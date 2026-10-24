"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  FlaskConical,
  Scale,
  Compass,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DEMO_SUMMARY,
  DEMO_RECORDS,
  DEMO_RECEIVABLES,
  DEMO_PAYABLES,
  DEMO_FORECAST_POINTS,
  DEMO_ALERTS,
} from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [forecastHorizon, setForecastHorizon] = useState<30 | 60 | 90>(30);

  // Filter forecast points according to selected horizon
  const displayedForecast = DEMO_FORECAST_POINTS.filter(
    (pt) => pt.dayOffset <= forecastHorizon
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Demo Mode & Financial Integrity Notice */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30">
              EXECUTIVE BRIEFING
            </span>
            <span className="text-xs text-slate-300">
              Last reconciled: Today, 10:45 AM
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {DEMO_SUMMARY.businessName}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Liquidity is secure for the next 14 days. Projected reserve breach on Day 22 (15 Nov) requires proactive receivables follow-up or scheduled vendor payment pacing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/forecast">
            <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Forecast Runway
            </Button>
          </Link>
          <Link href="/decision-centre">
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white shadow-md">
              <Compass className="w-4 h-4 mr-1.5" />
              Decision Centre
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Core Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Available Cash */}
        <StatCard
          title="Available Cash"
          value={formatCurrency(DEMO_SUMMARY.availableCash)}
          subtitle="Real bank balance"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
          variant="success"
          trend={{ value: "Cleared", isPositive: true }}
        />

        {/* 2. Expected Receipts */}
        <StatCard
          title="Expected Receipts (30d)"
          value={formatCurrency(DEMO_SUMMARY.expectedReceipts30d)}
          subtitle="Inbound customer dues"
          icon={<ArrowDownLeft className="w-5 h-5 text-blue-600" />}
          variant="primary"
          trend={{ value: "Inflows", isPositive: true }}
        />

        {/* 3. Outstanding Receivables */}
        <StatCard
          title="Outstanding Invoices"
          value={formatCurrency(DEMO_SUMMARY.outstandingReceivables)}
          subtitle={`${DEMO_SUMMARY.overdueReceivablesCount} overdue invoices`}
          icon={<ReceiptText className="w-5 h-5 text-amber-600" />}
          variant="warning"
          trend={{ value: "Action Required", isPositive: false }}
        />

        {/* 4. Outstanding Payables */}
        <StatCard
          title="Outstanding Payables"
          value={formatCurrency(DEMO_SUMMARY.outstandingPayables)}
          subtitle={`${DEMO_SUMMARY.overduePayablesCount} past vendor due`}
          icon={<ArrowUpRight className="w-5 h-5 text-rose-600" />}
          variant="danger"
          trend={{ value: "Obligations", isPositive: false }}
        />

        {/* 5. Upcoming Expenses (30d) */}
        <StatCard
          title="Upcoming Outflows (30d)"
          value={formatCurrency(DEMO_SUMMARY.upcomingExpenses30d)}
          subtitle="Committed ops & payroll"
          icon={<Clock className="w-5 h-5 text-slate-700" />}
          variant="neutral"
        />

        {/* 6. Projected Cash (30d) */}
        <StatCard
          title="Projected Cash (Day 30)"
          value={formatCurrency(DEMO_SUMMARY.projectedCash30d)}
          subtitle={`Target: ${formatCurrency(DEMO_SUMMARY.minimumReserve)}`}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          variant="primary"
          trend={{ value: "Above Min", isPositive: true }}
        />
      </div>

      {/* Main Grid: Forecast Chart & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash-Flow Trajectory Chart (2 cols) */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Cash-Flow Forecast Trajectory</CardTitle>
                <Badge variant="primary" size="sm">
                  Closing = Opening + Inflows - Outflows
                </Badge>
              </div>
              <CardDescription>
                Visualizing projected cash balance versus minimum safety reserve (₹2,50,000)
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setForecastHorizon(30)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  forecastHorizon === 30
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setForecastHorizon(60)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  forecastHorizon === 60
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                60 Days
              </button>
              <button
                onClick={() => setForecastHorizon(90)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  forecastHorizon === 90
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                90 Days
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={displayedForecast}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => formatDate(val).slice(0, 6)}
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
                    formatter={(val: number) => [formatCurrency(val), "Projected Cash"]}
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
                      value: "Min Reserve: ₹2.5L",
                      fill: "#e11d48",
                      fontSize: 10,
                      position: "insideBottomRight",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="closingCash"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#cashGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Forecast Alert:</strong> Balance dips to ₹2,00,000 on Day 22 (breaching the ₹2,50,000 reserve limit).
                </span>
              </div>
              <Link
                href="/decision-centre"
                className="font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 shrink-0 ml-2"
              >
                Resolve Risk <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Financial Alerts & Triggers (1 col) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>Smart Alerts</span>
                <Badge variant="danger" size="sm">
                  {DEMO_ALERTS.length} Active
                </Badge>
              </CardTitle>
              <Link href="/alerts" className="text-xs text-blue-600 hover:underline font-semibold">
                View All
              </Link>
            </div>
            <CardDescription>
              Predictive triggers derived from cash forecast & invoices
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            {DEMO_ALERTS.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      alert.severity === "critical"
                        ? "danger"
                        : alert.severity === "warning"
                        ? "warning"
                        : "info"
                    }
                    size="sm"
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] text-slate-600">{formatDate(alert.date)}</span>
                </div>
                <h5 className="text-xs font-bold text-slate-800">{alert.title}</h5>
                <p className="text-[11px] text-slate-600 line-clamp-2">{alert.message}</p>
                {alert.actionLink && (
                  <Link
                    href={alert.actionLink}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 pt-0.5"
                  >
                    Take Action <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}

            <Link href="/alerts" className="block pt-1">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Inspect All {DEMO_ALERTS.length} Alerts
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Transactions & Priority Receivables / Disputes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cleared Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Actual Transactions</CardTitle>
                <CardDescription>
                  Cleared bank ledger entries (Actuals only)
                </CardDescription>
              </div>
              <Link href="/records" className="text-xs text-blue-600 hover:underline font-semibold">
                All Records
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-slate-100">
              {DEMO_RECORDS.slice(0, 4).map((rec) => (
                <div key={rec.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        rec.type === "income"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {rec.type === "income" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{rec.description}</p>
                      <p className="text-[11px] text-slate-600">
                        {rec.category} • {formatDate(rec.date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold ${
                        rec.type === "income" ? "text-emerald-700" : "text-slate-800"
                      }`}
                    >
                      {rec.type === "income" ? "+ " : "- "}
                      {formatCurrency(rec.amount)}
                    </span>
                    <p className="text-[10px] text-slate-600 font-mono">{rec.reference}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Action Items: Overdue Receivables & FairResolve */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Disputed & Overdue Receivables</CardTitle>
                <CardDescription>
                  Invoices requiring collection intervention or dispute handling
                </CardDescription>
              </div>
              <Link href="/receivables" className="text-xs text-blue-600 hover:underline font-semibold">
                Manage Invoices
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {DEMO_RECEIVABLES.filter((ar) => ar.status === "overdue").map((ar) => (
              <div
                key={ar.id}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{ar.customerName}</span>
                    <Badge variant="danger" size="sm">
                      {ar.daysOverdue}d Overdue
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Inv: {ar.invoiceNumber} • Due: {formatDate(ar.dueDate)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600">
                    {formatCurrency(ar.balanceDue)}
                  </span>
                  <div className="mt-1">
                    {ar.notes?.includes("FairResolve") ? (
                      <Link href="/fairresolve">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-indigo-700 border-indigo-200 bg-indigo-50">
                          <Scale className="w-3 h-3 mr-1" />
                          FairResolve
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/receivables">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">
                          Follow Up
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="text-xs text-blue-900">
                  Unresolved commercial disputes? Use <strong>FairResolve</strong> for structured settlement offers.
                </span>
              </div>
              <Link href="/fairresolve">
                <Button size="sm" variant="primary" className="h-7 text-xs px-2.5">
                  Open
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
