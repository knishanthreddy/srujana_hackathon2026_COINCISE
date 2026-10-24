"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  PlusCircle,
  Building2,
  AlertTriangle,
  Search,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { DEMO_SUMMARY } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNewRecordModal?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Executive Financial Dashboard",
    subtitle: "Real-time liquidity, cash velocity & predictive runway",
  },
  "/records": {
    title: "Financial Records",
    subtitle: "Income and expense transactions ledger with categorization",
  },
  "/receivables": {
    title: "Accounts Receivable (Inflows)",
    subtitle: "Customer invoices, collection aging & follow-up tracking",
  },
  "/payables": {
    title: "Accounts Payable (Outflows)",
    subtitle: "Vendor obligations, upcoming liabilities & payment schedules",
  },
  "/forecast": {
    title: "Cash-Flow Forecast Engine",
    subtitle: "7, 30, 60 & 90-day predictive runway: Closing = Opening + Inflows - Outflows",
  },
  "/scenarios": {
    title: "Scenario Simulation Lab",
    subtitle: "Stress test hypothetical shocks without altering real financial books",
  },
  "/alerts": {
    title: "Smart Predictive Alerts",
    subtitle: "Automated breach detection, overdue warnings & early risk triggers",
  },
  "/decision-centre": {
    title: "Decision & Action Centre",
    subtitle: "Evaluate corrective liquidity actions and projected impact comparisons",
  },
  "/fairresolve": {
    title: "FairResolve - Payment Dispute Settlement",
    subtitle: "Direct dispute resolution & MSME ODR portal alignment workspace",
  },
  "/reports": {
    title: "Reports & Financial Analytics",
    subtitle: "Detailed cash reports, category breakdowns and CSV data exports",
  },
  "/settings": {
    title: "System & Business Settings",
    subtitle: "Configure business profile, reserve safety levels and alert rules",
  },
};

export function Header({ onToggleSidebar, onOpenNewRecordModal }: HeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pathname = usePathname();
  const isCloud = isSupabaseConfigured();
  const currentMeta = pageTitles[pathname] || {
    title: "COINCISE Finance",
    subtitle: "AI Business Finance & Decision Support",
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Business Switcher & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Active Business Badge / Auth Trigger */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/60 text-xs transition-colors"
          title="Manage Business Profile & Cloud Sync"
        >
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800 max-w-[160px] truncate">
            {DEMO_SUMMARY.businessName}
          </span>
          <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${
            isCloud ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
          }`}>
            {isCloud ? "Cloud" : "Demo"}
          </span>
        </button>

        {/* Quick Add Record Button */}
        {onOpenNewRecordModal && (
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenNewRecordModal}
            className="hidden sm:inline-flex"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Record</span>
          </Button>
        )}

        {/* Alert Notifications */}
        <Link
          href="/alerts"
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Smart Alerts"
        >
          <Bell className="w-4 h-4" />
          {DEMO_SUMMARY.activeAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </Link>

        {/* User Avatar */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 hover:ring-blue-400 transition-all"
          title="Account Settings"
        >
          AD
        </button>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
}
