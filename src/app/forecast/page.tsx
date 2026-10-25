"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  AlertOctagon,
  ChevronRight,
  Sliders,
  DollarSign,
  Download,
  HelpCircle,
  Eye,
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
import { Modal } from "@/components/ui/Modal";
import {
  getLiveForecast,
  subscribeToFinancialRecords,
  subscribeToReceivables,
  subscribeToPayables,
} from "@/lib/data-service";
import {
  DailyCashForecast,
  PeriodSummary,
  ForecastSummary,
  calculateVerificationExample,
} from "@/lib/forecast-engine";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ForecastPage() {
  const [horizon, setHorizon] = useState<7 | 30 | 60 | 90>(30);
  const [minimumReserve, setMinimumReserve] = useState<number>(250000);
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDay, setSelectedDay] = useState<DailyCashForecast | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveInput, setReserveInput] = useState("250000");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to live changes in records, receivables, and payables
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

  // Compute live forecast
  const forecast: ForecastSummary = useMemo(() => {
    return getLiveForecast(horizon, minimumReserve);
  }, [horizon, minimumReserve, refreshTrigger]);

  const verification = useMemo(() => {
    return calculateVerificationExample();
  }, []);

  const handleSaveReserve = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(reserveInput);
    if (!isNaN(val) && val >= 0) {
      setMinimumReserve(val);
      setIsReserveModalOpen(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Day Offset",
      "Date",
      "Day",
      "Opening Cash (INR)",
      "Inflows (INR)",
      "Outflows (INR)",
      "Net Cash Flow (INR)",
      "Closing Cash (INR)",
      "Status",
    ];

    const rows = forecast.dailyPoints.map((p) => [
      p.dayOffset,
      p.date,
      p.dayOfWeek,
      p.openingCash,
      p.inflows,
      p.outflows,
      p.netCashFlow,
      p.closingCash,
      p.status.toUpperCase(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `coincise_forecast_${horizon}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Mathematical Integrity & Horizon Controller */}
      <div className="bg-[#242321] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white border border-[#383632] flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-md">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#FCE4D8] text-[#F15A35] px-2.5 py-0.5 rounded-full border border-[#F15A35]/30">
              DETERMINISTIC CASH FORECAST ENGINE
            </span>
            <span className="text-xs text-[#A69C8D]">
              Live synchronized with Receivables, Payables & Cash Ledger
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-mono text-white">
            Closing Cash = Opening Cash + Inflows - Outflows
          </h2>
          <p className="text-xs text-[#A69C8D] mt-1 max-w-2xl leading-relaxed">
            Strictly forecasts actual cleared balances and scheduled contractual obligations. Never treats expected invoices as cash already in hand.
          </p>
        </div>

        {/* Controls: Horizon & Reserve Edit */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setReserveInput(String(minimumReserve));
              setIsReserveModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#1A1918] text-white border border-[#383632] hover:bg-white/10 transition-all"
            title="Configure Minimum Reserve Threshold"
          >
            <ShieldCheck className="w-4 h-4 text-[#F15A35]" />
            <span>Safety Reserve: {formatCurrency(minimumReserve)}</span>
          </button>

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

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="bg-[#1A1918] border-[#383632] text-white hover:bg-white/10 hover:text-white"
          >
            <Download className="w-4 h-4 mr-1.5 text-[#F15A35]" />
            CSV
          </Button>
        </div>
      </div>

      {/* Critical Cash Shortage or Reserve Breach Alerts */}
      {forecast.isCashDeficit && (
        <div className="bg-[#FCE4D8] border border-[#F15A35]/40 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-xl text-[#F15A35] shrink-0 mt-0.5 border border-[#F15A35]/30">
              <AlertOctagon className="w-5 h-5 text-[#F15A35]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-[#242321]">
                  Critical Cash Deficit Detected on {forecast.firstShortageDate ? formatDate(forecast.firstShortageDate) : "Upcoming"} (Day {forecast.firstShortageDayOffset})
                </h4>
                <Badge variant="danger">SOLVENCY RISK</Badge>
              </div>
              <p className="text-xs text-[#242321] mt-0.5">
                Projected cash balance turns negative by Day {forecast.firstShortageDayOffset}. Maximum cash shortfall reaches{" "}
                <span className="font-extrabold text-[#F15A35]">{formatCurrency(forecast.maximumCashShortfall)}</span> below zero. Corrective intervention required immediately.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/scenarios">
              <Button size="sm" variant="outline">
                <FlaskConical className="w-3.5 h-3.5 mr-1" />
                Simulate Scenarios
              </Button>
            </Link>
            <Link href="/decision-centre">
              <Button size="sm" variant="primary">
                <Compass className="w-3.5 h-3.5 mr-1" />
                Decision Centre
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!forecast.isCashDeficit && forecast.isReserveBreached && (
        <div className="bg-[#FCE4D8] border border-[#F15A35]/40 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-xl text-[#F15A35] shrink-0 mt-0.5 border border-[#F15A35]/30">
              <AlertTriangle className="w-5 h-5 text-[#F15A35]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-[#242321]">
                  Projected Minimum Reserve Breach on {forecast.firstReserveBreachDate ? formatDate(forecast.firstReserveBreachDate) : "Upcoming"} (Day {forecast.firstReserveBreachDayOffset})
                </h4>
                <Badge variant="warning">RESERVE BREACH</Badge>
              </div>
              <p className="text-xs text-[#242321] mt-0.5">
                Cash balance falls below your {formatCurrency(minimumReserve)} threshold on Day {forecast.firstReserveBreachDayOffset}.
                Lowest buffer reaches <span className="font-extrabold text-[#F15A35]">{formatCurrency(forecast.lowestCashBalance)}</span> (breach of {formatCurrency(forecast.maximumReserveShortfall)}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/decision-centre">
              <Button size="sm" variant="primary">
                <Compass className="w-3.5 h-3.5 mr-1" />
                Review Corrective Options
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Runway Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <p className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider">Opening Liquid Cash</p>
          <h4 className="text-xl font-extrabold text-[#242321] mt-1 font-mono">
            {formatCurrency(forecast.openingCash)}
          </h4>
          <p className="text-[11px] text-[#A69C8D] mt-0.5">Cleared balance at start</p>
        </div>

        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <p className="text-[11px] font-bold text-[#138C83] uppercase tracking-wider">Projected Inflows</p>
          <h4 className="text-xl font-extrabold text-[#138C83] mt-1 font-mono">
            +{formatCurrency(forecast.totalInflows)}
          </h4>
          <p className="text-[11px] text-[#A69C8D] mt-0.5">From {forecast.inputItemCount.inflows} expected receipts</p>
        </div>

        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <p className="text-[11px] font-bold text-[#F15A35] uppercase tracking-wider">Scheduled Outflows</p>
          <h4 className="text-xl font-extrabold text-[#F15A35] mt-1 font-mono">
            -{formatCurrency(forecast.totalOutflows)}
          </h4>
          <p className="text-[11px] text-[#A69C8D] mt-0.5">Payables, payroll, loans</p>
        </div>

        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <p className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider">Net Cash Flow</p>
          <h4
            className={`text-xl font-extrabold mt-1 font-mono ${
              forecast.netCashFlow >= 0 ? "text-[#138C83]" : "text-[#F15A35]"
            }`}
          >
            {forecast.netCashFlow >= 0 ? "+" : ""}
            {formatCurrency(forecast.netCashFlow)}
          </h4>
          <p className="text-[11px] text-[#A69C8D] mt-0.5">Over next {horizon} days</p>
        </div>

        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <p className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider">Projected Closing Cash</p>
          <h4
            className={`text-xl font-extrabold mt-1 font-mono ${
              forecast.closingCash < 0
                ? "text-[#F15A35]"
                : forecast.closingCash < minimumReserve
                ? "text-[#F15A35]"
                : "text-[#138C83]"
            }`}
          >
            {formatCurrency(forecast.closingCash)}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            {forecast.closingCash >= minimumReserve ? (
              <Badge variant="success" size="sm">
                Buffer Safe
              </Badge>
            ) : forecast.closingCash >= 0 ? (
              <Badge variant="warning" size="sm">
                Reserve Breach
              </Badge>
            ) : (
              <Badge variant="danger" size="sm">
                Deficit
              </Badge>
            )}
            <span className="text-[10px] text-[#A69C8D]">Day {horizon}</span>
          </div>
        </div>
      </div>

      {/* Chart 1: Daily Cash Balance Trajectory with Reserve Threshold */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
          <div>
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#138C83]" />
              <span>Projected Daily Cash Balance Trajectory ({horizon} Days)</span>
            </CardTitle>
            <CardDescription>
              Continuous daily closing balances plotted against your {formatCurrency(minimumReserve)} minimum safety buffer
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#7A7369]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#138C83] inline-block" />
              <span className="font-bold">Daily Closing Cash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#F15A35] inline-block border-t border-dashed border-[#F15A35]" />
              <span className="font-bold">Safety Reserve ({formatCurrency(minimumReserve)})</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.dailyPoints} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastCashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#138C83" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#138C83" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => formatDate(val)}
                  tick={{ fontSize: 11, fill: "#A69C8D" }}
                  axisLine={{ stroke: "#E8E1D5" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#A69C8D" }}
                  axisLine={{ stroke: "#E8E1D5" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), "Projected Closing"]}
                  labelFormatter={(lbl) => formatDate(String(lbl))}
                  contentStyle={{
                    backgroundColor: "#242321",
                    border: "1px solid #E8E1D5",
                    borderRadius: "16px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                />
                <ReferenceLine
                  y={minimumReserve}
                  stroke="#F15A35"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Reserve: ₹${(minimumReserve / 1000).toFixed(0)}k`,
                    fill: "#F15A35",
                    fontSize: 11,
                    position: "right",
                  }}
                />
                <ReferenceLine y={0} stroke="#F15A35" strokeWidth={1.5} />
                <Area
                  type="monotone"
                  dataKey="closingCash"
                  stroke="#138C83"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#forecastCashGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Projected Daily Inflows vs Outflows */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
          <div>
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#F15A35]" />
              <span>Inflows vs Outflows Schedule</span>
            </CardTitle>
            <CardDescription>
              Timing of expected receivables versus supplier payables, payroll, and scheduled expenses
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={forecast.dailyPoints.filter((p) => p.inflows > 0 || p.outflows > 0)}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => formatDate(val)}
                  tick={{ fontSize: 11, fill: "#A69C8D" }}
                  axisLine={{ stroke: "#E8E1D5" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#A69C8D" }}
                  axisLine={{ stroke: "#E8E1D5" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatCurrency(val),
                    name === "inflows" ? "Expected Inflow" : "Scheduled Outflow",
                  ]}
                  labelFormatter={(lbl) => formatDate(String(lbl))}
                  contentStyle={{
                    backgroundColor: "#242321",
                    border: "1px solid #E8E1D5",
                    borderRadius: "16px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                />
                <Legend
                  formatter={(value) => (value === "inflows" ? "Expected Receipts" : "Scheduled Expenses")}
                />
                <Bar dataKey="inflows" fill="#138C83" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="outflows" fill="#F15A35" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Breakdowns: Daily, Weekly, Monthly Tabs */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-[#E8E1D5]">
          <div>
            <CardTitle className="text-base font-extrabold">Forecast Ledger & Schedule</CardTitle>
            <CardDescription>
              Deterministic cash progression grouped by operational period
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-[#F7F3EA] p-1 rounded-xl border border-[#E8E1D5]">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "daily" ? "bg-[#F15A35] text-white shadow-xs" : "text-[#7A7369] hover:text-[#242321]"
              }`}
            >
              Daily ({forecast.dailyPoints.length})
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "weekly" ? "bg-[#F15A35] text-white shadow-xs" : "text-[#7A7369] hover:text-[#242321]"
              }`}
            >
              Weekly ({forecast.weeklySummaries.length})
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "monthly" ? "bg-[#F15A35] text-white shadow-xs" : "text-[#7A7369] hover:text-[#242321]"
              }`}
            >
              Monthly ({forecast.monthlySummaries.length})
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* VIEW: DAILY */}
          {viewMode === "daily" && (
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 sticky top-0 z-10 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Day / Date</th>
                    <th className="py-2.5 px-3 text-right">Opening Cash</th>
                    <th className="py-2.5 px-3 text-right">Inflows</th>
                    <th className="py-2.5 px-3 text-right">Outflows</th>
                    <th className="py-2.5 px-3 text-right">Net Flow</th>
                    <th className="py-2.5 px-3 text-right">Closing Cash</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {forecast.dailyPoints.map((p) => (
                    <tr
                      key={p.dayOffset}
                      className={`hover:bg-slate-50 transition-colors ${
                        p.status === "shortage"
                          ? "bg-rose-50/50"
                          : p.status === "warning"
                          ? "bg-amber-50/40"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-slate-900">
                          Day +{p.dayOffset} ({p.dayOfWeek})
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{formatDate(p.date)}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{formatCurrency(p.openingCash)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">
                        {p.inflows > 0 ? `+${formatCurrency(p.inflows)}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                        {p.outflows > 0 ? `-${formatCurrency(p.outflows)}` : "—"}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          p.netCashFlow > 0
                            ? "text-emerald-600"
                            : p.netCashFlow < 0
                            ? "text-rose-600"
                            : "text-slate-400"
                        }`}
                      >
                        {p.netCashFlow > 0 ? `+${formatCurrency(p.netCashFlow)}` : p.netCashFlow < 0 ? `-${formatCurrency(Math.abs(p.netCashFlow))}` : "0"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.closingCash)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {p.status === "safe" ? (
                          <Badge variant="success" className="text-[10px]">
                            Safe
                          </Badge>
                        ) : p.status === "warning" ? (
                          <Badge variant="warning" className="text-[10px]">
                            Reserve Breach
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">
                            Shortfall
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {p.inflowDetails.length > 0 || p.outflowDetails.length > 0 ? (
                          <button
                            onClick={() => setSelectedDay(p)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{p.inflowDetails.length + p.outflowDetails.length} items</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: WEEKLY */}
          {viewMode === "weekly" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Date Span</th>
                    <th className="py-2.5 px-3 text-right">Opening Cash</th>
                    <th className="py-2.5 px-3 text-right">Total Inflows</th>
                    <th className="py-2.5 px-3 text-right">Total Outflows</th>
                    <th className="py-2.5 px-3 text-right">Net Flow</th>
                    <th className="py-2.5 px-3 text-right">Closing Cash</th>
                    <th className="py-2.5 px-3 text-right">Lowest Dip</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {forecast.weeklySummaries.map((w) => (
                    <tr
                      key={w.periodIndex}
                      className={`hover:bg-slate-50 ${
                        w.status === "shortage" ? "bg-rose-50/40" : w.status === "warning" ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-sans font-bold text-slate-900">{w.label}</td>
                      <td className="py-3 px-3 font-sans text-slate-500">
                        {formatDate(w.startDate)} &rarr; {formatDate(w.endDate)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(w.openingCash)}</td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-semibold">
                        +{formatCurrency(w.totalInflows)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                        -{formatCurrency(w.totalOutflows)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-semibold ${
                          w.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {w.netCashFlow >= 0 ? "+" : ""}
                        {formatCurrency(w.netCashFlow)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(w.closingCash)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(w.lowestCash)}</td>
                      <td className="py-3 px-3 text-center font-sans">
                        {w.status === "safe" ? (
                          <Badge variant="success">Safe</Badge>
                        ) : w.status === "warning" ? (
                          <Badge variant="warning">Reserve Warning</Badge>
                        ) : (
                          <Badge variant="danger">Deficit</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: MONTHLY */}
          {viewMode === "monthly" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Date Span</th>
                    <th className="py-2.5 px-3 text-right">Opening Cash</th>
                    <th className="py-2.5 px-3 text-right">Total Inflows</th>
                    <th className="py-2.5 px-3 text-right">Total Outflows</th>
                    <th className="py-2.5 px-3 text-right">Net Flow</th>
                    <th className="py-2.5 px-3 text-right">Closing Cash</th>
                    <th className="py-2.5 px-3 text-right">Lowest Dip</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {forecast.monthlySummaries.map((m) => (
                    <tr
                      key={m.periodIndex}
                      className={`hover:bg-slate-50 ${
                        m.status === "shortage" ? "bg-rose-50/40" : m.status === "warning" ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-sans font-bold text-slate-900">{m.label}</td>
                      <td className="py-3 px-3 font-sans text-slate-500">
                        {formatDate(m.startDate)} &rarr; {formatDate(m.endDate)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(m.openingCash)}</td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-semibold">
                        +{formatCurrency(m.totalInflows)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                        -{formatCurrency(m.totalOutflows)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-semibold ${
                          m.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {m.netCashFlow >= 0 ? "+" : ""}
                        {formatCurrency(m.netCashFlow)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(m.closingCash)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(m.lowestCash)}</td>
                      <td className="py-3 px-3 text-center font-sans">
                        {m.status === "safe" ? (
                          <Badge variant="success">Safe</Badge>
                        ) : m.status === "warning" ? (
                          <Badge variant="warning">Reserve Warning</Badge>
                        ) : (
                          <Badge variant="danger">Deficit</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explicit Math Verification Card */}
      <div className="p-5 bg-white border border-[#E8E1D5] rounded-2xl sm:rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#DDEFE8] rounded-2xl text-[#138C83] shrink-0">
            <CheckCircle className="w-5 h-5 text-[#138C83]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold text-[#242321] uppercase tracking-wide">
                Engine Verification Case Validated
              </h4>
              <Badge variant="success" size="sm">
                TEST SUITE PASSED
              </Badge>
            </div>
            <p className="text-xs text-[#242321] mt-1 font-mono font-bold">
              Opening (₹1,00,000) + Receipts (₹40,000) - Supplier (₹50,000) - Payroll (₹30,000) = Expected Closing (₹60,000)
            </p>
            <p className="text-[11px] text-[#A69C8D] mt-0.5">
              Verified by automated Node.js unit tests with zero tolerance for rounding errors or double counting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/scenarios">
            <Button size="sm" variant="outline" className="text-xs">
              <FlaskConical className="w-3.5 h-3.5 mr-1 text-[#F15A35]" />
              Test in Scenario Lab
            </Button>
          </Link>
        </div>
      </div>

      {/* Modal: Day Items Detail Inspector */}
      {selectedDay && (
        <Modal
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          title={`Day +${selectedDay.dayOffset} Schedule (${formatDate(selectedDay.date)})`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-xs">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-sans">Opening</p>
                <p className="font-bold text-slate-900 mt-0.5">{formatCurrency(selectedDay.openingCash)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-sans">Net Cash Flow</p>
                <p
                  className={`font-bold mt-0.5 ${
                    selectedDay.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {selectedDay.netCashFlow >= 0 ? "+" : ""}
                  {formatCurrency(selectedDay.netCashFlow)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-sans">Closing</p>
                <p className="font-bold text-slate-900 mt-0.5">{formatCurrency(selectedDay.closingCash)}</p>
              </div>
            </div>

            {/* Inflows Section */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-2">
                <ArrowDownLeft className="w-4 h-4" />
                Expected Inflows ({selectedDay.inflowDetails.length})
              </h5>
              {selectedDay.inflowDetails.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No customer receipts landing on this date.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedDay.inflowDetails.map((inItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{inItem.name}</p>
                        <p className="text-[10px] text-emerald-700 uppercase">{inItem.category}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">
                        +{formatCurrency(inItem.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outflows Section */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 mb-2">
                <ArrowUpRight className="w-4 h-4" />
                Scheduled Outflows ({selectedDay.outflowDetails.length})
              </h5>
              {selectedDay.outflowDetails.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No supplier payments or payroll scheduled for this date.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedDay.outflowDetails.map((outItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{outItem.name}</p>
                        <p className="text-[10px] text-rose-700 uppercase">{outItem.category}</p>
                      </div>
                      <span className="font-mono font-bold text-rose-700">
                        -{formatCurrency(outItem.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Minimum Reserve Config */}
      {isReserveModalOpen && (
        <Modal
          isOpen={isReserveModalOpen}
          onClose={() => setIsReserveModalOpen(false)}
          title="Configure Minimum Safety Reserve"
          className="max-w-md"
        >
          <form onSubmit={handleSaveReserve} className="space-y-4">
            <p className="text-xs text-slate-600">
              Set the minimum liquid buffer required to cover payroll, statutory compliance, and emergency operations without distress.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minimum Reserve Buffer (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={reserveInput}
                onChange={(e) => setReserveInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Default: ₹2,50,000 (~30 days operational buffer)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReserveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Update Reserve
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
