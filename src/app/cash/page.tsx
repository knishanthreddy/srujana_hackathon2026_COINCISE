"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Info,
  Building,
  CheckCircle2,
  DollarSign,
  PlusCircle,
  HelpCircle,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getUnifiedDashboardMetrics,
  getFinancialRecords,
  subscribeToFinancialRecords,
  getLiveForecast,
} from "@/lib/data-service";
import { getOnboardingData, EVENT_ONBOARDING_UPDATED } from "@/lib/onboarding-service";
import { FinancialRecord } from "@/lib/types";

type Period = 7 | 30 | 60 | 90;

export default function AvailableCashPage() {
  const [period, setPeriod] = useState<Period>(30);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [onboarding, setOnboarding] = useState(getOnboardingData());
  const [metrics, setMetrics] = useState(getUnifiedDashboardMetrics());

  useEffect(() => {
    const sync = () => {
      setRecords(getFinancialRecords());
      setOnboarding(getOnboardingData());
      setMetrics(getUnifiedDashboardMetrics());
    };

    sync();
    const unRecs = subscribeToFinancialRecords(sync);
    window.addEventListener(EVENT_ONBOARDING_UPDATED, sync);

    return () => {
      unRecs();
      window.removeEventListener(EVENT_ONBOARDING_UPDATED, sync);
    };
  }, []);

  const minimumReserve = onboarding.openingFinances.minimumReserve || 250000;
  const cashInHand = onboarding.openingFinances.cashInHand || 0;
  const bankAccounts = onboarding.openingFinances.bankAccounts || [];
  const totalBankBalance = bankAccounts.reduce((acc, b) => acc + (b.availableBalance || 0), 0);
  const otherLiquid = onboarding.openingFinances.otherLiquidFunds || 0;
  const eligibleInvestments = onboarding.openingFinances.shortTermInvestments || 0;

  // Forecast points for the selected period
  const forecast = useMemo(() => {
    void records;
    return getLiveForecast(period, minimumReserve);
  }, [period, minimumReserve, records]);

  const reserveSurplus = metrics.availableCash - minimumReserve;
  const isSurplus = reserveSurplus >= 0;

  // Filter recent actual cash movements
  const recentCashMovements = records.slice(0, 8);

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
              Available Operating Cash
            </h1>
            <Badge variant="success" size="sm">
              Real Cleared Funds
            </Badge>
          </div>
          <p className="text-xs text-[#7A7369] mt-0.5">
            Strictly cleared, immediately spendable liquid reserves in hand and verified bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/records">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Record Cash In/Out</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Hero Cash Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Available Cash */}
        <div className="p-6 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#7A7369]">Available Operating Cash</span>
            <div className="w-10 h-10 rounded-2xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#242321] tracking-tight">
            {formatCurrency(metrics.availableCash)}
          </div>
          <div className="mt-3 pt-3 border-t border-[#E8E1D5]/60 flex items-center justify-between text-xs">
            <span className="text-[#A69C8D]">Status</span>
            <span className="font-bold text-[#138C83] bg-[#DDEFE8] px-2.5 py-0.5 rounded-full text-[10px]">
              Ready to Spend
            </span>
          </div>
        </div>

        {/* Minimum Cash Reserve Floor */}
        <div className="p-6 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#7A7369]">Safety Reserve Floor</span>
            <div className="w-10 h-10 rounded-2xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#242321] tracking-tight">
            {formatCurrency(minimumReserve)}
          </div>
          <div className="mt-3 pt-3 border-t border-[#E8E1D5]/60 flex items-center justify-between text-xs">
            <span className="text-[#A69C8D]">Emergency Threshold</span>
            <span className="font-bold text-[#F15A35] bg-[#FCE4D8] px-2.5 py-0.5 rounded-full text-[10px]">
              Statutory Floor
            </span>
          </div>
        </div>

        {/* Reserve Surplus or Shortfall */}
        <div className="p-6 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#7A7369]">
              {isSurplus ? "Reserve Surplus" : "Reserve Shortfall"}
            </span>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isSurplus
                  ? "bg-[#DDEFE8] text-[#138C83]"
                  : "bg-[#FCE4D8] text-[#F15A35]"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-3xl font-extrabold tracking-tight ${
              isSurplus ? "text-[#138C83]" : "text-[#F15A35]"
            }`}
          >
            {isSurplus ? "+" : ""}
            {formatCurrency(reserveSurplus)}
          </div>
          <div className="mt-3 pt-3 border-t border-[#E8E1D5]/60 flex items-center justify-between text-xs">
            <span className="text-[#A69C8D]">Operating Buffer</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                isSurplus
                  ? "bg-[#DDEFE8] text-[#138C83]"
                  : "bg-[#FCE4D8] text-[#F15A35]"
              }`}
            >
              {isSurplus ? "Above Floor" : "Below Target"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Trend Area Chart Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Cash Trend & Runway Trajectory</CardTitle>
              <Badge variant="primary" size="sm">
                {period} Days
              </Badge>
            </div>
            <CardDescription>
              Continuous projection based on real opening cash plus confirmed receipts minus committed bills
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-[#F7F3EA] p-1 rounded-xl border border-[#E8E1D5]">
            {([7, 30, 60, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  period === days
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
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={forecast.dailyPoints}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cashDetailGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#138C83" stopOpacity={0.3} />
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
                    value: `Reserve Floor: ₹${(minimumReserve / 1000).toFixed(0)}k`,
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
                  fill="url(#cashDetailGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-4 bg-[#F7F3EA] border border-[#E8E1D5] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-[#7A7369]">
              Lowest Balance in Window:{" "}
              <strong
                className={
                  forecast.lowestCashBalance < minimumReserve
                    ? "text-[#F15A35] font-extrabold"
                    : "text-[#138C83] font-extrabold"
                }
              >
                {formatCurrency(forecast.lowestCashBalance)}
              </strong>
            </span>
            <span className="text-[#7A7369]">
              Ending Balance ({period} Days):{" "}
              <strong className="text-[#242321] font-extrabold">
                {formatCurrency(forecast.closingCash)}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Liquid Cash Breakdown & Working Capital Exclusion Rule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown of Verified Liquid Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#F15A35]" />
              <span>Liquid Cash Breakdown</span>
            </CardTitle>
            <CardDescription>
              Components contributing to immediately spendable operating cash
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="divide-y divide-[#E8E1D5]">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#242321]">Cash in Hand</p>
                  <p className="text-[11px] text-[#A69C8D]">Physical petty cash & registered cash box</p>
                </div>
                <span className="text-sm font-extrabold text-[#242321]">
                  {formatCurrency(cashInHand)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#242321]">Bank Accounts</p>
                  <p className="text-[11px] text-[#A69C8D]">
                    {bankAccounts.length > 0
                      ? bankAccounts.map((b) => `${b.bankName} (${b.accountNumberMasked || b.accountNickname || "Primary"})`).join(", ")
                      : "Verified primary current accounts"}
                  </p>
                </div>
                <span className="text-sm font-extrabold text-[#242321]">
                  {formatCurrency(totalBankBalance > 0 ? totalBankBalance : metrics.availableCash)}
                </span>
              </div>

              {eligibleInvestments > 0 && (
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#242321]">Eligible Short-Term Liquid Funds</p>
                    <p className="text-[11px] text-[#A69C8D]">T+0 overnight mutual funds or sweep deposits</p>
                  </div>
                  <span className="text-sm font-extrabold text-[#242321]">
                    {formatCurrency(eligibleInvestments)}
                  </span>
                </div>
              )}

              {otherLiquid > 0 && (
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#242321]">Other Liquid Funds</p>
                    <p className="text-[11px] text-[#A69C8D]">Immediately convertible digital wallets & deposits</p>
                  </div>
                  <span className="text-sm font-extrabold text-[#242321]">
                    {formatCurrency(otherLiquid)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E8E1D5] flex items-center justify-between">
              <span className="text-xs font-bold text-[#7A7369]">Total Spendable Cash:</span>
              <span className="text-base font-extrabold text-[#138C83]">
                {formatCurrency(metrics.availableCash)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Accounting Invariant / Working Capital Exclusion Callout */}
        <Card className="bg-[#F7F3EA] border border-[#E8E1D5]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#242321]">
              <Info className="w-4 h-4 text-[#F15A35]" />
              <span>Working Capital Exclusion Rule</span>
            </CardTitle>
            <CardDescription className="text-[#7A7369]">
              Strict accounting separation: Cash &ne; Working Capital
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3.5 text-xs text-[#242321]">
            <p className="leading-relaxed">
              In COINCISE, <strong>Available Operating Cash</strong> only includes funds that have already cleared in your bank accounts and cash box. We deliberately exclude the following from spendable cash:
            </p>

            <div className="space-y-2">
              <div className="p-3 bg-white rounded-xl border border-[#E8E1D5] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#F15A35] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#242321]">Customer Receivables</strong>
                  <span className="text-[#7A7369] text-[11px]">
                    Invoices are promises of future payments, not cash in hand. They appear in cash flow only on their expected payment dates.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E8E1D5] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#F15A35] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#242321]">Inventory & WIP Stock</strong>
                  <span className="text-[#7A7369] text-[11px]">
                    Warehouse goods require sales and delivery before conversion to cash.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E8E1D5] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#F15A35] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#242321]">Fixed Assets & Security Deposits</strong>
                  <span className="text-[#7A7369] text-[11px]">
                    Machinery, factory lease advances, and equipment are illiquid and unavailable for payroll or supplier settlements.
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#A69C8D] italic pt-1">
              This safeguard prevents artificial over-optimism and keeps your business safe from sudden liquidity crises.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 5. Recent Cleared Cash Ledger Entries */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle>Recent Cleared Cash Transactions</CardTitle>
            <CardDescription>
              Chronological log of cleared entries impacting available cash
            </CardDescription>
          </div>
          <Link href="/records" className="text-xs font-bold text-[#F15A35] hover:underline">
            View All Ledger &rarr;
          </Link>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="divide-y divide-[#E8E1D5]">
            {recentCashMovements.map((rec) => (
              <div key={rec.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
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
                    <p className="text-xs font-bold text-[#242321]">{rec.description}</p>
                    <p className="text-[11px] text-[#A69C8D] mt-0.5">
                      {rec.category} • {formatDate(rec.date)} • {rec.paymentMethod || "Bank Transfer"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-extrabold ${
                      rec.type === "income" ? "text-[#138C83]" : "text-[#242321]"
                    }`}
                  >
                    {rec.type === "income" ? "+ " : "- "}
                    {formatCurrency(rec.amount)}
                  </span>
                  <span className="block text-[10px] text-[#138C83] font-bold">
                    ✓ Cleared
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
