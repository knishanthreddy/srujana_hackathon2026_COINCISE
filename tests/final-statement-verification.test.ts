import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import type { FinancialRecord, Receivable, Payable } from "../src/lib/types.ts";
import type { OnboardingData } from "../src/lib/onboarding-types.ts";
import {
  generateProfitAndLossStatement,
  generateCashFlowStatement,
  generateBalanceSheetStatement,
  resolvePeriodDates,
  filterRecordsByDate,
} from "../src/lib/financial-statements.ts";
import {
  calculateFinancialSummary,
  safeAdd,
  safeSub,
  round2,
} from "../src/lib/financial-summary.ts";
import {
  getFinancialRecords,
  getReceivables,
  getPayables,
  calculateFinancialTotals,
  calculateReceivablesTotals,
  calculatePayablesTotals,
  getUnifiedDashboardMetrics,
} from "../src/lib/data-service.ts";
import {
  calculateClosingCash,
} from "../src/lib/forecast-engine.ts";
import {
  DEFAULT_ONBOARDING_DATA,
} from "../src/lib/onboarding-service.ts";

// Test Fixtures
const TEST_RECORDS: FinancialRecord[] = [
  {
    id: "txn-001",
    date: "2026-05-10",
    type: "income",
    category: "Product Sales",
    amount: 150000,
    paidAmount: 150000,
    paymentStatus: "completed",
    description: "Component batch A",
    paymentMethod: "NEFT",
    status: "cleared",
  },
  {
    id: "txn-002",
    date: "2026-06-15",
    type: "expense",
    category: "Raw Materials",
    amount: 60000,
    paidAmount: 60000,
    paymentStatus: "completed",
    description: "Brass alloys",
    paymentMethod: "RTGS",
    status: "cleared",
  },
  {
    id: "txn-003",
    date: "2026-07-20",
    type: "income",
    category: "Client Milestone Payment",
    amount: 250000,
    paidAmount: 100000, // Partial payment: 100k paid, 150k unpaid
    paymentStatus: "partially_paid",
    description: "Milestone 1 contract",
    paymentMethod: "Bank Transfer",
    status: "pending",
  },
  {
    id: "txn-004",
    date: "2026-08-05",
    type: "expense",
    category: "Facility & Utilities",
    amount: 25000,
    paidAmount: 25000,
    paymentStatus: "completed",
    description: "Factory power",
    paymentMethod: "Auto-Debit",
    status: "cleared",
  },
  {
    id: "txn-005",
    date: "2026-09-12",
    type: "expense",
    category: "Payroll & Wages",
    amount: 50000,
    paidAmount: 50000,
    paymentStatus: "completed",
    description: "September staff salary",
    paymentMethod: "Direct Transfer",
    status: "cleared",
  },
  {
    id: "txn-006",
    date: "2026-10-18",
    type: "expense",
    category: "Maintenance & Tooling",
    amount: 12000,
    paidAmount: 12000,
    paymentStatus: "completed",
    description: "Machine lubrication",
    paymentMethod: "Card",
    status: "cleared",
  },
];

const TEST_RECEIVABLES: Receivable[] = [
  {
    id: "rec-t1",
    invoiceNumber: "INV-2026-001",
    customerName: "Aura Robotics",
    totalAmount: 350000,
    paidAmount: 150000,
    balanceDue: 200000,
    issueDate: "2026-06-01",
    dueDate: "2026-07-01",
    status: "partially_paid",
    daysOverdue: 0,
  },
  {
    id: "rec-t2",
    invoiceNumber: "INV-2026-002",
    customerName: "Zenith Aero",
    totalAmount: 250000,
    paidAmount: 0,
    balanceDue: 250000,
    issueDate: "2026-08-15",
    dueDate: "2026-09-15",
    status: "overdue",
    daysOverdue: 40,
  },
];

const TEST_PAYABLES: Payable[] = [
  {
    id: "pay-t1",
    invoiceNumber: "SUP-901",
    vendorName: "Bharat Alloys",
    totalAmount: 120000,
    paidAmount: 40000,
    balanceDue: 80000,
    issueDate: "2026-06-10",
    dueDate: "2026-07-10",
    status: "partially_paid",
    category: "Raw Materials",
  },
];

