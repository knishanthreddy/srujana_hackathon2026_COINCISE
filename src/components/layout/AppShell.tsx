"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick transaction form state
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Sales");
  const [formDesc, setFormDesc] = useState("");

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount))) return;

    setIsRecordModalOpen(false);
    setToastMessage(`Success: Recorded ${formType} of ₹${Number(formAmount).toLocaleString("en-IN")}`);
    setFormAmount("");
    setFormDesc("");

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenNewRecordModal={() => setIsRecordModalOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium">{toastMessage}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-xs text-emerald-700 font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Quick Record Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Add Financial Transaction"
        description="Record actual cash received or disbursed into the financial books."
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFormType("income")}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                formType === "income"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Cash Income
            </button>
            <button
              type="button"
              onClick={() => setFormType("expense")}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                formType === "expense"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              - Cash Expense
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (₹ INR) *
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              required
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category *
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {formType === "income" ? (
                <>
                  <option value="Client Milestone Payment">Client Milestone Payment</option>
                  <option value="Product Sales">Product Sales</option>
                  <option value="Job Work Services">Job Work Services</option>
                  <option value="Tax Refund">Tax Refund</option>
                  <option value="Other Income">Other Income</option>
                </>
              ) : (
                <>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Payroll & Wages">Payroll & Wages</option>
                  <option value="Facility & Utilities">Facility & Utilities</option>
                  <option value="Maintenance & Tooling">Maintenance & Tooling</option>
                  <option value="Vendor Settlement">Vendor Settlement</option>
                  <option value="Other Expense">Other Expense</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Memo *
            </label>
            <input
              type="text"
              placeholder="e.g. Part payment for CNC milling batch"
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Accounting Rule:</strong> Only record transactions where funds have actually cleared in your bank accounts. Do not record promises or uncollected invoices here.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
