"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  FlaskConical,
  Compass,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { DEMO_FORECAST_POINTS, DEMO_SUMMARY } from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ForecastPage() {
  const [horizon, setHorizon] = useState<7 | 30 | 60 | 90>(30);

  const points = DEMO_FORECAST_POINTS.filter((p) => p.dayOffset <= horizon);

  const initialCash = DEMO_FORECAST_POINTS[0]?.openingCash || 485000;
  const totalInflows = points.reduce((acc, p) => acc + p.projectedInflow, 0);
  const totalOutflows = points.reduce((acc, p) => acc + p.projectedOutflow, 0);
  const finalClosing = points[points.length - 1]?.closingCash || initialCash;
  const lowestPoint = Math.min(...points.map((p) => p.closingCash));
  const hasBreach = lowestPoint < DEMO_SUMMARY.minimumReserve;

  return (
    <div className="space-y-6">
      {/* Top Math Formula & Horizon Controller */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              CORE FORECAST ENGINE
            </span>
            <span className="text-xs text-slate-400">Deterministic cash balance algorithm</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Closing Cash = Opening Cash + Inflows - Outflows
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
            Simulates actual timing of cleared customer receivables and scheduled vendor outflows. Never counts unverified promises.
          </p>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700/80 shrink-0">
          {([7, 30, 60, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setHorizon(days)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                horizon === days
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Runway Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Starting Cash</p>
          <h4 className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(initialCash)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Cleared balance today</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Projected Inflows</p>
          <h4 className="text-xl font-bold text-emerald-600 mt-1">
            +{formatCurrency(totalInflows)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Across next {horizon} days</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Projected Outflows</p>
          <h4 className="text-xl font-bold text-rose-600 mt-1">
            -{formatCurrency(totalOutflows)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Vendor dues & payroll</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Ending Cash (Day {horizon})</p>
          <h4 className="text-xl font-bold text-blue-600 mt-1">
            {formatCurrency(finalClosing)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Projected position</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Lowest Dip Point</p>
          <h4
            className={`text-xl font-bold mt-1 ${
              hasBreach ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {formatCurrency(lowestPoint)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasBreach ? "⚠️ Breaches Min Reserve" : "✓ Within Safety Reserve"}
          </p>
        </div>
      </div>

      {/* Breach Warning Banner if breached */}
      {hasBreach && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Minimum Reserve Warning Detected
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                On Day 22 (15 Nov), projected cash drops to ₹2,00,000, which is ₹50,000 below your set minimum safety buffer of {formatCurrency(DEMO_SUMMARY.minimumReserve)}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/decision-centre">
              <Button size="sm" variant="primary" className="bg-amber-600 hover:bg-amber-700 border-none text-white">
                <Compass className="w-4 h-4 mr-1.5" />
                View Solutions
              </Button>
            </Link>
            <Link href="/scenarios">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 bg-white hover:bg-amber-100">
                <FlaskConical className="w-4 h-4 mr-1.5" />
                Simulate
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Trajectory Chart */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Projected Cash Runway vs Safety Reserve</CardTitle>
            <CardDescription>
              Horizon: {horizon} Days • Red dashed line indicates minimum safety reserve threshold ({formatCurrency(DEMO_SUMMARY.minimumReserve)})
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
              <span className="text-slate-600">Projected Closing Cash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span className="text-slate-600">Reserve Floor (₹2.5L)</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
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
                  formatter={(val: number) => [formatCurrency(val), "Closing Cash"]}
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
                  strokeWidth={2}
                  label={{
                    value: "Safety Floor: ₹2.5L",
                    fill: "#e11d48",
                    fontSize: 11,
                    position: "insideTopLeft",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="closingCash"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#forecastFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Granular Timeline Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cash Balance Breakdown</CardTitle>
          <CardDescription>
            Audit log of projected receipts and payments over the {horizon}-day horizon
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Day / Date</th>
                <th className="py-3 px-4 text-right">Opening Cash</th>
                <th className="py-3 px-4 text-right">Projected Inflow</th>
                <th className="py-3 px-4 text-right">Projected Outflow</th>
                <th className="py-3 px-4 text-right">Net Flow</th>
                <th className="py-3 px-4 text-right">Closing Cash</th>
                <th className="py-3 px-5 text-center">Liquidity Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {points.map((p) => (
                <tr
                  key={p.date}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    p.status === "warning" ? "bg-amber-50/30" : ""
                  }`}
                >
                  <td className="py-3.5 px-5 font-medium text-slate-900 whitespace-nowrap">
                    <span className="font-bold">Day +{p.dayOffset}</span>
                    <span className="text-slate-600 block text-[11px]">{formatDate(p.date)}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                    {formatCurrency(p.openingCash)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-emerald-700 whitespace-nowrap">
                    {p.projectedInflow > 0 ? `+${formatCurrency(p.projectedInflow)}` : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-rose-700 whitespace-nowrap">
                    {p.projectedOutflow > 0 ? `-${formatCurrency(p.projectedOutflow)}` : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                    <span
                      className={
                        p.netCashFlow > 0
                          ? "text-emerald-700"
                          : p.netCashFlow < 0
                          ? "text-rose-700"
                          : "text-slate-500"
                      }
                    >
                      {p.netCashFlow > 0 ? "+" : ""}
                      {formatCurrency(p.netCashFlow)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(p.closingCash)}
                  </td>
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    {p.status === "warning" ? (
                      <Badge variant="warning" size="sm">
                        ⚠️ Reserve Breach
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        ✓ Safe Buffer
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
