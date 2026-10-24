"use client";

import React, { useState } from "react";
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
import { Modal } from "@/components/ui/Modal";
import { DEMO_SCENARIOS, DEMO_FORECAST_POINTS, DEMO_SUMMARY } from "@/lib/demo-data";
import { ScenarioItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ScenarioLabPage() {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(DEMO_SCENARIOS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New scenario form state
  const [newScenario, setNewScenario] = useState({
    name: "",
    description: "",
    category: "delayed_receipts" as ScenarioItem["category"],
    cashImpact: "-100000",
    effectiveDay: "15",
  });

  const toggleScenario = (id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const resetAll = () => {
    setScenarios((prev) => prev.map((s) => ({ ...s, isActive: false })));
  };

  const handleCreateScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenario.name || !newScenario.cashImpact) return;

    const item: ScenarioItem = {
      id: `sc-${Date.now()}`,
      name: newScenario.name,
      description: newScenario.description,
      category: newScenario.category,
      cashImpact: Number(newScenario.cashImpact),
      effectiveDay: Number(newScenario.effectiveDay) || 10,
      isActive: true,
    };

    setScenarios([item, ...scenarios]);
    setIsAddModalOpen(false);
    setNewScenario({
      name: "",
      description: "",
      category: "delayed_receipts",
      cashImpact: "-100000",
      effectiveDay: "15",
    });
  };

  // Calculate dynamic simulated curve based on active scenarios
  const activeScenarios = scenarios.filter((s) => s.isActive);
  const totalActiveImpact = activeScenarios.reduce((sum, s) => sum + s.cashImpact, 0);

  const baselinePoints = DEMO_FORECAST_POINTS.filter((p) => p.dayOffset <= 30);

  const simulatedChartData = baselinePoints.map((pt) => {
    // Sum impacts that take effect on or before this dayOffset
    const scenarioImpactSoFar = activeScenarios
      .filter((s) => s.effectiveDay <= pt.dayOffset)
      .reduce((sum, s) => sum + s.cashImpact, 0);

    const simulatedClosing = Math.max(-500000, pt.closingCash + scenarioImpactSoFar);

    return {
      date: pt.date,
      dayOffset: pt.dayOffset,
      baselineClosing: pt.closingCash,
      simulatedClosing: simulatedClosing,
    };
  });

  const baselineEnding = baselinePoints[baselinePoints.length - 1]?.closingCash || 655000;
  const simulatedEnding = simulatedChartData[simulatedChartData.length - 1]?.simulatedClosing || baselineEnding;
  const simulatedLowest = Math.min(...simulatedChartData.map((d) => d.simulatedClosing));
  const isSimulatedBreach = simulatedLowest < DEMO_SUMMARY.minimumReserve;
  const isNegativeCash = simulatedLowest < 0;

  return (
    <div className="space-y-6">
      {/* Strict Isolation Notice Banner */}
      <div className="p-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl text-white border border-purple-800/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/30 text-purple-300 border border-purple-400/30">
              SANDBOX SIMULATION
            </span>
            <span className="text-xs text-purple-200">
              Zero Impact on Production Records
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Financial Scenario & Stress Testing Lab</h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
            Model hypothetical financial shocks, delayed buyer payments, or emergency expenditures. Actual accounting ledgers remain strictly untouched.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="border-purple-400/40 text-purple-200 bg-purple-900/30 hover:bg-purple-900/50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reset Shocks
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Custom Scenario
          </Button>
        </div>
      </div>

      {/* KPI Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Baseline Day 30 Cash</p>
          <h4 className="text-xl font-bold text-slate-800 mt-1">
            {formatCurrency(baselineEnding)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Without hypothetical shocks</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Simulated Day 30 Cash</p>
          <h4
            className={`text-xl font-bold mt-1 ${
              simulatedEnding < 0
                ? "text-rose-600"
                : simulatedEnding < DEMO_SUMMARY.minimumReserve
                ? "text-amber-600"
                : "text-blue-600"
            }`}
          >
            {formatCurrency(simulatedEnding)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Net shock: {totalActiveImpact >= 0 ? "+" : ""}
            {formatCurrency(totalActiveImpact)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Simulated Trough Point</p>
          <h4
            className={`text-xl font-bold mt-1 ${
              isNegativeCash
                ? "text-rose-600"
                : isSimulatedBreach
                ? "text-amber-600"
                : "text-emerald-600"
            }`}
          >
            {formatCurrency(simulatedLowest)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {isNegativeCash
              ? "🚨 CRITICAL CASH SHORTAGE"
              : isSimulatedBreach
              ? "⚠️ Reserve Breach"
              : "✓ Resilient Reserve"}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Active Variables</p>
          <h4 className="text-xl font-bold text-purple-700 mt-1">
            {activeScenarios.length} of {scenarios.length} Active
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Click toggles below to engage</p>
        </div>
      </div>

      {/* Comparative Simulation Chart */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Baseline vs. Simulated Cash Runway (30-Day Model)</CardTitle>
            <CardDescription>
              Blue line: Baseline actual forecast • Purple dashed line: Projected cash flow with active shocks
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-blue-600 rounded" />
              <span className="text-slate-600">Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-purple-600 rounded" />
              <span className="text-slate-600">Simulated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span className="text-slate-600">Min Reserve (₹2.5L)</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={simulatedChartData}
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
                    name === "baselineClosing" ? "Baseline Forecast" : "Simulated Runway",
                  ]}
                  labelFormatter={(label) => `Date: ${formatDate(label)}`}
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
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="baselineClosing"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="baselineClosing"
                />
                <Line
                  type="monotone"
                  dataKey="simulatedClosing"
                  stroke="#9333ea"
                  strokeWidth={3}
                  strokeDasharray={activeScenarios.length > 0 ? "4 4" : undefined}
                  dot={{ r: 4 }}
                  name="simulatedClosing"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Scenario Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-600" />
            Hypothetical Risk & Adjustment Switches
          </h3>
          <span className="text-xs text-slate-500">
            Toggle switches to evaluate compounding sensitivity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              onClick={() => toggleScenario(sc.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                sc.isActive
                  ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-md"
                  : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-bold text-slate-900">{sc.name}</h4>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      sc.isActive
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sc.isActive ? "ACTIVE" : "OFF"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">{sc.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Takes effect: <strong>Day +{sc.effectiveDay}</strong>
                </span>
                <span
                  className={`font-bold ${
                    sc.cashImpact < 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {sc.cashImpact < 0 ? "Shock: " : "Buffer: "}
                  {formatCurrency(sc.cashImpact)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Scenario Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Hypothetical Scenario"
        description="Define a shock or adjustment to stress-test your business runway."
      >
        <form onSubmit={handleCreateScenario} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scenario Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Major client bankruptcy"
              value={newScenario.name}
              onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Explain the background and assumptions..."
              value={newScenario.description}
              onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Net Cash Impact (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="-150000"
                value={newScenario.cashImpact}
                onChange={(e) => setNewScenario({ ...newScenario, cashImpact: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[10px] text-slate-500">Negative for outflows/losses</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Effective Day Offset
              </label>
              <input
                type="number"
                min={1}
                max={90}
                required
                placeholder="15"
                value={newScenario.effectiveDay}
                onChange={(e) => setNewScenario({ ...newScenario, effectiveDay: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[10px] text-slate-500">e.g. 15 = 15 days from today</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Add to Lab
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
