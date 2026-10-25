"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FlaskConical,
  PlusCircle,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Info,
  CheckCircle2,
  Sliders,
  Calendar,
  DollarSign,
  ArrowRight,
  Compass,
  AlertTriangle,
  RotateCcw,
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
import {
  ScenarioModifiers,
  ForecastSummary,
} from "@/lib/forecast-engine";
import {
  scenarioModifierSchema,
  ScenarioModifierFormData,
  PRESET_SCENARIOS,
} from "@/lib/validations/scenario";
import { formatCurrency, formatDate } from "@/lib/utils";

type PresetType = "base" | "optimistic" | "pessimistic" | "custom";

export default function ScenarioLabPage() {
  const [horizon, setHorizon] = useState<7 | 30 | 60 | 90>(30);
  const [activePreset, setActivePreset] = useState<PresetType>("pessimistic");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Scenario Modifier State
  const [modifiers, setModifiers] = useState<ScenarioModifierFormData>(
    PRESET_SCENARIOS.pessimistic.modifiers
  );

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Subscribe to underlying live data updates
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

  // Compute Base-case Forecast (Zero modifiers)
  const baseForecast: ForecastSummary = useMemo(() => {
    return getLiveForecast(horizon, 250000);
  }, [horizon, refreshTrigger]);

  // Convert form data into engine ScenarioModifiers
  const engineModifiers: ScenarioModifiers = useMemo(() => {
    const mods: ScenarioModifiers = {
      customerDelayDays: modifiers.customerDelayDays,
      salesPercentageChange: modifiers.salesPercentageChange,
      supplierShiftDays: modifiers.supplierShiftDays,
      payrollPercentageChange: modifiers.payrollPercentageChange,
    };

    if (modifiers.unexpectedExpenseAmount > 0) {
      mods.unexpectedExpenses = [
        {
          id: "custom-exp",
          name: modifiers.unexpectedExpenseName || "Emergency Outlay",
          amount: modifiers.unexpectedExpenseAmount,
          dayOffset: modifiers.unexpectedExpenseDay,
        },
      ];
    }

    if (modifiers.loanDeferredDays > 0 || modifiers.loanExtraPayment > 0) {
      mods.loanPaymentChange = {
        deferredDays: modifiers.loanDeferredDays,
        extraPayment: modifiers.loanExtraPayment,
      };
    }

    return mods;
  }, [modifiers]);

  // Compute Simulated Forecast via Forecasting Engine
  const simulatedForecast: ForecastSummary = useMemo(() => {
    return getLiveForecast(horizon, 250000, engineModifiers);
  }, [horizon, engineModifiers, refreshTrigger]);

  // Handle Preset Switching
  const handleSelectPreset = (preset: PresetType) => {
    setActivePreset(preset);
    setValidationErrors({});
    if (preset === "base") {
      setModifiers(PRESET_SCENARIOS.base.modifiers);
    } else if (preset === "optimistic") {
      setModifiers(PRESET_SCENARIOS.optimistic.modifiers);
    } else if (preset === "pessimistic") {
      setModifiers(PRESET_SCENARIOS.pessimistic.modifiers);
    }
  };

  // Handle Modifier Input Changes with Zod Validation
  const handleModifierChange = (field: keyof ScenarioModifierFormData, value: unknown) => {
    const updated = { ...modifiers, [field]: value };
    setModifiers(updated);
    setActivePreset("custom");

    const result = scenarioModifierSchema.safeParse(updated);
    if (!result.success) {
      const errMap: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        errMap[key] = issue.message;
      });
      setValidationErrors(errMap);
    } else {
      setValidationErrors({});
    }
  };

  // Prepare Comparative Trajectory Chart Data
  const chartData = useMemo(() => {
    return baseForecast.dailyPoints.map((basePt, idx) => {
      const simPt = simulatedForecast.dailyPoints[idx] || basePt;
      return {
        date: basePt.date,
        dayOffset: basePt.dayOffset,
        baselineClosing: basePt.closingCash,
        simulatedClosing: simPt.closingCash,
        minimumReserve: basePt.minimumReserve,
      };
    });
  }, [baseForecast, simulatedForecast]);

  const closingDelta = simulatedForecast.closingCash - baseForecast.closingCash;
  const lowestDelta = simulatedForecast.lowestCashBalance - baseForecast.lowestCashBalance;

  return (
    <div className="space-y-6">
      {/* Simulation Engine Header */}
      <div className="bg-[#242321] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white border border-[#383632] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#FCE4D8] text-[#F15A35] px-2.5 py-0.5 rounded-full border border-[#F15A35]/30">
              HYPOTHETICAL SCENARIO LAB
            </span>
            <span className="text-xs text-[#A69C8D]">
              Runs strictly on top of Forecasting Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Stress Test & Financial Risk Simulation
          </h2>
          <p className="text-xs text-[#A69C8D] mt-1 max-w-2xl leading-relaxed">
            Simulate payment delays, sales shifts, emergency capital outlays, and supplier payment accelerations.
            All scenarios are strictly hypothetical and never alter your actual financial ledger.
          </p>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-1 bg-[#1A1918] p-1.5 rounded-2xl border border-[#383632] shrink-0">
          {([7, 30, 60, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setHorizon(days)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                horizon === days
                  ? "bg-[#F15A35] text-white shadow-xs"
                  : "text-[#A69C8D] hover:text-white"
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Strict Hypothetical Disclaimer Notice */}
      <div className="p-4 bg-white border border-[#E8E1D5] rounded-2xl sm:rounded-3xl flex items-center justify-between gap-3 text-xs text-[#242321] shadow-xs">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#F15A35] shrink-0" />
          <span>
            <strong className="font-bold">Safe Sandbox Mode:</strong> Adjusting simulation parameters below models what-if outcomes. Your actual receivables, supplier bills, and cash ledger records remain 100% untouched.
          </span>
        </div>
        <Badge variant="neutral" className="bg-[#F7F3EA] text-[#7A7369] border-[#E8E1D5] shrink-0">
          Hypothetical Only
        </Badge>
      </div>

      {/* Preset Selector Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => handleSelectPreset("base")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activePreset === "base"
              ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900">Base-Case</span>
            <Badge variant="neutral" className="text-[10px]">Actual</Badge>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Live ledger and scheduled obligations with zero hypothetical modifiers.
          </p>
        </button>

        <button
          onClick={() => handleSelectPreset("optimistic")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activePreset === "optimistic"
              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-900">Optimistic</span>
            <Badge variant="success" className="text-[10px]">+15% Sales</Badge>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            +15% sales, 5-day earlier customer receipts, and extended supplier terms.
          </p>
        </button>

        <button
          onClick={() => handleSelectPreset("pessimistic")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activePreset === "pessimistic"
              ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-900">Pessimistic Stress</span>
            <Badge variant="danger" className="text-[10px]">-25% Sales</Badge>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            -25% sales, +30d customer delay, ₹1L emergency repair on Day 12.
          </p>
        </button>

        <button
          onClick={() => handleSelectPreset("custom")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activePreset === "custom"
              ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-purple-900">Custom Tuner</span>
            <Badge variant="warning" className="text-[10px]">Interactive</Badge>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Individually adjust sliders and toggles for precision stress-testing.
          </p>
        </button>
      </div>

      {/* Comparative Impact Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Closing Cash Comparison */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Closing Cash (Day {horizon})
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono text-purple-700">
              {formatCurrency(simulatedForecast.closingCash)}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                closingDelta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {closingDelta >= 0 ? "+" : ""}
              {formatCurrency(closingDelta)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Baseline: <span className="font-mono">{formatCurrency(baseForecast.closingCash)}</span>
          </p>
        </div>

        {/* Card 2: Lowest Cash Buffer */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Lowest Cash Dip
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-xl font-bold font-mono ${
                simulatedForecast.lowestCashBalance >= 250000
                  ? "text-emerald-600"
                  : simulatedForecast.lowestCashBalance >= 0
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {formatCurrency(simulatedForecast.lowestCashBalance)}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                lowestDelta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {lowestDelta >= 0 ? "+" : ""}
              {formatCurrency(lowestDelta)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Lowest at Day {simulatedForecast.lowestCashDayOffset ?? 0}
          </p>
        </div>

        {/* Card 3: First Projected Shortage Date */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            First Shortage Date (&lt; ₹0)
          </p>
          <div className="mt-1">
            {simulatedForecast.firstShortageDate ? (
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Day {simulatedForecast.firstShortageDayOffset} ({formatDate(simulatedForecast.firstShortageDate)})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No Cash Deficit Projected</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Base: {baseForecast.firstShortageDate ? `Day ${baseForecast.firstShortageDayOffset}` : "None"}
          </p>
        </div>

        {/* Card 4: Maximum Shortfall */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Maximum Cash Shortfall
          </p>
          <div className="mt-1">
            {simulatedForecast.maximumCashShortfall > 0 ? (
              <span className="text-xl font-bold font-mono text-rose-600">
                -{formatCurrency(simulatedForecast.maximumCashShortfall)}
              </span>
            ) : (
              <span className="text-xl font-bold font-mono text-emerald-600">
                ₹0 (Solvent)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Reserve Breach: {formatCurrency(simulatedForecast.maximumReserveShortfall)}
          </p>
        </div>
      </div>

      {/* Comparison Line Chart: Baseline vs Simulated Trajectory */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              <span>Comparative Trajectory: Base-Case vs Simulated Stress Test ({horizon} Days)</span>
            </CardTitle>
            <CardDescription>
              Comparing actual projected trajectory (Blue) with hypothetical scenario trajectory (Purple)
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-600 inline-block" />
              <span>Baseline Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-purple-600 inline-block" />
              <span className="font-semibold text-purple-700">Hypothetical Simulation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed border-amber-500" />
              <span>Safety Buffer (₹2.5L)</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
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
                    name === "simulatedClosing" ? "Hypothetical Scenario" : "Baseline Actual",
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
                  dataKey="baselineClosing"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="simulatedClosing"
                  stroke="#9333ea"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Scenario Controls Tuning Panel */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-600" />
              <span>Interactive Stress-Test Controls</span>
            </CardTitle>
            <CardDescription>
              Adjust hypothetical variables to evaluate business sensitivity and liquidity vulnerability
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectPreset("base")}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset to Base Live Data
          </Button>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Control 1: Customer Payment Delay */}
            <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Customer Payment Delay
                </label>
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {modifiers.customerDelayDays > 0 ? `+${modifiers.customerDelayDays}` : modifiers.customerDelayDays} Days
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="60"
                step="5"
                value={modifiers.customerDelayDays}
                onChange={(e) => handleModifierChange("customerDelayDays", Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <p className="text-[11px] text-slate-500">
                Shifts customer receivable due dates forward or earlier (-15d to +60d).
              </p>
              {validationErrors.customerDelayDays && (
                <p className="text-[11px] text-rose-600">{validationErrors.customerDelayDays}</p>
              )}
            </div>

            {/* Control 2: Sales Contraction / Growth */}
            <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Sales Revenue Change
                </label>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                    modifiers.salesPercentageChange >= 0
                      ? "text-emerald-700 bg-emerald-100"
                      : "text-rose-700 bg-rose-100"
                  }`}
                >
                  {modifiers.salesPercentageChange >= 0 ? `+${modifiers.salesPercentageChange}` : modifiers.salesPercentageChange}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={modifiers.salesPercentageChange}
                onChange={(e) => handleModifierChange("salesPercentageChange", Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <p className="text-[11px] text-slate-500">
                Scales expected invoice values up or down (-50% to +50%).
              </p>
              {validationErrors.salesPercentageChange && (
                <p className="text-[11px] text-rose-600">{validationErrors.salesPercentageChange}</p>
              )}
            </div>

            {/* Control 3: Supplier Payment Timing Shift */}
            <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Supplier Payment Timing
                </label>
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {modifiers.supplierShiftDays > 0 ? `+${modifiers.supplierShiftDays}` : modifiers.supplierShiftDays} Days
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="45"
                step="5"
                value={modifiers.supplierShiftDays}
                onChange={(e) => handleModifierChange("supplierShiftDays", Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <p className="text-[11px] text-slate-500">
                Negative = pay suppliers earlier; Positive = negotiate deferred payment.
              </p>
              {validationErrors.supplierShiftDays && (
                <p className="text-[11px] text-rose-600">{validationErrors.supplierShiftDays}</p>
              )}
            </div>

            {/* Control 4: Payroll Adjustment */}
            <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Payroll & Staff Expense
                </label>
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {modifiers.payrollPercentageChange >= 0 ? `+${modifiers.payrollPercentageChange}` : modifiers.payrollPercentageChange}%
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="5"
                value={modifiers.payrollPercentageChange}
                onChange={(e) => handleModifierChange("payrollPercentageChange", Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <p className="text-[11px] text-slate-500">
                Simulate overtime/bonuses (+%) or hiring freezes/reductions (-%).
              </p>
              {validationErrors.payrollPercentageChange && (
                <p className="text-[11px] text-rose-600">{validationErrors.payrollPercentageChange}</p>
              )}
            </div>

            {/* Control 5: Unexpected Emergency Outflow */}
            <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">
                Unexpected Emergency Expense
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">Amount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={modifiers.unexpectedExpenseAmount}
                    onChange={(e) => handleModifierChange("unexpectedExpenseAmount", Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded font-mono"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Occurs on Day</span>
                  <input
                    type="number"
                    min="0"
                    max={horizon}
                    value={modifiers.unexpectedExpenseDay}
                    onChange={(e) => handleModifierChange("unexpectedExpenseDay", Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded font-mono"
                    placeholder="Day #"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Models machine breakdowns, sudden litigation, or GST penalty.
              </p>
            </div>

            {/* Control 6: Loan Deferral / Extra Prepayment */}
            <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">
                Loan Repayment Adjustment
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">Defer Days</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={modifiers.loanDeferredDays}
                    onChange={(e) => handleModifierChange("loanDeferredDays", Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded font-mono"
                    placeholder="0 days"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Extra Principal (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={modifiers.loanExtraPayment}
                    onChange={(e) => handleModifierChange("loanExtraPayment", Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded font-mono"
                    placeholder="₹0"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Simulate bank EMI moratorium or early debt reduction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Period Comparison Breakdown</CardTitle>
          <CardDescription>
            Side-by-side progression of Baseline vs Simulated cash balances across weekly milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 border-b">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3 text-right">Base Closing</th>
                  <th className="py-2.5 px-3 text-right">Simulated Closing</th>
                  <th className="py-2.5 px-3 text-right">Net Impact</th>
                  <th className="py-2.5 px-3 text-center">Base Status</th>
                  <th className="py-2.5 px-3 text-center">Simulated Status</th>
                  <th className="py-2.5 px-3 text-center">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {baseForecast.weeklySummaries.map((baseW, idx) => {
                  const simW = simulatedForecast.weeklySummaries[idx] || baseW;
                  const delta = simW.closingCash - baseW.closingCash;

                  return (
                    <tr
                      key={baseW.periodIndex}
                      className={`hover:bg-slate-50 ${
                        simW.status === "shortage"
                          ? "bg-rose-50/50"
                          : simW.status === "warning"
                          ? "bg-amber-50/40"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-sans font-semibold text-slate-900">
                        {baseW.label}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatCurrency(baseW.closingCash)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-purple-900">
                        {formatCurrency(simW.closingCash)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          delta >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {delta >= 0 ? `+${formatCurrency(delta)}` : `-${formatCurrency(Math.abs(delta))}`}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        {baseW.status === "safe" ? (
                          <Badge variant="success" className="text-[10px]">Safe</Badge>
                        ) : baseW.status === "warning" ? (
                          <Badge variant="warning" className="text-[10px]">Warning</Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">Deficit</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        {simW.status === "safe" ? (
                          <Badge variant="success" className="text-[10px]">Safe</Badge>
                        ) : simW.status === "warning" ? (
                          <Badge variant="warning" className="text-[10px]">Reserve Breach</Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">Cash Shortage</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        {simW.status === "shortage" ? (
                          <Link href="/decision-centre">
                            <span className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline">
                              Explore TReDS / Credit
                            </span>
                          </Link>
                        ) : simW.status === "warning" ? (
                          <Link href="/decision-centre">
                            <span className="text-[11px] font-bold text-amber-600 hover:text-amber-800 underline">
                              Split Supplier Terms
                            </span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Normal Operations</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Next Step Action Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <h4 className="text-sm font-bold">Ready to evaluate real-world corrective measures?</h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Take simulated stress tests into the Decision Centre to compare invoice factoring, vendor installment splits, and cost-reduction trade-offs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/forecast">
            <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-slate-200 hover:text-white">
              View Base Forecast
            </Button>
          </Link>
          <Link href="/decision-centre">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Go to Decision Centre
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
