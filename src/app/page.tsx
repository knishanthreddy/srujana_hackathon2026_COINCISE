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
  FileText,
  CreditCard,
  UploadCloud,
  Landmark,
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
import { FinancialCardCarousel, CarouselData } from "@/components/dashboard/FinancialCardCarousel";
import { CredroCard } from "@/components/dashboard/CredroCard";
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
  getReceivables,
  subscribeToReceivables,
  calculateReceivablesTotals,
  getPayables,
  subscribeToPayables,
  calculatePayablesTotals,
  getUnifiedDashboardMetrics,
  getLiveForecast,
} from "@/lib/data-service";
import { getOnboardingData, EVENT_ONBOARDING_UPDATED } from "@/lib/onboarding-service";
import { calculateCredroScore, recordCredroSnapshot } from "@/lib/credro-score";
import { FinancialRecord, Receivable, Payable } from "@/lib/types";

type Horizon = 7 | 30 | 60 | 90;

export default function DashboardPage() {
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [onboarding, setOnboarding] = useState(getOnboardingData());

  // Subscribe to live records, receivables, payables, and onboarding updates
  useEffect(() => {
    const syncAll = () => {
      setRecords(getFinancialRecords());
      setReceivables(getReceivables());
      setPayables(getPayables());
      setOnboarding(getOnboardingData());
    };

    syncAll();

    const unRecs = subscribeToFinancialRecords(syncAll);
    const unReceivables = subscribeToReceivables(syncAll);
    const unPayables = subscribeToPayables(syncAll);
    window.addEventListener(EVENT_ONBOARDING_UPDATED, syncAll);

    return () => {
      unRecs();
      unReceivables();
      unPayables();
      window.removeEventListener(EVENT_ONBOARDING_UPDATED, syncAll);
    };
  }, []);

  // Commercial identity from onboarding
  const businessName =
    onboarding.profile.tradeName || onboarding.profile.mcaLegalName || DEMO_SUMMARY.businessName;
  const entityType = onboarding.profile.entityType || "pvt_ltd";
  const minimumReserve = onboarding.openingFinances.minimumReserve || DEMO_SUMMARY.minimumReserve;

  // Real-time live totals
  const recTotals = useMemo(() => calculateReceivablesTotals(receivables), [receivables]);
  const payTotals = useMemo(() => calculatePayablesTotals(payables), [payables]);

  // Unified available cash calculation
  const dashboardMetrics = useMemo(() => {
    void records;
    void receivables;
    void payables;
    return getUnifiedDashboardMetrics();
  }, [records, receivables, payables]);
  const currentAvailableCash = dashboardMetrics.availableCash;

  // Live forecast trajectory from deterministic forecasting engine
  const liveForecast = useMemo(() => {
    void records;
    void receivables;
    void payables;
    return getLiveForecast(horizon, minimumReserve);
  }, [horizon, minimumReserve, records, receivables, payables]);

  const displayedForecast = liveForecast.dailyPoints;
  const horizonInflows = liveForecast.totalInflows;
  const horizonOutflows = liveForecast.totalOutflows;
  const horizonClosingCash = liveForecast.closingCash;
  const lowestCashInHorizon = liveForecast.lowestCashBalance;
  const isReserveBreachedInHorizon = liveForecast.isReserveBreached;
  const firstReserveBreachDate = liveForecast.firstReserveBreachDate;

  // Credro Business Trust Score (recalculated reactively)
  const credroResult = useMemo(() => {
    const res = calculateCredroScore(
      records,
      receivables,
      payables,
      currentAvailableCash,
      minimumReserve,
      onboarding
    );
    recordCredroSnapshot(res.score, res.trustLevel);
    return res;
  }, [records, receivables, payables, currentAvailableCash, minimumReserve, onboarding]);

  // Carousel Data Preparation
  const carouselData: CarouselData = useMemo(() => {
    // Generate 7-day cash history sparkline
    const cashSpark = displayedForecast.slice(0, 7).map((pt, i) => ({
      day: `D${i + 1}`,
      value: pt.closingCash,
    }));

    // Generate forecast sparkline
    const forecastSpark = displayedForecast.map((pt, i) => ({
      day: `D${i + 1}`,
      value: pt.closingCash,
    }));

    return {
      availableCash: currentAvailableCash,
      cashDeltaPercent: 12.4,
      cashSparkline: cashSpark.length > 0 ? cashSpark : [{ day: "D1", value: currentAvailableCash }],
      projectedClosingCash: horizonClosingCash,
      horizonDays: horizon,
      forecastSparkline: forecastSpark,
      outstandingReceivables: recTotals.totalBalanceDue,
      receivablesCount: receivables.length,
      overdueReceivables: recTotals.overdueBalance,
      outstandingPayables: payTotals.totalBalanceDue,
      upcomingPayables: payTotals.pendingBalance,
      overduePayables: payTotals.overdueBalance,
      credro: credroResult,
      activeAlertsCount: DEMO_ALERTS.length,
      topAlertMessage: DEMO_ALERTS[0]?.message || "Cash reserve floor maintained",
      topAlertSeverity: (DEMO_ALERTS[0]?.severity as "critical" | "warning" | "info") || "info",
      minimumReserve: minimumReserve,
    };
  }, [
    currentAvailableCash,
    displayedForecast,
    horizonClosingCash,
    horizon,
    recTotals,
    receivables,
    payTotals,
    credroResult,
    minimumReserve,
  ]);

  // Chart data for Inflows vs Outflows (only days with flows)
  const flowsChartData = displayedForecast
    .filter((pt) => pt.dayOffset > 0 && (pt.inflows > 0 || pt.outflows > 0))
    .map((pt) => ({
      date: pt.date,
      dayLabel: `Day +${pt.dayOffset}`,
      Inflows: pt.inflows,
      Outflows: pt.outflows,
      netFlow: pt.netCashFlow,
    }));

  return (
    <div className="space-y-6">
      {/* 1. Executive Briefing Banner */}
      <div className="bg-[#242321] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#383632]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FCE4D8] text-[#F15A35] tracking-wider uppercase border border-[#F15A35]/30">
              Executive Briefing
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DDEFE8] text-[#138C83] tracking-wider border border-[#138C83]/30">
              Verified Books
            </span>
            <span className="text-xs text-[#A69C8D]">
              Entity: <strong className="text-white">{businessName}</strong> ({entityType.toUpperCase()})
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Business Liquidity & Forecast Center
          </h1>
          <p className="text-xs text-[#A69C8D] max-w-2xl leading-relaxed">
            {isReserveBreachedInHorizon ? (
              <span className="text-[#FCE4D8]">
                ⚠️ Proactive Risk Warning: Based on your {formatCurrency(minimumReserve)} reserve floor, a projected liquidity dip is detected on <strong>{firstReserveBreachDate || "upcoming days"}</strong> (lowest balance: {formatCurrency(lowestCashInHorizon)}). Proactive receivables follow-up or payment scheduling is advised.
              </span>
            ) : (
              <span>
                Operating cash remains healthy across your {horizon}-day runway with closing projected cash of <strong className="text-white">{formatCurrency(horizonClosingCash)}</strong> maintaining safely above your {formatCurrency(minimumReserve)} reserve floor.
              </span>
            )}
          </p>
        </div>

        {/* Quick Horizon Controller on Banner */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <span className="text-[11px] font-bold text-[#A69C8D] uppercase tracking-wider">
            Forecast Horizon Window:
          </span>
          <div className="flex items-center gap-1 bg-[#1A1918] p-1.5 rounded-2xl border border-[#383632]">
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
      </div>

      {/* 2. Primary Financial Card Carousel (Swipeable 6 Cards matching Image 2) */}
      <section aria-label="Key Financial Performance Metrics">
        <FinancialCardCarousel data={carouselData} />
      </section>

      {/* 3. Compact Financial Overview (4 rounded cards matching Image 2 Section 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Customer Receivables */}
        <Link
          href="/receivables"
          className="group p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs hover:border-[#F15A35] hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#7A7369]">Customer Receivables</span>
            <div className="w-8 h-8 rounded-xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#242321] tracking-tight">
              {formatCurrency(recTotals.totalBalanceDue)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E1D5]/60 text-xs">
              <span className="text-[#A69C8D]">{receivables.length} Invoices</span>
              {recTotals.overdueCount > 0 ? (
                <span className="font-bold text-[#F15A35] bg-[#FCE4D8] px-2 py-0.5 rounded-full text-[10px]">
                  {recTotals.overdueCount} Overdue
                </span>
              ) : (
                <span className="font-bold text-[#138C83] bg-[#DDEFE8] px-2 py-0.5 rounded-full text-[10px]">
                  All Current
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Card 2: Supplier Payables */}
        <Link
          href="/payables"
          className="group p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs hover:border-[#F15A35] hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#7A7369]">Supplier Payables</span>
            <div className="w-8 h-8 rounded-xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#242321] tracking-tight">
              {formatCurrency(payTotals.totalBalanceDue)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E1D5]/60 text-xs">
              <span className="text-[#A69C8D]">{payables.length} Bills</span>
              {payTotals.overdueCount > 0 ? (
                <span className="font-bold text-[#F15A35] bg-[#FCE4D8] px-2 py-0.5 rounded-full text-[10px]">
                  {payTotals.overdueCount} Past Due
                </span>
              ) : (
                <span className="font-bold text-[#7A7369] bg-[#F7F3EA] px-2 py-0.5 rounded-full text-[10px]">
                  Upcoming
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Card 3: Projected Closing Cash */}
        <Link
          href="/forecast"
          className="group p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs hover:border-[#F15A35] hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#7A7369]">Projected Closing Cash</span>
            <div className="w-8 h-8 rounded-xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#242321] tracking-tight">
              {formatCurrency(horizonClosingCash)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E1D5]/60 text-xs">
              <span className="text-[#A69C8D]">Day +{horizon} Horizon</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                  isReserveBreachedInHorizon
                    ? "bg-[#FCE4D8] text-[#F15A35]"
                    : "bg-[#DDEFE8] text-[#138C83]"
                }`}
              >
                {isReserveBreachedInHorizon ? "Dip Warning" : "Above Floor"}
              </span>
            </div>
          </div>
        </Link>

        {/* Card 4: Credro™ Trust Score */}
        <Link
          href="/credro"
          className="group p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs hover:border-[#F15A35] hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#7A7369]">Credro™ Trust Score</span>
            <div className="w-8 h-8 rounded-xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#242321] tracking-tight flex items-baseline gap-1">
              <span>{credroResult.score}</span>
              <span className="text-sm font-bold text-[#A69C8D]">/ 100</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E1D5]/60 text-xs">
              <span className="text-[#A69C8D]">Financial Reliability</span>
              <span className="font-bold text-[#138C83] bg-[#DDEFE8] px-2 py-0.5 rounded-full text-[10px] capitalize">
                {credroResult.trustLevel}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* 4. Quick Actions Row (5 explicit shortcuts) */}
      <div className="p-4 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold text-[#242321] uppercase tracking-wider">
            Quick Actions
          </span>
          <span className="text-[11px] text-[#A69C8D]">Instant workstation shortcuts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Shortcut 1: Upload Documents */}
          <Link href="/documents" className="block">
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-[#F7F3EA] hover:bg-[#DDEFE8] text-[#242321] hover:text-[#138C83] border border-[#E8E1D5] text-xs font-bold transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-[#138C83] group-hover:scale-110 transition-transform" />
              <span>Upload Documents</span>
            </button>
          </Link>

          {/* Shortcut 2: Create Invoice */}
          <Link href="/invoices/new" className="block">
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-[#F7F3EA] hover:bg-[#FCE4D8] text-[#242321] hover:text-[#F15A35] border border-[#E8E1D5] text-xs font-bold transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#F15A35] group-hover:scale-110 transition-transform" />
              <span>Create Invoice</span>
            </button>
          </Link>

          {/* Shortcut 3: Add Transaction */}
          <Link href="/records" className="block">
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-[#F7F3EA] hover:bg-[#FCE4D8] text-[#242321] hover:text-[#F15A35] border border-[#E8E1D5] text-xs font-bold transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <ReceiptText className="w-4 h-4 text-[#F15A35] group-hover:scale-110 transition-transform" />
              <span>Add Transaction</span>
            </button>
          </Link>

          {/* Shortcut 4: View Forecast */}
          <Link href="/forecast" className="block">
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-[#F7F3EA] hover:bg-[#DDEFE8] text-[#242321] hover:text-[#138C83] border border-[#E8E1D5] text-xs font-bold transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-[#138C83] group-hover:scale-110 transition-transform" />
              <span>View Forecast</span>
            </button>
          </Link>

          {/* Shortcut 5: Find Government Schemes */}
          <Link href="/schemes" className="block col-span-2 sm:col-span-1">
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-[#F7F3EA] hover:bg-[#DDEFE8] text-[#242321] hover:text-[#138C83] border border-[#E8E1D5] text-xs font-bold transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-[#138C83] group-hover:scale-110 transition-transform" />
              <span>Find Govt Schemes</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Dynamic Reserve Breach Alert Banner */}
      {isReserveBreachedInHorizon && (
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#FCE4D8] border border-[#F15A35]/40 text-[#242321] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#F15A35] flex items-center justify-center shrink-0 border border-[#F15A35]/30">
              <AlertTriangle className="w-5 h-5 text-[#F15A35]" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F15A35] uppercase tracking-wide flex items-center gap-2">
                <span>Predicted Cash Reserve Breach</span>
                <span className="px-2 py-0.5 rounded-full bg-[#F15A35] text-white text-[10px] font-extrabold">
                  Action Recommended
                </span>
              </div>
              <div className="text-xs text-[#242321] mt-0.5">
                Closing cash is projected to drop below your {formatCurrency(minimumReserve)} minimum safety floor on{" "}
                <strong className="text-[#242321] underline">{firstReserveBreachDate || "upcoming days"}</strong>, reaching a trough of{" "}
                <strong className="text-[#F15A35]">{formatCurrency(lowestCashInHorizon)}</strong>.
              </div>
            </div>
          </div>
          <Link href="/decision-centre" className="shrink-0">
            <Button
              variant="primary"
              size="sm"
            >
              Simulate Corrective Actions &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* 5. Dual Recharts Financial Visualizations */}
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
                Projected closing balance over {horizon} days versus {formatCurrency(minimumReserve)} reserve floor
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 bg-[#F7F3EA] p-1 rounded-xl border border-[#E8E1D5]">
              {([7, 30, 60, 90] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setHorizon(days)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    horizon === days
                      ? "bg-[#F15A35] text-white shadow-xs"
                      : "text-[#7A7369] hover:text-[#242321]"
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
                      <stop offset="5%" stopColor="#138C83" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#138C83" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D5" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => formatDate(val).slice(0, 6)}
                    tick={{ fontSize: 11, fill: "#A69C8D" }}
                    axisLine={{ stroke: "#E8E1D5" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "#A69C8D" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), "Projected Cash"]}
                    labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    contentStyle={{
                      backgroundColor: "#242321",
                      borderRadius: "16px",
                      color: "#FFFFFF",
                      border: "1px solid #E8E1D5",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  />
                  <ReferenceLine
                    y={minimumReserve}
                    stroke="#F15A35"
                    strokeDasharray="4 4"
                    label={{
                      value: `Min Reserve: ₹${(minimumReserve / 1000).toFixed(0)}k`,
                      fill: "#F15A35",
                      fontSize: 10,
                      position: "insideBottomRight",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="closingCash"
                    stroke="#138C83"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dashboardCashGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 p-3 bg-[#F7F3EA] border border-[#E8E1D5] rounded-2xl flex items-center justify-between text-xs text-[#242321]">
              <span className="text-[#7A7369]">
                Formula: <strong className="text-[#242321]">Closing = Opening + Inflows - Outflows</strong>
              </span>
              <span className="text-[#7A7369]">
                Lowest Trough:{" "}
                <strong
                  className={
                    lowestCashInHorizon < minimumReserve
                      ? "text-[#F15A35] font-extrabold"
                      : "text-[#138C83] font-extrabold"
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
                <span className="w-2.5 h-2.5 rounded-full bg-[#138C83] inline-block" />
                <span className="text-[#7A7369] font-bold">Inflows</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F15A35] inline-block" />
                <span className="text-[#7A7369] font-bold">Outflows</span>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D5" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 11, fill: "#A69C8D" }}
                    axisLine={{ stroke: "#E8E1D5" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "#A69C8D" }}
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
                      backgroundColor: "#242321",
                      borderRadius: "16px",
                      color: "#FFFFFF",
                      border: "1px solid #E8E1D5",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  />
                  <Bar dataKey="Inflows" fill="#138C83" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflows" fill="#F15A35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 p-3 bg-[#F7F3EA] border border-[#E8E1D5] rounded-2xl flex items-center justify-between text-xs text-[#242321]">
              <span className="text-[#7A7369]">
                Period Net Inflow:{" "}
                <strong
                  className={
                    horizonInflows - horizonOutflows >= 0
                      ? "text-[#138C83] font-extrabold"
                      : "text-[#F15A35] font-extrabold"
                  }
                >
                  {horizonInflows - horizonOutflows >= 0 ? "+" : ""}
                  {formatCurrency(horizonInflows - horizonOutflows)}
                </strong>
              </span>
              <Link
                href="/reports"
                className="font-bold text-[#F15A35] hover:underline inline-flex items-center gap-1"
              >
                Detailed Breakdown <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. Middle Section: Upcoming Expenses & Smart Financial Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Committed Expenses */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#242321]" />
                  <span>Upcoming Scheduled Expenses</span>
                </CardTitle>
                <CardDescription>
                  Impending supplier bills, lease charges & operational liabilities
                </CardDescription>
              </div>
              <Link href="/payables" className="text-xs text-[#F15A35] hover:underline font-bold">
                Manage Payables
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            <div className="divide-y divide-[#E8E1D5]">
              {payables.slice(0, 5).map((bill) => (
                <div key={bill.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#242321]">{bill.vendorName}</p>
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
                    <p className="text-[11px] text-[#A69C8D] mt-0.5">
                      {bill.category} • Bill #{bill.invoiceNumber}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#F15A35] block">
                      {formatCurrency(bill.balanceDue)}
                    </span>
                    <span className="text-[10px] text-[#A69C8D]">Balance Due</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href="/payables" className="block">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View All Scheduled Outflows ({payables.length} Items)
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
                  <AlertTriangle className="w-4 h-4 text-[#F15A35]" />
                  <span>Smart Financial Alerts</span>
                  <Badge variant="danger" size="sm">
                    {DEMO_ALERTS.length} Active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Automated risk triggers from cash-flow models & invoice aging
                </CardDescription>
              </div>
              <Link href="/alerts" className="text-xs text-[#F15A35] hover:underline font-bold">
                Alerts Center
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            {DEMO_ALERTS.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-2xl border border-[#E8E1D5] bg-[#F7F3EA]/60 hover:bg-[#F7F3EA] transition-colors space-y-1.5"
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
                  <span className="text-[10px] text-[#A69C8D] font-mono">
                    {formatDate(alert.date)}
                  </span>
                </div>

                <h5 className="text-xs font-bold text-[#242321]">{alert.title}</h5>
                <p className="text-[11px] text-[#7A7369] line-clamp-2 leading-relaxed">
                  {alert.message}
                </p>

                {alert.actionLink && (
                  <Link
                    href={alert.actionLink}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F15A35] hover:underline pt-0.5"
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

      {/* 7. Lower Section: Recent Cleared Transactions & Navigation Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cleared Bank Transactions */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-[#242321]" />
                  <span>Recent Actual Transactions</span>
                </CardTitle>
                <CardDescription>
                  Cleared bank ledger entries • Strict actuals isolation
                </CardDescription>
              </div>
              <Link href="/records" className="text-xs text-[#F15A35] hover:underline font-bold">
                Ledger
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            <div className="divide-y divide-[#E8E1D5]">
              {records.slice(0, 5).map((rec) => (
                <div key={rec.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        rec.type === "income"
                          ? "bg-[#DDEFE8] text-[#138C83]"
                          : "bg-[#FCE4D8] text-[#F15A35]"
                      }`}
                    >
                      {rec.type === "income" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#242321] line-clamp-1">
                        {rec.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#A69C8D]">
                          {rec.category} • {formatDate(rec.date)}
                        </span>
                        {rec.paymentStatus === "expected" && (
                          <span className="text-[10px] text-[#138C83] bg-[#DDEFE8] px-2 py-0.2 rounded-full font-bold">
                            Expected
                          </span>
                        )}
                        {rec.paymentStatus === "partially_paid" && (
                          <span className="text-[10px] text-[#F15A35] bg-[#FCE4D8] px-2 py-0.2 rounded-full font-bold">
                            Partially Cleared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-extrabold ${
                        rec.type === "income" ? "text-[#138C83]" : "text-[#242321]"
                      }`}
                    >
                      {rec.type === "income" ? "+ " : "- "}
                      {formatCurrency(rec.amount)}
                    </span>
                    <p className="text-[10px] text-[#A69C8D] font-mono">
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
                <Layers className="w-4 h-4 text-[#F15A35]" />
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
                className="p-3.5 rounded-2xl border border-[#E8E1D5] bg-[#F7F3EA]/50 hover:bg-white hover:border-[#F15A35] hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69C8D] group-hover:text-[#F15A35] transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#242321]">Forecast Runway</h4>
                  <p className="text-[11px] text-[#A69C8D] mt-0.5">
                    90-day predictive balance model
                  </p>
                </div>
              </Link>

              {/* Shortcut 2: Scenario Lab */}
              <Link
                href="/scenarios"
                className="p-3.5 rounded-2xl border border-[#E8E1D5] bg-[#F7F3EA]/50 hover:bg-white hover:border-[#F15A35] hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69C8D] group-hover:text-[#F15A35] transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#242321]">Scenario Lab</h4>
                  <p className="text-[11px] text-[#A69C8D] mt-0.5">
                    Stress-test shocks & delays
                  </p>
                </div>
              </Link>

              {/* Shortcut 3: Decision Centre */}
              <Link
                href="/decision-centre"
                className="p-3.5 rounded-2xl border border-[#E8E1D5] bg-[#F7F3EA]/50 hover:bg-white hover:border-[#F15A35] hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Compass className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69C8D] group-hover:text-[#F15A35] transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#242321]">Decision Centre</h4>
                  <p className="text-[11px] text-[#A69C8D] mt-0.5">
                    Compare liquidity fixes
                  </p>
                </div>
              </Link>

              {/* Shortcut 4: FairResolve */}
              <Link
                href="/fairresolve"
                className="p-3.5 rounded-2xl border border-[#E8E1D5] bg-[#F7F3EA]/50 hover:bg-white hover:border-[#F15A35] hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Scale className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69C8D] group-hover:text-[#F15A35] transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#242321]">FairResolve</h4>
                  <p className="text-[11px] text-[#A69C8D] mt-0.5">
                    Dispute mediation & ODR
                  </p>
                </div>
              </Link>

              {/* Shortcut 5: Receivables */}
              <Link
                href="/receivables"
                className="p-3.5 rounded-2xl border border-[#E8E1D5] bg-[#F7F3EA]/50 hover:bg-white hover:border-[#F15A35] hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69C8D] group-hover:text-[#F15A35] transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#242321]">Receivables Aging</h4>
                  <p className="text-[11px] text-[#A69C8D] mt-0.5">
                    Track customer invoices
                  </p>
                </div>
              </Link>

              {/* Shortcut 6: Reports & Analytics */}
              <Link
                href="/reports"
                className="p-3.5 rounded-2xl border border-[#E8E1D5] bg-[#F7F3EA]/50 hover:bg-white hover:border-[#F15A35] hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69C8D] group-hover:text-[#F15A35] transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#242321]">Reports & CSV</h4>
                  <p className="text-[11px] text-[#A69C8D] mt-0.5">
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
