"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Landmark,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Scale,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { resetAllDataToDefaults } from "@/lib/data-service";
import { DEMO_SUMMARY } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import {
  getOnboardingData,
  saveOnboardingProgress,
  resetOnboardingData,
} from "@/lib/onboarding-service";
import {
  calculateFinancialSummary,
  validateFinancialInputs,
  FinancialSummaryResult,
  FinancialValidationError,
} from "@/lib/financial-summary";
import {
  MCA_MASTER_DATA_URL,
  MCA_COMPANY_VERIFICATION_URL,
  validateCINFormat,
} from "@/lib/mca-service";
import {
  BusinessEntityType,
  BankAccountItem,
  LiabilityItem,
  InventoryItem,
  FixedAssetItem,
  OnboardingData,
} from "@/lib/onboarding-types";

type SettingsTab = "company" | "finances" | "forecast" | "demo";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [onboarding, setOnboarding] = useState<OnboardingData>(getOnboardingData());

  // Company Profile State
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

  // Liquid Finances State
  const [cashInHand, setCashInHand] = useState(onboarding.openingFinances.cashInHand || 0);
  const [shortTermInvestments, setShortTermInvestments] = useState(onboarding.openingFinances.shortTermInvestments || 0);
  const [isShortTermImmediate, setIsShortTermImmediate] = useState(
    Boolean(onboarding.openingFinances.isShortTermInvestmentImmediatelyAvailable)
  );
  const [minimumReserve, setMinimumReserve] = useState(
    (onboarding.openingFinances.minimumReserve || DEMO_SUMMARY.minimumReserve).toString()
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>(
    onboarding.openingFinances.bankAccounts || []
  );

  // Forecast Assumptions State
  const [horizon, setHorizon] = useState<7 | 30 | 60 | 90>(
    onboarding.preferences.defaultForecastHorizon || 30
  );
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(
    (onboarding.preferences.overdueAlertDays || 14).toString()
  );
  const [typicalSales, setTypicalSales] = useState(
    onboarding.forecastAssumptions?.typicalMonthlySales?.toString() || "600000"
  );
  const [typicalExpenses, setTypicalExpenses] = useState(
    onboarding.forecastAssumptions?.typicalMonthlyExpenses?.toString() || "400000"
  );
  const [expectedGrowth, setExpectedGrowth] = useState(
    onboarding.forecastAssumptions?.expectedGrowthRate?.toString() || "5"
  );
  const [customerDelay, setCustomerDelay] = useState(
    onboarding.forecastAssumptions?.typicalCustomerPaymentDelay?.toString() || "7"
  );
  const [supplierTerms, setSupplierTerms] = useState(
    onboarding.forecastAssumptions?.supplierPaymentTerms?.toString() || "30"
  );
  const [payrollDay, setPayrollDay] = useState(
    onboarding.forecastAssumptions?.payrollScheduleDay?.toString() || "5"
  );
  const [payrollAmount, setPayrollAmount] = useState(
    onboarding.forecastAssumptions?.payrollMonthlyAmount?.toString() || "210000"
  );

  // Status & Feedback State
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<FinancialValidationError[]>([]);

  // Modal State for adding a Bank Account
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [newBank, setNewBank] = useState<Partial<BankAccountItem>>({
    bankName: "HDFC Bank",
    accountNickname: "",
    accountType: "current",
    accountNumberMasked: "",
    currentBalance: 0,
    restrictedAmount: 0,
  });

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
    setCashInHand(fresh.openingFinances.cashInHand || 0);
    setShortTermInvestments(fresh.openingFinances.shortTermInvestments || 0);
    setIsShortTermImmediate(Boolean(fresh.openingFinances.isShortTermInvestmentImmediatelyAvailable));
    setMinimumReserve((fresh.openingFinances.minimumReserve || DEMO_SUMMARY.minimumReserve).toString());
    setBankAccounts(fresh.openingFinances.bankAccounts || []);
    setHorizon(fresh.preferences.defaultForecastHorizon || 30);
    setOverdueThresholdDays((fresh.preferences.overdueAlertDays || 14).toString());
    setTypicalSales(fresh.forecastAssumptions?.typicalMonthlySales?.toString() || "600000");
    setTypicalExpenses(fresh.forecastAssumptions?.typicalMonthlyExpenses?.toString() || "400000");
    setExpectedGrowth(fresh.forecastAssumptions?.expectedGrowthRate?.toString() || "5");
    setCustomerDelay(fresh.forecastAssumptions?.typicalCustomerPaymentDelay?.toString() || "7");
    setSupplierTerms(fresh.forecastAssumptions?.supplierPaymentTerms?.toString() || "30");
    setPayrollDay(fresh.forecastAssumptions?.payrollScheduleDay?.toString() || "5");
    setPayrollAmount(fresh.forecastAssumptions?.payrollMonthlyAmount?.toString() || "210000");
  }, []);

  // Compute live financial summary using business-logic layer
  const currentFinances = useMemo(() => {
    return {
      ...onboarding.openingFinances,
      cashInHand: Number(cashInHand) || 0,
      bankAccounts,
      shortTermInvestments: Number(shortTermInvestments) || 0,
      isShortTermInvestmentImmediatelyAvailable: isShortTermImmediate,
      minimumReserve: Number(minimumReserve) || 250000,
    };
  }, [onboarding.openingFinances, cashInHand, bankAccounts, shortTermInvestments, isShortTermImmediate, minimumReserve]);

  const liveSummary: FinancialSummaryResult = useMemo(() => {
    return calculateFinancialSummary(currentFinances);
  }, [currentFinances]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const minReserveNum = Number(minimumReserve) || 250000;
    const overdueDaysNum = Number(overdueThresholdDays) || 14;

    const validation = validateFinancialInputs(currentFinances);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);

    DEMO_SUMMARY.businessName = tradeName || businessName;
    DEMO_SUMMARY.minimumReserve = minReserveNum;
    DEMO_SUMMARY.availableCash = liveSummary.availableOperatingCash;

    const updated: OnboardingData = {
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
      openingFinances: currentFinances,
      preferences: {
        ...onboarding.preferences,
        defaultForecastHorizon: horizon,
        safetyReserveBuffer: minReserveNum,
        overdueAlertDays: overdueDaysNum,
      },
      forecastAssumptions: {
        ...onboarding.forecastAssumptions,
        typicalMonthlySales: Number(typicalSales) || 0,
        typicalMonthlyExpenses: Number(typicalExpenses) || 0,
        expectedGrowthRate: Number(expectedGrowth) || 0,
        typicalCustomerPaymentDelay: Number(customerDelay) || 0,
        supplierPaymentTerms: Number(supplierTerms) || 30,
        payrollScheduleDay: Number(payrollDay) || 5,
        payrollMonthlyAmount: Number(payrollAmount) || 0,
      },
    };

    saveOnboardingProgress(updated);
    setOnboarding(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = Number(newBank.currentBalance) || 0;
    const restr = Number(newBank.restrictedAmount) || 0;
    const item: BankAccountItem = {
      id: `bank-${Date.now()}`,
      bankName: newBank.bankName || "Commercial Bank",
      accountNickname: newBank.accountNickname || "Operating Current A/C",
      accountType: (newBank.accountType as "current" | "savings" | "od_cc") || "current",
      accountNumberMasked: newBank.accountNumberMasked || "••••" + Math.floor(1000 + Math.random() * 9000),
      currentBalance: bal,
      restrictedAmount: restr,
      availableBalance: Math.max(0, bal - restr),
      lastUpdatedDate: new Date().toISOString().split("T")[0],
    };
    setBankAccounts([...bankAccounts, item]);
    setIsAddBankModalOpen(false);
  };

  const handleRemoveBank = (id: string) => {
    setBankAccounts(bankAccounts.filter((b) => b.id !== id));
  };

  const handleResetDemoData = () => {
    if (confirm("Reset demo financial records, receivables, and payables back to sandbox baseline?")) {
      resetAllDataToDefaults();
      setResetNotice("Demo transaction records successfully restored to default state.");
      setTimeout(() => setResetNotice(null), 3500);
    }
  };

  const handleResetOnboarding = () => {
    if (confirm("Reset Business Setup status to unconfigured? You will be able to run through the 5-step onboarding wizard from scratch.")) {
      resetOnboardingData();
      setResetNotice("Business setup status reset to unconfigured. Launch the wizard from the top banner or sidebar.");
      setTimeout(() => setResetNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl font-sans text-slate-900">
      {/* Toast Confirmation */}
      {savedSuccess && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-2 text-sm shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0" />
          <span>Financial parameters saved successfully. Live forecasts and dashboards recalculated.</span>
        </div>
      )}

      {/* Validation Errors Alert */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-1 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Please resolve financial validation errors before saving:</span>
          </div>
          <ul className="list-disc list-inside text-rose-900 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {resetNotice && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2 text-sm shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-700 shrink-0" />
          <span>{resetNotice}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#242321] tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#F15A35]" />
            System & Business Settings
          </h2>
          <p className="text-xs text-[#7A7369] mt-0.5">
            Manage legal entity parameters, bank accounts, liquid reserves, and forecast assumptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/onboarding">
            <Button variant="outline" size="sm" className="font-bold">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#F15A35]" />
              Launch Setup Wizard
            </Button>
          </Link>
          <Badge variant="success" size="md">
            Active Workspace
          </Badge>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E1D5] pb-3 overflow-x-auto">
        {[
          { id: "company", label: "Business & MCA Profile", icon: Building },
          { id: "finances", label: "Bank Accounts & Liquid Cash", icon: Wallet },
          { id: "forecast", label: "Forecast Assumptions", icon: TrendingUp },
          { id: "demo", label: "Environment & Data", icon: Database },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as SettingsTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#F15A35] text-white shadow-xs"
                  : "bg-white text-[#7A7369] border border-[#E8E1D5] hover:bg-[#F7F3EA]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: BUSINESS & MCA PROFILE */}
        {activeTab === "company" && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-700" />
                  <CardTitle>Business Entity & Registration</CardTitle>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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

                  <a
                    href={MCA_COMPANY_VERIFICATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E1D5] bg-[#F7F3EA] hover:bg-[#FCE4D8] text-[#242321] hover:text-[#F15A35] text-xs font-bold transition-colors shadow-2xs"
                    aria-label="Open official MCA company verification portal in a new browser tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#F15A35]" />
                    <span>MCA Company Verification</span>
                  </a>
                </div>
              </div>
              <CardDescription>
                Commercial identity for reports, invoice headers, and MSME dispute filings under FairResolve.
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono uppercase bg-white"
                  />
                  {cin && (
                    <span className="text-[10px] mt-1 block">
                      {validateCINFormat(cin).isValid ? (
                        <span className="text-emerald-700 font-semibold">✓ Valid 21-char format</span>
                      ) : (
                        <span className="text-amber-700">{validateCINFormat(cin).explanation}</span>
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Financial Year Standard
                  </label>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="2026-2027 (Apr - Mar)">1st April - 31st March (Indian Standard)</option>
                    <option value="2026 (Jan - Dec)">1st January - 31st December (Calendar Year)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 border-t border-stone-200">
                <span>Direct Master Data & Corporate Verification:</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={MCA_COMPANY_VERIFICATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#F15A35] hover:text-[#D14420] font-semibold"
                  >
                    <span>MCA Company Verification</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-stone-300 hidden sm:inline">•</span>
                  <a
                    href={MCA_MASTER_DATA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold"
                  >
                    <span>MCA.gov.in Master Data Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: BANK ACCOUNTS & LIQUID CASH */}
        {activeTab === "finances" && (
          <div className="space-y-6">
            {/* Live Financial Position Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">
                  Available Operating Cash
                </span>
                <div className="text-xl font-extrabold text-teal-900 mt-0.5">
                  {formatCurrency(liveSummary.availableOperatingCash)}
                </div>
                <span className="text-[10px] text-teal-700 block mt-1">
                  Cash in Hand + Available Bank Balances
                </span>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-slate-900">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Total Liquid Resources
                </span>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {formatCurrency(liveSummary.totalLiquidResources)}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Includes short-term investments & gross deposits
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                  Safety Floor Surplus / Deficit
                </span>
                <div className="text-xl font-extrabold text-amber-950 mt-0.5">
                  {liveSummary.isReserveSurplus ? "+" : ""}
                  {formatCurrency(liveSummary.reserveSurplusOrShortfall)}
                </div>
                <span className="text-[10px] text-amber-800 block mt-1">
                  Floor: {formatCurrency(liveSummary.minimumCashReserve)}
                </span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-teal-700" />
                    <CardTitle>Cash in Hand & Bank Accounts</CardTitle>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddBankModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Bank Account
                  </Button>
                </div>
                <CardDescription>
                  Configure operating accounts. Restricted funds (e.g. margin money for guarantees) are subtracted automatically.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Physical Cash in Hand (₹) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cashInHand}
                      onChange={(e) => setCashInHand(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Minimum Cash Reserve Safety Floor (₹) *
                    </label>
                    <input
                      type="number"
                      step={10000}
                      min={0}
                      value={minimumReserve}
                      onChange={(e) => setMinimumReserve(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>
                </div>

                {/* Short-Term Investments Section */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">
                        Short-Term Investments (₹)
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Overnight funds, treasury bills, or liquid mutual funds
                      </span>
                    </div>
                    <div className="w-full sm:w-48">
                      <input
                        type="number"
                        min={0}
                        value={shortTermInvestments}
                        onChange={(e) => setShortTermInvestments(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="sett-st-immediate"
                      checked={isShortTermImmediate}
                      onChange={(e) => setIsShortTermImmediate(e.target.checked)}
                      className="mt-0.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="sett-st-immediate" className="text-xs text-slate-700 cursor-pointer">
                      <span className="font-semibold">Immediate availability established:</span> Include in immediately spendable operating cash (unrestricted, redeemable T+0/T+1).
                    </label>
                  </div>
                </div>

                {/* Bank Accounts Table */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Active Bank Accounts ({bankAccounts.length})
                  </span>

                  {bankAccounts.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-stone-200 rounded-xl text-xs text-slate-500">
                      No bank accounts registered. Click &quot;Add Bank Account&quot; to configure your operating accounts.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bankAccounts.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                              <Landmark className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {b.bankName} - {b.accountNickname}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {b.accountType.toUpperCase()} • {b.accountNumberMasked || "••••"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-teal-700">
                                {formatCurrency(Math.max(0, b.currentBalance - b.restrictedAmount))} available
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Ledger: {formatCurrency(b.currentBalance)}
                                {b.restrictedAmount > 0 && ` (₹${b.restrictedAmount.toLocaleString("en-IN")} restricted)`}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveBank(b.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: FORECAST ASSUMPTIONS */}
        {activeTab === "forecast" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-700" />
                <CardTitle>Forecast Assumptions & Planning Runway</CardTitle>
              </div>
              <CardDescription>
                Define default forecast horizon, assumed monthly sales, expected burn rate, and operational schedules.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Horizon (Days)
                  </label>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(Number(e.target.value) as 7 | 30 | 60 | 90)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value={7}>7 Days (Weekly)</option>
                    <option value={30}>30 Days (Monthly)</option>
                    <option value={60}>60 Days (Bi-monthly)</option>
                    <option value={90}>90 Days (Quarterly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Typical Monthly Sales (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={typicalSales}
                    onChange={(e) => setTypicalSales(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Typical Monthly Expenses (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={typicalExpenses}
                    onChange={(e) => setTypicalExpenses(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Monthly Growth (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={expectedGrowth}
                    onChange={(e) => setExpectedGrowth(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Typical Customer Delay (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={customerDelay}
                    onChange={(e) => setCustomerDelay(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Payment Terms (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={supplierTerms}
                    onChange={(e) => setSupplierTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Payroll Schedule Day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={payrollDay}
                    onChange={(e) => setPayrollDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Staff Payroll (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={payrollAmount}
                    onChange={(e) => setPayrollAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Overdue Invoice Alert Threshold (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={overdueThresholdDays}
                    onChange={(e) => setOverdueThresholdDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: ENVIRONMENT & DATA CONTROLS */}
        {activeTab === "demo" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600" />
                <CardTitle>Environment & Data State Management</CardTitle>
              </div>
              <CardDescription>
                Reset simulated transactions or reset business onboarding status to test the onboarding wizard flow.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">Reset Business Setup Status</p>
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

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">Restore Baseline Records</p>
                  <p className="text-[11px] text-slate-500">
                    Restores initial baseline receivables, payables, and transactions.
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
                  Reset Records
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Actions Bar */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Changes synchronize across the executive dashboard and forecasting engine.
          </span>

          <Button type="submit" variant="primary" size="md" className="bg-teal-700 hover:bg-teal-800">
            Save Settings & Recalculate
          </Button>
        </div>
      </form>

      {/* Modal: Add Bank Account */}
      <Modal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        title="Add Bank Account"
        description="Configure a new current or overdraft facility account."
      >
        <form onSubmit={handleAddBank} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Institution Name *
            </label>
            <input
              type="text"
              required
              value={newBank.bankName}
              onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
              placeholder="e.g. ICICI Bank, State Bank of India"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Nickname *
            </label>
            <input
              type="text"
              required
              value={newBank.accountNickname}
              onChange={(e) => setNewBank({ ...newBank, accountNickname: e.target.value })}
              placeholder="e.g. Raw Material Procurement Current A/C"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Type
              </label>
              <select
                value={newBank.accountType}
                onChange={(e) => setNewBank({ ...newBank, accountType: e.target.value as "current" | "savings" | "od_cc" })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="current">Current Account</option>
                <option value="od_cc">Overdraft / Cash Credit (OD/CC)</option>
                <option value="savings">Savings Account</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Masked Number (Optional)
              </label>
              <input
                type="text"
                value={newBank.accountNumberMasked}
                onChange={(e) => setNewBank({ ...newBank, accountNumberMasked: e.target.value })}
                placeholder="e.g. ••••9912"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ledger Balance (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={newBank.currentBalance || ""}
                onChange={(e) => setNewBank({ ...newBank, currentBalance: Number(e.target.value) || 0 })}
                placeholder="e.g. 300000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Restricted Margin (₹)
              </label>
              <input
                type="number"
                min={0}
                value={newBank.restrictedAmount || ""}
                onChange={(e) => setNewBank({ ...newBank, restrictedAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 0"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddBankModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-teal-700 hover:bg-teal-800">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
