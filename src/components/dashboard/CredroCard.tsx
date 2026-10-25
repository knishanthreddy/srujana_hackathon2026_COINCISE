"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { CredroResult, CredroFactor, TrustLevel } from "@/lib/credro-score";
import { formatCurrency } from "@/lib/utils";

interface CredroCardProps {
  credro: CredroResult;
}

export function CredroCard({ credro }: CredroCardProps) {
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Trust Level Color & Badges
  const getTrustBadgeVariant = (level: TrustLevel) => {
    switch (level) {
      case "Excellent":
        return "success";
      case "Good":
        return "primary";
      case "Fair":
        return "warning";
      case "Low":
        return "danger";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-500";
    return "text-rose-600";
  };

  const getFactorBarColor = (status: CredroFactor["status"]) => {
    switch (status) {
      case "positive":
        return "bg-emerald-500";
      case "neutral":
        return "bg-blue-500";
      case "warning":
        return "bg-amber-500";
      case "danger":
        return "bg-rose-500";
    }
  };

  // Circular gauge circumference
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (credro.score / 100) * circumference;

  return (
    <>
      <Card className="border border-slate-200/90 shadow-sm bg-gradient-to-br from-white via-slate-50/50 to-amber-50/20 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100/90 bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-sm text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                    Credro™ Business Trust Score
                  </CardTitle>
                  <Badge variant={getTrustBadgeVariant(credro.trustLevel)} size="sm">
                    {credro.trustLevel} Trust
                  </Badge>
                  {credro.isPreliminary && (
                    <Badge variant="neutral" size="sm" className="bg-slate-100 text-slate-600 border-slate-300">
                      Preliminary
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  AI-evaluated operational reliability, payment discipline & cash stability
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFormulaModal(true)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="View transparent scoring methodology"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>How it&apos;s calculated</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 pb-5 space-y-6">
          {/* Main Visual Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual Ring Gauge */}
            <div className="md:col-span-4 flex items-center gap-5 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                  {/* Background track */}
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-slate-100"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className={`transition-all duration-700 ease-out ${
                      credro.score >= 85
                        ? "stroke-emerald-500"
                        : credro.score >= 70
                        ? "stroke-blue-500"
                        : credro.score >= 50
                        ? "stroke-amber-500"
                        : "stroke-rose-500"
                    }`}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                {/* Score in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-black tracking-tight leading-none ${getScoreColor(credro.score)}`}>
                    {credro.score}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">/ 100</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Trust Level</span>
                  {credro.scoreChange !== null && credro.scoreChange !== 0 && (
                    <span
                      className={`text-[11px] font-bold inline-flex items-center gap-0.5 ${
                        credro.scoreChange > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {credro.scoreChange > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {credro.scoreChange > 0 ? `+${credro.scoreChange}` : credro.scoreChange} pts
                    </span>
                  )}
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {credro.trustLevel} Reliability
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {credro.historyNote}
                </p>
              </div>
            </div>

            {/* Top 2 Actionable Recommendations */}
            <div className="md:col-span-8 p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    How to Improve Your Credro Score
                  </span>
                  <span className="text-[11px] text-amber-700/80 font-medium">Dynamic Actions</span>
                </div>

                <div className="space-y-2">
                  {credro.recommendations.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-amber-200/40 flex items-center justify-between text-[11px] text-amber-900/70">
                <span>Calculated dynamically from active financial records</span>
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="font-bold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1"
                >
                  {isExpanded ? "Hide Factor Breakdown" : "View Factor Breakdown"}
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 5 Key Influencing Factors Breakdown (Collapsible or visible) */}
          {isExpanded && (
            <div className="pt-2 border-t border-slate-100 animate-in fade-in duration-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  5 Key Weighted Factors Influencing Your Score
                </span>
                <span className="text-[11px] text-slate-500">Formula Weights Sum to 100%</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {credro.factors.map((factor) => (
                  <div
                    key={factor.id}
                    className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800">{factor.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">Weight: {factor.weightPercent}</span>
                          <span className={`text-xs font-extrabold ${getScoreColor(factor.score)}`}>
                            {factor.score}/100
                          </span>
                        </div>
                      </div>

                      {/* Factor Progress Meter */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getFactorBarColor(
                            factor.status
                          )}`}
                          style={{ width: `${Math.min(100, Math.max(5, factor.score))}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {factor.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Status:</span>
                      <span className="capitalize font-semibold text-slate-700">{factor.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal Notice */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Notice:</strong> {credro.legalDisclaimer}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Transparent Calculation Methodology Modal */}
      <Modal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        title="Credro™ Scoring Methodology & Transparent Weights"
        description="How COINCISE evaluates your business's financial trust score"
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            Credro is calculated purely from your active financial transactions, supplier obligations, customer receivables, and cash buffer. It does not use subjective guesses or hidden algorithms.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1">
            <div className="text-amber-400 font-bold mb-1">{"// Transparent Weighted Formula"}</div>
            <div>Credro Score =</div>
            <div className="pl-4 text-emerald-400">0.25 × Payment History (Punctuality & Overdue Ratios)</div>
            <div className="pl-4 text-blue-400">+ 0.20 × Cash-Flow Stability (Net Inflows vs Disbursements)</div>
            <div className="pl-4 text-cyan-400">+ 0.25 × Liquidity Cushion (Operating Cash vs 30d Payables & Reserve)</div>
            <div className="pl-4 text-purple-400">+ 0.15 × Financial Consistency (Transaction Regularity & Completeness)</div>
            <div className="pl-4 text-orange-400">+ 0.15 × Outstanding Obligations (Debt & Payables Leverage)</div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Scoring Thresholds
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="block text-emerald-800 font-extrabold text-sm">85 - 100</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Excellent</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="block text-blue-800 font-extrabold text-sm">70 - 84</span>
                <span className="text-[10px] text-blue-600 font-semibold">Good</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="block text-amber-800 font-extrabold text-sm">50 - 69</span>
                <span className="text-[10px] text-amber-600 font-semibold">Fair</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="block text-rose-800 font-extrabold text-sm">0 - 49</span>
                <span className="text-[10px] text-rose-600 font-semibold">Low</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
            <div className="font-bold text-slate-800">Protections & Fair Use Guarantee:</div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>If transaction history is brief, Credro flags the score as <em>Preliminary</em> rather than penalizing missing data as misconduct.</li>
              <li>Credro is purely informational for management and does not guarantee loan eligibility or external credit decisions.</li>
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setShowFormulaModal(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
