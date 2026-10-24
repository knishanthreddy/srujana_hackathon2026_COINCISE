"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DEMO_RECEIVABLES } from "@/lib/demo-data";
import { Receivable } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Receivable[]>(DEMO_RECEIVABLES);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentModalReceivable, setPaymentModalReceivable] = useState<Receivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);

  // New invoice state
  const [newInvoice, setNewInvoice] = useState({
    customerName: "",
    invoiceNumber: "",
    totalAmount: "",
    dueDate: "",
    contactEmail: "",
    notes: "",
  });

  // Calculate metrics
  const totalReceivables = receivables.reduce((sum, item) => sum + item.balanceDue, 0);
  const overdueTotal = receivables
    .filter((r) => r.status === "overdue")
    .reduce((sum, item) => sum + item.balanceDue, 0);
  const currentTotal = receivables
    .filter((r) => r.status === "pending" || r.status === "partially_paid")
    .reduce((sum, item) => sum + item.balanceDue, 0);

  const filtered = receivables.filter((r) => {
    const matchesSearch =
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalReceivable || !paymentAmount || isNaN(Number(paymentAmount))) return;

    const amt = Number(paymentAmount);
    setReceivables((prev) =>
      prev.map((r) => {
        if (r.id !== paymentModalReceivable.id) return r;
        const newPaid = r.paidAmount + amt;
        const newBalance = Math.max(0, r.totalAmount - newPaid);
        return {
          ...r,
          paidAmount: newPaid,
          balanceDue: newBalance,
          status: newBalance === 0 ? "paid" : "partially_paid",
        };
      })
    );

    setPaymentModalReceivable(null);
    setPaymentAmount("");
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.customerName || !newInvoice.totalAmount) return;

    const amount = Number(newInvoice.totalAmount);
    const inv: Receivable = {
      id: `ar-${Date.now()}`,
      invoiceNumber:
        newInvoice.invoiceNumber || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerName: newInvoice.customerName,
      totalAmount: amount,
      paidAmount: 0,
      balanceDue: amount,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: newInvoice.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      status: "pending",
      daysOverdue: 0,
      contactEmail: newInvoice.contactEmail,
      notes: newInvoice.notes,
    };

    setReceivables([inv, ...receivables]);
    setIsNewInvoiceModalOpen(false);
    setNewInvoice({
      customerName: "",
      invoiceNumber: "",
      totalAmount: "",
      dueDate: "",
      contactEmail: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Receivables</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalReceivables)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Expected cash inflows</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Overdue Balance</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              {formatCurrency(overdueTotal)}
            </h3>
            <p className="text-xs text-rose-500 mt-0.5">High collection risk</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Current & Unbilled</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(currentTotal)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Within payment terms</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Invoices Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Customer Invoices & Aging</CardTitle>
            <CardDescription>
              Track receivables, log partial settlements, and route disputes to FairResolve
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewInvoiceModalOpen(true)}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          </div>
        </CardHeader>

        {/* Filter Controls */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, invoice #..."
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

        {/* Invoices List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No customer receivables matching the criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 font-mono">
                      {item.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{item.customerName}</p>
                      {item.contactEmail && (
                        <p className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {item.contactEmail}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-700">{formatDate(item.dueDate)}</span>
                      {item.daysOverdue > 0 && (
                        <p className="text-[10px] text-rose-600 font-semibold">
                          {item.daysOverdue} days overdue
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-700 whitespace-nowrap">
                      {formatCurrency(item.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.balanceDue)}
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
                        {item.balanceDue > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              setPaymentModalReceivable(item);
                              setPaymentAmount(item.balanceDue.toString());
                            }}
                          >
                            <DollarSign className="w-3 h-3 mr-0.5 text-emerald-600" />
                            Record Pay
                          </Button>
                        )}
                        {item.status === "overdue" && (
                          <Link href="/fairresolve">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 text-indigo-700 border-indigo-200 bg-indigo-50"
                              title="Resolve in FairResolve"
                            >
                              <Scale className="w-3 h-3 mr-1" />
                              Dispute
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalReceivable !== null}
        onClose={() => setPaymentModalReceivable(null)}
        title="Record Customer Payment"
        description={`Logging cash collection for ${paymentModalReceivable?.customerName} (${paymentModalReceivable?.invoiceNumber})`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500">Remaining Balance</p>
              <p className="text-base font-bold text-slate-900">
                {paymentModalReceivable && formatCurrency(paymentModalReceivable.balanceDue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">Total Invoice</p>
              <p className="text-xs font-semibold text-slate-700">
                {paymentModalReceivable && formatCurrency(paymentModalReceivable.totalAmount)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount Received (₹) *
            </label>
            <input
              type="number"
              required
              max={paymentModalReceivable?.balanceDue}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              This will update customer balance and increase available cash once cleared in bank ledger.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaymentModalReceivable(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add New Customer Invoice Modal */}
      <Modal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
        title="Create Customer Invoice"
        description="Issue new commercial bill to track expected receivables."
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Aerospace Ltd"
              value={newInvoice.customerName}
              onChange={(e) => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice # (Optional)
              </label>
              <input
                type="text"
                placeholder="INV-2026-XXX"
                value={newInvoice.invoiceNumber}
                onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Amount (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="250000"
                value={newInvoice.totalAmount}
                onChange={(e) => setNewInvoice({ ...newInvoice, totalAmount: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                placeholder="accounts@customer.com"
                value={newInvoice.contactEmail}
                onChange={(e) => setNewInvoice({ ...newInvoice, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewInvoiceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
