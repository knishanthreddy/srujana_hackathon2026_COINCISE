"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DEMO_DECISIONS, DEMO_FORECAST_POINTS, DEMO_SUMMARY } from "@/lib/demo-data";
import { DecisionOption } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DecisionCentrePage() {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>("dec-01");
  const [activeDecisions, setActiveDecisions] = useState<string[]>(["dec-01"]);

  const selectedDecision =
    DEMO_DECISIONS.find((d) => d.id === selectedDecisionId) || DEMO_DECISIONS[0];

  const toggleDecision = (id: string) => {
    setActiveDecisions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculate cumulative boost from all selected decisions
  const chosenDecisions = DEMO_DECISIONS.filter((d) => activeDecisions.includes(d.id));
  const totalCashImprovement = chosenDecisions.reduce(
    (sum, d) => sum + d.projectedCashImprovement,
    0
  );

  // Generate comparative trajectory data
  const comparisonData = DEMO_FORECAST_POINTS.filter((p) => p.dayOffset <= 30).map((pt) => {
    // Decision impact takes effect from day 7 onwards
    const improvement = pt.dayOffset >= 7 ? totalCashImprovement : 0;
    return {
      date: pt.date,
      dayOffset: pt.dayOffset,
      originalClosing: pt.closingCash,
      improvedClosing: pt.closingCash + improvement,
    };
  });

  const originalLowest = Math.min(...comparisonData.map((d) => d.originalClosing));
  const improvedLowest = Math.min(...comparisonData.map((d) => d.improvedClosing));

  return (
    <div className="space-y-6">
      {/* Strategic Header Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl text-white border border-blue-800/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-300 border border-blue-400/30">
              DECISION LAB
            </span>
            <span className="text-xs text-blue-200">
              Objective: Overcome Day 22 Reserve Breach
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Executive Decision & Trade-Off Centre</h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
            Compare actionable financing options, supplier payment deferrals, and factoring mechanisms to reinforce cash runway without operational disruption.
          </p>
        </div>

        <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-right shrink-0">
          <p className="text-[10px] text-slate-300 uppercase font-semibold">Simulated Cash Boost</p>
          <p className="text-lg font-bold text-emerald-400">
            +{formatCurrency(totalCashImprovement)}
          </p>
          <p className="text-[10px] text-slate-300">
            {activeDecisions.length} Corrective Action(s) Applied
          </p>
        </div>
      </div>

      {/* Trajectory Recovery Chart */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Forecast Recovery with Selected Decision(s)</CardTitle>
            <CardDescription>
              Comparing baseline runway vs post-intervention liquidity trajectory over 30 days
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-slate-400 rounded" />
              <span className="text-slate-600">Baseline (Reserve Dip)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-600 rounded" />
              <span className="text-emerald-700 font-semibold">With Corrective Plan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span className="text-slate-600">Min Reserve (₹2.5L)</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={comparisonData}
                margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => formatDate(val)}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatCurrency(val),
                    name === "originalClosing" ? "Baseline Forecast" : "With Corrective Plan",
                  ]}
                  labelFormatter={(label) => `Forecast Date: ${formatDate(label)}`}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderRadius: "8px",
                    color: "#fff",
                    border: "none",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={DEMO_SUMMARY.minimumReserve}
                  stroke="#e11d48"
                  strokeDasharray="4 4"
                  label={{
                    value: "Reserve Floor (₹2.5L)",
                    fill: "#e11d48",
                    fontSize: 10,
                    position: "insideBottomRight",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="originalClosing"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="originalClosing"
                />
                <Line
                  type="monotone"
                  dataKey="improvedClosing"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="improvedClosing"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Outcome:</strong> By applying the chosen corrective actions, lowest cash balance increases from{" "}
                <span className="font-bold text-rose-600">{formatCurrency(originalLowest)}</span> to{" "}
                <span className="font-bold text-emerald-700">{formatCurrency(improvedLowest)}</span>, successfully eliminating the reserve breach!
              </span>
            </div>
            <Link href="/forecast">
              <Button size="sm" variant="outline" className="text-xs h-7 bg-white border-emerald-300 text-emerald-800">
                View Runway
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Decision Options Matrix */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Comparative Corrective Action Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_DECISIONS.map((option) => {
            const isApplied = activeDecisions.includes(option.id);
            return (
              <Card
                key={option.id}
                className={`transition-all border flex flex-col justify-between ${
                  isApplied
                    ? "border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{option.title}</span>
                        {option.recommended && (
                          <Badge variant="primary" size="sm">
                            ★ Recommended
                          </Badge>
                        )}
                        <Badge
                          variant={
                            option.riskLevel === "low"
                              ? "success"
                              : option.riskLevel === "medium"
                              ? "warning"
                              : "danger"
                          }
                          size="sm"
                        >
                          {option.riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{option.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-emerald-600 block">
                        +{formatCurrency(option.projectedCashImprovement)}
                      </span>
                      <span className="text-[10px] text-slate-400">Liquidity Boost</span>
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                    <div className="space-y-1">
                      <span className="font-bold text-emerald-700 block">Advantages:</span>
                      <ul className="space-y-0.5 text-slate-600 list-disc list-inside">
                        {option.pros.map((pro, i) => (
                          <li key={i}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-rose-700 block">Trade-Offs:</span>
                      <ul className="space-y-0.5 text-slate-600 list-disc list-inside">
                        {option.cons.map((con, i) => (
                          <li key={i}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Lead time: <strong>{option.timeToImplement}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant={isApplied ? "primary" : "outline"}
                    className={
                      isApplied
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                        : "text-xs h-8"
                    }
                    onClick={() => toggleDecision(option.id)}
                  >
                    {isApplied ? "✓ Included in Plan" : "+ Add to Comparison"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
