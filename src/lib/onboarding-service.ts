import type {
  OnboardingData,
  OnboardingProfile,
  OnboardingCompanyVerification,
  OnboardingOpeningFinances,
  OnboardingPreferences,
} from "./onboarding-types.ts";

const STORAGE_KEY_ONBOARDING = "coincise_business_onboarding_v1";
export const EVENT_ONBOARDING_UPDATED = "coincise_onboarding_updated";

let memoryOnboarding: OnboardingData | null = null;

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  currentStep: 1,
  isCompleted: false,
  profile: {
    mcaLegalName: "Apex Engineering & Automation Private Limited",
    tradeName: "Apex Precision Works",
    cin: "U72900KA2021PTC148892",
    entityType: "pvt_ltd",
    incorporationDate: "2021-06-18",
    registeredAddress: "Plot No. 42, Peenya Industrial Area, 2nd Stage",
    operatingAddress: "Plot No. 42, Peenya Industrial Area, 2nd Stage",
    sameAsRegistered: true,
    city: "Bangalore",
    state: "Karnataka",
    industry: "Precision Manufacturing & Automation",
    businessDescription: "CNC machining, automotive tool assembly, and robotic arm base fabrication.",
    financialYear: "2026-2027 (Apr - Mar)",
    gstin: "29AABCA1234F1Z5",
    udyamNumber: "UDYAM-KR-03-0014882",
  },
  verification: {
    verificationSource: "format_validated",
    isFormatValid: true,
    verifiedStatus: "manual_confirmation",
    userConfirmed: true,
  },
  openingFinances: {
    cashInHand: 35000,
    bankAccounts: [
      {
        id: "bank-01",
        bankName: "HDFC Bank Ltd",
        accountNickname: "Primary Operating Current A/C",
        accountType: "current",
        accountNumberMasked: "••••4892",
        currentBalance: 400000,
        restrictedAmount: 50000, // Margin money for bank guarantee
        availableBalance: 350000,
        lastUpdatedDate: "2026-10-24",
      },
      {
        id: "bank-02",
        bankName: "State Bank of India",
        accountNickname: "Statutory & GST Reserve A/C",
        accountType: "current",
        accountNumberMasked: "••••1104",
        currentBalance: 100000,
        restrictedAmount: 0,
        availableBalance: 100000,
        lastUpdatedDate: "2026-10-24",
      },
    ],
    reservedCash: 50000,
    minimumReserve: 250000,
    otherLiquidFunds: 0,
    shortTermInvestments: 50000,
    receivables: [
      {
        id: "rec-init-01",
        customerName: "Zenith Aero Components Pvt Ltd",
        invoiceNumber: "INV-2026-094",
        invoiceDate: "2026-10-18",
        dueDate: "2026-10-31",
        invoiceAmount: 480000,
        amountReceived: 0,
        expectedCollectionDate: "2026-10-31",
        outstandingBalance: 480000,
        notes: "Turbine housing batch final settlement.",
      },
      {
        id: "rec-init-02",
        customerName: "Aura Robotics Systems",
        invoiceNumber: "INV-2026-089",
        invoiceDate: "2026-10-15",
        dueDate: "2026-10-25",
        invoiceAmount: 340000,
        amountReceived: 100000,
        expectedCollectionDate: "2026-10-25",
        outstandingBalance: 240000,
        notes: "Milestone 2 acceptance pending.",
      },
    ],
    supplierAdvances: [
      {
        id: "adv-01",
        supplierName: "Bharat Alloys & Steel Corp",
        advanceAmount: 75000,
        purpose: "Advance for titanium alloy rods lot #B-88",
      },
    ],
    inventoryItems: [
      {
        id: "inv-01",
        itemName: "CNC Cutting Inserts & Tooling",
        quantity: 120,
        unit: "Pieces",
        estimatedValue: 145000,
        valuationDate: "2026-10-20",
      },
      {
        id: "inv-02",
        itemName: "Finished Valve Assemblies",
        quantity: 45,
        unit: "Units",
        estimatedValue: 280000,
        valuationDate: "2026-10-22",
      },
    ],
    fixedAssets: [
      {
        id: "fa-01",
        assetName: "5-Axis Vertical Machining Center",
        category: "machinery",
        purchaseCost: 3500000,
        currentEstimatedValue: 2800000,
      },
      {
        id: "fa-02",
        assetName: "Industrial Air Compressor System",
        category: "machinery",
        purchaseCost: 240000,
        currentEstimatedValue: 190000,
      },
    ],
    otherCurrentAssets: 35000,
    payables: [
      {
        id: "pay-init-01",
        vendorName: "Bharat Alloys & Steel Corp",
        invoiceNumber: "SUP-0492",
        dueDate: "2026-10-25",
        totalAmount: 250000,
        paidAmount: 50000,
        outstandingBalance: 200000,
        category: "Raw Materials",
      },
      {
        id: "pay-init-02",
        vendorName: "Precision Matrix Tooling Ltd",
        invoiceNumber: "SUP-0814",
        dueDate: "2026-11-05",
        totalAmount: 90000,
        paidAmount: 0,
        outstandingBalance: 90000,
        category: "Consumables",
      },
    ],
    loans: [
      {
        id: "loan-01",
        liabilityType: "loan",
        name: "Machinery Term Loan (SIDBI)",
        amount: 850000,
        dueDate: "2026-11-10",
      },
    ],
    taxesPayable: [
      {
        id: "tax-01",
        liabilityType: "tax_payable",
        name: "GST Output Liability (September)",
        amount: 48000,
        dueDate: "2026-10-28",
      },
    ],
    payrollObligations: [
      {
        id: "pr-01",
        liabilityType: "payroll_obligation",
        name: "Staff Monthly Salaries (October)",
        amount: 210000,
        dueDate: "2026-11-05",
      },
    ],
    otherLiabilities: [],
  },
  preferences: {
    defaultForecastHorizon: 30,
    safetyReserveBuffer: 250000,
    overdueAlertDays: 14,
  },
};

