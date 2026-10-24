"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ReceiptText,
  Search,
  Filter,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit2,
  Download,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  HardDrive,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FinancialRecord, TransactionType, PaymentStatus } from "@/lib/types";
import {
  getFinancialRecords,
  addFinancialRecord,
  updateFinancialRecord,
  deleteFinancialRecord,
  resetFinancialRecords,
  calculateFinancialTotals,
  subscribeToFinancialRecords,
  getStorageError,
} from "@/lib/data-service";
import { formatCurrency, formatDate } from "@/lib/utils";

const INCOME_CATEGORIES = [
  "Client Milestone Payment",
  "Product Sales",
  "Job Work Services",
  "Consulting & Retainers",
  "Tax Refund / Subsidy",
  "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Raw Materials",
  "Payroll & Wages",
  "Facility & Utilities",
  "Maintenance & Tooling",
  "Logistics & Freight",
  "Vendor Settlement",
  "Equipment Lease",
  "Software & Subscriptions",
  "Other Expense",
];

const PAYMENT_METHODS = [
  "Bank Transfer (NEFT)",
  "RTGS",
  "IMPS",
  "UPI / QR",
  "Corporate Card",
  "Auto-Debit",
  "Cheque",
  "Cash",
];

type SortField = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "status";

export default function RecordsPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageErrorNotice, setStorageErrorNotice] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date_desc");

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<TransactionType>("income");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState("Client Milestone Payment");
  const [formAmount, setFormAmount] = useState("");
  const [formPaidAmount, setFormPaidAmount] = useState("");
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>("completed");
  const [formDescription, setFormDescription] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("Bank Transfer (NEFT)");
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Validation Error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load from Data Service & Subscribe to updates
  useEffect(() => {
    const loaded = getFinancialRecords();
    setRecords(loaded);
    setIsLoading(false);
    setStorageErrorNotice(getStorageError());

    const unsubscribe = subscribeToFinancialRecords((updatedRecords) => {
      setRecords(updatedRecords);
      setStorageErrorNotice(getStorageError());
    });

    return () => unsubscribe();
  }, []);

  // Compute live totals strictly segregating cleared vs expected
  const totals = useMemo(() => calculateFinancialTotals(records), [records]);

  // Handle payment status switch in form to maintain mathematical integrity
  const handlePaymentStatusChange = (newStatus: PaymentStatus, currentTotalStr: string) => {
    setFormPaymentStatus(newStatus);
    const numTotal = Number(currentTotalStr) || 0;

    if (newStatus === "completed") {
      setFormPaidAmount(numTotal > 0 ? numTotal.toString() : "");
    } else if (newStatus === "expected") {
      setFormPaidAmount("0");
    } else if (newStatus === "partially_paid") {
      // Default to 50% as a starting point if no paid amount exists
      const half = numTotal > 0 ? Math.round(numTotal * 0.5).toString() : "";
      setFormPaidAmount(half);
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setFormAmount(val);
    const num = Number(val) || 0;
    if (formPaymentStatus === "completed") {
      setFormPaidAmount(num > 0 ? num.toString() : "");
    } else if (formPaymentStatus === "expected") {
      setFormPaidAmount("0");
    }
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setFormType("income");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCategory(INCOME_CATEGORIES[0]);
    setFormAmount("");
    setFormPaidAmount("");
    setFormPaymentStatus("completed");
    setFormDescription("");
    setFormPaymentMethod(PAYMENT_METHODS[0]);
    setFormReference(`TXN-${Math.floor(10000 + Math.random() * 90000)}`);
    setFormNotes("");
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  const openEditModal = (rec: FinancialRecord) => {
    setEditingRecord(rec);
    setFormType(rec.type);
    setFormDate(rec.date);
    setFormCategory(rec.category);
    setFormAmount(rec.amount.toString());
    setFormPaidAmount(rec.paidAmount.toString());
    setFormPaymentStatus(rec.paymentStatus);
    setFormDescription(rec.description);
    setFormPaymentMethod(rec.paymentMethod);
    setFormReference(rec.reference || "");
    setFormNotes(rec.notes || "");
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const amountNum = parseFloat(formAmount);
    const paidAmountNum = parseFloat(formPaidAmount || "0");

    const payload = {
      date: formDate,
      type: formType,
      category: formCategory,
      amount: isNaN(amountNum) ? 0 : amountNum,
      paidAmount: isNaN(paidAmountNum) ? 0 : paidAmountNum,
      paymentStatus: formPaymentStatus,
      description: formDescription.trim(),
      paymentMethod: formPaymentMethod,
      reference: formReference.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    if (editingRecord) {
      const res = updateFinancialRecord(editingRecord.id, payload);
      if (res.success) {
        setIsFormModalOpen(false);
        showToast("Record updated successfully and persisted.");
      } else if (res.errors) {
        setFieldErrors(res.errors);
      }
    } else {
      const res = addFinancialRecord(payload);
      if (res.success) {
        setIsFormModalOpen(false);
        showToast(
          `Recorded ${formType.toUpperCase()} of ${formatCurrency(amountNum)} (${formPaymentStatus})`
        );
      } else if (res.errors) {
        setFieldErrors(res.errors);
      }
    }
  };

  const confirmDelete = () => {
    if (!recordToDelete) return;
    const ok = deleteFinancialRecord(recordToDelete.id);
    if (ok) {
      showToast("Record deleted from ledger.");
    }
    setRecordToDelete(null);
  };

  const handleResetData = () => {
    if (confirm("Reset financial records to initial demo records? Any custom entries will be reverted.")) {
      resetFinancialRecords();
      showToast("Financial records reset to baseline demo dataset.");
    }
  };

  // Filter & Sort Logic
  const filteredAndSortedRecords = useMemo(() => {
    return records
      .filter((rec) => {
        const matchesSearch =
          rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (rec.reference && rec.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (rec.notes && rec.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType = typeFilter === "all" || rec.type === typeFilter;
        const matchesStatus = statusFilter === "all" || rec.paymentStatus === statusFilter;
        const matchesCategory = categoryFilter === "all" || rec.category === categoryFilter;

        return matchesSearch && matchesType && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        if (sortField === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortField === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortField === "amount_desc") return b.amount - a.amount;
        if (sortField === "amount_asc") return a.amount - b.amount;
        if (sortField === "status") return a.paymentStatus.localeCompare(b.paymentStatus);
        return 0;
      });
  }, [records, searchQuery, typeFilter, statusFilter, categoryFilter, sortField]);

  // All unique categories for dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.category));
    return Array.from(set).sort();
  }, [records]);

  // Export filtered dataset to CSV
  const exportCSV = () => {
    const headers =
      "ID,Date,Type,Category,Description,TotalAmount,PaidAmount,PendingAmount,PaymentStatus,PaymentMethod,Reference,Notes\n";
    const rows = filteredAndSortedRecords
      .map((r) => {
        const pending = Math.max(0, r.amount - r.paidAmount);
        const sanitize = (val: string = "") => `"${val.replace(/"/g, '""')}"`;
        return [
          r.id,
          r.date,
          r.type,
          sanitize(r.category),
          sanitize(r.description),
          r.amount,
          r.paidAmount,
          pending,
          r.paymentStatus,
          sanitize(r.paymentMethod),
          sanitize(r.reference),
          sanitize(r.notes),
        ].join(",");
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coincise-financial-records-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    showToast(`Exported ${filteredAndSortedRecords.length} records to CSV!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs shadow-sm animate-in fade-in duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Storage Warning if restricted */}
      {storageErrorNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <HardDrive className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Storage Notice: {storageErrorNotice}. Running in robust in-memory session mode.
          </span>
        </div>
      )}

      {/* Top Banner: Accounting Integrity & Strict Realized Segregation */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              ACCOUNTING ENGINE
            </span>
            <span className="text-xs text-slate-300">
              Strict Cash vs. Expected Segregation
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Financial Records & Ledger Management
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
            Record, audit, and categorize actual bank receipts and disbursements. Uncollected invoices remain tracked under expected inflows and are <strong>never</strong> counted as liquid cash.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetData}
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reset Ledger
          </Button>
          <Button variant="primary" size="sm" onClick={openAddModal}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Add Record
          </Button>
        </div>
      </div>

      {/* 5 Core Financial Total Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Cleared Real Cash Inflow */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Cleared Inflows
              </span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">
              +{formatCurrency(totals.clearedInflows)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Realized bank credits</p>
        </div>

        {/* Cleared Real Cash Outflow */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Cleared Outflows
              </span>
              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-rose-600 mt-1">
              -{formatCurrency(totals.clearedOutflows)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Realized bank debits</p>
        </div>

        {/* Net Realized Cash */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Net Operating Cash
              </span>
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <ReceiptText className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3
              className={`text-xl font-bold mt-1 ${
                totals.netClearedCash >= 0 ? "text-blue-600" : "text-amber-600"
              }`}
            >
              {totals.netClearedCash >= 0 ? "+" : ""}
              {formatCurrency(totals.netClearedCash)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Current net liquidity</p>
        </div>

        {/* Expected Inflows (Pending Receivables) */}
        <div className="p-4 bg-white rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                Expected Inflows
              </span>
              <Badge variant="warning" size="sm">
                Unrealized
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-amber-700 mt-1">
              {formatCurrency(totals.expectedInflows)}
            </h3>
          </div>
          <p className="text-[10px] text-amber-800 font-medium mt-2">
            ⚠️ Not counted in available cash
          </p>
        </div>

        {/* Expected Outflows (Pending Payables) */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Expected Outflows
              </span>
              <Badge variant="neutral" size="sm">
                Pending
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mt-1">
              {formatCurrency(totals.expectedOutflows)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Upcoming obligations</p>
        </div>
      </div>

      {/* Main Ledger Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Financial Transaction Ledger</span>
              <Badge variant="neutral" size="sm">
                {filteredAndSortedRecords.length} of {records.length} Records
              </Badge>
            </CardTitle>
            <CardDescription>
              Local browser persistence enabled • Structured data model ready for Supabase migration
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={openAddModal}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              New Transaction
            </Button>
          </div>
        </CardHeader>

        {/* Advanced Search, Filtering & Sorting Controls */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search memo, category, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="amount_desc">Amount: Highest First</option>
                <option value="amount_asc">Amount: Lowest First</option>
                <option value="status">Status: Completed First</option>
              </select>
            </div>

            {/* Status Quick Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | PaymentStatus)}
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Payment Statuses</option>
                <option value="completed">Completed (100% Cleared)</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="expected">Expected (Uncollected)</option>
              </select>
            </div>
          </div>

          {/* Quick Type Filter Tabs */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 mr-1 font-medium">Type:</span>
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                All Records ({records.length})
              </button>
              <button
                onClick={() => setTypeFilter("income")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === "income"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Income ({records.filter((r) => r.type === "income").length})
              </button>
              <button
                onClick={() => setTypeFilter("expense")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  typeFilter === "expense"
                    ? "bg-rose-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Expenses ({records.filter((r) => r.type === "expense").length})
              </button>
            </div>

            {(searchQuery || typeFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Ledger Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-4">Description & Ref</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Cleared Cash</th>
                <th className="py-3 px-4 text-right">Expected Due</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">No financial records found</p>
                    <p className="text-xs mt-1">Try relaxing your search query or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRecords.map((r) => {
                  const pendingDue = Math.max(0, r.amount - r.paidAmount);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-slate-900 whitespace-nowrap">
                        {formatDate(r.date)}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate">{r.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.reference && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Ref: {r.reference}
                            </span>
                          )}
                          {r.notes && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={r.notes}>
                              • {r.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
                          {r.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        <span className={r.type === "income" ? "text-emerald-700" : "text-rose-700"}>
                          {r.type === "income" ? "+ " : "- "}
                          {formatCurrency(r.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {r.paidAmount > 0 ? (
                          formatCurrency(r.paidAmount)
                        ) : (
                          <span className="text-slate-400">₹0 (Unpaid)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-amber-700 whitespace-nowrap">
                        {pendingDue > 0 ? formatCurrency(pendingDue) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            r.paymentStatus === "completed"
                              ? "success"
                              : r.paymentStatus === "partially_paid"
                              ? "warning"
                              : "info"
                          }
                          size="sm"
                        >
                          {r.paymentStatus === "completed"
                            ? "✓ Completed"
                            : r.paymentStatus === "partially_paid"
                            ? "Partially Paid"
                            : "Expected"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {r.paymentMethod}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Transaction Modal with Zod Validation */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingRecord ? "Edit Financial Record" : "Add Financial Transaction"}
        description="Records are validated and stored locally, ready for seamless Supabase migration."
        className="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Income vs Expense Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setFormType("income");
                setFormCategory(INCOME_CATEGORIES[0]);
              }}
              className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                formType === "income"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Cash Income (Inflow)
            </button>
            <button
              type="button"
              onClick={() => {
                setFormType("expense");
                setFormCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                formType === "expense"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              - Cash Expense (Outflow)
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Transaction Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 50000"
                value={formAmount}
                onChange={(e) => handleTotalAmountChange(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  fieldErrors.amount ? "border-rose-500" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {fieldErrors.amount && (
                <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  fieldErrors.date ? "border-rose-500" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {fieldErrors.date && (
                <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.date}</p>
              )}
            </div>
          </div>

          {/* Payment Status & Paid Amount Tracking */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Payment Realization Status *
              </label>
              <span className="text-[10px] text-slate-500">
                Determines liquid bank realization
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePaymentStatusChange("completed", formAmount)}
                className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                  formPaymentStatus === "completed"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ✓ Completed
                <span className="block text-[10px] font-normal opacity-90">100% Cleared</span>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentStatusChange("partially_paid", formAmount)}
                className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                  formPaymentStatus === "partially_paid"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ⚡ Partially Paid
                <span className="block text-[10px] font-normal opacity-90">Part Cleared</span>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentStatusChange("expected", formAmount)}
                className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                  formPaymentStatus === "expected"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ⏳ Expected
                <span className="block text-[10px] font-normal opacity-90">Uncollected</span>
              </button>
            </div>

            {/* Paid Amount Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Actual Cleared Amount Received/Paid (₹) *
                </label>
                {formPaymentStatus === "partially_paid" && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    Remaining Expected:{" "}
                    {formatCurrency(
                      Math.max(0, (Number(formAmount) || 0) - (Number(formPaidAmount) || 0))
                    )}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="any"
                disabled={formPaymentStatus === "expected"}
                required
                placeholder="0"
                value={formPaidAmount}
                onChange={(e) => setFormPaidAmount(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  fieldErrors.paidAmount ? "border-rose-500" : "border-slate-300"
                } ${
                  formPaymentStatus === "expected" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {fieldErrors.paidAmount && (
                <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.paidAmount}</p>
              )}
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {(formType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Channel
              </label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Memo *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 50x valve batch delivery acceptance payment"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                fieldErrors.description ? "border-rose-500" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.description}</p>
            )}
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction / Invoice Ref
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-99420 or INV-089"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes & Terms (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 50% advance received, balance on delivery"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Accounting Guardrail Callout */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>COINCISE Principle:</strong> Only the actual cleared funds (₹{formPaidAmount || 0}) enter available liquidity calculations. Expected amounts are safely buffered.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingRecord ? "Update Record" : "Save Record"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={recordToDelete !== null}
        onClose={() => setRecordToDelete(null)}
        title="Delete Financial Record"
        description="Are you sure you want to permanently remove this transaction from your local ledger?"
      >
        <div className="space-y-4">
          {recordToDelete && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-900">{recordToDelete.description}</p>
              <p className="text-slate-600">
                {recordToDelete.category} • {formatDate(recordToDelete.date)}
              </p>
              <p className="font-semibold text-slate-900">
                Amount: {formatCurrency(recordToDelete.amount)} ({recordToDelete.paymentStatus})
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRecordToDelete(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
