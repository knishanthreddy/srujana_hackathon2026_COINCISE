"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  PlusCircle,
  Building2,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { DEMO_SUMMARY } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getOnboardingData, EVENT_ONBOARDING_UPDATED } from "@/lib/onboarding-service";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNewRecordModal?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Financial Dashboard",
    subtitle: "Real-time liquidity, cash velocity & predictive runway",
  },
  "/cash": {
    title: "Available Cash",
    subtitle: "Spendable operating funds, bank balances & liquid reserves",
  },
  "/documents": {
    title: "Document Centre",
    subtitle: "Import & reconcile statements, customer invoices & supplier bills",
  },
  "/records": {
    title: "Financial Records",
    subtitle: "Income and expense transactions ledger with categorization",
  },
  "/invoices": {
    title: "Invoice Management",
    subtitle: "Generate, preview, print and track GST-ready client invoices",
  },
  "/invoices/new": {
    title: "Create Tax Invoice",
    subtitle: "Itemized tax invoice builder with auto-tax splitting and bank details",
  },
  "/receivables": {
    title: "Customer Receivables",
    subtitle: "Customer invoices, collection aging & follow-up tracking",
  },
  "/payables": {
    title: "Supplier Payables",
    subtitle: "Vendor obligations, upcoming liabilities & payment schedules",
  },
  "/forecast": {
    title: "Cash-Flow Forecast",
    subtitle: "7, 30, 60 & 90-day predictive runway: Closing = Opening + Inflows − Outflows",
  },
  "/scenarios": {
    title: "Scenario Lab",
    subtitle: "Stress test hypothetical shocks without altering real financial books",
  },
  "/alerts": {
    title: "Smart Alerts",
    subtitle: "Automated breach detection, overdue warnings & early risk triggers",
  },
  "/decision-centre": {
    title: "Decision Centre",
    subtitle: "Evaluate corrective liquidity actions and projected impact comparisons",
  },
  "/schemes": {
    title: "Government Schemes & Subsidies",
    subtitle: "Verified central and state schemes matched with your business profile",
  },
  "/credro": {
    title: "Credro™ Trust Score",
    subtitle: "Operational reliability evaluation across 5 weighted factors",
  },
  "/fairresolve": {
    title: "FairResolve",
    subtitle: "Payment dispute settlement workspace aligned with MSME ODR",
  },
  "/reports": {
    title: "Reports & Analytics",
    subtitle: "Detailed financial reports, cash flow comparisons & CSV data exports",
  },
  "/statements": {
    title: "Financial Statements",
    subtitle: "Generate and download formal Profit & Loss, Cash Flow, and Balance Sheet statements",
  },
  "/settings": {
    title: "Business Settings",
    subtitle: "Configure business profile, reserve safety levels & forecast assumptions",
  },
  "/login": {
    title: "Sign In",
    subtitle: "Access your verified COINCISE enterprise workspace",
  },
  "/onboarding": {
    title: "Business Setup Wizard",
    subtitle: "Entity registration, opening liquidity & predictive rules",
  },
};

export function Header({ onToggleSidebar, onOpenNewRecordModal }: HeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pathname = usePathname();
  const isCloud = isSupabaseConfigured();
  const [businessName, setBusinessName] = useState(DEMO_SUMMARY.businessName);

  useEffect(() => {
    const syncName = () => {
      const data = getOnboardingData();
      setBusinessName(data.profile.tradeName || data.profile.mcaLegalName || DEMO_SUMMARY.businessName);
    };
    syncName();
    window.addEventListener(EVENT_ONBOARDING_UPDATED, syncName);
    return () => window.removeEventListener(EVENT_ONBOARDING_UPDATED, syncName);
  }, []);

  const currentMeta = pageTitles[pathname] || {
    title: "COINCISE",
    subtitle: "AI Business Finance & Decision Support",
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="sticky top-0 z-30 h-16 sm:h-20 bg-[#F7F3EA]/90 backdrop-blur-md border-b border-[#E8E1D5] px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all">
      {/* Left: Hamburger Menu & Branding / Page Title */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Icon (matching Image 2) */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-2xl bg-white border border-[#E8E1D5] text-[#242321] hover:bg-[#E8E1D5]/40 hover:text-[#F15A35] transition-all shadow-2xs cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand & Page Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold text-[#242321] tracking-tight truncate">
              {currentMeta.title}
            </h1>
            {!isCloud && (
              <span className="hidden sm:inline-flex text-[9px] font-bold text-[#A69C8D] bg-white border border-[#E8E1D5] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-xs text-[#A69C8D] hidden md:block truncate font-medium">
            {getGreeting()}, <strong className="text-[#242321]">{businessName}</strong>
          </p>
        </div>
      </div>

      {/* Right: Actions, Notification Bell, User Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Add Record Button */}
        {onOpenNewRecordModal && (
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenNewRecordModal}
            className="font-bold text-xs bg-[#F15A35] hover:bg-[#DE4924] shadow-xs px-3 sm:px-4 py-2"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}

        {/* Notification Bell */}
        <Link
          href="/alerts"
          className="relative p-2 sm:p-2.5 rounded-2xl bg-white border border-[#E8E1D5] text-[#242321] hover:text-[#F15A35] hover:border-[#F15A35]/40 transition-all shadow-2xs"
          title="Smart Financial Alerts"
          aria-label="View smart alerts"
        >
          <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F15A35]" />
        </Link>

        {/* User Profile Avatar / Auth Trigger */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 p-1 sm:p-1.5 pr-2.5 rounded-full bg-white border border-[#E8E1D5] hover:border-[#A69C8D] transition-all shadow-2xs cursor-pointer group"
          title="Manage Account Profile"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center font-bold text-xs">
            {businessName.slice(0, 2).toUpperCase()}
          </div>
          <span className="hidden lg:inline text-xs font-bold text-[#242321] max-w-[120px] truncate group-hover:text-[#F15A35]">
            {businessName}
          </span>
        </button>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
}
