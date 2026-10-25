"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  ExternalLink,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { resetAllDataToDefaults } from "@/lib/data-service";
import { DEMO_SUMMARY } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import {
  getOnboardingData,
  saveOnboardingProgress,
  resetOnboardingData,
} from "@/lib/onboarding-service";
import { MCA_MASTER_DATA_URL, validateCINFormat } from "@/lib/mca-service";
import { BusinessEntityType } from "@/lib/onboarding-types";

export default function SettingsPage() {
  const [onboarding, setOnboarding] = useState(getOnboardingData());
  const [businessName, setBusinessName] = useState(DEMO_SUMMARY.businessName);
  const [tradeName, setTradeName] = useState(onboarding.profile.tradeName || DEMO_SUMMARY.businessName);
  const [cin, setCin] = useState(onboarding.profile.cin || "");
  const [entityType, setEntityType] = useState<BusinessEntityType>(onboarding.profile.entityType || "pvt_ltd");
  const [registeredAddress, setRegisteredAddress] = useState(onboarding.profile.registeredAddress || "");
  const [city, setCity] = useState(onboarding.profile.city || "Bangalore");
  const [state, setState] = useState(onboarding.profile.state || "Karnataka");
  const [industry, setIndustry] = useState(onboarding.profile.industry || "Precision Manufacturing & Automation");
  const [gstin, setGstin] = useState(onboarding.profile.gstin || "29AABCA1234F1Z5");
  const [udyam, setUdyam] = useState(onboarding.profile.udyamNumber || "UDYAM-KR-03-0014882");
  const [financialYear, setFinancialYear] = useState(onboarding.profile.financialYear || "2026-2027 (Apr - Mar)");
  const [currency, setCurrency] = useState("INR");
  const [minimumReserve, setMinimumReserve] = useState(DEMO_SUMMARY.minimumReserve.toString());
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(
    (onboarding.preferences.overdueAlertDays || 14).toString()
  );
  const [concentrationLimitPct, setConcentrationLimitPct] = useState("35");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  useEffect(() => {
    const fresh = getOnboardingData();
    setOnboarding(fresh);
    setBusinessName(fresh.profile.mcaLegalName || DEMO_SUMMARY.businessName);
    setTradeName(fresh.profile.tradeName || fresh.profile.mcaLegalName);
    setCin(fresh.profile.cin || "");
    setEntityType(fresh.profile.entityType || "pvt_ltd");
    setRegisteredAddress(fresh.profile.registeredAddress || "");
    setCity(fresh.profile.city || "");
    setState(fresh.profile.state || "");
    setIndustry(fresh.profile.industry || "");
    setGstin(fresh.profile.gstin || "");
    setUdyam(fresh.profile.udyamNumber || "");
    setMinimumReserve((fresh.openingFinances.minimumReserve || DEMO_SUMMARY.minimumReserve).toString());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const minReserveNum = Number(minimumReserve) || 250000;
    const overdueDaysNum = Number(overdueThresholdDays) || 14;

    DEMO_SUMMARY.businessName = tradeName || businessName;
    DEMO_SUMMARY.minimumReserve = minReserveNum;

    const updated = {
      ...onboarding,
      profile: {
        ...onboarding.profile,
        mcaLegalName: businessName,
        tradeName: tradeName,
        cin: cin,
        entityType: entityType,
        registeredAddress: registeredAddress,
        city: city,
        state: state,
        industry: industry,
        gstin: gstin,
        udyamNumber: udyam,
        financialYear: financialYear,
      },
      preferences: {
        ...onboarding.preferences,
        safetyReserveBuffer: minReserveNum,
        overdueAlertDays: overdueDaysNum,
      },
      openingFinances: {
        ...onboarding.openingFinances,
        minimumReserve: minReserveNum,
      },
    };

    saveOnboardingProgress(updated);
    setOnboarding(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDemoData = () => {
    if (confirm("Reset demo financial records, receivables, and payables back to sandbox baseline?")) {
      resetAllDataToDefaults();
      setResetNotice("Demo transaction records successfully restored to default state.");
      setTimeout(() => setResetNotice(null), 3500);
    }
  };

  const handleResetOnboarding = () => {
    if (confirm("Reset Business Onboarding status to unconfigured? You will be able to run through the 5-step setup wizard from scratch.")) {
      resetOnboardingData();
      setResetNotice("Business setup status reset to unconfigured. Launch the wizard from the top banner or button.");
      setTimeout(() => setResetNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast Confirmation */}
      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Business settings saved successfully. Financial parameters updated.</span>
        </div>
      )}

      {resetNotice && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-2 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{resetNotice}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            System & Business Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure legal entity profile, MCA verification parameters, and liquidity risk rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/onboarding">
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Rerun Setup Wizard
            </Button>
          </Link>
          <Badge variant="success" size="md">
            Sandbox Active
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile & Legal Entity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <CardTitle>Business Entity & MCA Profile</CardTitle>
              </div>

              <Badge
                variant={
                  onboarding.verification.verifiedStatus === "verified"
                    ? "success"
                    : onboarding.verification.isFormatValid
                    ? "info"
                    : "neutral"
                }
                size="sm"
              >
                {onboarding.verification.verifiedStatus === "verified"
                  ? "MCA Seed Verified"
                  : onboarding.verification.isFormatValid
                  ? "CIN Format Valid"
                  : "Manual Declaration"}
              </Badge>
            </div>
            <CardDescription>
              Registered commercial identity for reports, invoice headers, and MSME dispute filings
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MCA Registered Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trade Name / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corporate Identity Number (CIN)
                </label>
                <input
                  type="text"
                  value={cin}
                  onChange={(e) => setCin(e.target.value.toUpperCase())}
                  placeholder="e.g. U72900KA2021PTC148892"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase bg-white"
                />
                {cin && (
                  <span className="text-[10px] mt-1 block">
                    {validateCINFormat(cin).isValid ? (
                      <span className="text-emerald-600 font-semibold">✓ Valid 21-char format</span>
                    ) : (
                      <span className="text-amber-600">{validateCINFormat(cin).explanation}</span>
                    )}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Entity Type *
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as BusinessEntityType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="pvt_ltd">Private Limited Company (Pvt Ltd)</option>
                  <option value="public_ltd">Public Limited Company (Public Ltd)</option>
                  <option value="opc">One Person Company (OPC)</option>
                  <option value="llp">Limited Liability Partnership (LLP)</option>
                  <option value="partnership">Partnership Firm</option>
                  <option value="sole_proprietorship">Sole Proprietorship</option>
                  <option value="other">Other Entity</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Office Address
                </label>
                <input
                  type="text"
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN (Tax ID)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Udyam Registration Number (MSME)
                </label>
                <input
                  type="text"
                  value={udyam}
                  onChange={(e) => setUdyam(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Financial Year Standard
                </label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="2026-2027 (Apr - Mar)">1st April - 31st March (Indian Standard)</option>
                  <option value="2026 (Jan - Dec)">1st January - 31st December (Calendar Year)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
              <span>Need to verify corporate records directly with the MCA?</span>
              <a
                href={MCA_MASTER_DATA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
              >
                <span>MCA Master Data Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

        {/* Demo & Setup State Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <CardTitle>Demo & Setup State Management</CardTitle>
            </div>
            <CardDescription>
              Reset simulated records or reset business onboarding status to test the onboarding wizard flow
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Reset Business Onboarding Status</p>
                <p className="text-[11px] text-slate-500">
                  Marks business onboarding as incomplete to test post-login redirection and wizard flows.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetOnboarding}
                className="text-amber-700 border-amber-300 hover:bg-amber-50 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Setup Status
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Restore Baseline Demo Records</p>
                <p className="text-[11px] text-slate-500">
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
            </div>
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" size="md">
            Save Business Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
