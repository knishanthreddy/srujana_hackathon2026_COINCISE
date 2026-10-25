"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  ReceiptText,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { CredroResult } from "@/lib/credro-score";

export interface CarouselData {
  availableCash: number;
  cashDeltaPercent?: number;
  cashSparkline: { day: string; value: number }[];
  projectedClosingCash: number;
  horizonDays: number;
  forecastSparkline: { day: string; value: number }[];
  outstandingReceivables: number;
  receivablesCount: number;
  overdueReceivables: number;
  outstandingPayables: number;
  upcomingPayables: number;
  overduePayables: number;
  credro: CredroResult;
  activeAlertsCount: number;
  topAlertMessage: string;
  topAlertSeverity: "critical" | "warning" | "info";
  minimumReserve: number;
  onOpenNewRecordModal?: () => void;
}

export function FinancialCardCarousel({ data }: { data: CarouselData }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const totalCards = 6;

  // Sync scroll position with active index
  const scrollToCard = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.children;
    if (cards[index]) {
      const card = cards[index] as HTMLElement;
      const scrollLeft = card.offsetLeft - (container.offsetWidth - card.offsetWidth) / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
      setActiveIndex(index);
    }
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((current) => {
      const nextIdx = Math.max(0, current - 1);
      scrollToCard(nextIdx);
      return nextIdx;
    });
  }, [scrollToCard]);

  const handleNext = useCallback(() => {
    setActiveIndex((current) => {
      const nextIdx = Math.min(totalCards - 1, current + 1);
      scrollToCard(nextIdx);
      return nextIdx;
    });
  }, [totalCards, scrollToCard]);

  // Listen to scroll events to update active dot
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const center = container.scrollLeft + container.offsetWidth / 2;
    const cards = Array.from(container.children) as HTMLElement[];

    let closestIdx = 0;
    let minDistance = Infinity;

    cards.forEach((card, idx) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(center - cardCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== activeIndex) {
      setActiveIndex(closestIdx);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Radius for Credro circular progress
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.credro.score / 100) * circumference;

  return (
    <div className="relative w-full">
      {/* Header controls for carousel */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#A69C8D]">
            Financial Summary Carousel
          </span>
          <span className="text-[11px] font-bold text-[#F15A35] bg-[#FCE4D8] px-2 py-0.5 rounded-full">
            {activeIndex + 1} of {totalCards}
          </span>
        </div>

        {/* Previous / Next Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="w-8 h-8 rounded-full bg-white border border-[#E8E1D5] text-[#242321] hover:bg-[#F7F3EA] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            aria-label="Previous financial card"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={activeIndex === totalCards - 1}
            className="w-8 h-8 rounded-full bg-white border border-[#E8E1D5] text-[#242321] hover:bg-[#F7F3EA] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            aria-label="Next financial card"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Swipeable Track */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory py-2 px-1 no-scrollbar scroll-smooth"
        style={{ scrollPadding: "0 1rem" }}
      >
        {/* ================================================================= */}
        {/* CARD 1: AVAILABLE CASH */}
        {/* ================================================================= */}
        <div className="shrink-0 snap-center w-[86vw] sm:w-[380px] md:w-[420px] bg-white rounded-3xl border border-[#E8E1D5] p-6 shadow-soft flex flex-col justify-between transition-all hover:border-[#A69C8D]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A69C8D]">
                    Available Cash
                  </h3>
                  <span className="text-[10px] text-[#138C83] font-semibold bg-[#DDEFE8] px-1.5 py-0.2 rounded-full">
                    Liquid Runway
                  </span>
                </div>
              </div>

              {data.cashDeltaPercent !== undefined && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    data.cashDeltaPercent >= 0
                      ? "text-[#138C83] bg-[#DDEFE8]"
                      : "text-[#F15A35] bg-[#FCE4D8]"
                  }`}
                >
                  {data.cashDeltaPercent >= 0 ? "↑ +" : "↓ "}
                  {Math.abs(data.cashDeltaPercent)}%
                </span>
              )}
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#242321] tracking-tight">
                {formatCurrency(data.availableCash)}
              </div>
              <p className="text-xs text-[#A69C8D] mt-1">
                Immediately spendable bank ledger &amp; operational funds
              </p>
            </div>

            {/* Sparkline trend chart in Teal Green */}
            <div className="h-16 w-full mt-4 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.cashSparkline} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tealSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#138C83" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#138C83" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#138C83"
                    strokeWidth={2.5}
                    fill="url(#tealSpark)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E8E1D5]/60 flex items-center justify-between">
            <span className="text-xs text-[#A69C8D] font-medium">
              Reserve Floor: {formatCurrency(data.minimumReserve)}
            </span>
            <Link href="/cash">
              <Button variant="outline" size="sm" className="font-bold text-[#F15A35] border-[#F15A35]/30 hover:bg-[#FCE4D8]">
                View Details &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CARD 2: CASH-FLOW FORECAST */}
        {/* ================================================================= */}
        <div className="shrink-0 snap-center w-[86vw] sm:w-[380px] md:w-[420px] bg-white rounded-3xl border border-[#E8E1D5] p-6 shadow-soft flex flex-col justify-between transition-all hover:border-[#A69C8D]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A69C8D]">
                    Cash Forecast
                  </h3>
                  <span className="text-[10px] text-[#F15A35] font-semibold bg-[#FCE4D8] px-1.5 py-0.2 rounded-full">
                    {data.horizonDays}D Projection
                  </span>
                </div>
              </div>

              <Badge variant="neutral" size="sm">
                Deterministic
              </Badge>
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#242321] tracking-tight">
                {formatCurrency(data.projectedClosingCash)}
              </div>
              <p className="text-xs text-[#A69C8D] mt-1">
                Projected Day {data.horizonDays} Closing: Opening + Inflows − Outflows
              </p>
            </div>

            {/* Sparkline forecast line */}
            <div className="h-16 w-full mt-4 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.forecastSparkline} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#F15A35"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E8E1D5]/60 flex items-center justify-between">
            <span className="text-xs text-[#A69C8D] font-medium">
              Closing Runway Target
            </span>
            <Link href="/forecast">
              <Button variant="outline" size="sm" className="font-bold text-[#F15A35] border-[#F15A35]/30 hover:bg-[#FCE4D8]">
                View Forecast &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CARD 3: CUSTOMER RECEIVABLES */}
        {/* ================================================================= */}
        <div className="shrink-0 snap-center w-[86vw] sm:w-[380px] md:w-[420px] bg-white rounded-3xl border border-[#E8E1D5] p-6 shadow-soft flex flex-col justify-between transition-all hover:border-[#A69C8D]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center font-bold">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A69C8D]">
                    Customer Receivables
                  </h3>
                  <span className="text-[10px] text-[#138C83] font-semibold bg-[#DDEFE8] px-1.5 py-0.2 rounded-full">
                    {data.receivablesCount} Invoices
                  </span>
                </div>
              </div>

              {data.overdueReceivables > 0 ? (
                <Badge variant="warning" size="sm">
                  {formatCurrency(data.overdueReceivables)} overdue
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  All Current
                </Badge>
              )}
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#242321] tracking-tight">
                {formatCurrency(data.outstandingReceivables)}
              </div>
              <p className="text-xs text-[#A69C8D] mt-1">
                Total outstanding client invoices awaiting settlement
              </p>
            </div>

            <div className="mt-5 p-3 rounded-2xl bg-[#F7F3EA] border border-[#E8E1D5] flex items-center justify-between text-xs text-[#242321]">
              <span className="text-[#A69C8D] font-medium">Pending Collection:</span>
              <span className="font-bold">{data.receivablesCount} Invoices Active</span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E8E1D5]/60 flex items-center justify-between">
            <span className="text-xs text-[#A69C8D] font-medium">Accounts Receivable</span>
            <Link href="/receivables">
              <Button variant="outline" size="sm" className="font-bold text-[#F15A35] border-[#F15A35]/30 hover:bg-[#FCE4D8]">
                View Receivables &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CARD 4: SUPPLIER PAYABLES */}
        {/* ================================================================= */}
        <div className="shrink-0 snap-center w-[86vw] sm:w-[380px] md:w-[420px] bg-white rounded-3xl border border-[#E8E1D5] p-6 shadow-soft flex flex-col justify-between transition-all hover:border-[#A69C8D]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A69C8D]">
                    Supplier Payables
                  </h3>
                  <span className="text-[10px] text-[#F15A35] font-semibold bg-[#FCE4D8] px-1.5 py-0.2 rounded-full">
                    Vendor Obligations
                  </span>
                </div>
              </div>

              {data.overduePayables > 0 ? (
                <Badge variant="danger" size="sm">
                  {formatCurrency(data.overduePayables)} overdue
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  On Schedule
                </Badge>
              )}
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#242321] tracking-tight">
                {formatCurrency(data.outstandingPayables)}
              </div>
              <p className="text-xs text-[#A69C8D] mt-1">
                Upcoming vendor bills &amp; committed operational payments
              </p>
            </div>

            <div className="mt-5 p-3 rounded-2xl bg-[#F7F3EA] border border-[#E8E1D5] flex items-center justify-between text-xs text-[#242321]">
              <span className="text-[#A69C8D] font-medium">Next 30D Commitments:</span>
              <span className="font-bold text-[#F15A35]">{formatCurrency(data.upcomingPayables)}</span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E8E1D5]/60 flex items-center justify-between">
            <span className="text-xs text-[#A69C8D] font-medium">Accounts Payable</span>
            <Link href="/payables">
              <Button variant="outline" size="sm" className="font-bold text-[#F15A35] border-[#F15A35]/30 hover:bg-[#FCE4D8]">
                View Payables &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CARD 5: CREDRO TRUST SCORE */}
        {/* ================================================================= */}
        <div className="shrink-0 snap-center w-[86vw] sm:w-[380px] md:w-[420px] bg-white rounded-3xl border border-[#E8E1D5] p-6 shadow-soft flex flex-col justify-between transition-all hover:border-[#A69C8D]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A69C8D]">
                    Credro™ Trust Score
                  </h3>
                  <Badge variant="primary" size="sm">
                    {data.credro.trustLevel} Trust
                  </Badge>
                </div>
              </div>

              {data.credro.isPreliminary && (
                <Badge variant="neutral" size="sm">
                  Preliminary
                </Badge>
              )}
            </div>

            {/* Circular score gauge */}
            <div className="mt-4 flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r={radius} className="stroke-[#E8E1D5]" strokeWidth="7" fill="transparent" />
                  <circle
                    cx="44"
                    cy="44"
                    r={radius}
                    className="stroke-[#F15A35] transition-all duration-700 ease-out"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-[#242321] leading-none">
                    {data.credro.score}
                  </span>
                  <span className="text-[9px] font-bold text-[#A69C8D]">/100</span>
                </div>
              </div>

              <div>
                <span className="text-base font-extrabold text-[#242321] block">
                  {data.credro.trustLevel} Reliability
                </span>
                <p className="text-[11px] text-[#A69C8D] mt-1 line-clamp-2">
                  {data.credro.historyNote}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-[#F7F3EA] border border-[#E8E1D5] text-[11px] text-[#242321]">
              <span className="font-semibold text-[#F15A35]">Tip: </span>
              <span>{data.credro.recommendations[0] || "Keep recording transactions to maintain score."}</span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E8E1D5]/60 flex items-center justify-between">
            <span className="text-xs text-[#A69C8D] font-medium">5 Factor Analysis</span>
            <Link href="/credro">
              <Button variant="outline" size="sm" className="font-bold text-[#F15A35] border-[#F15A35]/30 hover:bg-[#FCE4D8]">
                View Full Report &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CARD 6: FINANCIAL ALERTS */}
        {/* ================================================================= */}
        <div className="shrink-0 snap-center w-[86vw] sm:w-[380px] md:w-[420px] bg-white rounded-3xl border border-[#E8E1D5] p-6 shadow-soft flex flex-col justify-between transition-all hover:border-[#A69C8D]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A69C8D]">
                    Smart Alerts
                  </h3>
                  <span className="text-[10px] text-[#F15A35] font-semibold bg-[#FCE4D8] px-1.5 py-0.2 rounded-full">
                    {data.activeAlertsCount} Active Warning(s)
                  </span>
                </div>
              </div>

              <Badge variant="warning" size="sm">
                Real-Time
              </Badge>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#242321] tracking-tight">
                {data.activeAlertsCount} Action Triggers
              </div>
              <p className="text-xs text-[#A69C8D] mt-1">
                Automated breach detection, overdue invoices &amp; cash dips
              </p>
            </div>

            <div className="mt-5 p-3.5 rounded-2xl bg-[#FCE4D8]/60 border border-[#F15A35]/30 text-xs text-[#242321] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#F15A35] shrink-0 mt-0.5" />
              <div className="line-clamp-2">
                <span className="font-bold text-[#F15A35]">Primary Warning: </span>
                <span>{data.topAlertMessage}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E8E1D5]/60 flex items-center justify-between">
            <span className="text-xs text-[#A69C8D] font-medium">Predictive Monitoring</span>
            <Link href="/alerts">
              <Button variant="outline" size="sm" className="font-bold text-[#F15A35] border-[#F15A35]/30 hover:bg-[#FCE4D8]">
                View Alerts &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {Array.from({ length: totalCards }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToCard(idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              activeIndex === idx
                ? "w-6 h-2 bg-[#F15A35]"
                : "w-2 h-2 bg-[#E8E1D5] hover:bg-[#A69C8D]"
            }`}
            aria-label={`Jump to financial card ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
