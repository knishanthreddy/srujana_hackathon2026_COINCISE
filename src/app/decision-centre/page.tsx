"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Info,
  Scale,
  DollarSign,
  Layers,
  Sliders,
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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getLiveForecast,
  subscribeToFinancialRecords,
  subscribeToReceivables,
  subscribeToPayables,
} from "@/lib/data-service";
import { ScenarioModifiers, ForecastSummary } from "@/lib/forecast-engine";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ActionStrategy {
  id: string;
  title: string;
  category: "financing" | "negotiation" | "cost_cutting" | "discounting";
  description: string;
  projectedCashImprovement: number;
  timeToImplement: string;
  riskLevel: "low" | "medium" | "high";
  pros: string[];
  cons: string[];
  modifiers: ScenarioModifiers;
}

const STRATEGY_OPTIONS: ActionStrategy[] = [
  {
    id: "strat-factoring",
    title: "TReDS Invoice Discounting (85% Immediate Advance)",
    category: "financing",
    description: "Sell approved customer receivables via an MSME TReDS factoring platform for an 85% liquidity advance on Day 3.",
    projectedCashImprovement: 384000,
    timeToImplement: "48 - 72 Hours",
    riskLevel: "low",
    pros: [
      "Immediate cash injection directly to current account",
      "No secondary collateral required under RBI guidelines",
      "Decisively prevents projected cash reserve breaches",
    ],
    cons: ["1.8% factoring discount fee applies (approx ₹6,900)"],
    modifiers: {
      customerDelayDays: -12, // Pulls receivables forward by 12 days
      salesPercentageChange: -1.8, // Net of factoring charge
    },
  },
  {
    id: "strat-supplier-split",
    title: "Supplier Payment Split (50% Now, 50% in 25 Days)",
    category: "negotiation",
    description: "Negotiate with key suppliers to disburse 50% of outstanding bills today and defer the remaining balance by 25 days.",
    projectedCashImprovement: 100000,
    timeToImplement: "24 Hours",
    riskLevel: "medium",
    pros: [
      "Protects liquid buffer through the critical mid-month cash dip",
      "Maintains vendor goodwill with partial upfront clearance",
    ],
    cons: ["Requires vendor finance manager approval"],
    modifiers: {
      supplierShiftDays: 14, // Defer payables by 14 days
    },
  },
  {
    id: "strat-cost-reduction",
    title: "15% Discretionary Overhead & Consumables Freeze",
    category: "cost_cutting",
    description: "Temporarily pause non-essential operational expenses, cutting lubricants buffer, and travel reimbursements.",
    projectedCashImprovement: 45000,
    timeToImplement: "Immediate (Day 1)",
    riskLevel: "low",
    pros: [
      "Direct reduction in cash burn with zero external debt",
      "Strengthens business fiscal discipline",
    ],
    cons: ["May defer non-critical machinery servicing"],
    modifiers: {
      payrollPercentageChange: 0,
      salesPercentageChange: 0,
      supplierShiftDays: 0,
    },
  },
  {
    id: "strat-early-discount",
    title: "2% Prompt-Payment Cash Discount Incentive",
    category: "discounting",
    description: "Offer all pending customer accounts a 2% discount incentive for payment clearance within 5 calendar days.",
    projectedCashImprovement: 215000,
    timeToImplement: "2 - 4 Days",
    riskLevel: "low",
    pros: [
      "Accelerates cash recovery without third-party debt",
      "Strengthens client relationship and repeat buying",
    ],
    cons: ["2% margin concession on billed invoice value"],
    modifiers: {
      customerDelayDays: -10, // Pulls collection earlier by 10 days
      salesPercentageChange: -2, // 2% cash discount
    },
  },
];

