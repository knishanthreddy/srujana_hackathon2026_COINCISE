"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  Search,
  Filter,
  PlusCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Receipt,
  Mail,
  DollarSign,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  TrendingDown,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Receivable, InvoiceStatus } from "@/lib/types";
import {
  getReceivables,
  addReceivable,
  updateReceivable,
  deleteReceivable,
  recordReceivablePayment,
  calculateReceivablesTotals,
  subscribeToReceivables,
} from "@/lib/data-service";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAYMENT_CHANNELS = [
  "Bank Transfer (NEFT)",
  "RTGS",
  "IMPS",
  "UPI / QR",
  "Corporate Card",
  "Cheque",
  "Cash",
];

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [receivableToDelete, setReceivableToDelete] = useState<Receivable | null>(null);

  // Payment Recording Modal
  const [paymentTarget, setPaymentTarget] = useState<Receivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentChannel, setPaymentChannel] = useState("Bank Transfer (NEFT)");
  const [paymentRef, setPaymentRef] = useState("");
  const [syncToLedger, setSyncToLedger] = useState(true);

  // Invoice Form Fields
  const [customerName, setCustomerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
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
    setReceivables(getReceivables());
    const unsubscribe = subscribeToReceivables((updated) => {
      setReceivables(updated);
    });
    return () => unsubscribe();
  }, []);

  const totals = useMemo(() => calculateReceivablesTotals(receivables), [receivables]);

  // Open Create Modal
  const openAddModal = () => {
    setEditingReceivable(null);
    setCustomerName("");
    setInvoiceNumber(`INV-2026-${Math.floor(100 + Math.random() * 900)}`);
    setTotalAmount("");
    setPaidAmount("0");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
    setContactEmail("");
    setNotes("");
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rec: Receivable) => {
    setEditingReceivable(rec);
    setCustomerName(rec.customerName);
    setInvoiceNumber(rec.invoiceNumber);
    setTotalAmount(rec.totalAmount.toString());
    setPaidAmount(rec.paidAmount.toString());
    setIssueDate(rec.issueDate);
    setDueDate(rec.dueDate);
    setContactEmail(rec.contactEmail || "");
    setNotes(rec.notes || "");
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  // Handle Form Submission (Add or Update)
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const totalNum = parseFloat(totalAmount);
    const paidNum = parseFloat(paidAmount || "0");

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      customerName: customerName.trim(),
      totalAmount: isNaN(totalNum) ? 0 : totalNum,
      paidAmount: isNaN(paidNum) ? 0 : paidNum,
      issueDate,
      dueDate,
      contactEmail: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingReceivable) {
      const res = updateReceivable(editingReceivable.id, payload);
      if (res.success) {
        setIsFormModalOpen(false);
        showToast(`Invoice ${payload.invoiceNumber} updated successfully.`);
      } else if (res.errors) {
        setFieldErrors(res.errors);
      }
    } else {
      const res = addReceivable(payload);
      if (res.success) {
        setIsFormModalOpen(false);
        showToast(`Invoice ${payload.invoiceNumber} created and tracked.`);
      } else if (res.errors) {
        setFieldErrors(res.errors);
      }
    }
  };

  // Handle Recording Partial or Full Customer Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid positive payment amount", "error");
      return;
    }

    if (amt > paymentTarget.balanceDue) {
      showToast(`Payment cannot exceed outstanding balance of ${formatCurrency(paymentTarget.balanceDue)}`, "error");
      return;
    }

    const res = recordReceivablePayment(paymentTarget.id, {
      paymentAmount: amt,
      paymentDate,
      paymentMethod: paymentChannel,
      reference: paymentRef.trim() || undefined,
      syncToCashLedger: syncToLedger,
    });

    if (res.success) {
      setPaymentTarget(null);
      setPaymentAmount("");
      showToast(
        `Recorded payment of ${formatCurrency(amt)} for ${paymentTarget.customerName}.${
          syncToLedger ? " Added to cleared bank ledger." : ""
        }`
      );
    } else {
      showToast(res.error || "Payment recording failed", "error");
    }
  };

  const confirmDelete = () => {
    if (!receivableToDelete) return;
    deleteReceivable(receivableToDelete.id);
    showToast(`Invoice ${receivableToDelete.invoiceNumber} deleted.`);
    setReceivableToDelete(null);
  };

  // Filtered List
  const filtered = useMemo(() => {
    return receivables.filter((r) => {
      const matchesSearch =
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receivables, searchQuery, statusFilter]);

  // Export to CSV
  const exportCSV = () => {
    const headers = "InvoiceNumber,CustomerName,TotalAmount,PaidAmount,BalanceDue,IssueDate,DueDate,Status,DaysOverdue,Email,Notes\n";
    const rows = filtered
      .map((r) => {
        const sanitize = (val: string = "") => `"${val.replace(/"/g, '""')}"`;
        return [
          sanitize(r.invoiceNumber),
          sanitize(r.customerName),
          r.totalAmount,
          r.paidAmount,
          r.balanceDue,
          r.issueDate,
          r.dueDate,
          r.status,
          r.daysOverdue,
          sanitize(r.contactEmail),
          sanitize(r.notes),
        ].join(",");
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coincise-receivables-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    showToast(`Exported ${filtered.length} customer receivables to CSV.`);
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

      {/* KPI Cards: Receivables & Collection Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Book */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Total Invoiced Book
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(totals.totalReceivables)}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Collected: <strong className="text-emerald-700">{formatCurrency(totals.totalPaid)}</strong>
          </p>
        </div>

        {/* Total Outstanding Balance */}
        <div className="p-4 bg-white rounded-xl border border-blue-200/90 bg-blue-50/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide">
                Total Outstanding
              </span>
              <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-blue-700 mt-1">
              {formatCurrency(totals.totalBalanceDue)}
            </h3>
          </div>
          <p className="text-[11px] text-blue-900 mt-2 font-medium">Expected incoming liquidity</p>
        </div>

        {/* Overdue at Risk */}
        <div className="p-4 bg-white rounded-xl border border-rose-200/90 bg-rose-50/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wide">
                Overdue at Risk
              </span>
              <Badge variant="danger" size="sm">
                {totals.overdueCount} Invoices
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-rose-600 mt-1">
              {formatCurrency(totals.overdueBalance)}
            </h3>
          </div>
          <p className="text-[11px] text-rose-800 mt-2">Past credit payment window</p>
        </div>

        {/* Current & Upcoming */}
        <div className="p-4 bg-white rounded-xl border border-emerald-200/90 bg-emerald-50/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                Within Terms
              </span>
              <Badge variant="success" size="sm">
                Safe
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-emerald-700 mt-1">
              {formatCurrency(totals.currentBalance)}
            </h3>
          </div>
          <p className="text-[11px] text-emerald-800 mt-2">Dues within 30-day window</p>
        </div>
      </div>

      {/* Main Receivables Management Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Customer Invoices & Collections</span>
              <Badge variant="neutral" size="sm">
                {filtered.length} of {receivables.length} Invoices
              </Badge>
            </CardTitle>
            <CardDescription>
              Balances calculate automatically (Balance Due = Total Amount - Received Amount) • Real-time aging triggers
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={openAddModal}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          </div>
        </CardHeader>

        {/* Search & Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, invoice #, memo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Status:</span>
            {["all", "overdue", "partially_paid", "pending", "paid"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Due Date & Aging</th>
                <th className="py-3 px-4 text-right">Total Value</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No customer receivables match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 font-mono">
                      {item.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-900 truncate">{item.customerName}</p>
                      {item.contactEmail && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {item.contactEmail}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5" title={item.notes}>
                          {item.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-700">{formatDate(item.dueDate)}</span>
                      {item.daysOverdue > 0 && item.balanceDue > 0 && (
                        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {item.daysOverdue} days overdue
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
                            : "info"
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
                            className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setPaymentTarget(item);
                              setPaymentAmount(item.balanceDue.toString());
                              setPaymentDate(new Date().toISOString().split("T")[0]);
                              setPaymentRef(`PAY-REC-${item.invoiceNumber}`);
                            }}
                          >
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            Record Pay
                          </Button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded">
                            Fully Settled
                          </span>
                        )}

                        {item.status === "overdue" && item.balanceDue > 0 && (
                          <Link href="/fairresolve">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 text-indigo-700 border-indigo-200 bg-indigo-50"
                              title="Escalate to FairResolve dispute settlement"
                            >
                              <Scale className="w-3 h-3 mr-1" />
                              Dispute
                            </Button>
                          </Link>
                        )}

                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Invoice"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setReceivableToDelete(item)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Invoice"
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

      {/* Record Customer Payment Modal */}
      <Modal
        isOpen={paymentTarget !== null}
        onClose={() => setPaymentTarget(null)}
        title="Record Customer Payment"
        description={`Logging cash collection for ${paymentTarget?.customerName} (${paymentTarget?.invoiceNumber})`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500 font-medium">Remaining Outstanding Balance</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {paymentTarget && formatCurrency(paymentTarget.balanceDue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium">Total Invoice Value</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {paymentTarget && formatCurrency(paymentTarget.totalAmount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                max={paymentTarget?.balanceDue}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Can be partial or full settlement
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Channel
              </label>
              <select
                value={paymentChannel}
                onChange={(e) => setPaymentChannel(e.target.value)}
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
                Bank Ref / Cheque No.
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="TXN-XXXX"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Sync to Cash Ledger Option */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5">
            <input
              type="checkbox"
              id="syncToLedger"
              checked={syncToLedger}
              onChange={(e) => setSyncToLedger(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="syncToLedger" className="text-xs text-blue-900 cursor-pointer">
              <strong>Synchronize to Cash Ledger:</strong> Automatically create a cleared income entry in Financial Records so bank available cash increases immediately without double-counting.
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaymentTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Invoice Modal with Zod Validation */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingReceivable ? "Edit Customer Invoice" : "Create Customer Invoice"}
        description="Records customer debt obligations and due dates. Unpaid balances remain in expected receivables."
      >
        <form onSubmit={handleSaveInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer / Client Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Aerospace Systems"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                fieldErrors.customerName ? "border-rose-500" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {fieldErrors.customerName && (
              <p className="text-[11px] text-rose-600 mt-0.5">{fieldErrors.customerName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                placeholder="INV-2026-XXX"
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
                Total Invoice Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="100000"
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
                Already Received Amount (₹)
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calculated Balance Due
              </label>
              <div className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-800">
                {formatCurrency(
                  Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(paidAmount) || 0))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Date *
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
                Due Date *
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
              Customer Contact Email (Optional)
            </label>
            <input
              type="email"
              placeholder="billing@customer.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Terms
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Net 30 payment terms, 50% advance on delivery note"
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
              {editingReceivable ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={receivableToDelete !== null}
        onClose={() => setReceivableToDelete(null)}
        title="Delete Customer Receivable"
        description="Are you sure you want to delete this customer invoice?"
      >
        <div className="space-y-4">
          {receivableToDelete && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-900">{receivableToDelete.customerName}</p>
              <p className="text-slate-600">
                Invoice: {receivableToDelete.invoiceNumber} • Outstanding: {formatCurrency(receivableToDelete.balanceDue)}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReceivableToDelete(null)}
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
