"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  MoreVertical,
  X,
  Check,
  Building2,
  UploadCloud,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type { FullInvoice, InvoiceStatus } from "@/lib/invoice-types";
import {
  getInvoices,
  subscribeToInvoices,
  recordInvoicePayment,
  cancelInvoice,
} from "@/lib/invoice-service";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<FullInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<FullInvoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<FullInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer (NEFT)");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    setInvoices(getInvoices());
    const unsub = subscribeToInvoices((updated) => setInvoices(updated));
    return () => unsub();
  }, []);

  // Filter & Search logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (statusFilter === "all") return true;
      return inv.status === statusFilter;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.status !== "cancelled" ? inv.totalAmount : 0), 0);
    const outstanding = invoices.reduce((sum, inv) => sum + (inv.status !== "cancelled" ? inv.balanceDue : 0), 0);
    const overdueCount = invoices.filter((inv) => {
      if (inv.status === "paid" || inv.status === "cancelled") return false;
      return new Date(inv.dueDate) < new Date();
    }).length;
    const settledCount = invoices.filter((inv) => inv.status === "paid").length;

    return { totalInvoiced, outstanding, overdueCount, settledCount };
  }, [invoices]);

  const handleOpenPreview = (inv: FullInvoice) => {
    setSelectedInvoice(inv);
    setIsPreviewOpen(true);
  };

  const handleOpenPaymentModal = (inv: FullInvoice) => {
    setPaymentTargetInvoice(inv);
    setPaymentAmount(inv.balanceDue.toString());
    setPaymentRef(`PAY-${inv.invoiceNumber}-${Math.floor(100 + Math.random() * 900)}`);
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError("Payment amount must be greater than 0");
      return;
    }

    const res = recordInvoicePayment(paymentTargetInvoice.id, {
      paymentDate,
      amount: amt,
      paymentMethod,
      reference: paymentRef,
      notes: `Settlement recorded for invoice ${paymentTargetInvoice.invoiceNumber}`,
    });

    if (res.success) {
      setIsPaymentModalOpen(false);
      setPaymentTargetInvoice(null);
    } else {
      setPaymentError(res.error || "Failed to record payment.");
    }
  };

  const handleCancelInvoice = (inv: FullInvoice) => {
    if (confirm(`Are you sure you want to cancel invoice ${inv.invoiceNumber}?`)) {
      cancelInvoice(inv.id, "Cancelled by user request");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#242321] tracking-tight">Invoice Management</h1>
            <Badge variant="teal" className="text-xs font-semibold">
              Tax & GST Ready
            </Badge>
          </div>
          <p className="text-xs text-[#7A7369] mt-0.5">
            Generate, print, and track professional client invoices synchronized with your Cash Flow & Receivables.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link href="/documents">
            <Button variant="outline" size="sm" className="rounded-xl text-xs flex items-center gap-1.5 border-[#E8E1D5]">
              <UploadCloud className="w-3.5 h-3.5 text-[#138C83]" />
              Import Statements
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button
              variant="primary"
              size="sm"
              className="rounded-xl text-xs bg-[#F15A35] text-white hover:bg-[#d94825] shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E8E1D5] shadow-xs">
          <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wide">Total Invoiced</span>
          <p className="text-xl font-bold text-[#242321] mt-1 font-mono">{formatCurrency(metrics.totalInvoiced)}</p>
          <span className="text-[10px] text-[#7A7369]">Across all billing cycles</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E1D5] shadow-xs">
          <span className="text-[11px] font-bold text-[#F15A35] uppercase tracking-wide">Outstanding Receivables</span>
          <p className="text-xl font-bold text-[#F15A35] mt-1 font-mono">{formatCurrency(metrics.outstanding)}</p>
          <span className="text-[10px] text-[#7A7369]">Pending cash realization</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E1D5] shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Overdue Invoices</span>
          <p className="text-xl font-bold text-amber-600 mt-1">{metrics.overdueCount} Accounts</p>
          <span className="text-[10px] text-[#7A7369]">Beyond agreed due date</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E1D5] shadow-xs">
          <span className="text-[11px] font-bold text-[#138C83] uppercase tracking-wide">Settled Invoices</span>
          <p className="text-xl font-bold text-[#138C83] mt-1">{metrics.settledCount} Paid</p>
          <span className="text-[10px] text-[#7A7369]">Cleared in cash ledger</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: "All Invoices", value: "all" },
            { label: "Issued", value: "issued" },
            { label: "Partially Paid", value: "partially_paid" },
            { label: "Paid", value: "paid" },
            { label: "Drafts", value: "draft" },
            { label: "Cancelled", value: "cancelled" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.value
                  ? "bg-[#242321] text-white"
                  : "bg-white text-[#7A7369] border border-[#E8E1D5] hover:text-[#242321]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7A7369]" />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#E8E1D5] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#242321] outline-none focus:border-[#F15A35]"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <Card className="bg-white border border-[#E8E1D5] rounded-3xl overflow-hidden shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 text-[#7A7369]/50 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[#242321]">No invoices match your criteria</h3>
            <p className="text-xs text-[#7A7369] mt-0.5">Try clearing filters or generate a new tax invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EA] border-b border-[#E8E1D5] text-[#7A7369] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Issue & Due Date</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1D5]/60 text-[#242321]">
                {filteredInvoices.map((inv) => {
                  const isOverdue =
                    inv.status !== "paid" && inv.status !== "cancelled" && new Date(inv.dueDate) < new Date();

                  return (
                    <tr key={inv.id} className="hover:bg-[#F7F3EA]/50 transition-colors">
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#242321]">
                        <button
                          onClick={() => handleOpenPreview(inv)}
                          className="hover:text-[#F15A35] hover:underline flex items-center gap-1"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-xs text-[#242321]">{inv.customer.name}</div>
                        {inv.customer.gstin && (
                          <span className="text-[10px] font-mono text-[#7A7369] block">
                            GSTIN: {inv.customer.gstin}
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs text-[#242321] font-medium">{formatDate(inv.issueDate)}</div>
                        <div
                          className={`text-[10px] font-medium ${
                            isOverdue ? "text-[#F15A35] font-bold" : "text-[#7A7369]"
                          }`}
                        >
                          Due: {formatDate(inv.dueDate)} {isOverdue && "(Overdue)"}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs">
                        {formatCurrency(inv.totalAmount)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs">
                        <span className={inv.balanceDue > 0 ? "text-[#F15A35]" : "text-[#138C83]"}>
                          {formatCurrency(inv.balanceDue)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === "paid"
                              ? "bg-[#DDEFE8] text-[#138C83]"
                              : inv.status === "partially_paid"
                              ? "bg-amber-100 text-amber-800"
                              : inv.status === "issued"
                              ? "bg-[#FCE4D8] text-[#F15A35]"
                              : inv.status === "draft"
                              ? "bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5]"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5] capitalize">
                          {inv.source}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenPreview(inv)}
                            title="Preview & Print PDF"
                            className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E8E1D5] text-[#242321] transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {inv.balanceDue > 0 && inv.status !== "cancelled" && (
                            <button
                              onClick={() => handleOpenPaymentModal(inv)}
                              title="Record Settlement"
                              className="px-2 py-1 rounded-lg bg-[#DDEFE8] hover:bg-[#c7e5d9] text-[#138C83] text-[11px] font-semibold transition-colors"
                            >
                              Record Pymt
                            </button>
                          )}

                          {inv.status !== "paid" && inv.status !== "cancelled" && (
                            <button
                              onClick={() => handleCancelInvoice(inv)}
                              title="Cancel Invoice"
                              className="p-1 rounded-lg hover:bg-[#FCE4D8] text-[#7A7369] hover:text-[#F15A35] transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && paymentTargetInvoice && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Customer Payment: ${paymentTargetInvoice.invoiceNumber}`}
        >
          <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
            {paymentError && (
              <div className="p-3 bg-[#FCE4D8] border border-[#F15A35]/30 rounded-xl text-[#F15A35]">
                {paymentError}
              </div>
            )}

            <div className="p-3 bg-[#F7F3EA] rounded-xl border border-[#E8E1D5]">
              <span className="text-[#7A7369] block">Customer:</span>
              <strong className="text-[#242321] text-sm">{paymentTargetInvoice.customer.name}</strong>
              <div className="flex justify-between mt-1 text-[11px]">
                <span>Total Invoice: {formatCurrency(paymentTargetInvoice.totalAmount)}</span>
                <span className="text-[#F15A35] font-bold">
                  Outstanding: {formatCurrency(paymentTargetInvoice.balanceDue)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#7A7369] font-medium mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentTargetInvoice.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-bold text-[#242321] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#7A7369] font-medium mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs text-[#242321] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[#7A7369] font-medium mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs text-[#242321] outline-none"
              >
                <option value="Bank Transfer (NEFT)">Bank Transfer (NEFT)</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="UPI / QR">UPI / QR</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-[#7A7369] font-medium mb-1">Reference / UTR Number</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-mono text-[#242321] outline-none"
              />
            </div>

            <div className="p-2.5 bg-[#DDEFE8] rounded-xl text-[11px] text-[#138C83]">
              <Check className="w-3.5 h-3.5 inline mr-1" />
              Recording payment settles this invoice and synchronizes a cleared receipt into your Cash Ledger.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                className="rounded-xl text-xs bg-[#F15A35] text-white hover:bg-[#d94825]"
              >
                Confirm Settlement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        invoice={selectedInvoice}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
