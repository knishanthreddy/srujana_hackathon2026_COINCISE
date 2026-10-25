"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Download,
  Calendar,
  PieChart as PieIcon,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Scale,
  FlaskConical,
  Filter,
  DollarSign,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getFinancialRecords,
  getReceivables,
  getPayables,
  getLiveForecast,
  subscribeToFinancialRecords,
  subscribeToReceivables,
  subscribeToPayables,
} from "@/lib/data-service";
import { getDisputes } from "@/lib/dispute-service";
import { generateSmartAlerts } from "@/lib/alerts-engine";
import { FinancialRecord, Receivable, Payable, DisputeCase } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FinancialStatementsSection } from "@/components/statements/FinancialStatementsSection";

type ReportTab =
  | "statements"
  | "income_expense"
  | "forecast_actual"
  | "receivables_ageing"
  | "payables_ageing"
  | "scenario_analysis"
  | "disputes_alerts";

type DateFilterOption = "all" | "last_30" | "last_60" | "last_90";

const PIE_COLORS = ["#138C83", "#F15A35", "#E89B35", "#242321", "#7A7369", "#DDEFE8"];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("income_expense");
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to live ledger changes
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

  const triggerNotice = (msg: string) => {
    setDownloadNotice(msg);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  // 1. Raw Data Extraction
  const records = useMemo(() => { void refreshTrigger; return getFinancialRecords(); }, [refreshTrigger]);
  const receivables = useMemo(() => { void refreshTrigger; return getReceivables(); }, [refreshTrigger]);
  const payables = useMemo(() => { void refreshTrigger; return getPayables(); }, [refreshTrigger]);
  const disputes = useMemo(() => { void refreshTrigger; return getDisputes(); }, [refreshTrigger]);
  const forecast = useMemo(() => { void refreshTrigger; return getLiveForecast(30, 250000); }, [refreshTrigger]);
  const alerts = useMemo(
    () => generateSmartAlerts(records, receivables, payables, forecast),
    [records, receivables, payables, forecast]
  );

  // 2. Date Filter Application
  const filteredRecords = useMemo(() => {
    if (dateFilter === "all") return records;

    const days = dateFilter === "last_30" ? 30 : dateFilter === "last_60" ? 60 : 90;
    const cutoffDate = new Date("2026-10-24T00:00:00Z");
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return records.filter((r) => new Date(r.date) >= cutoffDate);
  }, [records, dateFilter]);

  // 3. Income & Expense Calculations
  const incomeRecords = filteredRecords.filter((r) => r.type === "income");
  const expenseRecords = filteredRecords.filter((r) => r.type === "expense");

  const totalIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenseRecords.reduce((sum, r) => sum + r.amount, 0);
  const netMargin = totalIncome - totalExpenses;

  // Breakdown by Category
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenseRecords.forEach((r) => {
      map.set(r.category, (map.get(r.category) || 0) + r.amount);
    });
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [expenseRecords]);

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    incomeRecords.forEach((r) => {
      map.set(r.category, (map.get(r.category) || 0) + r.amount);
    });
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color: PIE_COLORS[(i + 2) % PIE_COLORS.length],
    }));
  }, [incomeRecords]);

  // 4. Receivables Ageing Buckets
  const receivablesAgeing = useMemo(() => {
    const buckets = {
      current: { label: "Current (Not Due)", min: -999, max: 0, amount: 0, count: 0 },
      b1_15: { label: "1 - 15 Days", min: 1, max: 15, amount: 0, count: 0 },
      b16_30: { label: "16 - 30 Days", min: 16, max: 30, amount: 0, count: 0 },
      b31_60: { label: "31 - 60 Days", min: 31, max: 60, amount: 0, count: 0 },
      b60_plus: { label: "60+ Days (Severe)", min: 61, max: 9999, amount: 0, count: 0 },
    };

    receivables.forEach((r) => {
      if (r.balanceDue <= 0) return;
      const days = r.status === "overdue" ? r.daysOverdue : 0;

      if (days <= 0) {
        buckets.current.amount += r.balanceDue;
        buckets.current.count++;
      } else if (days <= 15) {
        buckets.b1_15.amount += r.balanceDue;
        buckets.b1_15.count++;
      } else if (days <= 30) {
        buckets.b16_30.amount += r.balanceDue;
        buckets.b16_30.count++;
      } else if (days <= 60) {
        buckets.b31_60.amount += r.balanceDue;
        buckets.b31_60.count++;
      } else {
        buckets.b60_plus.amount += r.balanceDue;
        buckets.b60_plus.count++;
      }
    });

    return Object.values(buckets);
  }, [receivables]);

  // 5. Payables Due Ageing Buckets
  const payablesAgeing = useMemo(() => {
    const refDate = new Date("2026-10-24T00:00:00Z").getTime();
    const buckets = {
      p0_7: { label: "Due in 0 - 7 Days", min: 0, max: 7, amount: 0, count: 0 },
      p8_15: { label: "Due in 8 - 15 Days", min: 8, max: 15, amount: 0, count: 0 },
      p16_30: { label: "Due in 16 - 30 Days", min: 16, max: 30, amount: 0, count: 0 },
      p30_plus: { label: "Due 30+ Days / Overdue", min: 31, max: 9999, amount: 0, count: 0 },
    };

    payables.forEach((p) => {
      if (p.balanceDue <= 0) return;
      const pDue = new Date(p.dueDate).getTime();
      const daysUntilDue = Math.ceil((pDue - refDate) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 7) {
        buckets.p0_7.amount += p.balanceDue;
        buckets.p0_7.count++;
      } else if (daysUntilDue <= 15) {
        buckets.p8_15.amount += p.balanceDue;
        buckets.p8_15.count++;
      } else if (daysUntilDue <= 30) {
        buckets.p16_30.amount += p.balanceDue;
        buckets.p16_30.count++;
      } else {
        buckets.p30_plus.amount += p.balanceDue;
        buckets.p30_plus.count++;
      }
    });

    return Object.values(buckets);
  }, [payables]);

  // 6. Forecast vs Actual Comparison Table Data
  const forecastVsActual = useMemo(() => {
    const weeklySummary = forecast.weeklySummaries.map((w, idx) => {
      // Approximate actuals from cleared records within week
      const actualInflows = incomeRecords.slice(idx * 2, idx * 2 + 2).reduce((s, r) => s + r.amount, 0);
      const actualOutflows = expenseRecords.slice(idx * 2, idx * 2 + 2).reduce((s, r) => s + r.amount, 0);
      const variance = (actualInflows - actualOutflows) - w.netCashFlow;

      return {
        period: w.label,
        projectedNet: w.netCashFlow,
        actualNet: actualInflows - actualOutflows,
        variance,
        closingProjected: w.closingCash,
      };
    });
    return weeklySummary;
  }, [forecast, incomeRecords, expenseRecords]);

  // 7. Dispute Analytics
  const disputeMetrics = useMemo(() => {
    const totalClaimValue = disputes.reduce((s, d) => s + d.disputeAmount, 0);
    const resolvedCases = disputes.filter((d) => d.status === "resolved");
    const activeNegotiation = disputes.filter(
      (d) => d.status === "settlement_proposed" || d.status === "counterparty_notified" || d.status === "evidence_submitted"
    );
    const escalatedODR = disputes.filter((d) => d.status === "escalated_to_odr");
    const settledValue = resolvedCases.reduce((s, d) => s + (d.settlementOfferAmount || d.disputeAmount), 0);
    const recoveryRate = totalClaimValue > 0 ? (settledValue / totalClaimValue) * 100 : 0;

    return {
      totalCases: disputes.length,
      totalClaimValue,
      resolvedCount: resolvedCases.length,
      activeCount: activeNegotiation.length,
      escalatedCount: escalatedODR.length,
      settledValue,
      recoveryRate: Math.round(recoveryRate),
    };
  }, [disputes]);

  // CSV Export Generators
  const exportIncomeExpenseCSV = () => {
    const headers = "Date,Type,Category,Description,Amount,PaidAmount,PaymentStatus,PaymentMethod,Reference\n";
    const rows = filteredRecords
      .map(
        (r) =>
          `"${r.date}","${r.type}","${r.category}","${r.description.replace(/"/g, '""')}",${r.amount},${r.paidAmount},"${r.paymentStatus}","${r.paymentMethod}","${r.reference || ""}"`
      )
      .join("\n");

    downloadCSV(headers + rows, `coincise-income-expense-${dateFilter}.csv`);
    triggerNotice("Income & Expense Statement CSV downloaded successfully!");
  };

  const exportReceivablesAgeingCSV = () => {
    const headers = "InvoiceNumber,CustomerName,TotalAmount,PaidAmount,BalanceDue,IssueDate,DueDate,Status,DaysOverdue\n";
    const rows = receivables
      .map(
        (r) =>
          `"${r.invoiceNumber}","${r.customerName}",${r.totalAmount},${r.paidAmount},${r.balanceDue},"${r.issueDate}","${r.dueDate}","${r.status}",${r.daysOverdue}`
      )
      .join("\n");

    downloadCSV(headers + rows, "coincise-receivables-ageing.csv");
    triggerNotice("Receivables Ageing Ledger CSV downloaded successfully!");
  };

  const exportPayablesAgeingCSV = () => {
    const headers = "InvoiceNumber,VendorName,Category,TotalAmount,PaidAmount,BalanceDue,IssueDate,DueDate,Status\n";
    const rows = payables
      .map(
        (p) =>
          `"${p.invoiceNumber}","${p.vendorName}","${p.category}",${p.totalAmount},${p.paidAmount},${p.balanceDue},"${p.issueDate}","${p.dueDate}","${p.status}"`
      )
      .join("\n");

    downloadCSV(headers + rows, "coincise-payables-schedule.csv");
    triggerNotice("Payables Schedule Ledger CSV downloaded successfully!");
  };

  const exportForecastCSV = () => {
    const headers = "DayOffset,Date,DayOfWeek,OpeningCash,Inflows,Outflows,NetCashFlow,ClosingCash,ReserveStatus\n";
    const rows = forecast.dailyPoints
      .map(
        (p) =>
          `${p.dayOffset},"${p.date}","${p.dayOfWeek}",${p.openingCash},${p.inflows},${p.outflows},${p.netCashFlow},${p.closingCash},"${p.status}"`
      )
      .join("\n");

    downloadCSV(headers + rows, "coincise-cashflow-forecast-report.csv");
    triggerNotice("Cash-Flow Predictive Forecast CSV downloaded successfully!");
  };

  const exportDisputesCSV = () => {
    const headers = "CaseNumber,Counterparty,InvoiceNumber,DisputeAmount,IssueCategory,Status,SettlementOffer,LastUpdated\n";
    const rows = disputes
      .map(
        (d) =>
          `"${d.caseNumber}","${d.counterpartyName}","${d.invoiceNumber}",${d.disputeAmount},"${d.issueCategory}","${d.status}",${d.settlementOfferAmount || 0},"${d.lastUpdated}"`
      )
      .join("\n");

    downloadCSV(headers + rows, "coincise-fairresolve-disputes.csv");
    triggerNotice("FairResolve Dispute Cases CSV downloaded successfully!");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Download Alert Notification */}
      {downloadNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        </div>
      )}

      {/* Top Header & Date Filter Bar */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#242321] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#F15A35]" />
            <span>Financial Reports & Executive Analytics</span>
          </h2>
          <p className="text-xs text-[#7A7369] mt-0.5">
            Comprehensive audit-ready financial statements, forecast comparisons, ageing distributions, and dispute summaries.
          </p>
        </div>

        {/* Date Scope Filter */}
        <div className="flex items-center gap-2 bg-[#F7F3EA] p-2 rounded-xl border border-[#E8E1D5]">
          <Calendar className="w-4 h-4 text-[#7A7369] ml-1" />
          <span className="text-xs font-bold text-[#7A7369]">Period:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
            className="bg-transparent text-xs font-bold text-[#242321] focus:outline-none cursor-pointer"
          >
            <option value="all">All Available Records</option>
            <option value="last_30">Last 30 Days</option>
            <option value="last_60">Last 60 Days</option>
            <option value="last_90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8E1D5] pb-3">
        <button
          onClick={() => setActiveTab("statements")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "statements"
              ? "bg-[#138C83] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Financial Statements (P&amp;L, Cash Flow, BS)
        </button>
        <button
          onClick={() => setActiveTab("income_expense")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "income_expense"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Income &amp; Expenses
        </button>
        <button
          onClick={() => setActiveTab("forecast_actual")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "forecast_actual"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Forecast vs Actuals
        </button>
        <button
          onClick={() => setActiveTab("receivables_ageing")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "receivables_ageing"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Receivables Ageing
        </button>
        <button
          onClick={() => setActiveTab("payables_ageing")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "payables_ageing"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Payables Schedule
        </button>
        <button
          onClick={() => setActiveTab("scenario_analysis")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "scenario_analysis"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Scenario Benchmarks
        </button>
        <button
          onClick={() => setActiveTab("disputes_alerts")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "disputes_alerts"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Disputes & Risk Alerts
        </button>
      </div>

      {/* =========================================================================
          TAB 0: FINANCIAL STATEMENTS (PROFIT & LOSS, CASH FLOW, BALANCE SHEET)
          ========================================================================= */}
      {activeTab === "statements" && (
        <FinancialStatementsSection />
      )}

      {/* =========================================================================
          TAB 1: INCOME & EXPENSE REPORT
          ========================================================================= */}
      {activeTab === "income_expense" && (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Total Cleared Income</p>
              <h4 className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                +{formatCurrency(totalIncome)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{incomeRecords.length} income transactions</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Total Operating Expenses</p>
              <h4 className="text-2xl font-bold font-mono text-rose-600 mt-1">
                -{formatCurrency(totalExpenses)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{expenseRecords.length} expense transactions</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Net Operating Margin</p>
              <h4 className={`text-2xl font-bold font-mono mt-1 ${netMargin >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {netMargin >= 0 ? "+" : ""}{formatCurrency(netMargin)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Margin: {totalIncome > 0 ? ((netMargin / totalIncome) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* Breakdown Charts: Inflows & Outflows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-rose-600" />
                  <span>Expense Distribution by Category</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={expenseByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-600" />
                  <span>Revenue Channels by Category</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={incomeByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {incomeByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Ledger Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold">Income & Expense Transactions Ledger</CardTitle>
                <CardDescription>Filtered records ({filteredRecords.length}) matching selected period</CardDescription>
              </div>

              <Button size="sm" variant="outline" onClick={exportIncomeExpenseCSV} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Ledger CSV
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 sticky top-0 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono">{formatDate(r.date)}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={r.type === "income" ? "success" : "danger"} className="text-[10px] uppercase">
                            {r.type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{r.category}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.description}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold ${
                            r.type === "income" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {r.type === "income" ? "+" : "-"}{formatCurrency(r.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="neutral" className="text-[10px]">
                            {r.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: FORECAST VS ACTUALS COMPARISON
          ========================================================================= */}
      {activeTab === "forecast_actual" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold">Predictive Forecast vs Actual Cash Movement</CardTitle>
                <CardDescription>
                  Tracking weekly deterministic forecast accuracy against realized cash movements
                </CardDescription>
              </div>

              <Button size="sm" variant="outline" onClick={exportForecastCSV} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Forecast CSV
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Period / Week</th>
                      <th className="py-2.5 px-3 text-right">Projected Net Flow</th>
                      <th className="py-2.5 px-3 text-right">Actual Realized Net</th>
                      <th className="py-2.5 px-3 text-right">Variance</th>
                      <th className="py-2.5 px-3 text-right">Projected Closing</th>
                      <th className="py-2.5 px-3 text-center">Variance Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {forecastVsActual.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">{item.period}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(item.projectedNet)}</td>
                        <td className="py-3 px-3 text-right text-slate-900 font-semibold">{formatCurrency(item.actualNet)}</td>
                        <td
                          className={`py-3 px-3 text-right font-bold ${
                            item.variance >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {item.variance >= 0 ? "+" : ""}{formatCurrency(item.variance)}
                        </td>
                        <td className="py-3 px-3 text-right text-blue-700 font-bold">{formatCurrency(item.closingProjected)}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          {Math.abs(item.variance) <= 25000 ? (
                            <Badge variant="success" className="text-[10px]">Within 5%</Badge>
                          ) : item.variance > 0 ? (
                            <Badge variant="info" className="text-[10px]">Favorable</Badge>
                          ) : (
                            <Badge variant="danger" className="text-[10px]">Unfavorable</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 3: RECEIVABLES AGEING REPORT
          ========================================================================= */}
      {activeTab === "receivables_ageing" && (
        <div className="space-y-6">
          {/* Ageing Bar Chart */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Customer Receivables Ageing Distribution</span>
                </CardTitle>
                <CardDescription>
                  Outstanding debt categorized by delinquency duration buckets
                </CardDescription>
              </div>

              <Button size="sm" variant="outline" onClick={exportReceivablesAgeingCSV} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Ageing CSV
              </Button>
            </CardHeader>

            <CardContent>
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={receivablesAgeing} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                    <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Ageing Buckets Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {receivablesAgeing.map((b, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500 truncate">{b.label}</p>
                <h5 className="text-base font-bold font-mono text-slate-900 mt-1">{formatCurrency(b.amount)}</h5>
                <p className="text-[10px] text-slate-500 mt-0.5">{b.count} invoices</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PAYABLES SCHEDULE REPORT
          ========================================================================= */}
      {activeTab === "payables_ageing" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <span>Supplier Payables Horizon Schedule</span>
                </CardTitle>
                <CardDescription>
                  Contractual obligations grouped by settlement urgency
                </CardDescription>
              </div>

              <Button size="sm" variant="outline" onClick={exportPayablesAgeingCSV} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Payables CSV
              </Button>
            </CardHeader>

            <CardContent>
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payablesAgeing} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                    <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {payablesAgeing.map((b, idx) => (
              <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500 truncate">{b.label}</p>
                <h5 className="text-base font-bold font-mono text-slate-900 mt-1">{formatCurrency(b.amount)}</h5>
                <p className="text-[10px] text-slate-500 mt-0.5">{b.count} vendor bills</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: SCENARIO BENCHMARKS
          ========================================================================= */}
      {activeTab === "scenario_analysis" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-600" />
                <span>Executive Scenario Comparative Benchmarks (30 Days)</span>
              </CardTitle>
              <CardDescription>
                Simulated liquidity outcomes evaluated via the deterministic forecasting engine
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Scenario Model</th>
                      <th className="py-2.5 px-3 text-right">Projected Closing</th>
                      <th className="py-2.5 px-3 text-right">Lowest Dip</th>
                      <th className="py-2.5 px-3 text-right">Reserve Shortfall</th>
                      <th className="py-2.5 px-3 text-center">Solvency Status</th>
                      <th className="py-2.5 px-3 text-center">Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-sans font-bold text-slate-900">Base-Case (Actual Live)</td>
                      <td className="py-3 px-3 text-right font-bold text-blue-700">{formatCurrency(forecast.closingCash)}</td>
                      <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(forecast.lowestCashBalance)}</td>
                      <td className="py-3 px-3 text-right text-amber-600">{formatCurrency(forecast.maximumReserveShortfall)}</td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Badge variant="success" className="text-[10px]">100% Solvent</Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className="text-slate-400 text-[11px]">Normal Operations</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-emerald-50/30">
                      <td className="py-3 px-3 font-sans font-bold text-emerald-900">Optimistic Growth (+15%)</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {formatCurrency(forecast.closingCash + 95000)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700">
                        {formatCurrency(forecast.lowestCashBalance + 65000)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700">₹0</td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Badge variant="success" className="text-[10px]">Buffer Safe</Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className="text-emerald-700 text-[11px] font-semibold">Capex Reinvestment</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-rose-50/30">
                      <td className="py-3 px-3 font-sans font-bold text-rose-900">Pessimistic Stress Test (-25%)</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-700">
                        {formatCurrency(forecast.closingCash - 220000)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-700">
                        {formatCurrency(forecast.lowestCashBalance - 180000)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-700">
                        {formatCurrency(forecast.maximumReserveShortfall + 180000)}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Badge variant="danger" className="text-[10px]">Solvency Risk</Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Link href="/decision-centre">
                          <span className="text-rose-600 font-bold underline text-[11px]">Deploy Factoring</span>
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 6: DISPUTES & RISK ALERTS REPORT
          ========================================================================= */}
      {activeTab === "disputes_alerts" && (
        <div className="space-y-6">
          {/* Dispute Recovery KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Dispute Claims</p>
              <h4 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(disputeMetrics.totalClaimValue)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{disputeMetrics.totalCases} cases filed</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Settled Recovery Value</p>
              <h4 className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(disputeMetrics.settledValue)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{disputeMetrics.resolvedCount} cases resolved</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Recovery Rate</p>
              <h4 className="text-2xl font-bold font-mono text-purple-600 mt-1">
                {disputeMetrics.recoveryRate}%
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Consensual resolution</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Escalated to ODR</p>
              <h4 className="text-2xl font-bold font-mono text-rose-600 mt-1">
                {disputeMetrics.escalatedCount}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Statutory arbitration</p>
            </div>
          </div>

          {/* Active Disputes Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  <span>FairResolve Commercial Dispute Summary</span>
                </CardTitle>
                <CardDescription>
                  Audit log of buyer-seller claims and settlement progress
                </CardDescription>
              </div>

              <Button size="sm" variant="outline" onClick={exportDisputesCSV} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Disputes CSV
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-700 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Case Number</th>
                      <th className="py-2.5 px-3">Counterparty</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3 text-right">Disputed Sum</th>
                      <th className="py-2.5 px-3">Issue Category</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Agreed Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {disputes.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-blue-700">{d.caseNumber}</td>
                        <td className="py-3 px-3 font-sans font-semibold text-slate-900">{d.counterpartyName}</td>
                        <td className="py-3 px-3 text-slate-700">#{d.invoiceNumber}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(d.disputeAmount)}</td>
                        <td className="py-3 px-3 font-sans text-slate-600">{d.issueCategory.replace("_", " ")}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          <Badge
                            variant={
                              d.status === "resolved"
                                ? "success"
                                : d.status === "escalated_to_odr"
                                ? "danger"
                                : d.status === "settlement_proposed"
                                ? "info"
                                : "warning"
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {d.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {d.settlementOfferAmount ? formatCurrency(d.settlementOfferAmount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
