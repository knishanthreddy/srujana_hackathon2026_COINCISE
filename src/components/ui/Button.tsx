import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "teal";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      "bg-[#F15A35] text-white hover:bg-[#DE4924] active:bg-[#C83B18] shadow-sm shadow-[#F15A35]/20 border border-[#F15A35] focus-visible:ring-[#F15A35]",
    secondary:
      "bg-[#242321] text-white hover:bg-[#383532] active:bg-[#1a1917] border border-[#242321] focus-visible:ring-[#242321]",
    outline:
      "bg-white text-[#242321] hover:bg-[#F7F3EA] border border-[#E8E1D5] focus-visible:ring-[#A69C8D] shadow-2xs",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-rose-600 focus-visible:ring-rose-500",
    ghost:
      "bg-transparent text-[#242321] hover:bg-[#E8E1D5]/50 border border-transparent",
    teal:
      "bg-[#138C83] text-white hover:bg-[#0E6E67] active:bg-[#0A544E] border border-[#138C83] focus-visible:ring-[#138C83]",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-xl",
    md: "h-9.5 px-4 text-xs font-semibold sm:text-sm gap-2 rounded-xl",
    lg: "h-11 px-6 text-sm sm:text-base gap-2.5 rounded-2xl",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