/**
 * Calculates liquid cash strictly available for operational disbursement.
 * Inventory, supplier advances, and uncollected invoices are explicitly excluded.
 */
export function calculateTotalLiquidCash(finances: OnboardingOpeningFinances): number {
  const bankAvailable = finances.bankAccounts.reduce(
    (sum, b) => sum + Math.max(0, (b.currentBalance || 0) - (b.restrictedAmount || 0)),
    0
  );
  return (finances.cashInHand || 0) + bankAvailable + (finances.otherLiquidFunds || 0);
}

/**
 * Calculates total non-liquid working capital assets (receivables, advances, inventory, fixed assets).
 */
export function calculateWorkingCapitalAssets(finances: OnboardingOpeningFinances): number {
  const totalReceivables = finances.receivables.reduce(
    (sum, r) => sum + Math.max(0, (r.invoiceAmount || 0) - (r.amountReceived || 0)),
    0
  );
  const totalAdvances = finances.supplierAdvances.reduce((sum, a) => sum + (a.advanceAmount || 0), 0);
  const totalInventory = finances.inventoryItems.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
  const totalFixedAssets = finances.fixedAssets.reduce((sum, f) => sum + (f.currentEstimatedValue || 0), 0);
  const otherAssets = finances.otherCurrentAssets || 0;

  return totalReceivables + totalAdvances + totalInventory + totalFixedAssets + otherAssets;
}

/**
 * Calculates total outstanding obligations and liabilities (payables, loans, taxes, payroll).
 */
export function calculateTotalLiabilities(finances: OnboardingOpeningFinances): number {
  const totalPayables = finances.payables.reduce(
    (sum, p) => sum + Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0)),
    0
  );
  const totalLoans = finances.loans.reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalTaxes = finances.taxesPayable.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPayroll = finances.payrollObligations.reduce((sum, pr) => sum + (pr.amount || 0), 0);
  const totalOther = finances.otherLiabilities.reduce((sum, o) => sum + (o.amount || 0), 0);

  return totalPayables + totalLoans + totalTaxes + totalPayroll + totalOther;
}

