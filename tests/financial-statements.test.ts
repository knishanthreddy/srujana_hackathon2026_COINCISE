import test from "node:test";
import assert from "node:assert/strict";
import type { FinancialRecord, Receivable, Payable } from "../src/lib/types.ts";
import type { OnboardingData } from "../src/lib/onboarding-types.ts";
import {
  generateProfitAndLossStatement,
  generateCashFlowStatement,
  generateBalanceSheetStatement,
  resolvePeriodDates,
  filterRecordsByDate,
} from "../src/lib/financial-statements.ts";

const MOCK_RECORDS: FinancialRecord[] = [
  {
    id: "rec-01",
    date: "2026-10-01",
    type: "income",
    category: "Product Sales",
    amount: 100000,
    paidAmount: 100000,
    paymentStatus: "completed",
    description: "Product batch 1",
    paymentMethod: "NEFT",
    status: "cleared",
  },
  {
    id: "rec-02",
    date: "2026-10-05",
    type: "income",
    category: "Client Milestone Payment",
    amount: 200000,
    paidAmount: 80000, // partially paid
    paymentStatus: "partially_paid",
    description: "Milestone 1",
    paymentMethod: "RTGS",
    status: "pending",
  },
  {
    id: "rec-03",
    date: "2026-10-10",
    type: "expense",
    category: "Raw Materials",
    amount: 40000,
    paidAmount: 40000,
    paymentStatus: "completed",
    description: "Steel rods",
    paymentMethod: "Bank Transfer",
    status: "cleared",
  },
  {
    id: "rec-04",
    date: "2026-10-15",
    type: "expense",
    category: "Facility & Utilities",
    amount: 15000,
    paidAmount: 15000,
    paymentStatus: "completed",
    description: "Electricity bill",
    paymentMethod: "Auto-Debit",
    status: "cleared",
  },
  {
    id: "rec-05",
    date: "2026-10-20",
    type: "expense",
    category: "Payroll & Wages",
    amount: 30000,
    paidAmount: 30000,
    paymentStatus: "completed",
    description: "Staff salary",
    paymentMethod: "Direct Transfer",
    status: "cleared",
  },
];

const MOCK_RECEIVABLES: Receivable[] = [
  {
    id: "r-01",
    invoiceNumber: "INV-2026-001",
    customerName: "Zenith Aero",
    totalAmount: 300000,
    paidAmount: 100000,
    balanceDue: 200000,
    issueDate: "2026-10-05",
    dueDate: "2026-10-31",
    status: "partially_paid",
    daysOverdue: 0,
  },
];

const MOCK_PAYABLES: Payable[] = [
  {
    id: "p-01",
    invoiceNumber: "SUP-101",
    vendorName: "Bharat Alloys",
    totalAmount: 80000,
    paidAmount: 20000,
    balanceDue: 60000,
    issueDate: "2026-10-02",
    dueDate: "2026-10-28",
    status: "partially_paid",
    category: "Raw Materials",
  },
];

