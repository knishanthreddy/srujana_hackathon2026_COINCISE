"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  PlusCircle,
  FlaskConical,
  Scale,
  Compass,
  BarChart3,
  Calendar,
  AlertOctagon,
  Info,
  DollarSign,
  ArrowRight,
  Layers,
  Sparkles,
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
import {
  getFinancialRecords,
  subscribeToFinancialRecords,
  calculateFinancialTotals,
} from "@/lib/data-service";
import { FinancialRecord } from "@/lib/types";

type Horizon = 7 | 30 | 60 | 90;

export default function DashboardPage() {
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [records, setRecords] = useState<FinancialRecord[]>(DEMO_RECORDS);

  // Subscribe to live records from shared data service
  useEffect(() => {
    setRecords(getFinancialRecords());
    const unsubscribe = subscribeToFinancialRecords((updated) => {
      setRecords(updated);
    });
    return () => unsubscribe();
  }, []);

  // Compute live totals strictly segregating cleared vs expected
  const recordTotals = useMemo(() => calculateFinancialTotals(records), [records]);
  const baselineTotals = useMemo(() => calculateFinancialTotals(DEMO_RECORDS), []);

  // Compute dynamic live available cash: base cash + additional net cleared cash from user changes
  const netDelta = recordTotals.netClearedCash - baselineTotals.netClearedCash;
  const currentAvailableCash = Math.max(0, DEMO_SUMMARY.availableCash + netDelta);

  // Filter forecast points according to selected horizon
  const displayedForecast = DEMO_FORECAST_POINTS.filter(
    (pt) => pt.dayOffset <= horizon
  );

  // Horizon-specific metrics
  const horizonInflows = displayedForecast.reduce((sum, pt) => sum + pt.projectedInflow, 0);
  const horizonOutflows = displayedForecast.reduce((sum, pt) => sum + pt.projectedOutflow, 0);
  const horizonClosingCash =
    displayedForecast[displayedForecast.length - 1]?.closingCash ?? DEMO_SUMMARY.availableCash;
  const lowestCashInHorizon = Math.min(
    ...displayedForecast.map((pt) => pt.closingCash)
  );
  const isReserveBreachedInHorizon = lowestCashInHorizon < DEMO_SUMMARY.minimumReserve;

  // Chart data for Inflows vs Outflows (only days with flows)
  const flowsChartData = displayedForecast
    .filter((pt) => pt.dayOffset > 0)
    .map((pt) => ({
      date: pt.date,
      dayLabel: `Day +${pt.dayOffset}`,
      Inflows: pt.projectedInflow,
      Outflows: pt.projectedOutflow,
      netFlow: pt.netCashFlow,
    }));

  return (
    <div className="space-y-6">
      {/* 1. Executive Briefing Banner & Fictional Demo Mode Tag */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30 tracking-wider uppercase">
              EXECUTIVE BRIEFING
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 tracking-wider">
              DEMO MODE • FICTIONAL SAMPLE DATA
            </span>
            <span className="text-xs text-slate-400">
              Company: <strong className="text-white">{DEMO_SUMMARY.businessName}</strong>
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            Business Liquidity & Forecast Center
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Realized cash position is stable for the next 14 days. Looking across the 30-day window, a projected minimum reserve breach on <strong>15 Nov (Day 22)</strong> requires proactive receivables follow-up or scheduled vendor payment pacing.
          </p>
        </div>

        {/* Quick Horizon Controller on Banner */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Forecast Horizon Window:
          </span>
          <div className="flex items-center gap-1 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
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
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Primary Financial Stat Cards (Responsive to Horizon) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Available Real Cash */}
        <StatCard
          title="Current Cash"
          value={formatCurrency(currentAvailableCash)}
          subtitle="Real cleared bank funds"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
          variant="success"
          trend={{ value: "Cleared", isPositive: true }}
        />

        {/* Expected Receipts */}
        <StatCard
          title={`Expected Receipts (${horizon}d)`}
          value={formatCurrency(horizonInflows)}
          subtitle="Customer dues scheduled"
          icon={<ArrowDownLeft className="w-5 h-5 text-blue-600" />}
          variant="primary"
          trend={{ value: "Inflows", isPositive: true }}
        />

        {/* Upcoming Expenses */}
        <StatCard
          title={`Upcoming Expenses (${horizon}d)`}
          value={formatCurrency(horizonOutflows)}
          subtitle="Committed disbursements"
          icon={<Clock className="w-5 h-5 text-slate-700" />}
          variant="neutral"
          trend={{ value: "Outflows", isPositive: false }}
        />

        {/* Outstanding Receivables */}
        <StatCard
          title="Outstanding Receivables"
          value={formatCurrency(DEMO_SUMMARY.outstandingReceivables)}
          subtitle={`${DEMO_SUMMARY.overdueReceivablesCount} invoices overdue`}
          icon={<ReceiptText className="w-5 h-5 text-amber-600" />}
          variant="warning"
          trend={{ value: "Action Required", isPositive: false }}
        />

        {/* Outstanding Payables */}
        <StatCard
          title="Outstanding Payables"
          value={formatCurrency(DEMO_SUMMARY.outstandingPayables)}
          subtitle={`${DEMO_SUMMARY.overduePayablesCount} past vendor due`}
          icon={<ArrowUpRight className="w-5 h-5 text-rose-600" />}
          variant="danger"
          trend={{ value: "Liabilities", isPositive: false }}
        />

        {/* Projected Closing Cash at end of Horizon */}
        <StatCard
          title={`Projected Cash (Day ${horizon})`}
          value={formatCurrency(horizonClosingCash)}
          subtitle={`Floor: ${formatCurrency(DEMO_SUMMARY.minimumReserve)}`}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          variant={isReserveBreachedInHorizon ? "warning" : "primary"}
          trend={{
            value: isReserveBreachedInHorizon ? "Dip Detected" : "Above Floor",
            isPositive: !isReserveBreachedInHorizon,
          }}
        />
      </div>

      {/* 3. Dual Recharts Financial Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cash-Flow Trajectory (AreaChart) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Cash-Flow Forecast Trajectory</CardTitle>
                <Badge variant={isReserveBreachedInHorizon ? "warning" : "success"} size="sm">
                  {isReserveBreachedInHorizon ? "⚠️ Reserve Dip" : "✓ Healthy"}
                </Badge>
              </div>
              <CardDescription>
                Projected closing balance over {horizon} days versus ₹2.5L minimum reserve floor
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {([7, 30, 60, 90] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setHorizon(days)}
                  className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                    horizon === days
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={displayedForecast}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dashboardCashGradient" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#dashboardCashGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs text-slate-700">
              <span className="text-slate-600">
                Formula: <strong className="text-slate-900">Closing = Opening + Inflows - Outflows</strong>
              </span>
              <span className="text-slate-600">
                Lowest Trough:{" "}
                <strong
                  className={
                    lowestCashInHorizon < DEMO_SUMMARY.minimumReserve
                      ? "text-rose-600 font-bold"
                      : "text-emerald-700 font-bold"
                  }
                >
                  {formatCurrency(lowestCashInHorizon)}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Inflows versus Outflows (BarChart) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Inflows vs. Outflows Schedule</CardTitle>
                <Badge variant="primary" size="sm">
                  {horizon} Days
                </Badge>
              </div>
              <CardDescription>
                Comparison of expected cash receipts vs. scheduled disbursements
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span className="text-slate-600 font-medium">Inflows</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                <span className="text-slate-600 font-medium">Outflows</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={flowsChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dayLabel"
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
                      name === "Inflows" ? "Projected Receipts" : "Scheduled Expenses",
                    ]}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="Inflows" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflows" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs text-slate-700">
              <span className="text-slate-600">
                Period Net Inflow:{" "}
                <strong
                  className={
                    horizonInflows - horizonOutflows >= 0
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }
                >
                  {horizonInflows - horizonOutflows >= 0 ? "+" : ""}
                  {formatCurrency(horizonInflows - horizonOutflows)}
                </strong>
              </span>
              <Link
                href="/reports"
                className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                Detailed Breakdown <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Middle Section: Upcoming Expenses & Smart Financial Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Committed Expenses */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <span>Upcoming Scheduled Expenses</span>
                </CardTitle>
                <CardDescription>
                  Impending supplier bills, lease charges & operational liabilities
                </CardDescription>
              </div>
              <Link href="/payables" className="text-xs text-blue-600 hover:underline font-semibold">
                Manage Payables
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            <div className="divide-y divide-slate-100">
              {DEMO_PAYABLES.map((bill) => (
                <div key={bill.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">{bill.vendorName}</p>
                      <Badge
                        variant={
                          bill.status === "overdue"
                            ? "danger"
                            : bill.status === "partially_paid"
                            ? "warning"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {bill.status === "overdue"
                          ? "Overdue"
                          : `Due ${formatDate(bill.dueDate).slice(0, 6)}`}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {bill.category} • Bill #{bill.invoiceNumber}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-rose-600 block">
                      {formatCurrency(bill.balanceDue)}
                    </span>
                    <span className="text-[10px] text-slate-400">Balance Due</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href="/payables" className="block">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View All Scheduled Outflows ({DEMO_PAYABLES.length} Items)
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Smart Financial Alerts */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Smart Financial Alerts</span>
                  <Badge variant="danger" size="sm">
                    {DEMO_ALERTS.length} Active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Automated risk triggers from cash-flow models & invoice aging
                </CardDescription>
              </div>
              <Link href="/alerts" className="text-xs text-blue-600 hover:underline font-semibold">
                Alerts Center
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            {DEMO_ALERTS.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5"
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
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDate(alert.date)}
                  </span>
                </div>

                <h5 className="text-xs font-bold text-slate-800">{alert.title}</h5>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {alert.message}
                </p>

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

            <div className="pt-2">
              <Link href="/alerts" className="block">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Inspect All {DEMO_ALERTS.length} Triggered Alerts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Lower Section: Recent Cleared Transactions & Navigation Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cleared Bank Transactions */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-slate-700" />
                  <span>Recent Actual Transactions</span>
                </CardTitle>
                <CardDescription>
                  Cleared bank ledger entries • Strict actuals isolation
                </CardDescription>
              </div>
              <Link href="/records" className="text-xs text-blue-600 hover:underline font-semibold">
                Ledger
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            <div className="divide-y divide-slate-100">
              {records.slice(0, 5).map((rec) => (
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
                      <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {rec.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500">
                          {rec.category} • {formatDate(rec.date)}
                        </span>
                        {rec.paymentStatus === "expected" && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-medium border border-blue-200">
                            Expected
                          </span>
                        )}
                        {rec.paymentStatus === "partially_paid" && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-medium border border-amber-200">
                            Partially Cleared
                          </span>
                        )}
                      </div>
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
                    <p className="text-[10px] text-slate-400 font-mono">
                      {rec.paidAmount > 0
                        ? `Cleared: ${formatCurrency(rec.paidAmount)}`
                        : "Uncollected"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href="/records" className="block">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Full Cash Ledger ({records.length} Transactions)
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation & Operational Shortcuts Hub */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Decision & Navigation Shortcuts</span>
              </CardTitle>
              <CardDescription>
                Direct access to core financial management workstations
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              {/* Shortcut 1: Forecast */}
              <Link
                href="/forecast"
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Forecast Runway</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    90-day predictive balance model
                  </p>
                </div>
              </Link>

              {/* Shortcut 2: Scenario Lab */}
              <Link
                href="/scenarios"
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-purple-400 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Scenario Lab</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Stress-test shocks & delays
                  </p>
                </div>
              </Link>

              {/* Shortcut 3: Decision Centre */}
              <Link
                href="/decision-centre"
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-emerald-400 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Compass className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Decision Centre</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Compare liquidity fixes
                  </p>
                </div>
              </Link>

              {/* Shortcut 4: FairResolve */}
              <Link
                href="/fairresolve"
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-400 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Scale className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">FairResolve</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dispute mediation & ODR
                  </p>
                </div>
              </Link>

              {/* Shortcut 5: Receivables */}
              <Link
                href="/receivables"
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-amber-400 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Receivables Aging</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Track customer invoices
                  </p>
                </div>
              </Link>

              {/* Shortcut 6: Reports & Analytics */}
              <Link
                href="/reports"
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-cyan-400 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Reports & CSV Export</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Download datasets & audits
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