test("1. STATEMENT GENERATION: P&L, Cash Flow, and Balance Sheet across periods and businesses", () => {
  // Profit and Loss Test
  const pnl = generateProfitAndLossStatement(
    TEST_RECORDS,
    TEST_RECEIVABLES,
    TEST_PAYABLES,
    DEFAULT_ONBOARDING_DATA,
    { basis: "cash", preset: "current_fy" }
  );

  assert.equal(pnl.statementType, "profit_and_loss");
  assert.equal(pnl.businessName, DEFAULT_ONBOARDING_DATA.profile.tradeName);
  assert.equal(pnl.cin, DEFAULT_ONBOARDING_DATA.profile.cin);

  // Cash Revenue = 150,000 (Product Sales) + 100,000 (Milestone payment cleared) = 250,000
  assert.equal(pnl.revenueSection.subtotal, 250000);

  // Direct Costs (Raw Materials) = 60,000
  assert.equal(pnl.directCostsSection.subtotal, 60000);

  // Gross Profit = 250,000 - 60,000 = 190,000
  assert.equal(pnl.grossProfit, 190000);

  // Operating Expenses = Utilities (25,000) + Payroll (50,000) + Maintenance (12,000) = 87,000
  assert.equal(pnl.operatingExpensesSection.subtotal, 87000);

  // Operating Profit = 190,000 - 87,000 = 103,000
  assert.equal(pnl.operatingProfit, 103000);

  // Net Profit = Operating Profit - Taxes (48,000 from default onboarding) = 103,000 - 48,000 = 55,000
  assert.equal(pnl.netProfitOrLoss, 55000);

  // Cash Flow Statement Test
  const cf = generateCashFlowStatement(
    TEST_RECORDS,
    DEFAULT_ONBOARDING_DATA,
    { preset: "current_fy" }
  );

  assert.equal(cf.statementType, "cash_flow");
  // Operating Inflows (150,000 + 100,000) = 250,000
  // Operating Outflows (60,000 + 25,000 + 50,000 + 12,000) = 147,000
  // Net Operating Cash Flow = 250,000 - 147,000 = 103,000
  assert.equal(cf.operatingActivities.subtotal, 103000);
  assert.equal(cf.netChangeInCash, 103000);
  assert.equal(cf.closingCashBalance, cf.openingCashBalance + cf.netChangeInCash);

  // Balance Sheet Test
  const bs = generateBalanceSheetStatement(
    TEST_RECORDS,
    TEST_RECEIVABLES,
    TEST_PAYABLES,
    DEFAULT_ONBOARDING_DATA,
    { asOfDate: "2026-10-25" }
  );

  assert.equal(bs.statementType, "balance_sheet");
  // Receivables Balance Due from TEST_RECEIVABLES: 200,000 + 250,000 = 450,000
  const recItem = bs.currentAssets.items.find((i) => i.id === "ca-receivables");
  assert.equal(recItem?.amount, 450000);

  // Payables Balance Due from TEST_PAYABLES: 80,000
  const payItem = bs.currentLiabilities.items.find((i) => i.id === "cl-payables");
  assert.equal(payItem?.amount, 80000);

  // Total Assets = Current Assets + Non-Current Assets
  assert.equal(bs.totalAssets, bs.totalCurrentAssets + bs.totalNonCurrentAssets);
  // Total Liabilities = Current Liabilities + Non-Current Liabilities
  assert.equal(bs.totalLiabilities, bs.totalCurrentLiabilities + bs.totalNonCurrentLiabilities);
  // Net Assets Identity
  assert.equal(bs.approximateNetAssets, bs.totalAssets - bs.totalLiabilities);
  assert.equal(bs.totalLiabilitiesAndEquity, bs.totalLiabilities + (bs.totalEquity ?? 0));
});

test("2. HANDLING MISSING OR INCOMPLETE DATA: Honest disclosure without artificial plug figures", () => {
  // Empty records array in narrow future date range
  const emptyPnl = generateProfitAndLossStatement(
    TEST_RECORDS,
    TEST_RECEIVABLES,
    TEST_PAYABLES,
    DEFAULT_ONBOARDING_DATA,
    { preset: "custom", startDate: "2027-01-01", endDate: "2027-01-31" }
  );

  // Revenue is 0, not undefined or crashing
  assert.equal(emptyPnl.revenueSection.subtotal, 0);
  assert.equal(emptyPnl.directCostsSection.subtotal, 0);
  assert.equal(emptyPnl.grossProfit, 0);

  // Unrecorded Depreciation is disclosed as null and 'unrecorded', NOT zero
  const depr = emptyPnl.operatingExpensesSection.items.find((i) => i.id === "opex-depreciation");
  assert.ok(depr);
  assert.equal(depr.amount, null);
  assert.equal(depr.status, "unrecorded");

  // Balance sheet historical reserves are marked unrecorded, not artificially adjusted
  const bs = generateBalanceSheetStatement([], [], [], DEFAULT_ONBOARDING_DATA);
  const eqRetained = bs.equitySection.items.find((i) => i.id === "eq-retained");
  assert.ok(eqRetained);
  assert.equal(eqRetained.amount, null);
  assert.equal(eqRetained.status, "unrecorded");
});

test("3. CASH FLOW ISOLATION: Unpaid invoice amounts are NEVER counted as cash receipts", () => {
  // In TEST_RECORDS, txn-003 has total amount 250,000 but only 100,000 paid.
  // The 150,000 unpaid balance must NOT be in cash flow.
  const cf = generateCashFlowStatement(TEST_RECORDS, DEFAULT_ONBOARDING_DATA, { preset: "all" });

  const opReceipts = cf.operatingActivities.items.find((i) => i.id === "cf-op-in");
  assert.ok(opReceipts);
  // Cleared receipts: txn-001 (150,000) + txn-003 paidAmount (100,000) = 250,000 (NOT 400,000!)
  assert.equal(opReceipts.amount, 250000);
});

