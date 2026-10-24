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
      <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Automated Financial Risk Triggers
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white font-mono">
                  {unreadCount} Active
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Generated deterministically from active cash forecasts, invoice aging, and vendor payment schedules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-slate-500" />
              Mark All as Read
            </Button>
          )}
          <Link href="/forecast">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Compass className="w-4 h-4 mr-1.5" />
              Inspect Forecast
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSeverityFilter("all")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            severityFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setSeverityFilter("critical")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            severityFilter === "critical"
              ? "bg-rose-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Critical ({criticalCount})
        </button>
        <button
          onClick={() => setSeverityFilter("warning")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            severityFilter === "warning"
              ? "bg-amber-500 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Warnings ({warningCount})
        </button>
        <button
          onClick={() => setSeverityFilter("info")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            severityFilter === "info"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Informational
        </button>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-base font-bold text-slate-800">No active alerts in this view</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Your receivables, payables, and projected liquidity buffer are currently within safe thresholds.
            </p>
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.isRead
                  ? "bg-slate-50/70 border-slate-200 opacity-75"
                  : alert.severity === "critical"
                  ? "bg-rose-50/70 border-rose-200/90 shadow-sm"
                  : alert.severity === "warning"
                  ? "bg-amber-50/70 border-amber-200/90 shadow-sm"
                  : "bg-blue-50/60 border-blue-200/80 shadow-sm"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      alert.severity === "critical"
                        ? "bg-rose-100 text-rose-700"
                        : alert.severity === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
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

                      <span className="text-[11px] font-semibold text-slate-400 font-mono">
                        {formatDate(alert.date)}
                      </span>

                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{alert.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>

                    {/* Root Cause & Suggested Action */}
                    <div className="mt-3 p-3 bg-white/80 rounded-lg border border-slate-200/70 text-xs space-y-1">
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Recommended Corrective Strategy:</span>
                      </p>
                      <p className="text-slate-600">{alert.suggestedAction}</p>
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
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
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
