"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DEMO_ALERTS } from "@/lib/demo-data";
import { SmartAlert } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function SmartAlertsPage() {
  const [alerts, setAlerts] = useState<SmartAlert[]>(DEMO_ALERTS);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const markAsRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
  };

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
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
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                  {unreadCount} New
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Derived automatically from 90-day cash flow mathematical forecasts and invoice aging rules.
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
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1.5" />
              Configure Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
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
              : "bg-white text-rose-600 hover:bg-rose-50 border border-rose-200"
          }`}
        >
          Critical ({alerts.filter((a) => a.severity === "critical").length})
        </button>
        <button
          onClick={() => setSeverityFilter("warning")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            severityFilter === "warning"
              ? "bg-amber-600 text-white"
              : "bg-white text-amber-600 hover:bg-amber-50 border border-amber-200"
          }`}
        >
          Warnings ({alerts.filter((a) => a.severity === "warning").length})
        </button>
        <button
          onClick={() => setSeverityFilter("info")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            severityFilter === "info"
              ? "bg-blue-600 text-white"
              : "bg-white text-blue-600 hover:bg-slate-100 border border-blue-200"
          }`}
        >
          Informational ({alerts.filter((a) => a.severity === "info").length})
        </button>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {filtered.map((alert) => (
          <Card
            key={alert.id}
            className={`border transition-all ${
              !alert.isRead ? "border-l-4 border-l-rose-500 bg-white" : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
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

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        alert.severity === "critical"
                          ? "danger"
                          : alert.severity === "warning"
                          ? "warning"
                          : "info"
                      }
                      size="sm"
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(alert.date)}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                      Trigger: {alert.triggerType.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 pt-0.5">{alert.title}</h3>
                  <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">{alert.message}</p>

                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2 text-xs text-slate-700">
                    <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Recommended Action: </span>
                      {alert.suggestedAction}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                {alert.actionLink && (
                  <Link href={alert.actionLink}>
                    <Button size="sm" variant="primary" className="h-8 text-xs">
                      Resolve Risk <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                )}

                {!alert.isRead ? (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Acknowledged
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Rules Architecture Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alert Trigger Detection Engine Rules</CardTitle>
          <CardDescription>
            COINCISE generates signals deterministically according to these business rules
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">Rule 1: Liquidity Reserve Breach</p>
              <p className="text-slate-600 mt-1">
                Fires whenever closing cash balance dips below configured threshold (₹2,50,000) within the next 90 days.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">Rule 2: Aging Receivables Danger</p>
              <p className="text-slate-600 mt-1">
                Fires when an invoice exceeds due date by &gt;14 days or enters disputed status without a settlement counter-offer.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">Rule 3: Major Supplier Concentration</p>
              <p className="text-slate-600 mt-1">
                Fires when a single vendor bill due within 7 days constitutes more than 35% of current available cash.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">Rule 4: Statutory GST / Tax Reconciliation</p>
              <p className="text-slate-600 mt-1">
                Fires when input tax credits on vendor invoices do not match cleared transaction records prior to filing deadline.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
