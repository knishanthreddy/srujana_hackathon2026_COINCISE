"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldAlert,
  Compass,
  Scale,
  CreditCard,
  Settings,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getFinancialRecords,
  getReceivables,
  getPayables,
  getLiveForecast,
  subscribeToFinancialRecords,
  subscribeToReceivables,
  subscribeToPayables,
} from "@/lib/data-service";
import { generateSmartAlerts } from "@/lib/alerts-engine";
import { SmartAlert } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function SmartAlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to live records, receivables, and payables
  useEffect(() => {
    const unsubRecords = subscribeToFinancialRecords(() => setRefreshTrigger((n) => n + 1));
    const unsubReceivables = subscribeToReceivables(() => setRefreshTrigger((n) => n + 1));
    const unsubPayables = subscribeToPayables(() => setRefreshTrigger((n) => n + 1));

    return () => {
      unsubRecords();
      unsubReceivables();
      unsubPayables();
    };
  }, []);

  // Compute live smart alerts directly from application calculations
  const rawAlerts = useMemo(() => {
    void refreshTrigger;
    const records = getFinancialRecords();
    const receivables = getReceivables();
    const payables = getPayables();
    const forecast = getLiveForecast(60, 250000);

    return generateSmartAlerts(records, receivables, payables, forecast);
  }, [refreshTrigger]);

  const alerts: SmartAlert[] = useMemo(() => {
    return rawAlerts.map((a) => ({
      ...a,
      isRead: readAlertIds.has(a.id),
    }));
  }, [rawAlerts, readAlertIds]);

  const markAsRead = (id: string) => {
    setReadAlertIds((prev) => new Set([...Array.from(prev), id]));
  };

  const markAllRead = () => {
    setReadAlertIds(new Set(rawAlerts.map((a) => a.id)));
  };

  const filtered = alerts.filter((a) => {
    if (severityFilter === "all") return true;
    return a.severity === severityFilter;
  });

  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.isRead).length;
  const warningCount = alerts.filter((a) => a.severity === "warning" && !a.isRead).length;
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Alert Center Top Bar */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FCE4D8] border border-[#F15A35]/30 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-[#F15A35]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#242321] tracking-tight flex items-center gap-2">
              Automated Financial Risk Triggers
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F15A35] text-white font-mono">
                  {unreadCount} Active
                </span>
              )}
            </h2>
            <p className="text-xs text-[#7A7369] mt-0.5">
              Generated deterministically from active cash forecasts, invoice aging, and vendor payment schedules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#7A7369]" />
              Mark All as Read
            </Button>
          )}
          <Link href="/forecast">
            <Button variant="primary" size="sm">
              <Compass className="w-4 h-4 mr-1.5" />
              Inspect Forecast
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8E1D5] pb-3">
        <button
          onClick={() => setSeverityFilter("all")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            severityFilter === "all"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setSeverityFilter("critical")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            severityFilter === "critical"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Critical ({criticalCount})
        </button>
        <button
          onClick={() => setSeverityFilter("warning")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            severityFilter === "warning"
              ? "bg-[#F15A35] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Warnings ({warningCount})
        </button>
        <button
          onClick={() => setSeverityFilter("info")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            severityFilter === "info"
              ? "bg-[#138C83] text-white shadow-xs"
              : "bg-white text-[#7A7369] hover:bg-[#F7F3EA] border border-[#E8E1D5]"
          }`}
        >
          Informational
        </button>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5]">
            <CheckCircle2 className="w-12 h-12 text-[#138C83] mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#242321]">No active alerts in this view</h4>
            <p className="text-xs text-[#7A7369] mt-1 max-w-sm mx-auto">
              Your receivables, payables, and projected liquidity buffer are currently within safe thresholds.
            </p>
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all ${
                alert.isRead
                  ? "bg-white border-[#E8E1D5] opacity-75"
                  : alert.severity === "critical"
                  ? "bg-[#FCE4D8]/50 border-[#F15A35]/40 shadow-xs"
                  : alert.severity === "warning"
                  ? "bg-[#FCE4D8]/30 border-[#F15A35]/30 shadow-xs"
                  : "bg-[#DDEFE8]/40 border-[#138C83]/30 shadow-xs"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                      alert.severity === "critical"
                        ? "bg-[#FCE4D8] text-[#F15A35]"
                        : alert.severity === "warning"
                        ? "bg-[#FCE4D8] text-[#F15A35]"
                        : "bg-[#DDEFE8] text-[#138C83]"
                    }`}
                  >
                    {alert.severity === "critical" ? (
                      <AlertOctagon className="w-5 h-5" />
                    ) : alert.severity === "warning" ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "danger"
                            : alert.severity === "warning"
                            ? "warning"
                            : "info"
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {alert.severity}
                      </Badge>

                      <span className="text-[11px] font-semibold text-[#A69C8D] font-mono">
                        {formatDate(alert.date)}
                      </span>

                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#F15A35] inline-block" />
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-[#242321]">{alert.title}</h4>
                    <p className="text-xs text-[#7A7369] mt-1 leading-relaxed">{alert.message}</p>

                    {/* Root Cause & Suggested Action */}
                    <div className="mt-3 p-3 bg-white rounded-xl border border-[#E8E1D5] text-xs space-y-1">
                      <p className="font-bold text-[#242321] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#F15A35]" />
                        <span>Recommended Corrective Strategy:</span>
                      </p>
                      <p className="text-[#7A7369]">{alert.suggestedAction}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 md:self-center">
                  {!alert.isRead && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsRead(alert.id)}
                      className="text-xs"
                    >
                      Dismiss
                    </Button>
                  )}

                  {alert.actionLink && (
                    <Link href={alert.actionLink}>
                      <Button size="sm" className="bg-[#242321] hover:bg-[#383632] text-white text-xs font-bold rounded-xl">
                        Resolve
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