const MOCK_ONBOARDING: OnboardingData = {
  currentStep: 5,
  isCompleted: true,
  profile: {
    mcaLegalName: "Apex Engineering Private Limited",
    tradeName: "Apex Works",
    cin: "U72900KA2021PTC148892",
    entityType: "pvt_ltd",
    registeredAddress: "Bangalore",
    operatingAddress: "Bangalore",
    sameAsRegistered: true,
    city: "Bangalore",
    state: "Karnataka",
    industry: "Manufacturing",
    businessDescription: "Engineering",
    financialYear: "2026-2027 (Apr - Mar)",
    gstin: "29AABCA1234F1Z5",
  },
  verification: {
    verificationSource: "mca_lookup",
    isFormatValid: true,
    verifiedStatus: "verified",
    userConfirmed: true,
    mcaDetailsRetrieved: {
      cin: "U72900KA2021PTC148892",
      companyName: "Apex Engineering Private Limited",
      rocCode: "ROC-Bangalore",
      registrationNumber: "148892",
      companyCategory: "Company limited by shares",
      companySubCategory: "Non-govt company",
      classOfCompany: "Private",
      authorizedCapital: 1000000,
      paidUpCapital: 500000,
      dateOfIncorporation: "2021-06-18",
      registeredAddress: "Bangalore",
    },
  },
  openingFinances: {
    cashInHand: 20000,
    bankAccounts: [
      {
        id: "b-01",
        bankName: "HDFC",
        accountNickname: "Current A/C",
        accountType: "current",
        currentBalance: 300000,
        restrictedAmount: 50000,
        availableBalance: 250000,
        lastUpdatedDate: "2026-10-01",
      },
    ],
    reservedCash: 50000,
    minimumReserve: 150000,
    otherLiquidFunds: 10000,
    shortTermInvestments: 20000,
    receivables: [],
    supplierAdvances: [
      {
        id: "adv-01",
        supplierName: "Bharat Alloys",
        advanceAmount: 15000,
        purpose: "Titanium advance",
      },
    ],
    inventoryItems: [
      {
        id: "inv-01",
        itemName: "Steel rods",
        estimatedValue: 75000,
        valuationDate: "2026-10-01",
      },
    ],
    fixedAssets: [
      {
        id: "fa-01",
        assetName: "CNC Milling Machine",
        category: "machinery",
        purchaseCost: 800000,
        currentEstimatedValue: 650000,
      },
    ],
    otherCurrentAssets: 5000,
    payables: [],
    loans: [
      {
        id: "l-01",
        liabilityType: "loan",
        name: "SIDBI Term Loan",
        amount: 200000,
        dueDate: "2026-12-01",
      },
    ],
    taxesPayable: [
      {
        id: "t-01",
        liabilityType: "tax_payable",
        name: "GST Output Tax",
        amount: 18000,
      },
    ],
    payrollObligations: [
      {
        id: "pr-01",
        liabilityType: "payroll_obligation",
        name: "Staff Wages",
        amount: 45000,
      },
    ],
    otherLiabilities: [],
  },
  preferences: {
    defaultForecastHorizon: 30,
    safetyReserveBuffer: 150000,
    overdueAlertDays: 14,
  },
  forecastAssumptions: {
    typicalMonthlySales: 500000,
  },
};

test("Profit and Loss Statement: Cash vs Accrual revenue and margins", () => {
  // Cash Basis Test:
  // Income 1: 100,000 paid. Income 2: 80,000 paid. Total Cash Revenue = 180,000
  // Direct Costs (Raw Materials): 40,000
  // Gross Profit = 180,000 - 40,000 = 140,000
  // Operating Expenses (Utilities 15,000 + Wages 30,000) = 45,000
  // Operating Profit = 140,000 - 45,000 = 95,000
  // Taxes = 18,000
  // Net Profit = 95,000 - 18,000 = 77,000
  const cashPnl = generateProfitAndLossStatement(
    MOCK_RECORDS,
    MOCK_RECEIVABLES,
    MOCK_PAYABLES,
    MOCK_ONBOARDING,
    { basis: "cash", preset: "all" }
  );

  assert.equal(cashPnl.revenueSection.subtotal, 180000);
  assert.equal(cashPnl.directCostsSection.subtotal, 40000);
  assert.equal(cashPnl.grossProfit, 140000);
  assert.equal(cashPnl.operatingExpensesSection.subtotal, 45000);
  assert.equal(cashPnl.operatingProfit, 95000);
  assert.equal(cashPnl.taxesAndFinancingSection.subtotal, 18000);
  assert.equal(cashPnl.netProfitOrLoss, 77000);

  // Accrual Basis Test:
  // Receivables billed in period: 300,000
  const accrualPnl = generateProfitAndLossStatement(
    MOCK_RECORDS,
    MOCK_RECEIVABLES,
    MOCK_PAYABLES,
    MOCK_ONBOARDING,
    { basis: "accrual", preset: "all" }
  );

  assert.equal(accrualPnl.revenueSection.subtotal, 300000);
  assert.equal(accrualPnl.grossProfit, 300000 - 40000);

  // Honest disclosure of unrecorded depreciation:
  const deprItem = cashPnl.operatingExpensesSection.items.find((i) => i.id === "opex-depreciation");
  assert.ok(deprItem);
  assert.equal(deprItem.amount, null);
  assert.equal(deprItem.status, "unrecorded");
});

