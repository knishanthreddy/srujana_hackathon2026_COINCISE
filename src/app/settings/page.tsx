"use client";

import React, { useState } from "react";
import {
  Settings,
  Building,
  Shield,
  Bell,
  Database,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DEMO_SUMMARY } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState(DEMO_SUMMARY.businessName);
  const [gstin, setGstin] = useState("29ABCDE1234F1Z5");
  const [currency, setCurrency] = useState("INR");
  const [minimumReserve, setMinimumReserve] = useState(DEMO_SUMMARY.minimumReserve.toString());
  const [overdueThresholdDays, setOverdueThresholdDays] = useState("14");
  const [concentrationLimitPct, setConcentrationLimitPct] = useState("35");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDemoData = () => {
    if (confirm("Reset demo data back to default sandbox state?")) {
      setResetNotice(true);
      setTimeout(() => setResetNotice(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast Confirmation */}
      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Settings saved successfully. Risk thresholds updated.</span>
        </div>
      )}

      {resetNotice && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-2 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Demo data successfully refreshed to baseline values.</span>
        </div>
      )}

      {/* Page Header */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            System & Financial Parameters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure safety reserve thresholds, alert engine triggers, and MSME profile information.
          </p>
        </div>

        <Badge variant="success" size="md">
          Sandbox Mode Active
        </Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <CardTitle>Business Entity Profile</CardTitle>
            </div>
            <CardDescription>
              Basic commercial identity for reports and dispute correspondence
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN / Tax ID
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Financial Year Cycle
                </label>
                <select className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>1st April - 31st March (Indian Standard)</option>
                  <option>1st January - 31st December (Calendar Year)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Reserve & Risk Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <CardTitle>Liquidity Safety Floor & Risk Rules</CardTitle>
            </div>
            <CardDescription>
              Determines when Smart Alerts trigger and minimum reserve lines on forecast charts
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Cash Reserve Floor (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={minimumReserve}
                  onChange={(e) => setMinimumReserve(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Alert fires when closing cash dips below this
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overdue Invoice Alert Threshold (Days)
                </label>
                <input
                  type="number"
                  required
                  value={overdueThresholdDays}
                  onChange={(e) => setOverdueThresholdDays(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Alert fires after due date + N days
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Concentration Limit (%)
                </label>
                <input
                  type="number"
                  required
                  value={concentrationLimitPct}
                  onChange={(e) => setConcentrationLimitPct(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  % of available cash in a single payable
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
              <span className="font-bold">Algorithmic Integrity:</span> Setting the reserve floor higher triggers earlier warnings in the Cash-Flow Forecast engine, giving you more time to take corrective action in the Decision Centre.
            </div>
          </CardContent>
        </Card>

        {/* Demo Data Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <CardTitle>Demo Environment Controls</CardTitle>
            </div>
            <CardDescription>
              Reset simulated transactions or manage demo state
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Restore Baseline Demo State</p>
              <p className="text-xs text-slate-500">
                Restores original demo receivables, payables, and transactions for presentations.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDemoData}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset Demo Records
            </Button>
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" size="md">
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
