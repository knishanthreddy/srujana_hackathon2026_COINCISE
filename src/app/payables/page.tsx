"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  Filter,
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building,
  DollarSign,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  CreditCard,
  Split,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Payable, InvoiceStatus } from "@/lib/types";
import {
  getPayables,
  addPayable,
  updatePayable,
  deletePayable,
  recordPayablePayment,
  calculatePayablesTotals,
  subscribeToPayables,
} from "@/lib/data-service";
import { formatCurrency, formatDate } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  "Raw Material",
  "Equipment & Spares",
  "Consumables",
  "Logistics & Freight",
  "Facility Rent",
  "Utility Tariff",
  "Solar Capex Installment",
  "Contract Labor",
  "Other Obligation",
];

const PAYMENT_CHANNELS = [
  "Bank Transfer (NEFT)",
  "RTGS",
  "IMPS",
  "Corporate Card",
  "Auto-Debit",
  "Cheque",
  "Cash",
];

const SCHEDULE_TERMS = [
  "Immediate / Due on Receipt",
  "Net 15 Days",
  "Net 30 Days",
  "Net 45 Days",
  "Net 60 Days",
  "50% Advance / 50% on Delivery",
  "Quarterly Installment",
];

export default function PayablesPage() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const [payableToDelete, setPayableToDelete] = useState<Payable | null>(null);

  // Disburse Payment Modal
  const [disburseTarget, setDisburseTarget] = useState<Payable | null>(null);
  const [disburseAmount, setDisburseAmount] = useState("");
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().split("T")[0]);
  const [disburseChannel, setDisburseChannel] = useState("RTGS");
  const [disburseRef, setDisburseRef] = useState("");
  const [syncToLedger, setSyncToLedger] = useState(true);

  // Form Fields
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Validation & Toast
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setPayables(getPayables());
    const unsubscribe = subscribeToPayables((updated) => {
      setPayables(updated);
    });
    return () => unsubscribe();
  }, []);

  const totals = useMemo(() => calculatePayablesTotals(payables), [payables]);

  const openAddModal = () => {
    setEditingPayable(null);
    setVendorName("");
    setInvoiceNumber(`SUP-${Math.floor(1000 + Math.random() * 9000)}`);
    setTotalAmount("");
    setPaidAmount("0");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]);
    setCategory(EXPENSE_CATEGORIES[0]);
    setContactEmail("");
    setNotes("");
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: Payable) => {
    setEditingPayable(item);
    setVendorName(item.vendorName);
    setInvoiceNumber(item.invoiceNumber);
    setTotalAmount(item.totalAmount.toString());
    setPaidAmount(item.paidAmount.toString());
    setIssueDate(item.issueDate);
    setDueDate(item.dueDate);
    setCategory(item.category);
    setContactEmail(item.contactEmail || "");
    setNotes(item.notes || "");
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const totalNum = parseFloat(totalAmount);
    const paidNum = parseFloat(paidAmount || "0");

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      vendorName: vendorName.trim(),
      totalAmount: isNaN(totalNum) ? 0 : totalNum,
      paidAmount: isNaN(paidNum) ? 0 : paidNum,
      issueDate,
      dueDate,
      category,
      contactEmail: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingPayable) {
      const res = updatePayable(editingPayable.id, payload);
      if (res.success) {
        setIsFormModalOpen(false);
        showToast(`Bill #${payload.invoiceNumber} updated successfully.`);
      } else if (res.errors) {
        setFieldErrors(res.errors);
      }
    } else {
      const res = addPayable(payload);
      if (res.success) {
        setIsFormModalOpen(false);
        showToast(`Vendor bill #${payload.invoiceNumber} added to payment obligations.`);
      } else if (res.errors) {
        setFieldErrors(res.errors);
      }
    }
  };

  const handleDisbursePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseTarget) return;

    const amt = parseFloat(disburseAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid disbursement amount", "error");
      return;
    }

    if (amt > disburseTarget.balanceDue) {
      showToast(`Payment cannot exceed outstanding liability of ${formatCurrency(disburseTarget.balanceDue)}`, "error");
      return;
    }

    const res = recordPayablePayment(disburseTarget.id, {
      paymentAmount: amt,
      paymentDate: disburseDate,
      paymentMethod: disburseChannel,
      reference: disburseRef.trim() || undefined,
      syncToCashLedger: syncToLedger,
    });

    if (res.success) {
      setDisburseTarget(null);
      setDisburseAmount("");
      showToast(
        `Disbursed ${formatCurrency(amt)} to ${disburseTarget.vendorName}.${
          syncToLedger ? " Deducted from cleared bank balance." : ""
        }`
      );
    } else {
      showToast(res.error || "Disbursement failed", "error");
    }
  };

  const confirmDelete = () => {
    if (!payableToDelete) return;
    deletePayable(payableToDelete.id);
    showToast(`Bill #${payableToDelete.invoiceNumber} removed.`);
    setPayableToDelete(null);
  };

  // Filtered List
  const filtered = useMemo(() => {
    return payables.filter((p) => {
      const matchesSearch =
        p.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [payables, searchQuery, statusFilter, categoryFilter]);

  // Export to CSV
  const exportCSV = () => {
    const headers = "BillNumber,VendorName,Category,TotalAmount,PaidAmount,BalanceDue,IssueDate,DueDate,Status,Email,Notes\n";
    const rows = filtered
      .map((p) => {
        const sanitize = (val: string = "") => `"${val.replace(/"/g, '""')}"`;
        return [
          sanitize(p.invoiceNumber),
          sanitize(p.vendorName),
          sanitize(p.category),
          p.totalAmount,
          p.paidAmount,
          p.balanceDue,
          p.issueDate,
          p.dueDate,
          p.status,
          sanitize(p.contactEmail),
          sanitize(p.notes),
        ].join(",");
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coincise-payables-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    showToast(`Exported ${filtered.length} supplier payables to CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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

      {/* KPI Cards: Payables & Cash Outflow Risk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Booked Liabilities */}
        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wide">
              Total Invoiced Bills
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#242321] mt-1">
              {formatCurrency(totals.totalPayables)}
            </h3>
          </div>
          <p className="text-[11px] text-[#7A7369] mt-2 pt-2 border-t border-[#E8E1D5]/60">
            Settled to Date: <strong className="text-[#138C83]">{formatCurrency(totals.totalPaid)}</strong>
          </p>
        </div>

        {/* Total Outstanding Payables */}
        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wide">
                Committed Liabilities
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-[#F15A35]" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#242321] mt-1">
              {formatCurrency(totals.totalBalanceDue)}
            </h3>
          </div>
          <p className="text-[11px] text-[#7A7369] mt-2 pt-2 border-t border-[#E8E1D5]/60">Unsettled supplier dues</p>
        </div>

        {/* Overdue / Escalated Payables */}
        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#F15A35] uppercase tracking-wide">
                Past Due Date
              </span>
              <Badge variant="danger" size="sm">
                {totals.overdueCount} Vendor Bills
              </Badge>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#F15A35] mt-1">
              {formatCurrency(totals.overdueBalance)}
            </h3>
          </div>
          <p className="text-[11px] text-[#A69C8D] mt-2 pt-2 border-t border-[#E8E1D5]/60">Subject to late surcharges & dispute</p>
        </div>

        {/* Upcoming Scheduled Dues */}
        <div className="p-5 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wide">
                Due Within Window
              </span>
              <Badge variant="warning" size="sm">
                Pacing Required
              </Badge>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#242321] mt-1">
              {formatCurrency(totals.pendingBalance)}
            </h3>
          </div>
          <p className="text-[11px] text-[#A69C8D] mt-2 pt-2 border-t border-[#E8E1D5]/60">Active supplier grace periods</p>
        </div>
      </div>

      {/* Main Payables Management Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Supplier Liabilities & Scheduled Outflows</span>
              <Badge variant="neutral" size="sm">
                {filtered.length} of {payables.length} Bills
              </Badge>
            </CardTitle>
            <CardDescription>
              Automatic balance calculations • Grace period tracking • Pacing to protect working capital
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={openAddModal}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Add Vendor Bill
            </Button>
          </div>
        </CardHeader>

        {/* Filter Controls */}
        <div className="px-5 py-3.5 border-b border-[#E8E1D5] bg-[#F7F3EA]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#A69C8D]" />
            <input
              type="text"
              placeholder="Search vendor, bill #, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-[#E8E1D5] text-[#242321] placeholder:text-[#A69C8D] focus:outline-none focus:ring-2 focus:ring-[#F15A35]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs text-[#7A7369] mr-1 hidden sm:inline font-bold">Status:</span>
            {["all", "pending", "overdue", "partially_paid", "paid"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-[#F15A35] text-white shadow-xs"
                    : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Bill #</th>
                <th className="py-3 px-4">Vendor / Supplier</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total Bill</th>
                <th className="py-3 px-4 text-right">Settled</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No supplier obligations match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 font-mono">
                      {item.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-900 truncate">{item.vendorName}</p>
                      {item.notes && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5" title={item.notes}>
                          {item.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-700">{formatDate(item.dueDate)}</span>
                      {item.status === "overdue" && item.balanceDue > 0 && (
                        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-700 whitespace-nowrap">
                      {item.paidAmount > 0 ? formatCurrency(item.paidAmount) : "₹0"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      <span className={item.balanceDue > 0 ? "text-slate-900" : "text-slate-400"}>
                        {formatCurrency(item.balanceDue)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant={
                          item.status === "paid"
                            ? "success"
                            : item.status === "overdue"
                            ? "danger"
                            : item.status === "partially_paid"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.balanceDue > 0 ? (
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-7 text-xs px-2.5 bg-rose-600 hover:bg-rose-700"
                            onClick={() => {
                              setDisburseTarget(item);
                              setDisburseAmount(item.balanceDue.toString());
                              setDisburseDate(new Date().toISOString().split("T")[0]);
                              setDisburseRef(`PAY-VEN-${item.invoiceNumber}`);
                            }}
                          >
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            Disburse
                          </Button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded">
                            Settled
                          </span>
                        )}

                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Bill"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPayableToDelete(item)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disburse Supplier Payment Modal */}
      <Modal
        isOpen={disburseTarget !== null}
        onClose={() => setDisburseTarget(null)}
        title="Disburse Supplier Payment"
        description={`Authorizing payment to ${disburseTarget?.vendorName} (Bill #${disburseTarget?.invoiceNumber})`}
      >
        <form onSubmit={handleDisbursePayment} className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500 font-medium">Remaining Liability</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {disburseTarget && formatCurrency(disburseTarget.balanceDue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium">Total Bill</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {disburseTarget && formatCurrency(disburseTarget.totalAmount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                max={disburseTarget?.balanceDue}
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Can be partial tranche or full payoff
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Date *
              </label>
              <input
                type="date"
                required
                value={disburseDate}
                onChange={(e) => setDisburseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Banking Channel
              </label>
              <select
                value={disburseChannel}
                onChange={(e) => setDisburseChannel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PAYMENT_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Ref / UTR No.
              </label>
              <input
                type="text"
                value={disburseRef}
                onChange={(e) => setDisburseRef(e.target.value)}
                placeholder="UTR-XXXX"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Sync to Cash Ledger Option */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
            <input
              type="checkbox"
              id="syncToLedgerPayable"
              checked={syncToLedger}
              onChange={(e) => setSyncToLedger(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="syncToLedgerPayable" className="text-xs text-rose-900 cursor-pointer">
              <strong>Synchronize to Cash Ledger:</strong> Automatically record a cleared expense in Financial Records so available cash accurately decreases without double-counting.
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDisburseTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-700">
              Confirm Disbursement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Vendor Bill Modal with Zod Validation */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingPayable ? "Edit Vendor Bill" : "Add Supplier Obligation"}
        description="Records committed supplier liabilities, due dates, and payment schedules."
      >
        <form onSubmit={handleSaveBill} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vendor / Supplier Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bharat Alloys Corp"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                fieldErrors.vendorName ? "border-rose-500" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {fieldErrors.vendorName && (
              <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.vendorName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill / Invoice Number *
              </label>
              <input
                type="text"
                required
                placeholder="SUP-XXXX"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  fieldErrors.invoiceNumber ? "border-rose-500" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
              />
              {fieldErrors.invoiceNumber && (
                <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.invoiceNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Bill Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="150000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  fieldErrors.totalAmount ? "border-rose-500" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {fieldErrors.totalAmount && (
                <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.totalAmount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Already Settled Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  fieldErrors.paidAmount ? "border-rose-500" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {fieldErrors.paidAmount && (
                <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.paidAmount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Schedule & Terms Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Net 30 terms, late payment incurs 1.5% interest penalty"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
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
              {editingPayable ? "Update Bill" : "Save Obligation"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={payableToDelete !== null}
        onClose={() => setPayableToDelete(null)}
        title="Delete Supplier Payable"
        description="Are you sure you want to delete this vendor liability?"
      >
        <div className="space-y-4">
          {payableToDelete && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-900">{payableToDelete.vendorName}</p>
              <p className="text-slate-600">
                Bill: {payableToDelete.invoiceNumber} • Outstanding: {formatCurrency(payableToDelete.balanceDue)}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPayableToDelete(null)}
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
