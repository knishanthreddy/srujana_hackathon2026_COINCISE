"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ReceiptText,
  TrendingUp,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export function MobileBottomNav({ onOpenDrawer }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Don't show bottom nav on standalone onboarding or login screen
  if (pathname === "/onboarding" || pathname === "/login") {
    return null;
  }

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Transactions",
      href: "/records",
      icon: ReceiptText,
      isActive: pathname === "/records",
    },
    {
      label: "Forecast",
      href: "/forecast",
      icon: TrendingUp,
      isActive: pathname === "/forecast",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#F7F3EA]/95 backdrop-blur-md border-t border-[#E8E1D5] md:hidden px-4 py-2 flex items-center justify-around shadow-sm"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Mobile Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all",
              item.isActive
                ? "text-[#F15A35] font-bold"
                : "text-[#A69C8D] hover:text-[#242321] font-medium"
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5 transition-transform",
                item.isActive && "scale-110 stroke-[2.5]"
              )}
            />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}

      {/* More Button: Opens the full Hamburger Navigation Drawer */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[#A69C8D] hover:text-[#242321] font-medium transition-all"
        aria-label="Open full menu"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">More</span>
      </button>
    </nav>
  );
}
