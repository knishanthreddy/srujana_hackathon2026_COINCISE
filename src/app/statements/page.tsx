"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  TrendingUp,
  ReceiptText,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getFinancialRecords,
  getReceivables,
  getPayables,
  subscribeToFinancialRecords,
  subscribeToReceivables,
  subscribeToPayables,
} from "@/lib/data-service";
import { getOnboardingData, EVENT_ONBOARDING_UPDATED } from "@/lib/onboarding-service";
import {
  generateProfitAndLossStatement,
  generateCashFlowStatement,
  generateBalanceSheetStatement,
  type ProfitAndLossStatement,
  type CashFlowStatement,
  type BalanceSheetStatement,
  type StatementPeriodPreset,
  type AccountingBasis,
} from "@/lib/financial-statements";
import {
  exportProfitAndLossToExcel,
  exportCashFlowToExcel,
  exportBalanceSheetToExcel,
} from "@/lib/statement-export-service";

type StatementType = "profit_and_loss" | "cash_flow" | "balance_sheet";

export default function FinancialStatementsPage() {
  const [selectedStatement, setSelectedStatement] = useState<StatementType>("profit_and_loss");
  const [periodPreset, setPeriodPreset] = useState<StatementPeriodPreset>("current_fy");
  const [accountingBasis, setAccountingBasis] = useState<AccountingBasis>("cash");
  const [customStartDate, setCustomStartDate] = useState("2026-04-01");
  const [customEndDate, setCustomEndDate] = useState("2026-10-25");
  const [asOfDate, setAsOfDate] = useState("2026-10-25");
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to live ledger changes & onboarding updates
  useEffect(() => {
    const sync = () => setRefreshTrigger((n) => n + 1);
    const unsubRecs = subscribeToFinancialRecords(sync);
    const unsubReceivables = subscribeToReceivables(sync);
    const unsubPayables = subscribeToPayables(sync);
    window.addEventListener(EVENT_ONBOARDING_UPDATED, sync);

    return () => {
      unsubRecs();
      unsubReceivables();
      unsubPayables();
      window.removeEventListener(EVENT_ONBOARDING_UPDATED, sync);
    };
  }, []);

  const triggerNotice = (msg: string) => {
    setDownloadNotice(msg);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  // Extract underlying data reactively
  const records = useMemo(() => { void refreshTrigger; return getFinancialRecords(); }, [refreshTrigger]);
  const receivables = useMemo(() => { void refreshTrigger; return getReceivables(); }, [refreshTrigger]);
  const payables = useMemo(() => { void refreshTrigger; return getPayables(); }, [refreshTrigger]);
  const onboarding = useMemo(() => { void refreshTrigger; return getOnboardingData(); }, [refreshTrigger]);

  const profile = onboarding.profile;
  const businessName = profile.tradeName || profile.mcaLegalName || "NexGen Precision Engineering Ltd";

  // Generate Statements
  const pnlStatement: ProfitAndLossStatement = useMemo(() => {
    return generateProfitAndLossStatement(records, receivables, payables, onboarding, {
      preset: periodPreset,
      startDate: customStartDate,
      endDate: customEndDate,
      basis: accountingBasis,
    });
  }, [records, receivables, payables, onboarding, periodPreset, customStartDate, customEndDate, accountingBasis]);

  const cashFlowStatement: CashFlowStatement = useMemo(() => {
    return generateCashFlowStatement(records, onboarding, {
      preset: periodPreset,
      startDate: customStartDate,
      endDate: customEndDate,
    });
  }, [records, onboarding, periodPreset, customStartDate, customEndDate]);

  const balanceSheetStatement: BalanceSheetStatement = useMemo(() => {
    return generateBalanceSheetStatement(records, receivables, payables, onboarding, {
      asOfDate,
    });
  }, [records, receivables, payables, onboarding, asOfDate]);

  // Handle Excel Export
  const handleExportExcel = () => {
    if (selectedStatement === "profit_and_loss") {
      exportProfitAndLossToExcel(pnlStatement);
      triggerNotice("Profit & Loss Statement Excel file downloaded successfully!");
    } else if (selectedStatement === "cash_flow") {
      exportCashFlowToExcel(cashFlowStatement);
      triggerNotice("Cash Flow Statement Excel file downloaded successfully!");
    } else {
      exportBalanceSheetToExcel(balanceSheetStatement);
      triggerNotice("Balance Sheet Excel file downloaded successfully!");
    }
  };

  // Handle Native PDF / Print
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Download Alert Notification */}
      {downloadNotice && (
        <div className="fixed top-4 right-4 z-50 bg-[#138C83] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 print:hidden">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* 1. Header & Configuration Card (Hidden during print) */}
      <div className="bg-[#242321] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md border border-[#383632] print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FCE4D8] text-[#F15A35] tracking-wider uppercase border border-[#F15A35]/30">
                Financial Statements
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DDEFE8] text-[#138C83] tracking-wider border border-[#138C83]/30">
                Statutory &amp; Management Ready
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Statement Generation &amp; Download
            </h1>
            <p className="text-xs text-[#A69C8D] max-w-2xl leading-relaxed">
              Generate, preview, and download formal <strong>Profit &amp; Loss</strong>, <strong>Cash Flow</strong>, and <strong>Balance Sheet</strong> statements verified strictly from your real financial records and setup profile.
            </p>
          </div>

          {/* Action Download Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#DDEFE8]" />
              <span>Download Excel (.xlsx)</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrintPDF}
              className="text-xs font-bold flex items-center gap-2 shadow-orange cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </div>

        {/* Configuration Filters Row */}
        <div className="mt-6 pt-5 border-t border-[#383632] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Business Entity Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#A69C8D] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#F15A35]" />
              <span>Reporting Entity:</span>
            </label>
            <div className="px-3 py-2 rounded-xl bg-[#1A1918] border border-[#383632] text-white font-semibold truncate">
              {businessName}
            </div>
          </div>

          {/* Statement Type Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#A69C8D] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#138C83]" />
              <span>Select Statement:</span>
            </label>
            <select
              value={selectedStatement}
              onChange={(e) => setSelectedStatement(e.target.value as StatementType)}
              className="w-full px-3 py-2 rounded-xl bg-[#1A1918] border border-[#383632] text-white font-semibold focus:outline-hidden focus:border-[#F15A35] cursor-pointer"
            >
              <option value="profit_and_loss">Profit and Loss Statement</option>
              <option value="cash_flow">Cash Flow Statement</option>
              <option value="balance_sheet">Balance Sheet</option>
            </select>
          </div>

          {/* Reporting Period Preset */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#A69C8D] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#F15A35]" />
              <span>Reporting Window:</span>
            </label>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as StatementPeriodPreset)}
              className="w-full px-3 py-2 rounded-xl bg-[#1A1918] border border-[#383632] text-white font-semibold focus:outline-hidden focus:border-[#F15A35] cursor-pointer"
            >
              <option value="current_fy">Current Financial Year (2026-27)</option>
              <option value="last_quarter">Last Quarter (90 Days)</option>
              <option value="last_30">Last 30 Days</option>
              <option value="last_60">Last 60 Days</option>
              <option value="last_90">Last 90 Days</option>
              <option value="all">All Available Records</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Accounting Basis or As-of Date Toggle */}
          <div className="space-y-1.5">
            {selectedStatement === "balance_sheet" ? (
              <>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#A69C8D] flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#138C83]" />
                  <span>As Of Date:</span>
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1918] border border-[#383632] text-white font-semibold focus:outline-hidden focus:border-[#F15A35]"
                />
              </>
            ) : (
              <>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#A69C8D] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#138C83]" />
                  <span>Accounting Basis:</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#1A1918] p-1 rounded-xl border border-[#383632]">
                  <button
                    type="button"
                    onClick={() => setAccountingBasis("cash")}
                    className={`py-1 text-center font-bold rounded-lg transition-colors cursor-pointer ${
                      accountingBasis === "cash" ? "bg-[#138C83] text-white" : "text-[#A69C8D] hover:text-white"
                    }`}
                  >
                    Cash Cleared
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountingBasis("accrual")}
                    className={`py-1 text-center font-bold rounded-lg transition-colors cursor-pointer ${
                      accountingBasis === "accrual" ? "bg-[#F15A35] text-white" : "text-[#A69C8D] hover:text-white"
                    }`}
                  >
                    Accrual Billed
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custom Date Inputs if preset === "custom" */}
        {periodPreset === "custom" && (
          <div className="mt-4 pt-3 border-t border-[#383632] flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#A69C8D]">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#1A1918] border border-[#383632] text-white font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#A69C8D]">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#1A1918] border border-[#383632] text-white font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Statement Selector Pills (Hidden during print) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
        <button
          type="button"
          onClick={() => setSelectedStatement("profit_and_loss")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatement === "profit_and_loss"
              ? "bg-[#F15A35] text-white shadow-sm"
              : "bg-white text-[#242321] border border-[#E8E1D5] hover:border-[#F15A35]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>1. Profit &amp; Loss Statement</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatement("cash_flow")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatement === "cash_flow"
              ? "bg-[#138C83] text-white shadow-sm"
              : "bg-white text-[#242321] border border-[#E8E1D5] hover:border-[#138C83]"
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>2. Cash Flow Statement</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatement("balance_sheet")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatement === "balance_sheet"
              ? "bg-[#242321] text-white shadow-sm"
              : "bg-white text-[#242321] border border-[#E8E1D5] hover:border-[#242321]"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>3. Balance Sheet</span>
        </button>
      </div>

      {/* 3. Formal Printable Statement Paper Container */}
      <div
        ref={printContainerRef}
        id="printable-statement"
        className="bg-white rounded-3xl border border-[#E8E1D5] shadow-xs p-6 sm:p-10 space-y-8 text-[#242321] print:border-none print:shadow-none print:p-0 print:m-0"
      >
        {/* Statement Formal Header */}
        <div className="border-b-2 border-[#242321] pb-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-[#242321]">
                {businessName}
              </span>
            </div>
            {profile.mcaLegalName && profile.mcaLegalName !== businessName && (
              <p className="text-xs text-[#7A7369] font-medium">
                Legal Registered Entity: <strong>{profile.mcaLegalName}</strong>
              </p>
            )}
            <div className="text-xs text-[#7A7369] space-y-0.5 pt-1">
              {profile.cin && (
                <p>
                  Corporate Identity Number (CIN): <strong className="text-[#242321]">{profile.cin}</strong>
                </p>
              )}
              {profile.gstin && (
                <p>
                  GSTIN: <strong className="text-[#242321]">{profile.gstin}</strong> • State: {profile.state}
                </p>
              )}
              {profile.registeredAddress && <p>{profile.registeredAddress}</p>}
            </div>
          </div>

          {/* Statement Title Badge Box */}
          <div className="text-left md:text-right space-y-1 shrink-0">
            <h2 className="text-lg font-black tracking-wider uppercase text-[#242321]">
              {selectedStatement === "profit_and_loss" && "Statement of Profit and Loss"}
              {selectedStatement === "cash_flow" && "Statement of Cash Flows"}
              {selectedStatement === "balance_sheet" && "Balance Sheet"}
            </h2>
            <p className="text-xs font-semibold text-[#7A7369]">
              {selectedStatement === "balance_sheet"
                ? `As of: ${formatDate(balanceSheetStatement.asOfDate)}`
                : `Period: ${selectedStatement === "profit_and_loss" ? pnlStatement.periodLabel : cashFlowStatement.periodLabel}`}
            </p>
            <p className="text-[11px] text-[#A69C8D]">
              Financial Year: {profile.financialYear || "2026-2027 (Apr - Mar)"} • Currency: Indian Rupees (INR ₹)
            </p>
            {selectedStatement === "profit_and_loss" && (
              <div className="pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7F3EA] text-[#242321] border border-[#E8E1D5]">
                  Basis: {accountingBasis.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STATEMENT 1: PROFIT AND LOSS STATEMENT                                   */}
        {/* ========================================================================= */}
        {selectedStatement === "profit_and_loss" && (
          <div className="space-y-6">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E8E1D5] bg-[#F7F3EA] text-[#242321] font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Particulars</th>
                    <th className="py-3 px-4 text-center">Classification &amp; Notes</th>
                    <th className="py-3 px-4 text-right">Amount (INR ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E1D5]">
                  {/* 1. Revenue */}
                  <tr className="bg-[#F7F3EA]/60 font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      I. {pnlStatement.revenueSection.title}
                    </td>
                    <td className="py-2.5 px-4 text-right"></td>
                  </tr>
                  {pnlStatement.revenueSection.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || (it.status === "recorded" ? "Cleared" : "—")}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? formatCurrency(it.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#DDEFE8]/40 font-bold text-[#138C83]">
                    <td className="py-2 px-4 pl-6">Total Operating Revenue</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {formatCurrency(pnlStatement.revenueSection.subtotal || 0)}
                    </td>
                  </tr>

                  {/* 2. Direct Costs / COGS */}
                  <tr className="bg-[#F7F3EA]/60 font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      II. {pnlStatement.directCostsSection.title}
                    </td>
                    <td></td>
                  </tr>
                  {pnlStatement.directCostsSection.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || "Direct Production Outlays"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? formatCurrency(it.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FCE4D8]/30 font-bold text-[#F15A35]">
                    <td className="py-2 px-4 pl-6">Total Direct Production Costs</td>
                    <td></td>
                    <td className="py-2 px-4 text-right">
                      {formatCurrency(pnlStatement.directCostsSection.subtotal || 0)}
                    </td>
                  </tr>

                  {/* Gross Profit Line */}
                  <tr className="bg-[#F7F3EA] border-y-2 border-[#E8E1D5] font-extrabold text-[#242321]">
                    <td className="py-3 px-4 text-sm uppercase">III. Gross Profit / (Loss) (I − II)</td>
                    <td className="py-3 px-4 text-center text-[11px] text-[#7A7369]">
                      Gross Trading Margin
                    </td>
                    <td className="py-3 px-4 text-right text-base text-[#138C83]">
                      {formatCurrency(pnlStatement.grossProfit)}
                    </td>
                  </tr>

                  {/* 3. Operating Expenses */}
                  <tr className="bg-[#F7F3EA]/60 font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      IV. {pnlStatement.operatingExpensesSection.title}
                    </td>
                    <td></td>
                  </tr>
                  {pnlStatement.operatingExpensesSection.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px]">
                        {it.status === "unrecorded" ? (
                          <span className="text-[#A69C8D] italic">{it.notes || "Not recorded in ledger"}</span>
                        ) : (
                          <span className="text-[#7A7369]">Operational Overhead</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? (
                          formatCurrency(it.amount)
                        ) : (
                          <span className="text-[#A69C8D] italic text-[11px]">Not recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FCE4D8]/30 font-bold text-[#F15A35]">
                    <td className="py-2 px-4 pl-6">Total Operating Expenses</td>
                    <td></td>
                    <td className="py-2 px-4 text-right">
                      {formatCurrency(pnlStatement.operatingExpensesSection.subtotal || 0)}
                    </td>
                  </tr>

                  {/* Operating Profit Line */}
                  <tr className="bg-[#F7F3EA] border-y border-[#E8E1D5] font-extrabold text-[#242321]">
                    <td className="py-3 px-4 text-sm uppercase">V. Operating Profit (EBITDA Approximation) (III − IV)</td>
                    <td className="py-3 px-4 text-center text-[11px] text-[#7A7369]">
                      Operating Surplus
                    </td>
                    <td className="py-3 px-4 text-right text-base">
                      {formatCurrency(pnlStatement.operatingProfit)}
                    </td>
                  </tr>

                  {/* 4. Taxes & Financing */}
                  <tr className="bg-[#F7F3EA]/60 font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      VI. {pnlStatement.taxesAndFinancingSection.title}
                    </td>
                    <td></td>
                  </tr>
                  {pnlStatement.taxesAndFinancingSection.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || "Statutory Outlays"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? (
                          formatCurrency(it.amount)
                        ) : (
                          <span className="text-[#A69C8D] italic text-[11px]">Not segregated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FCE4D8]/30 font-bold text-[#F15A35]">
                    <td className="py-2 px-4 pl-6">Total Taxes &amp; Finance Obligations</td>
                    <td></td>
                    <td className="py-2 px-4 text-right">
                      {formatCurrency(pnlStatement.taxesAndFinancingSection.subtotal || 0)}
                    </td>
                  </tr>

                  {/* NET PROFIT / (LOSS) ROW */}
                  <tr className="bg-[#242321] text-white font-black text-sm sm:text-base border-t-2 border-[#242321]">
                    <td className="py-4 px-4 uppercase tracking-wider">
                      VII. Net Profit / (Loss) for the Period (V − VI)
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-normal text-[#DDEFE8]">
                      Net Margin
                    </td>
                    <td className="py-4 px-4 text-right">
                      {formatCurrency(pnlStatement.netProfitOrLoss)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Disclosures Box */}
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#E8E1D5] space-y-1.5 text-xs text-[#7A7369]">
              <div className="flex items-center gap-2 font-bold text-[#242321]">
                <ShieldCheck className="w-4 h-4 text-[#138C83]" />
                <span>Statutory &amp; Accounting Disclosures</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                {pnlStatement.disclosures.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATEMENT 2: CASH FLOW STATEMENT                                         */}
        {/* ========================================================================= */}
        {selectedStatement === "cash_flow" && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E8E1D5] bg-[#F7F3EA] text-[#242321] font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Cash Flow Activities</th>
                    <th className="py-3 px-4 text-center">Notes / Verification</th>
                    <th className="py-3 px-4 text-right">Amount (INR ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E1D5]">
                  {/* Opening Cash */}
                  <tr className="bg-[#DDEFE8]/60 font-extrabold text-[#138C83] text-sm">
                    <td className="py-3 px-4">A. Opening Cash &amp; Bank Balances</td>
                    <td className="py-3 px-4 text-center text-[11px] text-[#7A7369]">
                      Live spendable funds at period start
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(cashFlowStatement.openingCashBalance)}
                    </td>
                  </tr>

                  {/* 1. Operating Activities */}
                  <tr className="bg-[#F7F3EA]/60 font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      {cashFlowStatement.operatingActivities.title}
                    </td>
                    <td></td>
                  </tr>
                  {cashFlowStatement.operatingActivities.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        Confirmed Cleared Transactions
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? formatCurrency(it.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#F7F3EA] font-bold text-[#242321]">
                    <td className="py-2 px-4 pl-6">Net Cash Flow from Operating Activities</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {formatCurrency(cashFlowStatement.operatingActivities.subtotal || 0)}
                    </td>
                  </tr>

                  {/* 2. Investing Activities */}
                  <tr className="bg-[#F7F3EA]/60 font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      {cashFlowStatement.investingActivities.title}
                    </td>
                    <td></td>
                  </tr>
                  {cashFlowStatement.investingActivities.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px]">
                        {it.status === "unrecorded" ? (
                          <span className="text-[#A69C8D] italic">{it.notes}</span>
                        ) : (
                          <span className="text-[#7A7369]">Capital Transactions</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? (
                          formatCurrency(it.amount)
                        ) : (
                          <span className="text-[#A69C8D] italic text-[11px]">Not recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#F7F3EA] font-bold text-[#242321]">
                    <td className="py-2 px-4 pl-6">Net Cash Flow from Investing Activities</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {cashFlowStatement.investingActivities.subtotal !== null
                        ? formatCurrency(cashFlowStatement.investingActivities.subtotal)
                        : "—"}
                    </td>
                  </tr>

                  {/* 3. Financing Activities */}
                  <tr className="bg-[#F7F3EA]/60 font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      {cashFlowStatement.financingActivities.title}
                    </td>
                    <td></td>
                  </tr>
                  {cashFlowStatement.financingActivities.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px]">
                        {it.status === "unrecorded" ? (
                          <span className="text-[#A69C8D] italic">{it.notes}</span>
                        ) : (
                          <span className="text-[#7A7369]">Borrowing / Capital</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? (
                          formatCurrency(it.amount)
                        ) : (
                          <span className="text-[#A69C8D] italic text-[11px]">Not recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#F7F3EA] font-bold text-[#242321]">
                    <td className="py-2 px-4 pl-6">Net Cash Flow from Financing Activities</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {cashFlowStatement.financingActivities.subtotal !== null
                        ? formatCurrency(cashFlowStatement.financingActivities.subtotal)
                        : "—"}
                    </td>
                  </tr>

                  {/* Net Change in Cash */}
                  <tr className="bg-[#FCE4D8]/60 border-t-2 border-[#E8E1D5] font-extrabold text-[#F15A35]">
                    <td className="py-3 px-4 text-sm uppercase">
                      B. Net Increase / (Decrease) in Cash (1 + 2 + 3)
                    </td>
                    <td className="py-3 px-4 text-center text-[11px] text-[#7A7369]">
                      Net Cash Delta
                    </td>
                    <td className="py-3 px-4 text-right text-base">
                      {formatCurrency(cashFlowStatement.netChangeInCash)}
                    </td>
                  </tr>

                  {/* Closing Cash Balance */}
                  <tr className="bg-[#242321] text-white font-black text-sm sm:text-base border-t-2 border-[#242321]">
                    <td className="py-4 px-4 uppercase tracking-wider">
                      C. Closing Cash &amp; Bank Balances (A + B)
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-normal text-[#DDEFE8]">
                      Closing Cash = Opening + Inflows − Outflows
                    </td>
                    <td className="py-4 px-4 text-right">
                      {formatCurrency(cashFlowStatement.closingCashBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Disclosures Box */}
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#E8E1D5] space-y-1.5 text-xs text-[#7A7369]">
              <div className="flex items-center gap-2 font-bold text-[#242321]">
                <ShieldCheck className="w-4 h-4 text-[#138C83]" />
                <span>Cash Flow Verification &amp; Exclusions</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                {cashFlowStatement.disclosures.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATEMENT 3: BALANCE SHEET                                               */}
        {/* ========================================================================= */}
        {selectedStatement === "balance_sheet" && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E8E1D5] bg-[#F7F3EA] text-[#242321] font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Balance Sheet Particulars</th>
                    <th className="py-3 px-4 text-center">Audit Notes &amp; Line Reference</th>
                    <th className="py-3 px-4 text-right">Amount (INR ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E1D5]">
                  {/* ASSETS HEADER */}
                  <tr className="bg-[#242321] text-white font-black uppercase tracking-wider text-xs">
                    <td colSpan={3} className="py-2.5 px-4">
                      I. ASSETS
                    </td>
                  </tr>

                  {/* 1. Current Assets */}
                  <tr className="bg-[#F7F3EA] font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      {balanceSheetStatement.currentAssets.title}
                    </td>
                    <td></td>
                  </tr>
                  {balanceSheetStatement.currentAssets.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || "Live Operating Ledger"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? formatCurrency(it.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#DDEFE8]/40 font-bold text-[#138C83]">
                    <td className="py-2 px-4 pl-6">Total Current Assets</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {formatCurrency(balanceSheetStatement.totalCurrentAssets)}
                    </td>
                  </tr>

                  {/* 2. Non-Current Assets */}
                  <tr className="bg-[#F7F3EA] font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      {balanceSheetStatement.nonCurrentAssets.title}
                    </td>
                    <td></td>
                  </tr>
                  {balanceSheetStatement.nonCurrentAssets.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || "Fixed Asset Registry"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? (
                          formatCurrency(it.amount)
                        ) : (
                          <span className="text-[#A69C8D] italic text-[11px]">Not recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#DDEFE8]/40 font-bold text-[#138C83]">
                    <td className="py-2 px-4 pl-6">Total Non-Current Assets</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {formatCurrency(balanceSheetStatement.totalNonCurrentAssets)}
                    </td>
                  </tr>

                  {/* TOTAL ASSETS ROW */}
                  <tr className="bg-[#DDEFE8] font-black text-sm text-[#138C83] border-y-2 border-[#138C83]/40">
                    <td className="py-3 px-4 uppercase tracking-wide">TOTAL RECORDED ASSETS</td>
                    <td className="py-3 px-4 text-center text-xs font-medium text-[#7A7369]">
                      Current Assets + Non-Current Assets
                    </td>
                    <td className="py-3 px-4 text-right text-base">
                      {formatCurrency(balanceSheetStatement.totalAssets)}
                    </td>
                  </tr>

                  {/* LIABILITIES HEADER */}
                  <tr className="bg-[#242321] text-white font-black uppercase tracking-wider text-xs">
                    <td colSpan={3} className="py-2.5 px-4">
                      II. LIABILITIES
                    </td>
                  </tr>

                  {/* 3. Current Liabilities */}
                  <tr className="bg-[#F7F3EA] font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      {balanceSheetStatement.currentLiabilities.title}
                    </td>
                    <td></td>
                  </tr>
                  {balanceSheetStatement.currentLiabilities.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || "Live Payables Registry"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? formatCurrency(it.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FCE4D8]/40 font-bold text-[#F15A35]">
                    <td className="py-2 px-4 pl-6">Total Current Liabilities</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {formatCurrency(balanceSheetStatement.totalCurrentLiabilities)}
                    </td>
                  </tr>

                  {/* 4. Non-Current Liabilities */}
                  <tr className="bg-[#F7F3EA] font-bold text-[#242321]">
                    <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide">
                      {balanceSheetStatement.nonCurrentLiabilities.title}
                    </td>
                    <td></td>
                  </tr>
                  {balanceSheetStatement.nonCurrentLiabilities.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || "Long-Term Bank Borrowings"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? formatCurrency(it.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FCE4D8]/40 font-bold text-[#F15A35]">
                    <td className="py-2 px-4 pl-6">Total Non-Current Liabilities</td>
                    <td></td>
                    <td className="py-2 px-4 text-right text-sm">
                      {formatCurrency(balanceSheetStatement.totalNonCurrentLiabilities)}
                    </td>
                  </tr>

                  {/* TOTAL LIABILITIES ROW */}
                  <tr className="bg-[#FCE4D8] font-black text-sm text-[#F15A35] border-y-2 border-[#F15A35]/40">
                    <td className="py-3 px-4 uppercase tracking-wide">TOTAL RECORDED LIABILITIES</td>
                    <td className="py-3 px-4 text-center text-xs font-medium text-[#7A7369]">
                      Current Liabilities + Non-Current Borrowings
                    </td>
                    <td className="py-3 px-4 text-right text-base">
                      {formatCurrency(balanceSheetStatement.totalLiabilities)}
                    </td>
                  </tr>

                  {/* APPROXIMATE NET ASSETS ROW */}
                  <tr className="bg-[#F7F3EA] border-y-2 border-[#242321] font-black text-sm text-[#242321]">
                    <td className="py-3.5 px-4 uppercase tracking-wider">
                      III. APPROXIMATE NET ASSETS (ASSETS − LIABILITIES)
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-semibold text-[#138C83]">
                      Net Book Equity Base
                    </td>
                    <td className="py-3.5 px-4 text-right text-base font-extrabold text-[#138C83]">
                      {formatCurrency(balanceSheetStatement.approximateNetAssets)}
                    </td>
                  </tr>

                  {/* EQUITY HEADER */}
                  <tr className="bg-[#242321] text-white font-black uppercase tracking-wider text-xs">
                    <td colSpan={3} className="py-2.5 px-4">
                      IV. EQUITY &amp; SHAREHOLDERS&apos; FUNDS
                    </td>
                  </tr>
                  {balanceSheetStatement.equitySection.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F7F3EA]/30">
                      <td className="py-2.5 px-4 pl-8 text-[#242321] font-medium">{it.label}</td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-[#7A7369]">
                        {it.notes || (it.status === "derived" ? "Calculated from books" : "MCA Verified")}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {it.amount !== null ? (
                          formatCurrency(it.amount)
                        ) : (
                          <span className="text-[#A69C8D] italic text-[11px]">Requires formal audit</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* TOTAL LIABILITIES AND EQUITY ROW */}
                  {balanceSheetStatement.totalLiabilitiesAndEquity !== null && (
                    <tr className="bg-[#242321] text-white font-black text-sm sm:text-base border-t-2 border-[#242321]">
                      <td className="py-4 px-4 uppercase tracking-wider">
                        TOTAL LIABILITIES AND EQUITY
                      </td>
                      <td className="py-4 px-4 text-center text-xs font-normal text-[#DDEFE8]">
                        Liabilities + Equity
                      </td>
                      <td className="py-4 px-4 text-right">
                        {formatCurrency(balanceSheetStatement.totalLiabilitiesAndEquity)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Disclosures Box */}
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#E8E1D5] space-y-1.5 text-xs text-[#7A7369]">
              <div className="flex items-center gap-2 font-bold text-[#242321]">
                <ShieldCheck className="w-4 h-4 text-[#138C83]" />
                <span>Balance Sheet Accounting Notes</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                {balanceSheetStatement.disclosures.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Formal Signature & Verification Footer */}
        <div className="pt-8 border-t border-[#E8E1D5] flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-[#7A7369]">
          <div className="space-y-1">
            <p className="font-bold text-[#242321]">COINCISE Automated Financial Ledger Platform</p>
            <p className="text-[11px]">Generated on: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
            <p className="text-[10px] text-[#A69C8D]">
              Note: Unaudited management statement generated from operational financial books.
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="w-48 border-b border-[#242321]/40 sm:ml-auto pb-6">
              <span className="text-[10px] text-[#A69C8D] uppercase tracking-wider">Authorized Signatory</span>
            </div>
            <p className="text-[11px] font-bold text-[#242321]">{businessName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
