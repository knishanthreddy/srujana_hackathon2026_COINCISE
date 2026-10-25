"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Info,
  Sparkles,
  HelpCircle,
  Clock,
  ArrowUpRight,
  ReceiptText,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getFinancialRecords,
  subscribeToFinancialRecords,
  getReceivables,
  subscribeToReceivables,
  getPayables,
  subscribeToPayables,
  getUnifiedDashboardMetrics,
} from "@/lib/data-service";
import { getOnboardingData, EVENT_ONBOARDING_UPDATED } from "@/lib/onboarding-service";
import { calculateCredroScore, recordCredroSnapshot, CredroResult } from "@/lib/credro-score";

export default function CredroPage() {
  const [records, setRecords] = useState(getFinancialRecords());
  const [receivables, setReceivables] = useState(getReceivables());
  const [payables, setPayables] = useState(getPayables());
  const [onboarding, setOnboarding] = useState(getOnboardingData());
  const [metrics, setMetrics] = useState(getUnifiedDashboardMetrics());

  useEffect(() => {
    const sync = () => {
      setRecords(getFinancialRecords());
      setReceivables(getReceivables());
      setPayables(getPayables());
      setOnboarding(getOnboardingData());
      setMetrics(getUnifiedDashboardMetrics());
    };

    sync();
    const unRecs = subscribeToFinancialRecords(sync);
    const unReceivables = subscribeToReceivables(sync);
    const unPayables = subscribeToPayables(sync);
    window.addEventListener(EVENT_ONBOARDING_UPDATED, sync);

    return () => {
      unRecs();
      unReceivables();
      unPayables();
      window.removeEventListener(EVENT_ONBOARDING_UPDATED, sync);
    };
  }, []);

  const minimumReserve = onboarding.openingFinances.minimumReserve || 250000;

  const credro: CredroResult = useMemo(() => {
    const res = calculateCredroScore(
      records,
      receivables,
      payables,
      metrics.availableCash,
      minimumReserve,
      onboarding
    );
    recordCredroSnapshot(res.score, res.trustLevel);
    return res;
  }, [records, receivables, payables, metrics.availableCash, minimumReserve, onboarding]);

  // Color mapping based on trust level
  const trustColor =
    credro.trustLevel === "Excellent" || credro.trustLevel === "Good"
      ? "#138C83"
      : credro.trustLevel === "Fair"
      ? "#F15A35"
      : "#d94824";

  const trustBg =
    credro.trustLevel === "Excellent" || credro.trustLevel === "Good"
      ? "#DDEFE8"
      : "#FCE4D8";

  // Circular gauge calculations (radius = 54, circumference = 2 * PI * 54 = 339.29)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (credro.score / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* 1. Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A7369] hover:text-[#242321] mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#242321] tracking-tight">
              Credro™ Business Trust Score
            </h1>
            <Badge variant="primary" size="sm">
              Proprietary Engine
            </Badge>
          </div>
          <p className="text-xs text-[#7A7369] mt-0.5">
            Transparent, multi-factor evaluation of your operational and commercial reliability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/decision-centre">
            <Button variant="outline" size="sm">
              <span>Decision Centre</span>
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="primary" size="sm">
              <span>Download Audit</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Primary Score Hero Card */}
      <div className="p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Circular SVG Gauge */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
                {/* Background Track */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="#E8E1D5"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Progress Arc */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke={trustColor}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#242321] tracking-tight">
                  {credro.score}
                </span>
                <span className="text-xs font-bold text-[#A69C8D]">out of 100</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase"
                style={{ backgroundColor: trustBg, color: trustColor }}
              >
                {credro.trustLevel} Trust Level
              </span>
              {credro.scoreChange !== null && (
                <span
                  className={`text-xs font-bold ${
                    credro.scoreChange >= 0 ? "text-[#138C83]" : "text-[#F15A35]"
                  }`}
                >
                  {credro.scoreChange >= 0 ? `+${credro.scoreChange}` : credro.scoreChange} pts
                </span>
              )}
            </div>
          </div>

          {/* Score Overview & Data Sufficiency Note */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <span className="text-xs font-bold text-[#7A7369] uppercase tracking-wider">
                Reliability Status
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#242321] mt-1">
                {credro.trustLevel === "Excellent"
                  ? "Superior Operational Discipline"
                  : credro.trustLevel === "Good"
                  ? "Strong Financial Reliability"
                  : credro.trustLevel === "Fair"
                  ? "Moderate Reliability with Growth Headroom"
                  : "Attention Recommended"}
              </h2>
              <p className="text-xs text-[#7A7369] mt-2 leading-relaxed">
                {credro.historyNote}
              </p>
            </div>

            <div className="p-4 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5] flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#F15A35] shrink-0 mt-0.5" />
              <div className="text-xs text-[#242321]">
                <strong>Transparent Methodology:</strong> Credro dynamically analyzes 5 mathematical factors from your verified books without relying on arbitrary black-box estimations.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Five Factor Breakdown Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-[#242321]">
            Scoring Factor Breakdown
          </h3>
          <span className="text-xs text-[#A69C8D]">Weights sum to 100%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {credro.factors.map((factor) => {
            const factorColor =
              factor.status === "positive"
                ? "#138C83"
                : factor.status === "warning"
                ? "#F15A35"
                : factor.status === "danger"
                ? "#d94824"
                : "#7A7369";

            const factorBg =
              factor.status === "positive"
                ? "#DDEFE8"
                : factor.status === "warning"
                ? "#FCE4D8"
                : factor.status === "danger"
                ? "#FCE4D8"
                : "#F7F3EA";

            return (
              <div
                key={factor.id}
                className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#242321]">{factor.name}</span>
                    <span className="text-[10px] font-bold text-[#A69C8D] bg-[#F7F3EA] px-2 py-0.5 rounded-full border border-[#E8E1D5]">
                      Weight: {factor.weightPercent}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-extrabold text-[#242321]">
                      {factor.score}
                      <span className="text-xs font-bold text-[#A69C8D]"> / 100</span>
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: factorBg, color: factorColor }}
                    >
                      {factor.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-[#F7F3EA] rounded-full overflow-hidden border border-[#E8E1D5]/50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${factor.score}%`,
                        backgroundColor: factorColor,
                      }}
                    />
                  </div>

                  <p className="text-xs text-[#7A7369] mt-3 leading-relaxed">
                    {factor.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E8E1D5]/60 text-[11px] text-[#A69C8D] italic">
                  {factor.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Actionable Improvement Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#F15A35]" />
            <span>Targeted Recommendations to Enhance Credro</span>
          </CardTitle>
          <CardDescription>
            High-leverage operational adjustments to improve trust score and credit readiness
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {credro.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-4 bg-[#F7F3EA]/70 rounded-2xl border border-[#E8E1D5] flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-[#FCE4D8] text-[#F15A35] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="text-xs text-[#242321] leading-relaxed">
                {rec}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 5. Statutory Disclaimer */}
      <div className="p-4 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] text-[11px] text-[#A69C8D] leading-relaxed">
        <strong className="text-[#242321] block mb-1">Statutory & Governance Disclaimer:</strong>
        {credro.legalDisclaimer}
      </div>
    </div>
  );
}
