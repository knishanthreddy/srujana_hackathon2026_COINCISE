"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
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
  AlertTriangle,
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
  badgeVariant?: "neutral" | "warning" | "danger" | "info" | "success";
}

const mainNavItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Financial Records", href: "/records", icon: ReceiptText },
  { name: "Receivables", href: "/receivables", icon: ArrowDownLeft, badge: "3 Overdue", badgeVariant: "warning" },
  { name: "Payables", href: "/payables", icon: ArrowUpRight, badge: "₹7.8L", badgeVariant: "neutral" },
  { name: "Cash-Flow Forecast", href: "/forecast", icon: TrendingUp },
  { name: "Scenario Lab", href: "/scenarios", icon: FlaskConical },
  { name: "Smart Alerts", href: "/alerts", icon: Bell, badge: "4", badgeVariant: "danger" },
  { name: "Decision Centre", href: "/decision-centre", icon: Compass },
  { name: "FairResolve", href: "/fairresolve", icon: Scale, badge: "ODR", badgeVariant: "info" },
  { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
];

const secondaryNavItems: NavItem[] = [
  { name: "Setup Wizard", href: "/onboarding", icon: Sparkles, badge: "Setup", badgeVariant: "info" },
  { name: "Settings", href: "/settings", icon: Settings },
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

  useEffect(() => {
    const syncCash = () => {
      const metrics = getUnifiedDashboardMetrics();
      setAvailableCash(metrics.availableCash);
      const onboarding = getOnboardingData();
      const minReserve = onboarding.openingFinances.minimumReserve || DEMO_SUMMARY.minimumReserve;
      setMinimumReserve(minReserve);
      setIsDeficit(metrics.availableCash < minReserve);
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

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800/80 transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-wider text-white">COINCISE</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Business Finance Support</p>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Main Menu
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono">
                DEMO MODE
              </span>
            </div>

            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          isActive
                            ? "bg-white/20 text-white border-white/20"
                            : item.badgeVariant === "danger"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : item.badgeVariant === "warning"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : item.badgeVariant === "info"
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Preferences
              </span>
            </div>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Cash Reserve Pill Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Available Cash</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-1 rounded">
                Live
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span
                className={cn(
                  "text-base font-bold tracking-tight transition-colors",
                  isDeficit ? "text-amber-400" : "text-white"
                )}
              >
                {formatCurrency(availableCash)}
              </span>
              <span className="text-[11px] text-slate-400">
                Min: {formatCurrency(minimumReserve)}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isDeficit ? "bg-amber-500" : "bg-emerald-500"
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
