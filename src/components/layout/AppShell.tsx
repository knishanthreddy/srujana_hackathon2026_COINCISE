"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { addFinancialRecord } from "@/lib/data-service";
import { isOnboardingCompleted, EVENT_ONBOARDING_UPDATED } from "@/lib/onboarding-service";
import { COINCISEAssistant } from "@/components/chat/COINCISEAssistant";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(true);

  useEffect(() => {
    setOnboardingDone(isOnboardingCompleted());
    const handler = () => {
      setOnboardingDone(isOnboardingCompleted());
    };
    window.addEventListener(EVENT_ONBOARDING_UPDATED, handler);
    return () => window.removeEventListener(EVENT_ONBOARDING_UPDATED, handler);
  }, []);

  // Quick transaction form state
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Sales");
  const [formDesc, setFormDesc] = useState("");

  // Distraction-free standalone shell for Onboarding Wizard
  if (pathname === "/onboarding") {
    return <>{children}</>;
  }

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(formAmount);
    if (!formAmount || isNaN(amt) || amt <= 0) return;

    const res = addFinancialRecord({
      date: new Date().toISOString().split("T")[0],
      type: formType,
      category: formCategory,
      amount: amt,
      paidAmount: amt,
      paymentStatus: "completed",
      description: formDesc.trim() || `${formType === "income" ? "Cash Received" : "Disbursement"} (${formCategory})`,
      paymentMethod: "Bank Transfer (NEFT)",
    });

    if (res.success) {
      setIsRecordModalOpen(false);
      setToastMessage(`Success: Recorded ${formType} of ₹${amt.toLocaleString("en-IN")} into local ledger`);
      setFormAmount("");
      setFormDesc("");
    } else {
      setToastMessage("Failed to record: please verify input values");
    }

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

          {/* Business Onboarding Incomplete Reminder Banner */}
          {!onboardingDone && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white border border-blue-700/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/40 text-blue-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Business Setup Incomplete</span>
                    <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-medium">
                      Action Recommended
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-200 mt-0.5">
                    Configure your registered legal entity, CIN verification, opening bank balances, and predictive forecast rules.
                  </div>
                </div>
              </div>

              <Link href="/onboarding" className="shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm w-full sm:w-auto"
                >
                  <span>Launch Setup Wizard</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
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

      {/* Persistent Floating COINCISE Help Assistant */}
      <COINCISEAssistant />
    </div>
  );
}
