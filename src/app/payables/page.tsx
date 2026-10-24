"use client";

import React, { useState } from "react";
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
  Split,
  Building,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DEMO_PAYABLES } from "@/lib/demo-data";
import { Payable } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PayablesPage() {
  const [payables, setPayables] = useState<Payable[]>(DEMO_PAYABLES);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentModalPayable, setPaymentModalPayable] = useState<Payable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);

  // New bill state
  const [newBill, setNewBill] = useState({
    vendorName: "",
    invoiceNumber: "",
    totalAmount: "",
    dueDate: "",
    category: "Raw Material",
    notes: "",
  });

  const totalPayables = payables.reduce((sum, item) => sum + item.balanceDue, 0);
  const overdueTotal = payables
    .filter((p) => p.status === "overdue")
    .reduce((sum, item) => sum + item.balanceDue, 0);
  const dueSoonTotal = payables
    .filter((p) => p.status === "pending")
    .reduce((sum, item) => sum + item.balanceDue, 0);

  const filtered = payables.filter((p) => {
    const matchesSearch =
      p.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDisbursePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalPayable || !paymentAmount || isNaN(Number(paymentAmount))) return;

    const amt = Number(paymentAmount);
    setPayables((prev) =>
      prev.map((p) => {
        if (p.id !== paymentModalPayable.id) return p;
        const newPaid = p.paidAmount + amt;
        const newBalance = Math.max(0, p.totalAmount - newPaid);
        return {
          ...p,
          paidAmount: newPaid,
          balanceDue: newBalance,
          status: newBalance === 0 ? "paid" : "partially_paid",
        };
      })
    );

    setPaymentModalPayable(null);
    setPaymentAmount("");
  };

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.vendorName || !newBill.totalAmount) return;

    const amount = Number(newBill.totalAmount);
    const bill: Payable = {
      id: `ap-${Date.now()}`,
      invoiceNumber:
        newBill.invoiceNumber || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: newBill.vendorName,
      totalAmount: amount,
      paidAmount: 0,
      balanceDue: amount,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: newBill.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      status: "pending",
      category: newBill.category,
      notes: newBill.notes,
    };

    setPayables([bill, ...payables]);
    setIsNewBillModalOpen(false);
    setNewBill({
      vendorName: "",
      invoiceNumber: "",
      totalAmount: "",
      dueDate: "",
      category: "Raw Material",
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Payables</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalPayables)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Committed supplier liabilities</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Upcoming Dues</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {formatCurrency(dueSoonTotal)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Due in next 30 days</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Disputed / Overdue</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              {formatCurrency(overdueTotal)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Requires vendor negotiation</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Payables Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Supplier Liabilities & Scheduled Outflows</CardTitle>
            <CardDescription>
              Manage accounts payable, track grace periods, and avoid cash crunches
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewBillModalOpen(true)}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Add Vendor Bill
            </Button>
          </div>
        </CardHeader>

        {/* Filter Controls */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor, invoice #, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Status:</span>
            {["all", "pending", "overdue", "partially_paid", "paid"].map((status) => (
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
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No supplier obligations matching the criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 font-mono">
                      {item.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{item.vendorName}</p>
                      {item.notes && (
                        <p className="text-[10px] text-slate-600 line-clamp-1">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-700">{formatDate(item.dueDate)}</span>
                      {item.status === "overdue" && (
                        <p className="text-[10px] text-rose-600 font-semibold">Overdue</p>
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
                            : "neutral"
                        }
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      {item.balanceDue > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5"
                          onClick={() => {
                            setPaymentModalPayable(item);
                            setPaymentAmount(item.balanceDue.toString());
                          }}
                        >
                          <DollarSign className="w-3 h-3 mr-0.5 text-rose-600" />
                          Pay Vendor
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pay Vendor Modal */}
      <Modal
        isOpen={paymentModalPayable !== null}
        onClose={() => setPaymentModalPayable(null)}
        title="Disburse Supplier Payment"
        description={`Authorizing payment to ${paymentModalPayable?.vendorName} (${paymentModalPayable?.invoiceNumber})`}
      >
        <form onSubmit={handleDisbursePayment} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500">Remaining Obligation</p>
              <p className="text-base font-bold text-slate-900">
                {paymentModalPayable && formatCurrency(paymentModalPayable.balanceDue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">Total Bill</p>
              <p className="text-xs font-semibold text-slate-700">
                {paymentModalPayable && formatCurrency(paymentModalPayable.totalAmount)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Disbursement Amount (₹) *
            </label>
            <input
              type="number"
              required
              max={paymentModalPayable?.balanceDue}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              Releasing this payment will deduct from your available cash once RTGS/NEFT settles.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaymentModalPayable(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Disbursement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Bill Modal */}
      <Modal
        isOpen={isNewBillModalOpen}
        onClose={() => setIsNewBillModalOpen(false)}
        title="Record Vendor Bill"
        description="Add a new supplier obligation to cash flow schedules."
      >
        <form onSubmit={handleCreateBill} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vendor / Supplier Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tata Steel Processing"
              value={newBill.vendorName}
              onChange={(e) => setNewBill({ ...newBill, vendorName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill # (Optional)
              </label>
              <input
                type="text"
                placeholder="SUP-XXXX"
                value={newBill.invoiceNumber}
                onChange={(e) => setNewBill({ ...newBill, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="150000"
                value={newBill.totalAmount}
                onChange={(e) => setNewBill({ ...newBill, totalAmount: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={newBill.category}
                onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Equipment & Spares">Equipment & Spares</option>
                <option value="Consumables">Consumables</option>
                <option value="Logistics">Logistics</option>
                <option value="Facility Rent">Facility Rent</option>
                <option value="Utility Tariff">Utility Tariff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newBill.dueDate}
                onChange={(e) => setNewBill({ ...newBill, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewBillModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Obligation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
