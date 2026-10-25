"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Sparkles,
  ArrowRight,
  Landmark,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  Layers,
  Search,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  OnboardingData,
  OnboardingProfile,
  OnboardingCompanyVerification,
  OnboardingOpeningFinances,
  OnboardingPreferences,
  BusinessEntityType,
  BankAccountItem,
  OpeningReceivableItem,
  OpeningPayableItem,
  InventoryItem,
  FixedAssetItem,
  SupplierAdvanceItem,
  LiabilityItem,
} from "@/lib/onboarding-types";
import {
  getOnboardingData,
  saveOnboardingProgress,
  completeOnboarding,
  calculateTotalLiquidCash,
  calculateWorkingCapitalAssets,
  calculateTotalLiabilities,
  DEFAULT_ONBOARDING_DATA,
} from "@/lib/onboarding-service";
import {
  validateCINFormat,
  searchMCACompany,
  MCA_OFFICIAL_PORTAL_URL,
  MCA_MASTER_DATA_URL,
} from "@/lib/mca-service";

const STEPS = [
  { step: 1, title: "Business Profile", desc: "Legal entity & trade details" },
  { step: 2, title: "Company Verification", desc: "MCA validation & CIN status" },
  { step: 3, title: "Opening Finances", desc: "Liquid cash, receivables & assets" },
  { step: 4, title: "Forecast Preferences", desc: "Runway horizon & reserve floor" },
  { step: 5, title: "Review & Activate", desc: "Confirm initial setup" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // MCA Verification state
  const [cinInput, setCinInput] = useState("");
  const [mcaMessage, setMcaMessage] = useState<string | null>(null);
  const [mcaStatus, setMcaStatus] = useState<"idle" | "searching" | "verified" | "validated" | "manual">("idle");

  // Modals for Step 3 (Opening Finances)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [newBank, setNewBank] = useState<Partial<BankAccountItem>>({
    bankName: "HDFC Bank",
    accountNickname: "",
    accountType: "current",
    accountNumberMasked: "",
    currentBalance: 0,
    restrictedAmount: 0,
  });

  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
  const [newRec, setNewRec] = useState<Partial<OpeningReceivableItem>>({
    customerName: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    invoiceAmount: 0,
    amountReceived: 0,
    expectedCollectionDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    notes: "",
  });

  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [newPay, setNewPay] = useState<Partial<OpeningPayableItem>>({
    vendorName: "",
    invoiceNumber: "",
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    totalAmount: 0,
    paidAmount: 0,
    category: "Raw Materials",
  });

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [newInv, setNewInv] = useState<Partial<InventoryItem>>({
    itemName: "",
    quantity: 1,
    unit: "Units",
    estimatedValue: 0,
    valuationDate: new Date().toISOString().split("T")[0],
  });

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<FixedAssetItem>>({
    assetName: "",
    category: "machinery",
    purchaseCost: 0,
    currentEstimatedValue: 0,
  });

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [newAdvance, setNewAdvance] = useState<Partial<SupplierAdvanceItem>>({
    supplierName: "",
    advanceAmount: 0,
    purpose: "",
  });

  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
  const [newLiability, setNewLiability] = useState<Partial<LiabilityItem>>({
    liabilityType: "loan",
    name: "",
    amount: 0,
    dueDate: "",
  });

  // Load saved progress on mount
  useEffect(() => {
    const saved = getOnboardingData();
    setData(saved);
    setCinInput(saved.profile.cin || "");
    setIsLoaded(true);
  }, []);

  const currentStep = data.currentStep;

  // Calculated subtotals for live UI display
  const totalLiquidCash = useMemo(() => {
    return calculateTotalLiquidCash(data.openingFinances);
  }, [data.openingFinances]);

  const totalWorkingCapital = useMemo(() => {
    return calculateWorkingCapitalAssets(data.openingFinances);
  }, [data.openingFinances]);

  const totalLiabilities = useMemo(() => {
    return calculateTotalLiabilities(data.openingFinances);
  }, [data.openingFinances]);

  // Save progress helper
  const handleSaveProgress = (showToast = true) => {
    saveOnboardingProgress(data);
    if (showToast) {
      setSaveToast("Progress saved. You can safely exit and return anytime.");
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  const handleNextStep = () => {
    handleSaveProgress(false);
    if (currentStep < 5) {
      const updated = { ...data, currentStep: currentStep + 1 };
      setData(updated);
      saveOnboardingProgress(updated);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      const updated = { ...data, currentStep: currentStep - 1 };
      setData(updated);
      saveOnboardingProgress(updated);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleJumpToStep = (targetStep: number) => {
    handleSaveProgress(false);
    const updated = { ...data, currentStep: targetStep };
    setData(updated);
    saveOnboardingProgress(updated);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 MCA Search & Validation
  const handleMCASearch = () => {
    if (!cinInput.trim()) {
      setMcaMessage("Please enter a CIN or company name to search MCA registry records.");
      return;
    }

    setMcaStatus("searching");
    setTimeout(() => {
      const res = searchMCACompany(cinInput);
      if (res.found && res.cin) {
        setMcaStatus("verified");
        setMcaMessage(res.message);
        setData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            cin: res.cin,
            mcaLegalName: res.companyName || prev.profile.mcaLegalName,
            incorporationDate: res.dateOfIncorporation || prev.profile.incorporationDate,
            registeredAddress: res.registeredAddress || prev.profile.registeredAddress,
          },
          verification: {
            verificationSource: "mca_lookup",
            isFormatValid: true,
            verifiedStatus: "verified",
            userConfirmed: true,
            verifiedAt: new Date().toISOString(),
            mcaDetailsRetrieved: {
              cin: res.cin || "",
              companyName: res.companyName || "",
              rocCode: res.rocCode || "RoC-Corporate Registry",
              registrationNumber: res.registrationNumber || "",
              companyCategory: res.companyCategory || "Company limited by shares",
              companySubCategory: "Indian Non-Government Company",
              classOfCompany: res.classOfCompany || "Private Limited",
              authorizedCapital: res.authorizedCapital || 1000000,
              paidUpCapital: res.paidUpCapital || 500000,
              dateOfIncorporation: res.dateOfIncorporation || "2021-06-18",
              registeredAddress: res.registeredAddress || "",
            },
          },
        }));
      } else if (res.source === "format_validated_only") {
        setMcaStatus("validated");
        setMcaMessage(res.message);
        setData((prev) => ({
          ...prev,
          profile: { ...prev.profile, cin: cinInput.trim().toUpperCase() },
          verification: {
            verificationSource: "format_validated",
            isFormatValid: true,
            verifiedStatus: "manual_confirmation",
            userConfirmed: true,
          },
        }));
      } else {
        setMcaStatus("manual");
        setMcaMessage(res.message);
        setData((prev) => ({
          ...prev,
          verification: {
            verificationSource: "manual_user_declared",
            isFormatValid: false,
            verifiedStatus: "manual_confirmation",
            userConfirmed: false,
          },
        }));
      }
    }, 400);
  };

  // Add Bank Account
  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const curr = Number(newBank.currentBalance) || 0;
    const restr = Number(newBank.restrictedAmount) || 0;
    const avail = Math.max(0, curr - restr);

    const bankItem: BankAccountItem = {
      id: `bank-${Date.now()}`,
      bankName: newBank.bankName || "Commercial Bank",
      accountNickname: newBank.accountNickname || "Primary Current A/C",
      accountType: (newBank.accountType as "current" | "savings" | "od_cc") || "current",
      accountNumberMasked: newBank.accountNumberMasked || "••••" + Math.floor(1000 + Math.random() * 9000),
      currentBalance: curr,
      restrictedAmount: restr,
      availableBalance: avail,
      lastUpdatedDate: new Date().toISOString().split("T")[0],
    };

    setData((prev) => ({
      ...prev,
      openingFinances: {
        ...prev.openingFinances,
        bankAccounts: [...prev.openingFinances.bankAccounts, bankItem],
      },
    }));

    setIsBankModalOpen(false);
    setNewBank({
      bankName: "HDFC Bank",
      accountNickname: "",
      accountType: "current",
      accountNumberMasked: "",
      currentBalance: 0,
      restrictedAmount: 0,
    });
  };

  const handleRemoveBank = (id: string) => {
    setData((prev) => ({
      ...prev,
      openingFinances: {
        ...prev.openingFinances,
        bankAccounts: prev.openingFinances.bankAccounts.filter((b) => b.id !== id),
      },
    }));
  };

  // Add Customer Receivable
  const handleAddReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(newRec.invoiceAmount) || 0;
    const recd = Number(newRec.amountReceived) || 0;
    const out = Math.max(0, total - recd);

    const recItem: OpeningReceivableItem = {
      id: `rec-${Date.now()}`,
      customerName: newRec.customerName || "Customer Enterprise",
      invoiceNumber: newRec.invoiceNumber || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoiceDate: newRec.invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: newRec.dueDate || new Date().toISOString().split("T")[0],
      invoiceAmount: total,
      amountReceived: recd,
      expectedCollectionDate: newRec.expectedCollectionDate || newRec.dueDate || new Date().toISOString().split("T")[0],
      outstandingBalance: out,
      notes: newRec.notes || "",
    };

    setData((prev) => ({
      ...prev,
      openingFinances: {
        ...prev.openingFinances,
        receivables: [...prev.openingFinances.receivables, recItem],
      },
    }));

    setIsReceivableModalOpen(false);
    setNewRec({
      customerName: "",
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      invoiceAmount: 0,
      amountReceived: 0,
      expectedCollectionDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      notes: "",
    });
  };

  const handleRemoveReceivable = (id: string) => {
    setData((prev) => ({
      ...prev,
      openingFinances: {
        ...prev.openingFinances,
        receivables: prev.openingFinances.receivables.filter((r) => r.id !== id),
      },
    }));
  };

  // Add Supplier Payable
  const handleAddPayable = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(newPay.totalAmount) || 0;
    const paid = Number(newPay.paidAmount) || 0;
    const out = Math.max(0, total - paid);

    const payItem: OpeningPayableItem = {
      id: `pay-${Date.now()}`,
      vendorName: newPay.vendorName || "Supplier Vendor",
      invoiceNumber: newPay.invoiceNumber || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      dueDate: newPay.dueDate || new Date().toISOString().split("T")[0],
      totalAmount: total,
      paidAmount: paid,
      outstandingBalance: out,
      category: newPay.category || "Raw Materials",
    };

    setData((prev) => ({
      ...prev,
      openingFinances: {
        ...prev.openingFinances,
        payables: [...prev.openingFinances.payables, payItem],
      },
    }));

    setIsPayableModalOpen(false);
    setNewPay({
      vendorName: "",
      invoiceNumber: "",
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
      totalAmount: 0,
      paidAmount: 0,
      category: "Raw Materials",
    });
  };

  const handleRemovePayable = (id: string) => {
    setData((prev) => ({
      ...prev,
      openingFinances: {
        ...prev.openingFinances,
        payables: prev.openingFinances.payables.filter((p) => p.id !== id),
      },
    }));
  };

  // Final Activation
  const handleCompleteActivation = async () => {
    setIsActivating(true);
    try {
      const res = await completeOnboarding(data);
      setSaveToast(`Setup completed successfully! Opening liquid cash: ${formatCurrency(res.liquidCash)}`);
      setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch {
      setIsActivating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
          <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
          <span>Loading Business Setup Wizard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-base">COINCISE</span>
              <Badge variant="info" size="sm">
                Business Setup Wizard
              </Badge>
            </div>
            <p className="text-xs text-slate-500">Configure legal entity, opening liquidity & predictive rules</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSaveProgress(true)}
            className="text-slate-700 hover:text-slate-900"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save & Continue Later
          </Button>

          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-800">
              Exit to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Main Wizard Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 lg:p-8 space-y-6">
        {/* Horizontal Stepper Progress */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-600">
            <span>
              STEP {currentStep} OF {STEPS.length}: {STEPS[currentStep - 1].title.toUpperCase()}
            </span>
            <span className="text-blue-600 font-mono">{Math.round((currentStep / STEPS.length) * 100)}% Complete</span>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Step Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 lg:gap-4">
            {STEPS.map((s) => {
              const isActive = s.step === currentStep;
              const isPast = s.step < currentStep;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => handleJumpToStep(s.step)}
                  className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isActive
                      ? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/30"
                      : isPast
                      ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-slate-700"
                      : "border-slate-200/80 hover:bg-slate-50 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : isPast
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isPast ? <Check className="w-3 h-3" /> : s.step}
                    </span>
                    {isPast && <span className="text-[10px] text-emerald-600 font-semibold">Done</span>}
                  </div>
                  <div className="font-bold text-slate-900 truncate">{s.title}</div>
                  <div className="text-[10px] text-slate-500 truncate hidden lg:block">{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            STEP 1: BUSINESS PROFILE
           ========================================================================= */}
        {currentStep === 1 && (
          <Card className="animate-in fade-in duration-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <CardTitle>Business Entity Profile</CardTitle>
              </div>
              <CardDescription>
                Provide the registered legal and operating details of your enterprise for commercial reports, forecasting, and dispute resolution.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MCA Registered Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={data.profile.mcaLegalName}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, mcaLegalName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Apex Engineering & Automation Private Limited"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Full entity name as registered with the Registrar of Companies (RoC).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trade Name / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={data.profile.tradeName}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, tradeName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Apex Precision Works"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Displayed across executive dashboards and customer invoices.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Entity Type *
                  </label>
                  <select
                    value={data.profile.entityType}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, entityType: e.target.value as BusinessEntityType },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="pvt_ltd">Private Limited Company (Pvt Ltd)</option>
                    <option value="public_ltd">Public Limited Company (Public Ltd)</option>
                    <option value="opc">One Person Company (OPC)</option>
                    <option value="llp">Limited Liability Partnership (LLP)</option>
                    <option value="partnership">Partnership Firm</option>
                    <option value="sole_proprietorship">Sole Proprietorship</option>
                    <option value="other">Other Commercial Entity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Incorporation
                  </label>
                  <input
                    type="date"
                    value={data.profile.incorporationDate || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, incorporationDate: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Office Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={data.profile.registeredAddress}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, registeredAddress: e.target.value },
                      }))
                    }
                    placeholder="Plot No. / Industrial Area / Street / Ward"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={data.profile.sameAsRegistered}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            sameAsRegistered: e.target.checked,
                            operatingAddress: e.target.checked ? prev.profile.registeredAddress : prev.profile.operatingAddress,
                          },
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Operating address is the same as registered office</span>
                  </label>
                </div>

                {!data.profile.sameAsRegistered && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Operating / Plant Address
                    </label>
                    <input
                      type="text"
                      value={data.profile.operatingAddress}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, operatingAddress: e.target.value },
                        }))
                      }
                      placeholder="Factory or workshop premises"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={data.profile.city}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, city: e.target.value },
                      }))
                    }
                    placeholder="e.g. Bangalore"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={data.profile.state}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, state: e.target.value },
                      }))
                    }
                    placeholder="e.g. Karnataka"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Industry Sector *
                  </label>
                  <select
                    value={data.profile.industry}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, industry: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Precision Manufacturing & Automation">Precision Manufacturing & Automation</option>
                    <option value="Automotive Components & Tooling">Automotive Components & Tooling</option>
                    <option value="Electronics & Hardware Assembly">Electronics & Hardware Assembly</option>
                    <option value="Food Processing & Agribusiness">Food Processing & Agribusiness</option>
                    <option value="Logistics, Freight & Supply Chain">Logistics, Freight & Supply Chain</option>
                    <option value="IT Services & Software Development">IT Services & Software Development</option>
                    <option value="Textiles, Apparel & Fabrication">Textiles, Apparel & Fabrication</option>
                    <option value="Wholesale Distribution & Trading">Wholesale Distribution & Trading</option>
                    <option value="Healthcare & Medical Supplies">Healthcare & Medical Supplies</option>
                    <option value="Other Commercial Services">Other Commercial Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Financial Year Standard
                  </label>
                  <select
                    value={data.profile.financialYear}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, financialYear: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="2026-2027 (Apr - Mar)">2026-2027 (1st April - 31st March, Indian Standard)</option>
                    <option value="2026 (Jan - Dec)">2026 (1st January - 31st December, Calendar Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN (Goods and Services Tax ID)
                  </label>
                  <input
                    type="text"
                    value={data.profile.gstin || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, gstin: e.target.value.toUpperCase() },
                      }))
                    }
                    placeholder="e.g. 29AABCA1234F1Z5"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Udyam Registration Number (MSME)
                  </label>
                  <input
                    type="text"
                    value={data.profile.udyamNumber || ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, udyamNumber: e.target.value.toUpperCase() },
                      }))
                    }
                    placeholder="e.g. UDYAM-KR-03-0014882"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Enables MSME statutory payment protections (45-day rule).
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* =========================================================================
            STEP 2: COMPANY VERIFICATION & MCA LOOKUP
           ========================================================================= */}
        {currentStep === 2 && (
          <Card className="animate-in fade-in duration-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <CardTitle>Company Verification & MCA Validation</CardTitle>
              </div>
              <CardDescription>
                Validate your Indian Corporate Identity Number (CIN) or confirm registration details via the Ministry of Corporate Affairs (MCA).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              {/* Notice regarding corporate vs non-corporate entities */}
              {["sole_proprietorship", "partnership"].includes(data.profile.entityType) ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Non-Corporate Entity Notice:</span> As a{" "}
                    <strong>{data.profile.entityType === "partnership" ? "Partnership Firm" : "Sole Proprietorship"}</strong>, your business is not assigned a CIN by the Ministry of Corporate Affairs. You may verify via GSTIN or proceed directly with manual confirmation.
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Corporate Entity Requirement:</span> As an incorporated entity (
                    <strong>{data.profile.entityType.toUpperCase()}</strong>), you possess a 21-character Corporate Identity Number (CIN). COINCISE validates syntactic structure and cross-checks known registry records.
                  </div>
                </div>
              )}

              {/* CIN Search & Validation Form */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Corporate Identity Number (CIN) or Registered Company Name
                    </label>
                    <input
                      type="text"
                      value={cinInput}
                      onChange={(e) => {
                        setCinInput(e.target.value);
                        setMcaStatus("idle");
                        setMcaMessage(null);
                      }}
                      placeholder="e.g. U72900KA2021PTC148892 or Apex Engineering"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase bg-white"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleMCASearch}
                    disabled={mcaStatus === "searching"}
                    className="shrink-0"
                  >
                    <Search className="w-4 h-4 mr-1.5" />
                    {mcaStatus === "searching" ? "Searching MCA..." : "Search MCA Records"}
                  </Button>
                </div>

                {/* Live Syntactic Format Check Indicator */}
                {cinInput.trim() && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600">CIN Format:</span>
                    {validateCINFormat(cinInput).isValid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Valid 21-character Indian CIN structure
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        {validateCINFormat(cinInput).explanation}
                      </span>
                    )}
                  </div>
                )}

                {/* MCA Message Notice */}
                {mcaMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                      mcaStatus === "verified"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : mcaStatus === "validated"
                        ? "bg-blue-50 border border-blue-200 text-blue-800"
                        : "bg-slate-100 border border-slate-300 text-slate-700"
                    }`}
                  >
                    {mcaStatus === "verified" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div>{mcaMessage}</div>
                  </div>
                )}
              </div>

              {/* Retrieved MCA Master Record Card */}
              {data.verification.mcaDetailsRetrieved && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {data.verification.mcaDetailsRetrieved.companyName}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        CIN: {data.verification.mcaDetailsRetrieved.cin}
                      </span>
                    </div>

                    <Badge variant="success" size="sm">
                      MCA Seed Verified
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">RoC Jurisdiction</span>
                      <span className="font-semibold text-slate-200">{data.verification.mcaDetailsRetrieved.rocCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Registration No.</span>
                      <span className="font-semibold text-slate-200">{data.verification.mcaDetailsRetrieved.registrationNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Company Class</span>
                      <span className="font-semibold text-slate-200">{data.verification.mcaDetailsRetrieved.classOfCompany}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Authorized Capital</span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(data.verification.mcaDetailsRetrieved.authorizedCapital || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-300 border-t border-slate-700/80">
                    <span className="text-slate-400">Registered Office: </span>
                    {data.verification.mcaDetailsRetrieved.registeredAddress}
                  </div>
                </div>
              )}

              {/* Official MCA Portal Link & Government CAPTCHA Disclaimer */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800">Official Ministry of Corporate Affairs Portal</span>
                  <p className="text-[11px] text-slate-500">
                    Need to look up master data or check public filing history directly?
                  </p>
                </div>
                <a
                  href={MCA_MASTER_DATA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold text-xs shrink-0"
                >
                  <span>Open MCA.gov.in</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* User Confirmation Checkbox */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={data.verification.userConfirmed}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        verification: { ...prev.verification, userConfirmed: e.target.checked },
                      }))
                    }
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span>I confirm that the business identity, CIN, and corporate registration details provided above are true, accurate, and represent our operational enterprise.</span>
                    <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                      COINCISE uses these parameters for generating compliant balance sheets, dispute filings under FairResolve, and MSME statutory payment timelines.
                    </span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* =========================================================================
            STEP 3: OPENING FINANCES, ASSETS & LIABILITIES
           ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* STRICT ACCOUNTING PRINCIPLE CALLOUT */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white border border-emerald-700/60 shadow-sm flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-extrabold text-emerald-200 text-sm">
                  Accounting Integrity & Liquidity Isolation Principle
                </span>
                <p className="text-emerald-100/90 leading-relaxed">
                  In accordance with conservative cash-flow accounting, <strong>Customer Receivables</strong>, <strong>Inventory Stock</strong>, <strong>Supplier Advances</strong>, and <strong>Fixed Machinery</strong> are classified as Working Capital and Capital Assets. They are <strong>NEVER</strong> counted as liquid cash available for paying immediate bills until payments physically settle in your bank accounts.
                </p>
              </div>
            </div>

            {/* Quick Live Summary Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  Available Liquid Cash
                </div>
                <div className="text-xl font-extrabold text-emerald-900 mt-0.5">
                  {formatCurrency(totalLiquidCash)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-1">
                  Cash in Hand + Unrestricted Bank Balances
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                  Working Capital & Receivables
                </div>
                <div className="text-xl font-extrabold text-blue-900 mt-0.5">
                  {formatCurrency(totalWorkingCapital)}
                </div>
                <div className="text-[10px] text-blue-600 mt-1">
                  Invoices to collect, inventory & advances
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">
                  Total Opening Liabilities
                </div>
                <div className="text-xl font-extrabold text-rose-900 mt-0.5">
                  {formatCurrency(totalLiabilities)}
                </div>
                <div className="text-[10px] text-rose-600 mt-1">
                  Supplier bills, loans, taxes & pending payroll
                </div>
              </div>
            </div>

            {/* 3.1 LIQUID CASH & BANK ACCOUNTS */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    <div>
                      <CardTitle>1. Liquid Cash & Bank Balances</CardTitle>
                      <CardDescription>
                        Physical cash and immediately accessible bank deposits.
                      </CardDescription>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBankModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Bank Account
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Cash in Hand input */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Physical Cash in Hand (₹ INR)
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Petty cash stored in office register or workshop vault
                    </span>
                  </div>
                  <div className="w-full sm:w-48">
                    <input
                      type="number"
                      min={0}
                      value={data.openingFinances.cashInHand}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          openingFinances: {
                            ...prev.openingFinances,
                            cashInHand: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* Bank Accounts Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Registered Bank Accounts ({data.openingFinances.bankAccounts.length})</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Restricted funds (e.g. margin money for guarantees) are subtracted automatically
                    </span>
                  </div>

                  {data.openingFinances.bankAccounts.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                      No bank accounts added yet. Click &quot;Add Bank Account&quot; to configure your primary current account.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.openingFinances.bankAccounts.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
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
                              <div className="text-xs font-bold text-emerald-700">
                                {formatCurrency(b.availableBalance)}
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

                {/* Zero Credential Security Guarantee */}
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    <strong>Security Notice:</strong> COINCISE never asks for net-banking passwords, UPI PINs, or OTPs. Balances are recorded for internal forecasting only.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 3.2 WORKING CAPITAL & CUSTOMER RECEIVABLES */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle>2. Opening Receivables & Working Assets</CardTitle>
                      <CardDescription>
                        Pending customer invoices to collect, supplier advances, and stock inventory.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsReceivableModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Customer Invoice
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsInventoryModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Stock
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Customer Invoices List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Unsettled Customer Invoices ({data.openingFinances.receivables.length})</span>
                    <span className="text-[10px] text-blue-600 font-semibold">
                      Auto-computes: Outstanding = Invoice Total - Amount Received
                    </span>
                  </div>

                  {data.openingFinances.receivables.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                      No opening customer receivables. If you have outstanding client invoices, add them here to include them in expected cash collections.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.openingFinances.receivables.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {r.customerName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Inv #{r.invoiceNumber} • Due {formatDate(r.dueDate)} • Expected {formatDate(r.expectedCollectionDate)}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-blue-700">
                                {formatCurrency(r.outstandingBalance)} due
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Total: {formatCurrency(r.invoiceAmount)}
                                {r.amountReceived > 0 && ` (₹${r.amountReceived.toLocaleString("en-IN")} received)`}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveReceivable(r.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inventory & Fixed Assets badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        Stock & Inventory ({data.openingFinances.inventoryItems.length} items)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsInventoryModalOpen(true)}
                        className="text-[11px] text-blue-600 h-6 px-2"
                      >
                        + Add
                      </Button>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatCurrency(
                        data.openingFinances.inventoryItems.reduce((s, i) => s + i.estimatedValue, 0)
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">Raw materials, tools & finished goods</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        Machinery & Fixed Assets ({data.openingFinances.fixedAssets.length} items)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAssetModalOpen(true)}
                        className="text-[11px] text-blue-600 h-6 px-2"
                      >
                        + Add
                      </Button>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatCurrency(
                        data.openingFinances.fixedAssets.reduce((s, a) => s + a.currentEstimatedValue, 0)
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">CNC machines, vehicles, IT infrastructure</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3.3 LIABILITIES & PAYABLES */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <div>
                      <CardTitle>3. Opening Payables & Outstanding Obligations</CardTitle>
                      <CardDescription>
                        Supplier invoices due, commercial credit lines, GST liabilities, and pending staff salaries.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPayableModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Supplier Bill
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLiabilityModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Loan / Tax / Payroll
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Payables list */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Vendor Payables Due ({data.openingFinances.payables.length})</span>
                    <span className="text-[10px] text-rose-600 font-semibold">
                      Auto-computes: Outstanding = Total Bill - Paid Amount
                    </span>
                  </div>

                  {data.openingFinances.payables.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                      No vendor payables registered. Add supplier invoices that will require cash outflow in upcoming days.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.openingFinances.payables.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.vendorName}</div>
                            <div className="text-[10px] text-slate-500">
                              Bill #{p.invoiceNumber} • Category: {p.category} • Due {formatDate(p.dueDate)}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-rose-700">
                                {formatCurrency(p.outstandingBalance)} due
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Total: {formatCurrency(p.totalAmount)}
                                {p.paidAmount > 0 && ` (₹${p.paidAmount.toLocaleString("en-IN")} paid)`}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePayable(p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove Payable"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Liabilities Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">Bank Loans & Credit</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                      {formatCurrency(data.openingFinances.loans.reduce((s, l) => s + l.amount, 0))}
                    </span>
                    <span className="text-[10px] text-slate-500">SIDBI / MSME term facilities</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">Taxes & GST Payable</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                      {formatCurrency(data.openingFinances.taxesPayable.reduce((s, t) => s + t.amount, 0))}
                    </span>
                    <span className="text-[10px] text-slate-500">Monthly GST & TDS returns</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">Staff Wages & Payroll</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                      {formatCurrency(data.openingFinances.payrollObligations.reduce((s, pr) => s + pr.amount, 0))}
                    </span>
                    <span className="text-[10px] text-slate-500">Upcoming payroll cycle</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* =========================================================================
            STEP 4: FORECAST PREFERENCES & RISK BENCHMARKS
           ========================================================================= */}
        {currentStep === 4 && (
          <Card className="animate-in fade-in duration-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <CardTitle>Forecast & Liquidity Risk Preferences</CardTitle>
              </div>
              <CardDescription>
                Define your planning horizon and minimum cash reserve floor for automated predictive risk alerts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              {/* Default Horizon Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Default Forecast Planning Horizon *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { days: 7, label: "7 Days", desc: "Weekly tactical liquidity" },
                    { days: 30, label: "30 Days (Recommended)", desc: "Monthly operational runway" },
                    { days: 60, label: "60 Days", desc: "Bi-monthly supplier cycle" },
                    { days: 90, label: "90 Days", desc: "Quarterly strategic view" },
                  ].map((h) => {
                    const isSelected = data.preferences.defaultForecastHorizon === h.days;
                    return (
                      <button
                        key={h.days}
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              defaultForecastHorizon: h.days as 7 | 30 | 60 | 90,
                            },
                          }))
                        }
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="font-bold text-xs">{h.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{h.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minimum Cash Reserve Floor */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Minimum Cash Reserve Safety Floor (₹ INR) *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      When projected closing cash drops below this threshold, COINCISE triggers automated alerts.
                    </p>
                  </div>

                  <div className="w-full sm:w-56">
                    <input
                      type="number"
                      step={10000}
                      min={0}
                      value={data.openingFinances.minimumReserve}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          openingFinances: {
                            ...prev.openingFinances,
                            minimumReserve: Number(e.target.value) || 0,
                          },
                          preferences: {
                            ...prev.preferences,
                            safetyReserveBuffer: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Current Setting: <strong>{formatCurrency(data.openingFinances.minimumReserve)}</strong>. Recommended for small manufacturing: ₹2,50,000 (roughly 1 month of utility & statutory expenses).
                  </span>
                </div>
              </div>

              {/* Overdue Alert Threshold */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Overdue Receivables Follow-Up Trigger (Days) *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Number of days past invoice due date before marking as high-risk in Decision Centre.
                  </p>
                </div>

                <div className="w-full sm:w-36">
                  <select
                    value={data.preferences.overdueAlertDays}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          overdueAlertDays: Number(e.target.value) || 14,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value={7}>7 Days past due</option>
                    <option value={14}>14 Days (Standard)</option>
                    <option value={21}>21 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* =========================================================================
            STEP 5: REVIEW, CONFIRM & ACTIVATE
           ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <CardTitle>Review & Confirm Setup</CardTitle>
                </div>
                <CardDescription>
                  Review your configured business profile, liquid cash balances, and risk parameters before opening the dashboard.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-0">
                {/* 4 Key Summary Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Business Identity */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Commercial Identity
                    </div>
                    <div className="font-bold text-sm text-slate-900 truncate">
                      {data.profile.tradeName || data.profile.mcaLegalName}
                    </div>
                    <div className="text-xs text-slate-600">
                      Entity: <span className="font-semibold">{data.profile.entityType.toUpperCase()}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      CIN: {data.profile.cin || "N/A (Non-corporate)"}
                    </div>
                    <Badge variant={data.verification.userConfirmed ? "success" : "neutral"} size="sm">
                      {data.verification.userConfirmed ? "Confirmed by User" : "Pending Confirmation"}
                    </Badge>
                  </div>

                  {/* Available Liquid Cash */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                      Starting Liquid Cash
                    </div>
                    <div className="font-extrabold text-lg text-emerald-900">
                      {formatCurrency(totalLiquidCash)}
                    </div>
                    <div className="text-xs text-emerald-800">
                      Cash: {formatCurrency(data.openingFinances.cashInHand)}
                    </div>
                    <div className="text-xs text-emerald-800">
                      Bank: {formatCurrency(totalLiquidCash - data.openingFinances.cashInHand)}
                    </div>
                    <span className="text-[10px] text-emerald-600 block">
                      Synchronizes to dashboard opening cash
                    </span>
                  </div>

                  {/* Working Capital Assets */}
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                      Working Assets
                    </div>
                    <div className="font-extrabold text-lg text-blue-900">
                      {formatCurrency(totalWorkingCapital)}
                    </div>
                    <div className="text-xs text-blue-800">
                      Receivables: {data.openingFinances.receivables.length} invoices
                    </div>
                    <div className="text-xs text-blue-800">
                      Stock: {data.openingFinances.inventoryItems.length} items
                    </div>
                    <span className="text-[10px] text-blue-600 block">
                      Exempted from liquid cash calculation
                    </span>
                  </div>

                  {/* Opening Obligations */}
                  <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                    <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">
                      Opening Liabilities
                    </div>
                    <div className="font-extrabold text-lg text-rose-900">
                      {formatCurrency(totalLiabilities)}
                    </div>
                    <div className="text-xs text-rose-800">
                      Payables: {data.openingFinances.payables.length} bills
                    </div>
                    <div className="text-xs text-rose-800">
                      Loans: {formatCurrency(data.openingFinances.loans.reduce((s, l) => s + l.amount, 0))}
                    </div>
                    <span className="text-[10px] text-rose-600 block">
                      Scheduled for upcoming disbursements
                    </span>
                  </div>
                </div>

                {/* Audit Confirmation Box */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ready for Activation</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Upon activation, COINCISE will initialize the real-time cash-flow forecasting engine with your <strong>{formatCurrency(totalLiquidCash)}</strong> available liquid cash, register your <strong>{data.openingFinances.receivables.length} customer receivables</strong> in the collection tracker, schedule your <strong>{data.openingFinances.payables.length} vendor payables</strong>, and apply your <strong>{formatCurrency(data.openingFinances.minimumReserve)}</strong> safety floor across all 7, 30, 60, and 90-day scenarios.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handlePrevStep}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Step
              </Button>
            ) : (
              <Link href="/">
                <Button variant="ghost" size="md" className="text-xs text-slate-500">
                  Cancel Setup
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleSaveProgress(true)}
              className="hidden sm:inline-flex"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save Progress
            </Button>

            {currentStep < 5 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNextStep}
              >
                <span>Continue to {STEPS[currentStep].title}</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleCompleteActivation}
                disabled={isActivating}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {isActivating ? "Activating Business..." : "Activate Business & Open Dashboard"}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* =========================================================================
          MODALS FOR OPENING FINANCES
         ========================================================================= */}

      {/* Modal: Add Bank Account */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Add Business Bank Account"
        description="Record current operating accounts, overdraft credit lines, or fixed reserves."
      >
        <form onSubmit={handleAddBankAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Institution Name *
            </label>
            <input
              type="text"
              required
              value={newBank.bankName}
              onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
              placeholder="e.g. HDFC Bank, State Bank of India, ICICI Bank"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              placeholder="e.g. Primary Operating Current A/C"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Type *
              </label>
              <select
                value={newBank.accountType}
                onChange={(e) => setNewBank({ ...newBank, accountType: e.target.value as "current" | "savings" | "od_cc" })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                placeholder="e.g. ••••4892"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Ledger Balance (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={newBank.currentBalance || ""}
                onChange={(e) => setNewBank({ ...newBank, currentBalance: Number(e.target.value) || 0 })}
                placeholder="e.g. 500000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Restricted / Margin Money (₹)
              </label>
              <input
                type="number"
                min={0}
                value={newBank.restrictedAmount || ""}
                onChange={(e) => setNewBank({ ...newBank, restrictedAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Subtracted from available cash
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsBankModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Customer Receivable */}
      <Modal
        isOpen={isReceivableModalOpen}
        onClose={() => setIsReceivableModalOpen(false)}
        title="Add Opening Customer Invoice"
        description="Record an existing customer bill pending payment."
      >
        <form onSubmit={handleAddReceivable} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Client Name *
              </label>
              <input
                type="text"
                required
                value={newRec.customerName}
                onChange={(e) => setNewRec({ ...newRec, customerName: e.target.value })}
                placeholder="e.g. Zenith Aero Components"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={newRec.invoiceNumber}
                onChange={(e) => setNewRec({ ...newRec, invoiceNumber: e.target.value })}
                placeholder="e.g. INV-2026-094"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Invoice Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={newRec.invoiceAmount || ""}
                onChange={(e) => setNewRec({ ...newRec, invoiceAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 480000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received So Far (₹)
              </label>
              <input
                type="number"
                min={0}
                value={newRec.amountReceived || ""}
                onChange={(e) => setNewRec({ ...newRec, amountReceived: Number(e.target.value) || 0 })}
                placeholder="e.g. 100000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Outstanding Balance Preview */}
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span className="font-semibold">Calculated Outstanding Balance:</span>
            <span className="font-extrabold text-blue-700">
              {formatCurrency(Math.max(0, (newRec.invoiceAmount || 0) - (newRec.amountReceived || 0)))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Issue Date
              </label>
              <input
                type="date"
                value={newRec.invoiceDate}
                onChange={(e) => setNewRec({ ...newRec, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Due Date *
              </label>
              <input
                type="date"
                required
                value={newRec.dueDate}
                onChange={(e) => setNewRec({ ...newRec, dueDate: e.target.value, expectedCollectionDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsReceivableModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Supplier Payable */}
      <Modal
        isOpen={isPayableModalOpen}
        onClose={() => setIsPayableModalOpen(false)}
        title="Add Opening Supplier Payable"
        description="Record a vendor bill that will require cash disbursement."
      >
        <form onSubmit={handleAddPayable} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor / Supplier Name *
              </label>
              <input
                type="text"
                required
                value={newPay.vendorName}
                onChange={(e) => setNewPay({ ...newPay, vendorName: e.target.value })}
                placeholder="e.g. Bharat Alloys & Steel"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill / Invoice Number *
              </label>
              <input
                type="text"
                required
                value={newPay.invoiceNumber}
                onChange={(e) => setNewPay({ ...newPay, invoiceNumber: e.target.value })}
                placeholder="e.g. SUP-0492"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Bill Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={newPay.totalAmount || ""}
                onChange={(e) => setNewPay({ ...newPay, totalAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 250000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Paid So Far (₹)
              </label>
              <input
                type="number"
                min={0}
                value={newPay.paidAmount || ""}
                onChange={(e) => setNewPay({ ...newPay, paidAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Outstanding Balance Preview */}
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
            <span className="font-semibold">Calculated Outstanding Payable:</span>
            <span className="font-extrabold text-rose-700">
              {formatCurrency(Math.max(0, (newPay.totalAmount || 0) - (newPay.paidAmount || 0)))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Due Date *
              </label>
              <input
                type="date"
                required
                value={newPay.dueDate}
                onChange={(e) => setNewPay({ ...newPay, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={newPay.category}
                onChange={(e) => setNewPay({ ...newPay, category: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Raw Materials">Raw Materials</option>
                <option value="Consumables & Tooling">Consumables & Tooling</option>
                <option value="Subcontracting / Job Work">Subcontracting / Job Work</option>
                <option value="Logistics & Freight">Logistics & Freight</option>
                <option value="Utilities & Facility">Utilities & Facility</option>
                <option value="Other">Other Obligation</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPayableModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Payable
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Inventory */}
      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title="Add Inventory Item"
        description="Record valuation of raw materials or finished goods."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const invItem: InventoryItem = {
              id: `inv-${Date.now()}`,
              itemName: newInv.itemName || "Stock Item",
              quantity: newInv.quantity || 1,
              unit: newInv.unit || "Units",
              estimatedValue: Number(newInv.estimatedValue) || 0,
              valuationDate: new Date().toISOString().split("T")[0],
            };
            setData((prev) => ({
              ...prev,
              openingFinances: {
                ...prev.openingFinances,
                inventoryItems: [...prev.openingFinances.inventoryItems, invItem],
              },
            }));
            setIsInventoryModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item or Batch Name *
            </label>
            <input
              type="text"
              required
              value={newInv.itemName}
              onChange={(e) => setNewInv({ ...newInv, itemName: e.target.value })}
              placeholder="e.g. CNC Carbide Milling Inserts"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Valuation (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={newInv.estimatedValue || ""}
                onChange={(e) => setNewInv({ ...newInv, estimatedValue: Number(e.target.value) || 0 })}
                placeholder="e.g. 150000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity & Unit
              </label>
              <input
                type="text"
                value={`${newInv.quantity || 1} ${newInv.unit || "Units"}`}
                onChange={(e) => setNewInv({ ...newInv, unit: e.target.value })}
                placeholder="e.g. 100 Pcs"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsInventoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add Inventory
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Fixed Asset */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title="Add Fixed Capital Asset"
        description="Record machinery, vehicles, or physical property."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const assetItem: FixedAssetItem = {
              id: `fa-${Date.now()}`,
              assetName: newAsset.assetName || "Capital Asset",
              category: (newAsset.category as "machinery" | "vehicles" | "it_hardware" | "furniture_fixtures" | "real_estate" | "other") || "machinery",
              purchaseCost: Number(newAsset.purchaseCost) || 0,
              currentEstimatedValue: Number(newAsset.currentEstimatedValue) || 0,
            };
            setData((prev) => ({
              ...prev,
              openingFinances: {
                ...prev.openingFinances,
                fixedAssets: [...prev.openingFinances.fixedAssets, assetItem],
              },
            }));
            setIsAssetModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asset Name & Model *
            </label>
            <input
              type="text"
              required
              value={newAsset.assetName}
              onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
              placeholder="e.g. 5-Axis CNC Machining Center"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset Category
              </label>
              <select
                value={newAsset.category}
                onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as "machinery" | "vehicles" | "it_hardware" | "furniture_fixtures" | "real_estate" | "other" })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="machinery">Machinery & Plant Equipment</option>
                <option value="vehicles">Commercial Vehicles</option>
                <option value="it_hardware">IT Hardware & Servers</option>
                <option value="furniture_fixtures">Fixtures & Tooling</option>
                <option value="real_estate">Real Estate & Sheds</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Book Value (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={newAsset.currentEstimatedValue || ""}
                onChange={(e) => setNewAsset({ ...newAsset, currentEstimatedValue: Number(e.target.value) || 0 })}
                placeholder="e.g. 2500000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Loan / Tax / Payroll */}
      <Modal
        isOpen={isLiabilityModalOpen}
        onClose={() => setIsLiabilityModalOpen(false)}
        title="Add Opening Liability"
        description="Record an existing bank loan, GST obligation, or pending payroll."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const liabItem: LiabilityItem = {
              id: `liab-${Date.now()}`,
              liabilityType: (newLiability.liabilityType as "loan" | "tax_payable" | "payroll_obligation" | "other") || "loan",
              name: newLiability.name || "Obligation",
              amount: Number(newLiability.amount) || 0,
              dueDate: newLiability.dueDate,
            };

            setData((prev) => {
              const updatedFinances = { ...prev.openingFinances };
              if (liabItem.liabilityType === "loan") {
                updatedFinances.loans = [...updatedFinances.loans, liabItem];
              } else if (liabItem.liabilityType === "tax_payable") {
                updatedFinances.taxesPayable = [...updatedFinances.taxesPayable, liabItem];
              } else if (liabItem.liabilityType === "payroll_obligation") {
                updatedFinances.payrollObligations = [...updatedFinances.payrollObligations, liabItem];
              } else {
                updatedFinances.otherLiabilities = [...updatedFinances.otherLiabilities, liabItem];
              }
              return { ...prev, openingFinances: updatedFinances };
            });

            setIsLiabilityModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Liability Type *
            </label>
            <select
              value={newLiability.liabilityType}
              onChange={(e) => setNewLiability({ ...newLiability, liabilityType: e.target.value as "loan" | "tax_payable" | "payroll_obligation" | "other" })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="loan">Bank Loan / Working Capital Credit</option>
              <option value="tax_payable">Statutory Tax Payable (GST / TDS)</option>
              <option value="payroll_obligation">Staff Wages & Payroll Obligation</option>
              <option value="other">Other Liability</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Creditor Name *
            </label>
            <input
              type="text"
              required
              value={newLiability.name}
              onChange={(e) => setNewLiability({ ...newLiability, name: e.target.value })}
              placeholder="e.g. SIDBI Machinery Loan or October GST"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Outstanding Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={newLiability.amount || ""}
                onChange={(e) => setNewLiability({ ...newLiability, amount: Number(e.target.value) || 0 })}
                placeholder="e.g. 450000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newLiability.dueDate || ""}
                onChange={(e) => setNewLiability({ ...newLiability, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsLiabilityModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Liability
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
