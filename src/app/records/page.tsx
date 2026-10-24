"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DEMO_RECORDS } from "@/lib/demo-data";
import { FinancialRecord, TransactionType } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function RecordsPage() {
  const [records, setRecords] = useState<FinancialRecord[]>(DEMO_RECORDS);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "income" as TransactionType,
    category: "Client Milestone Payment",
    amount: "",
    description: "",
    paymentMethod: "Bank Transfer (NEFT)",
    reference: "",
  });

  // Calculate totals from current records
  const totalIncome = records
    .filter((r) => r.type === "income" && r.status === "cleared")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = records
    .filter((r) => r.type === "expense" && r.status === "cleared")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reference && r.reference.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this financial record?")) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || isNaN(Number(formData.amount))) return;

    if (editingRecord) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id
            ? {
                ...r,
                date: formData.date,
                type: formData.type,
                category: formData.category,
                amount: Number(formData.amount),
                description: formData.description,
                paymentMethod: formData.paymentMethod,
                reference: formData.reference || `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
              }
            : r
        )
      );
      setEditingRecord(null);
    } else {
      const newRec: FinancialRecord = {
        id: `rec-${Date.now()}`,
        date: formData.date,
        type: formData.type,
        category: formData.category,
        amount: Number(formData.amount),
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        status: "cleared",
        reference: formData.reference || `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      };
      setRecords([newRec, ...records]);
    }

    setIsAddModalOpen(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "income",
      category: "Client Milestone Payment",
      amount: "",
      description: "",
      paymentMethod: "Bank Transfer (NEFT)",
      reference: "",
    });
  };

  const handleOpenEdit = (rec: FinancialRecord) => {
    setEditingRecord(rec);
    setFormData({
      date: rec.date,
      type: rec.type,
      category: rec.category,
      amount: rec.amount.toString(),
      description: rec.description,
      paymentMethod: rec.paymentMethod,
      reference: rec.reference || "",
    });
    setIsAddModalOpen(true);
  };

  const exportCSV = () => {
    const headers = "ID,Date,Type,Category,Description,Amount,PaymentMethod,Status,Reference\n";
    const rows = filteredRecords
      .map(
        (r) =>
          `"${r.id}","${r.date}","${r.type}","${r.category}","${r.description}",${r.amount},"${r.paymentMethod}","${r.status}","${r.reference || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coincise-financial-records-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Ledger Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Cleared Inflow</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              +{formatCurrency(totalIncome)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Realized bank credits</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Cleared Outflow</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              -{formatCurrency(totalExpense)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Realized bank debits</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Net Realized Cash</p>
            <h3
              className={`text-2xl font-bold mt-1 ${
                netCashFlow >= 0 ? "text-blue-600" : "text-amber-600"
              }`}
            >
              {netCashFlow >= 0 ? "+" : ""}
              {formatCurrency(netCashFlow)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Period net liquidity change</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ReceiptText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Cash Transaction Ledger</CardTitle>
            <CardDescription>
              Showing {filteredRecords.length} cleared records • Strict actuals isolation
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingRecord(null);
                setFormData({
                  date: new Date().toISOString().split("T")[0],
                  type: "income",
                  category: "Client Milestone Payment",
                  amount: "",
                  description: "",
                  paymentMethod: "Bank Transfer (NEFT)",
                  reference: "",
                });
                setIsAddModalOpen(true);
              }}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Add Record
            </Button>
          </div>
        </CardHeader>

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search memo, category, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Type:</span>
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter("income")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === "income"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Income
            </button>
            <button
              onClick={() => setTypeFilter("expense")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === "expense"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Expenses
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching financial records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5 font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(r.date)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{r.description}</p>
                      <span className="text-[10px] text-slate-600 font-mono">
                        Ref: {r.reference}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{r.category}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {r.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      <span className={r.type === "income" ? "text-emerald-700" : "text-rose-700"}>
                        {r.type === "income" ? "+ " : "- "}
                        {formatCurrency(r.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Badge variant="success" size="sm">
                        Cleared
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Record"
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

      {/* Add / Edit Record Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingRecord ? "Edit Financial Record" : "Add Financial Transaction"}
        description="Maintain strict segregation of actual cleared transactions."
      >
        <form onSubmit={handleSaveRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "income" })}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                formData.type === "income"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Cash Income
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "expense" })}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                formData.type === "expense"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              - Cash Expense
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="50000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Raw Materials or Job Work"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Memo *
            </label>
            <input
              type="text"
              required
              placeholder="Description of transaction"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Bank Transfer (NEFT)">Bank Transfer (NEFT)</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="Corporate Card">Corporate Card</option>
                <option value="UPI / QR">UPI / QR</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Ref / Cheque No.
              </label>
              <input
                type="text"
                placeholder="TXN-XXXX"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Saving this record updates the cleared bank ledger. It does not tamper with scenarios or future forecast models.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingRecord ? "Update Record" : "Save Record"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