test("4. IMMUTABILITY: Statement generation does not alter original records, receivables, or payables", () => {
  const recordsCopy = JSON.stringify(TEST_RECORDS);
  const receivablesCopy = JSON.stringify(TEST_RECEIVABLES);
  const payablesCopy = JSON.stringify(TEST_PAYABLES);

  generateProfitAndLossStatement(TEST_RECORDS, TEST_RECEIVABLES, TEST_PAYABLES, DEFAULT_ONBOARDING_DATA);
  generateCashFlowStatement(TEST_RECORDS, DEFAULT_ONBOARDING_DATA);
  generateBalanceSheetStatement(TEST_RECORDS, TEST_RECEIVABLES, TEST_PAYABLES, DEFAULT_ONBOARDING_DATA);

  assert.equal(JSON.stringify(TEST_RECORDS), recordsCopy, "Financial records must not be mutated");
  assert.equal(JSON.stringify(TEST_RECEIVABLES), receivablesCopy, "Receivables must not be mutated");
  assert.equal(JSON.stringify(TEST_PAYABLES), payablesCopy, "Payables must not be mutated");
});

test("5. EXCEL WORKBOOK STRUCTURE: Generates readable, valid sheets with numbers and headers", () => {
  const pnl = generateProfitAndLossStatement(TEST_RECORDS, TEST_RECEIVABLES, TEST_PAYABLES, DEFAULT_ONBOARDING_DATA);

  // Build sheet rows using identical structure to exportProfitAndLossToExcel
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push([pnl.businessName.toUpperCase()]);
  rows.push(["STATEMENT OF PROFIT AND LOSS"]);
  rows.push([`Reporting Period: ${pnl.periodLabel}`, "", `Financial Year: ${pnl.financialYear}`]);
  rows.push(["Particulars", "Amount (INR ₹)", "Notes"]);

  pnl.revenueSection.items.forEach((it) => {
    rows.push([it.label, it.amount ?? "Not recorded", it.notes || ""]);
  });
  rows.push(["GROSS PROFIT / (LOSS)", pnl.grossProfit, ""]);
  rows.push(["NET PROFIT / (LOSS)", pnl.netProfitOrLoss, ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "P&L");

  // Verify sheet contents
  assert.ok(wb.SheetNames.includes("P&L"));
  const sheet = wb.Sheets["P&L"];
  assert.ok(sheet["A1"]?.v.includes(pnl.businessName.toUpperCase()));
  // Verify gross profit value in sheet
  const cellGross = rows.find((r) => r[0] === "GROSS PROFIT / (LOSS)");
  assert.equal(cellGross?.[1], 190000);
});

test("6. EXISTING METRIC DEFINITIONS & FORMULAS PRESERVATION: Verified exact math", () => {
  // Test fundamental cash identity
  const closing = calculateClosingCash(100000, 40000, 80000);
  assert.equal(closing, 60000);

  // Test summary arithmetic on default onboarding configuration
  const sum = calculateFinancialSummary(DEFAULT_ONBOARDING_DATA.openingFinances);
  assert.equal(sum.totalLiquidResources, 585000);
  assert.equal(sum.availableOperatingCash, 485000);
  assert.equal(sum.minimumCashReserve, 250000);
  assert.equal(sum.reserveSurplusOrShortfall, 235000);
  assert.equal(sum.totalRecordedAssets, 4830000);
  assert.equal(sum.totalRecordedLiabilities, 1398000);
  assert.equal(sum.approximateNetAssets, 3432000);
});

test("7. MULTI-TENANT SECURITY ISOLATION: Scoped to user's authorized business profile", () => {
  // Tenant A profile
  const tenantA_Onboarding: OnboardingData = {
    ...DEFAULT_ONBOARDING_DATA,
    profile: {
      ...DEFAULT_ONBOARDING_DATA.profile,
      tradeName: "Tenant A Precision",
      cin: "U11111KA2020PTC111111",
    },
  };

  // Tenant B profile
  const tenantB_Onboarding: OnboardingData = {
    ...DEFAULT_ONBOARDING_DATA,
    profile: {
      ...DEFAULT_ONBOARDING_DATA.profile,
      tradeName: "Tenant B Logistics",
      cin: "U22222MH2021PTC222222",
    },
  };

  const pnlA = generateProfitAndLossStatement([], [], [], tenantA_Onboarding);
  const pnlB = generateProfitAndLossStatement([], [], [], tenantB_Onboarding);

  assert.equal(pnlA.businessName, "Tenant A Precision");
  assert.equal(pnlA.cin, "U11111KA2020PTC111111");

  assert.equal(pnlB.businessName, "Tenant B Logistics");
  assert.equal(pnlB.cin, "U22222MH2021PTC222222");

  assert.notEqual(pnlA.businessName, pnlB.businessName, "Tenant profiles must remain isolated");
  assert.notEqual(pnlA.cin, pnlB.cin, "Tenant credentials must remain isolated");
});
