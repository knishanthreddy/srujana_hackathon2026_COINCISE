import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: "neutral" | "success" | "warning" | "danger" | "primary";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "neutral",
  className,
}: StatCardProps) {
  const iconBgStyles = {
    neutral: "bg-[#F7F3EA] text-[#242321] border border-[#E8E1D5]",
    success: "bg-[#DDEFE8] text-[#138C83] border border-[#138C83]/30",
    warning: "bg-[#FCE4D8] text-[#F15A35] border border-[#F15A35]/30",
    danger: "bg-rose-50 text-rose-600 border border-rose-100",
    primary: "bg-[#FCE4D8] text-[#F15A35] border border-[#F15A35]/30",
  };

  return (
    <Card className={cn("p-5 flex flex-col justify-between relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#A69C8D] tracking-wider uppercase">{title}</p>
          <h4 className="text-2xl sm:text-3xl font-extrabold text-[#242321] mt-1.5 tracking-tight">{value}</h4>
        </div>
        {icon && (
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs", iconBgStyles[variant])}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 pt-2.5 border-t border-[#E8E1D5]/40 flex items-center justify-between text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center font-bold px-2 py-0.5 rounded-full text-[11px]",
                trend.isPositive ? "text-[#138C83] bg-[#DDEFE8]" : "text-[#F15A35] bg-[#FCE4D8]"
              )}
            >
              {trend.isPositive ? "↑ " : "↓ "}
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-[#A69C8D] text-[11px] truncate font-medium">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