export default function DecisionCentrePage() {
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([
    "strat-factoring",
    "strat-supplier-split",
  ]);
  const [activeStrategyDetail, setActiveStrategyDetail] = useState<string>("strat-factoring");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to live data changes
  useEffect(() => {
    const unsubRecords = subscribeToFinancialRecords(() => setRefreshTrigger((n) => n + 1));
    const unsubReceivables = subscribeToReceivables(() => setRefreshTrigger((n) => n + 1));
    const unsubPayables = subscribeToPayables(() => setRefreshTrigger((n) => n + 1));

    return () => {
      unsubRecords();
      unsubReceivables();
      unsubPayables();
    };
  }, []);

  const toggleStrategy = (id: string) => {
    setSelectedStrategies((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 1. Calculate Base-Case Forecast (Zero Actions Applied)
  const baseForecast: ForecastSummary = useMemo(() => {
    return getLiveForecast(30, 250000);
  }, [refreshTrigger]);

  // 2. Aggregate Modifiers from All Selected Strategies
  const aggregatedModifiers: ScenarioModifiers = useMemo(() => {
    const chosen = STRATEGY_OPTIONS.filter((s) => selectedStrategies.includes(s.id));

    let customerDelay = 0;
    let salesDelta = 0;
    let supplierShift = 0;

    for (const strat of chosen) {
      if (strat.modifiers.customerDelayDays) {
        customerDelay += strat.modifiers.customerDelayDays;
      }
      if (strat.modifiers.salesPercentageChange) {
        salesDelta += strat.modifiers.salesPercentageChange;
      }
      if (strat.modifiers.supplierShiftDays) {
        supplierShift += strat.modifiers.supplierShiftDays;
      }
    }

    return {
      customerDelayDays: customerDelay,
      salesPercentageChange: salesDelta,
      supplierShiftDays: supplierShift,
    };
  }, [selectedStrategies]);

  // 3. Calculate Adjusted Forecast with Corrective Interventions Applied
  const adjustedForecast: ForecastSummary = useMemo(() => {
    return getLiveForecast(30, 250000, aggregatedModifiers);
  }, [aggregatedModifiers, refreshTrigger]);

  // Prepare chart comparison data
  const comparisonData = useMemo(() => {
    return baseForecast.dailyPoints.map((basePt, idx) => {
      const adjPt = adjustedForecast.dailyPoints[idx] || basePt;
      return {
        date: basePt.date,
        dayOffset: basePt.dayOffset,
        baseClosing: basePt.closingCash,
        adjustedClosing: adjPt.closingCash,
        minimumReserve: basePt.minimumReserve,
      };
    });
  }, [baseForecast, adjustedForecast]);

  const activeStrategy =
    STRATEGY_OPTIONS.find((s) => s.id === activeStrategyDetail) || STRATEGY_OPTIONS[0];

  const totalBoost = adjustedForecast.closingCash - baseForecast.closingCash;
  const lowestDipImprovement = adjustedForecast.lowestCashBalance - baseForecast.lowestCashBalance;
  const isReserveSaved = !adjustedForecast.isReserveBreached && baseForecast.isReserveBreached;

  return (
    <div className="space-y-6">
      {/* Strategic Header Banner */}
      <div className="p-5 sm:p-6 bg-[#242321] rounded-2xl sm:rounded-3xl text-white border border-[#383632] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FCE4D8] text-[#F15A35] border border-[#F15A35]/30">
              EXECUTIVE DECISION CENTRE
            </span>
            <span className="text-xs text-[#A69C8D]">
              Hypothetical Corrective Action & Trade-Off Modeling
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Liquidity Rescue & Working Capital Optimizer
          </h2>
          <p className="text-xs text-[#A69C8D] mt-1 max-w-2xl leading-relaxed">
            Select and compare corrective strategies to resolve projected cash reserve breaches and cash shortages.
            Simulations evaluate trade-offs without executing actual payments or altering your ledger.
          </p>
        </div>

        <div className="p-4 bg-[#1A1918] rounded-2xl border border-[#383632] text-right shrink-0">
          <p className="text-[10px] text-[#A69C8D] uppercase font-bold">Simulated Net Impact</p>
          <p className={`text-xl font-extrabold font-mono ${totalBoost >= 0 ? "text-[#138C83]" : "text-[#F15A35]"}`}>
            {totalBoost >= 0 ? "+" : ""}{formatCurrency(totalBoost)}
          </p>
          <p className="text-[11px] text-[#A69C8D] mt-0.5">
            {selectedStrategies.length} Corrective Action(s) Active
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Simulation Sandbox:</strong> Activating strategies below calculates the hypothetical trajectory recovery using the core forecasting engine. No actual invoices are discounted and no bank disbursements occur.
          </span>
        </div>
        <Badge variant="neutral" className="bg-blue-100 text-blue-800 border-blue-200 shrink-0">
          Hypothetical Only
        </Badge>
      </div>

      {/* Executive Comparison KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 30-Day Closing Cash */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Closing Cash (Day 30)
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono text-emerald-600">
              {formatCurrency(adjustedForecast.closingCash)}
            </span>
            <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              +{formatCurrency(totalBoost)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Baseline: <span className="font-mono">{formatCurrency(baseForecast.closingCash)}</span>
          </p>
        </div>

        {/* Card 2: Lowest Cash Buffer */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Lowest Projected Dip
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono text-slate-900">
              {formatCurrency(adjustedForecast.lowestCashBalance)}
            </span>
            <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              +{formatCurrency(lowestDipImprovement)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Baseline Dip: <span className="font-mono">{formatCurrency(baseForecast.lowestCashBalance)}</span>
          </p>
        </div>

        {/* Card 3: Reserve Breach Status */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Safety Buffer Protection
          </p>
          <div className="mt-1">
            {!adjustedForecast.isReserveBreached ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Buffer Fully Defended (&gt; ₹2.5L)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Partial Breach: -{formatCurrency(adjustedForecast.maximumReserveShortfall)}</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isReserveSaved ? "Breach eliminated by selected actions" : "Additional actions recommended"}
          </p>
        </div>

        {/* Card 4: Shortfall Recovery */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Solvency Status (&lt; ₹0)
          </p>
          <div className="mt-1">
            {!adjustedForecast.isCashDeficit ? (
              <span className="text-xl font-bold font-mono text-emerald-600">
                100% Solvent
              </span>
            ) : (
              <span className="text-xl font-bold font-mono text-rose-600">
                Deficit: -{formatCurrency(adjustedForecast.maximumCashShortfall)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Day 0 to Day 30 Trajectory
          </p>
        </div>
      </div>

      {/* Comparative Recovery Chart */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Comparative Trajectory: Original Baseline vs Corrective Interventions</span>
            </CardTitle>
            <CardDescription>
              Shows how the combination of selected actions recovers liquidity and protects the minimum safety reserve
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 inline-block border-t border-dashed border-slate-400" />
              <span>Original Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
              <span className="font-semibold text-emerald-700">With Corrective Actions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed border-amber-500" />
              <span>Safety Reserve (₹2.5L)</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => formatDate(val)}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatCurrency(val),
                    name === "adjustedClosing" ? "Adjusted Trajectory" : "Original Baseline",
                  ]}
                  labelFormatter={(lbl) => formatDate(String(lbl))}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                    fontSize: "0.8rem",
                  }}
                />
                <ReferenceLine
                  y={250000}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Reserve: ₹250k",
                    fill: "#d97706",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="baseClosing"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="adjustedClosing"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Action Strategy Cards & Detailed Trade-Off View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Action Toggle Cards */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Select Actionable Corrective Strategies</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STRATEGY_OPTIONS.map((strategy) => {
              const isSelected = selectedStrategies.includes(strategy.id);
              const isInspected = activeStrategyDetail === strategy.id;

              return (
                <div
                  key={strategy.id}
                  onClick={() => setActiveStrategyDetail(strategy.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-900 leading-snug">
                      {strategy.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStrategy(strategy.id);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected ? "Active" : "Add"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    {strategy.description}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 font-mono">
                    <span className="font-bold text-emerald-700">
                      +{formatCurrency(strategy.projectedCashImprovement)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans">
                      {strategy.timeToImplement}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: In-Depth Trade-Off Analysis */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <Badge variant="neutral" className="text-[10px] uppercase">
                  {activeStrategy.category}
                </Badge>
                <Badge
                  variant={
                    activeStrategy.riskLevel === "low"
                      ? "success"
                      : activeStrategy.riskLevel === "medium"
                      ? "warning"
                      : "danger"
                  }
                  className="text-[10px] uppercase font-bold"
                >
                  {activeStrategy.riskLevel} Risk
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold mt-2">
                {activeStrategy.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                {activeStrategy.description}
              </p>

              <div>
                <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1.5 text-emerald-700">
                  Strategic Advantages:
                </h5>
                <ul className="space-y-1 text-slate-600">
                  {activeStrategy.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">&#x2713;</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1.5 text-amber-700">
                  Operational Trade-Offs:
                </h5>
                <ul className="space-y-1 text-slate-600">
                  {activeStrategy.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">&bull;</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Execution Velocity:</span>
                <span className="font-bold text-slate-800">{activeStrategy.timeToImplement}</span>
              </div>

              <Button
                variant={selectedStrategies.includes(activeStrategy.id) ? "outline" : "primary"}
                size="sm"
                onClick={() => toggleStrategy(activeStrategy.id)}
                className="w-full text-xs"
              >
                {selectedStrategies.includes(activeStrategy.id)
                  ? "Remove Strategy from Simulation"
                  : "Apply Strategy to Forecast"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