export function resetOnboardingData(): void {
  memoryOnboarding = { ...DEFAULT_ONBOARDING_DATA, isCompleted: false, currentStep: 1 };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY_ONBOARDING, JSON.stringify(memoryOnboarding));
      window.dispatchEvent(new CustomEvent(EVENT_ONBOARDING_UPDATED, { detail: memoryOnboarding }));
    } catch {
      // Ignore localStorage errors
    }
  }
}

export function getOnboardingData(): OnboardingData {
  if (memoryOnboarding) return memoryOnboarding;

  if (typeof window === "undefined") {
    return DEFAULT_ONBOARDING_DATA;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ONBOARDING);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memoryOnboarding = parsed;
        return parsed;
      }
    }
    // By default, if not set, initialize with default draft
    memoryOnboarding = { ...DEFAULT_ONBOARDING_DATA, isCompleted: true };
    window.localStorage.setItem(STORAGE_KEY_ONBOARDING, JSON.stringify(memoryOnboarding));
    return memoryOnboarding;
  } catch {
    return memoryOnboarding || DEFAULT_ONBOARDING_DATA;
  }
}

export function saveOnboardingProgress(data: OnboardingData): boolean {
  memoryOnboarding = data;
  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(STORAGE_KEY_ONBOARDING, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT_ONBOARDING_UPDATED, { detail: data }));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent(EVENT_ONBOARDING_UPDATED, { detail: data }));
    return false;
  }
}

/**
 * Finalizes onboarding setup, synchronizing opening balances,
 * customer receivables, and vendor obligations into the live data model.
 */
export async function completeOnboarding(
  data: OnboardingData
): Promise<{ success: boolean; liquidCash: number }> {
  const finalizedData: OnboardingData = {
    ...data,
    isCompleted: true,
    completedAt: new Date().toISOString(),
  };

  // 1. Calculate Total Liquid Available Cash:
  // Strict rule: Inventory, advances, and receivables are NOT counted in liquid cash.
  const totalLiquidCash = calculateTotalLiquidCash(finalizedData.openingFinances);

  // 2. Synchronize with Live Stores if in Browser Runtime
  if (typeof window !== "undefined") {
    try {
      const { DEMO_SUMMARY } = await import("./demo-data");
      const { addReceivable, addPayable } = await import("./data-service");

      DEMO_SUMMARY.businessName = finalizedData.profile.tradeName || finalizedData.profile.mcaLegalName;
      DEMO_SUMMARY.minimumReserve = finalizedData.openingFinances.minimumReserve || 250000;
      DEMO_SUMMARY.availableCash = totalLiquidCash;

      // Sync Opening Receivables
      for (const r of finalizedData.openingFinances.receivables) {
        addReceivable({
          invoiceNumber: r.invoiceNumber,
          customerName: r.customerName,
          totalAmount: r.invoiceAmount,
          paidAmount: r.amountReceived,
          issueDate: r.invoiceDate,
          dueDate: r.dueDate,
          notes: r.notes || "Added during opening financial setup",
        });
      }

      // Sync Opening Payables
      for (const p of finalizedData.openingFinances.payables) {
        addPayable({
          invoiceNumber: p.invoiceNumber,
          vendorName: p.vendorName,
          totalAmount: p.totalAmount,
          paidAmount: p.paidAmount,
          issueDate: new Date().toISOString().split("T")[0],
          dueDate: p.dueDate,
          category: p.category || "Raw Materials",
          notes: "Added during opening financial setup",
        });
      }
    } catch (e) {
      console.warn("Could not sync with demo stores:", e);
    }
  }

  saveOnboardingProgress(finalizedData);
  return { success: true, liquidCash: totalLiquidCash };
}

export function isOnboardingCompleted(): boolean {
  const data = getOnboardingData();
  return !!data.isCompleted;
}
