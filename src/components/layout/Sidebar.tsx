"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  UploadCloud,
  FileText,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  FlaskConical,
  Bell,
  Compass,
  Scale,
  BarChart3,
  Settings,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  X,
  User,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { DEMO_SUMMARY } from "@/lib/demo-data";
import { Badge } from "@/components/ui/Badge";
import {
  getUnifiedDashboardMetrics,
  subscribeToFinancialRecords,
  subscribeToReceivables,
  subscribeToPayables,
} from "@/lib/data-service";
import { getOnboardingData, EVENT_ONBOARDING_UPDATED } from "@/lib/onboarding-service";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "neutral" | "warning" | "danger" | "info" | "success" | "primary";
}

const allNavItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Available Cash", href: "/cash", icon: Wallet },
  { name: "Document Centre", href: "/documents", icon: UploadCloud, badge: "Import", badgeVariant: "primary" },
  { name: "Financial Records", href: "/records", icon: ReceiptText },
  { name: "Tax Invoices", href: "/invoices", icon: FileText, badge: "GST", badgeVariant: "primary" },
  { name: "Receivables", href: "/receivables", icon: ArrowDownLeft, badge: "3 Overdue", badgeVariant: "warning" },
  { name: "Payables", href: "/payables", icon: ArrowUpRight, badge: "Upcoming", badgeVariant: "neutral" },
  { name: "Cash-Flow Forecast", href: "/forecast", icon: TrendingUp },
  { name: "Scenario Lab", href: "/scenarios", icon: FlaskConical },
  { name: "Smart Alerts", href: "/alerts", icon: Bell, badge: "Active", badgeVariant: "danger" },
  { name: "Decision Centre", href: "/decision-centre", icon: Compass },
  { name: "Govt Schemes", href: "/schemes", icon: Landmark, badge: "Subsidies", badgeVariant: "success" },
  { name: "Credro™ Trust Score", href: "/credro", icon: ShieldCheck, badge: "82", badgeVariant: "primary" },
  { name: "FairResolve", href: "/fairresolve", icon: Scale, badge: "ODR", badgeVariant: "info" },
  { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { name: "Business Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [availableCash, setAvailableCash] = useState(DEMO_SUMMARY.availableCash);
  const [minimumReserve, setMinimumReserve] = useState(DEMO_SUMMARY.minimumReserve);
  const [isDeficit, setIsDeficit] = useState(false);
  const [businessName, setBusinessName] = useState(DEMO_SUMMARY.businessName);

  useEffect(() => {
    const syncCash = () => {
      const metrics = getUnifiedDashboardMetrics();
      setAvailableCash(metrics.availableCash);
      const onboarding = getOnboardingData();
      const minReserve = onboarding.openingFinances.minimumReserve || DEMO_SUMMARY.minimumReserve;
      setMinimumReserve(minReserve);
      setIsDeficit(metrics.availableCash < minReserve);
      setBusinessName(onboarding.profile.tradeName || onboarding.profile.mcaLegalName || DEMO_SUMMARY.businessName);
    };

    syncCash();
    const unsubRecs = subscribeToFinancialRecords(syncCash);
    const unsubReceivables = subscribeToReceivables(syncCash);
    const unsubPayables = subscribeToPayables(syncCash);
    window.addEventListener(EVENT_ONBOARDING_UPDATED, syncCash);
    window.addEventListener("storage", syncCash);

    return () => {
      unsubRecs();
      unsubReceivables();
      unsubPayables();
      window.removeEventListener(EVENT_ONBOARDING_UPDATED, syncCash);
      window.removeEventListener("storage", syncCash);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop for Drawer (Mobile & Desktop) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#242321]/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Hamburger Navigation Drawer matching Image 2 */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-[#F7F3EA] text-[#242321] flex flex-col border-r border-[#E8E1D5] transition-transform duration-300 ease-in-out shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navigation Drawer"
      >
        {/* Drawer Header */}
        <div className="h-20 px-5 border-b border-[#E8E1D5] flex items-center justify-between bg-white/70 backdrop-blur-sm">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-[#F15A35] flex items-center justify-center text-white shadow-orange group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-wider text-[#242321]">COINCISE</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-[#FCE4D8] text-[#F15A35] rounded-full border border-[#F15A35]/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-[#A69C8D] font-medium">Business Finance &amp; Cash Flow</p>
            </div>
          </Link>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E8E1D5] text-[#242321] hover:bg-[#F7F3EA] flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Business Profile Summary Banner inside Drawer */}
        <div className="px-5 py-3.5 bg-white/50 border-b border-[#E8E1D5]/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#DDEFE8] text-[#138C83] flex items-center justify-center font-bold text-xs shrink-0">
            {businessName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#242321] truncate">{businessName}</p>
            <div className="flex items-center gap-1 text-[10px] text-[#A69C8D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#138C83]" />
              <span>Verified MSME Workspace</span>
            </div>
          </div>
        </div>

        {/* Navigation Link List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A69C8D]">
              All Modules &amp; Tools
            </span>
            <span className="text-[9px] bg-[#DDEFE8] text-[#138C83] border border-[#138C83]/30 px-1.5 py-0.2 rounded-full font-bold">
              13 Pages
            </span>
          </div>

          <nav className="space-y-1">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all group",
                    isActive
                      ? "bg-[#FCE4D8] text-[#F15A35] font-bold shadow-2xs"
                      : "text-[#242321] hover:bg-white hover:text-[#242321]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isActive ? "text-[#F15A35]" : "text-[#A69C8D] group-hover:text-[#242321]"
                      )}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <Badge variant={item.badgeVariant || "neutral"} size="sm" className="text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer: Available Cash Runway Pill */}
        <div className="p-3.5 border-t border-[#E8E1D5] bg-white">
          <div className="p-3.5 rounded-2xl bg-[#F7F3EA] border border-[#E8E1D5] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#A69C8D] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#138C83]" />
                <span>Live Available Cash</span>
              </div>
              <span className="text-[10px] text-[#138C83] bg-[#DDEFE8] px-1.5 py-0.2 rounded-full font-bold">
                Runway
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span
                className={cn(
                  "text-base font-extrabold tracking-tight",
                  isDeficit ? "text-[#F15A35]" : "text-[#242321]"
                )}
              >
                {formatCurrency(availableCash)}
              </span>
              <span className="text-[10px] text-[#A69C8D]">
                Min: {formatCurrency(minimumReserve)}
              </span>
            </div>

            <div className="w-full bg-[#E8E1D5] h-1.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isDeficit ? "bg-[#F15A35]" : "bg-[#138C83]"
                )}
                style={{
                  width: `${Math.min(
                    100,
                    minimumReserve > 0 ? (availableCash / minimumReserve) * 50 : 50
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
