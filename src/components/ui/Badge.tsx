import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "info" | "primary" | "purple" | "teal";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-[#E8E1D5]/60 text-[#242321] border-[#E8E1D5]",
    primary: "bg-[#FCE4D8] text-[#F15A35] border-[#F15A35]/30 font-semibold",
    success: "bg-[#DDEFE8] text-[#138C83] border-[#138C83]/30 font-semibold",
    warning: "bg-[#FCE4D8] text-[#F15A35] border-[#F15A35]/30",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-[#DDEFE8] text-[#138C83] border-[#138C83]/30",
    purple: "bg-[#F7F3EA] text-[#242321] border-[#E8E1D5]",
    teal: "bg-[#138C83] text-white border-transparent font-medium",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