test("Cash Flow Statement: Strict cash continuity (Closing = Opening + Inflows - Outflows)", () => {
  const cf = generateCashFlowStatement(MOCK_RECORDS, MOCK_ONBOARDING, { preset: "all" });

  // Baseline opening cash from onboarding:
  // Cash in Hand (20,000) + Available Bank (250,000) + Other Liquid (10,000) = 280,000
  assert.equal(cf.openingCashBalance, 280000);

  // Operating cash inflows:
  // 100,000 + 80,000 = 180,000
  // Operating cash outflows:
  // 40,000 + 15,000 + 30,000 = 85,000
  // Net Operating Cash Flow = 180,000 - 85,000 = 95,000
  assert.equal(cf.operatingActivities.subtotal, 95000);

  // Net change in cash = 95,000
  assert.equal(cf.netChangeInCash, 95000);

  // Closing cash balance = 280,000 + 95,000 = 375,000
  assert.equal(cf.closingCashBalance, 375000);
  assert.equal(cf.closingCashBalance, cf.openingCashBalance + cf.netChangeInCash);

  // Confirm that unrecorded investing and financing flows are identified without assuming zero:
  const invNone = cf.investingActivities.items.find((i) => i.id === "cf-inv-none");
  assert.ok(invNone);
  assert.equal(invNone.amount, null);
  assert.equal(invNone.status, "unrecorded");
});

test("Balance Sheet: Assets, Liabilities, and Approximate Net Assets identity", () => {
  const bs = generateBalanceSheetStatement(
    MOCK_RECORDS,
    MOCK_RECEIVABLES,
    MOCK_PAYABLES,
    MOCK_ONBOARDING,
    { asOfDate: "2026-10-25" }
  );

  // Current Assets:
  // Cash in hand: 20,000
  // Available Bank: 250,000
  // Restricted Bank: 50,000
  // Receivables balance due: 200,000 (from MOCK_RECEIVABLES)
  // Inventory: 75,000
  // Supplier Advances: 15,000
  // Other current assets + short term investments: 5,000 + 20,000 = 25,000
  // Total Current Assets = 20,000 + 250,000 + 50,000 + 200,000 + 75,000 + 15,000 + 25,000 = 635,000
  assert.equal(bs.totalCurrentAssets, 635000);

  // Non-Current Assets:
  // Machinery: 650,000
  assert.equal(bs.totalNonCurrentAssets, 650000);

  // Total Assets = 635,000 + 650,000 = 1,285,000
  assert.equal(bs.totalAssets, 1285000);

  // Current Liabilities:
  // Payables balance due: 60,000 (from MOCK_PAYABLES)
  // Taxes payable: 18,000
  // Payroll obligations: 45,000
  // Total Current Liabilities = 60,000 + 18,000 + 45,000 = 123,000
  assert.equal(bs.totalCurrentLiabilities, 123000);

  // Non-Current Liabilities:
  // Loans: 200,000
  assert.equal(bs.totalNonCurrentLiabilities, 200000);

  // Total Liabilities = 123,000 + 200,000 = 323,000
  assert.equal(bs.totalLiabilities, 323000);

  // Approximate Net Assets = 1,285,000 - 323,000 = 962,000
  assert.equal(bs.approximateNetAssets, 962000);
  assert.equal(bs.approximateNetAssets, bs.totalAssets - bs.totalLiabilities);

  // Equity Section verified
  assert.equal(bs.totalEquity, 962000);
  assert.equal(bs.totalLiabilitiesAndEquity, bs.totalLiabilities + bs.totalEquity);
});

test("Reporting Period Date Resolver: Formats Indian FY and ranges", () => {
  const fy = resolvePeriodDates("current_fy", undefined, undefined, "2026-10-25");
  assert.equal(fy.startDate, "2026-04-01");
  assert.equal(fy.endDate, "2027-03-31");
  assert.ok(fy.label.includes("FY 2026-2027"));

  const custom = resolvePeriodDates("custom", "2026-07-01", "2026-09-30");
  assert.equal(custom.startDate, "2026-07-01");
  assert.equal(custom.endDate, "2026-09-30");

  const filtered = filterRecordsByDate(MOCK_RECORDS, "2026-10-01", "2026-10-10");
  assert.equal(filtered.length, 3);
});
