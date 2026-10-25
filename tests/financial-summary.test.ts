import test from "node:test";
import assert from "node:assert";
import {
  calculateFinancialSummary,
  validateFinancialInputs,
  round2,
  safeAdd,
  safeSub,
} from "../src/lib/financial-summary.ts";
import type { OnboardingOpeningFinances } from "../src/lib/onboarding-types.ts";
import {
  generateCashForecast,
  buildForecastItemsWithAssumptions,
  calculateVerificationExample,
  calculateClosingCash,
} from "../src/lib/forecast-engine.ts";
import type { FinancialRecord, Receivable, Payable } from "../src/lib/types.ts";

// =========================================================================
// TEST SUITE 1: DECIMAL-SAFE ARITHMETIC UTILITIES
// =========================================================================
test("Decimal-safe arithmetic: Prevents IEEE-754 precision issues", () => {
  // Classical JS 0.1 + 0.2 = 0.30000000000000004
  const sum1 = safeAdd(0.1, 0.2);
  assert.strictEqual(sum1, 0.3, "0.1 + 0.2 must equal exactly 0.3");

  const sub1 = safeSub(1.0, 0.9);
  assert.strictEqual(sub1, 0.1, "1.0 - 0.9 must equal exactly 0.1");

  const rounded = round2(12345.6789);
  assert.strictEqual(rounded, 12345.68, "Rounds to two decimal places accurately");
});

// =========================================================================
// TEST SUITE 2: CORE 7 FINANCIAL SUMMARY METRICS WITH SIMPLE EXAMPLES
// =========================================================================
test("Financial Summary: Calculates all 7 core metrics strictly by definition", () => {
  // Simple Example Case:
  // Cash in Hand: 50,000
  // Bank A: Balance = 300,000, Restricted = 50,000 (Available = 250,000)
  // Bank B: Balance = 150,000, Restricted = 0 (Available = 150,000)
  // Other Liquid Funds: 20,000
  // Short-Term Investments: 80,000 (Availability established: true)
  // Minimum Cash Reserve: 200,000
  // Receivables: 100,000 (Paid = 20,000, Outstanding = 80,000)
  // Supplier Advances: 30,000
  // Inventory: 120,000
  // Fixed Assets: 400,000
  // Other Current Assets: 10,000
  // Payables: 90,000 (Paid = 30,000, Outstanding = 60,000)
  // Loans: 150,000
  // Taxes Payable: 25,000
  // Payroll Obligations: 45,000
  // Other Liabilities: 10,000
  const sampleFinances: OnboardingOpeningFinances = {
    cashInHand: 50000,
    bankAccounts: [
      {
        id: "b1",
        bankName: "State Bank of India",
        accountNickname: "Main Current",
        accountType: "current",
        accountNumberMasked: "••••1111",
        currentBalance: 300000,
        restrictedAmount: 50000,
        availableBalance: 250000,
        lastUpdatedDate: "2026-10-24",
      },
      {
        id: "b2",
        bankName: "HDFC Bank",
        accountNickname: "Tax Escrow",
        accountType: "current",
        accountNumberMasked: "••••2222",
        currentBalance: 150000,
        restrictedAmount: 0,
        availableBalance: 150000,
        lastUpdatedDate: "2026-10-24",
      },
    ],
    reservedCash: 50000,
    minimumReserve: 200000,
    otherLiquidFunds: 20000,
    shortTermInvestments: 80000,
    isShortTermInvestmentImmediatelyAvailable: true,
    shortTermInvestmentDescription: "7-day liquid mutual fund",
    receivables: [
      {
        id: "r1",
        customerName: "Acme Corp",
        invoiceNumber: "INV-001",
        invoiceDate: "2026-10-15",
        dueDate: "2026-11-15",
        invoiceAmount: 100000,
        amountReceived: 20000,
        expectedCollectionDate: "2026-11-15",
        outstandingBalance: 80000,
      },
    ],
    supplierAdvances: [
      {
        id: "sa1",
        supplierName: "Steel Suppliers Ltd",
        advanceAmount: 30000,
        purpose: "Raw steel ingot batch",
      },
    ],
    inventoryItems: [
      {
        id: "inv1",
        itemName: "Steel Rods",
        estimatedValue: 120000,
        valuationDate: "2026-10-20",
      },
    ],
    fixedAssets: [
      {
        id: "fa1",
        assetName: "Lathe Machine",
        category: "machinery",
        purchaseCost: 500000,
        currentEstimatedValue: 400000,
      },
    ],
    otherCurrentAssets: 10000,
    payables: [
      {
        id: "p1",
        vendorName: "Industrial Power Corp",
        invoiceNumber: "BILL-555",
        dueDate: "2026-11-05",
        totalAmount: 90000,
        paidAmount: 30000,
        outstandingBalance: 60000,
        category: "Utilities",
      },
    ],
    loans: [
      {
        id: "l1",
        liabilityType: "loan",
        name: "Term Loan",
        amount: 150000,
      },
    ],
    taxesPayable: [
      {
        id: "t1",
        liabilityType: "tax_payable",
        name: "GST Payable",
        amount: 25000,
      },
    ],
    payrollObligations: [
      {
        id: "pr1",
        liabilityType: "payroll_obligation",
        name: "Staff Salaries",
        amount: 45000,
      },
    ],
    otherLiabilities: [
      {
        id: "ol1",
        liabilityType: "other",
        name: "Security Deposit Received",
        amount: 10000,
      },
    ],
  };

  const summary = calculateFinancialSummary(sampleFinances);

  // 1. Total Liquid Resources = Cash in Hand (50,000) + Bank Balances (300,000 + 150,000 = 450,000) + Other Liquid Funds (20,000) + Eligible Short-Term Investments (80,000)
  // 50,000 + 450,000 + 20,000 + 80,000 = 600,000
  assert.strictEqual(
    summary.totalLiquidResources,
    600000,
    "Metric 1: Total Liquid Resources must equal ₹600,000"
  );

  // 2. Available Operating Cash = Cash in Hand (50,000) + Available Bank Balances (250,000 + 150,000 = 400,000) + Other Immediately Available Funds (20,000 + 80,000 = 100,000)
  // 50,000 + 400,000 + 100,000 = 550,000
  // Note: restricted margin money (50,000) was excluded exactly once through available bank balances.
  assert.strictEqual(
    summary.availableOperatingCash,
    550000,
    "Metric 2: Available Operating Cash must equal ₹550,000"
  );

  // 3. Minimum Cash Reserve = 200,000
  assert.strictEqual(
    summary.minimumCashReserve,
    200000,
    "Metric 3: Minimum Cash Reserve must equal ₹200,000"
  );

  // 4. Reserve Surplus or Shortfall = Available Operating Cash (550,000) - Minimum Cash Reserve (200,000) = +350,000
  assert.strictEqual(
    summary.reserveSurplusOrShortfall,
    350000,
    "Metric 4: Reserve Surplus must equal ₹350,000"
  );
  assert.strictEqual(summary.isReserveSurplus, true, "Must be flagged as surplus");

  // 5. Total Recorded Assets = Total Liquid Resources (600,000) + Outstanding Receivables (80,000) + Supplier Advances (30,000) + Inventory (120,000) + Fixed Assets (400,000) + Other Current Assets (10,000)
  // 600,000 + 80,000 + 30,000 + 120,000 + 400,000 + 10,000 = 1,240,000
  assert.strictEqual(
    summary.totalRecordedAssets,
    1240000,
    "Metric 5: Total Recorded Assets must equal ₹1,240,000"
  );

  // 6. Total Recorded Liabilities = Outstanding Payables (60,000) + Loans (150,000) + Taxes (25,000) + Payroll (45,000) + Other Liabilities (10,000)
  // 60,000 + 150,000 + 25,000 + 45,000 + 10,000 = 290,000
  assert.strictEqual(
    summary.totalRecordedLiabilities,
    290000,
    "Metric 6: Total Recorded Liabilities must equal ₹290,000"
  );

  // 7. Approximate Net Assets = Total Recorded Assets (1,240,000) - Total Recorded Liabilities (290,000) = 950,000
  assert.strictEqual(
    summary.approximateNetAssets,
    950000,
    "Metric 7: Approximate Net Assets must equal ₹950,000"
  );

  // Check legal labeling & estimate status
  assert.strictEqual(summary.isEstimate, true, "Must be flagged as an estimate");
  assert.ok(
    summary.legalDisclaimer.includes("Management Financial Estimate"),
    "Disclaimer must state Management Financial Estimate"
  );
  assert.ok(
    summary.legalDisclaimer.includes("audited financial statement"),
    "Disclaimer must clarify it is not an audited statement"
  );
});

// =========================================================================
// TEST SUITE 3: SHORT-TERM INVESTMENTS AND RESTRICTED FUNDS ISOLATION
// =========================================================================
test("Short-term investments eligibility and restricted funds isolation", () => {
  // Case A: Short-term investments NOT established as immediately available
  const baseFinances: OnboardingOpeningFinances = {
    cashInHand: 10000,
    bankAccounts: [
      {
        id: "b1",
        bankName: "Axis Bank",
        accountNickname: "Current A/C",
        accountType: "current",
        accountNumberMasked: "••••3333",
        currentBalance: 100000,
        restrictedAmount: 20000, // 20k restricted
        availableBalance: 80000,
        lastUpdatedDate: "2026-10-24",
      },
    ],
    reservedCash: 20000,
    minimumReserve: 150000,
    otherLiquidFunds: 5000,
    shortTermInvestments: 50000, // 50k
    isShortTermInvestmentImmediatelyAvailable: false, // NOT immediately available
    receivables: [],
    supplierAdvances: [],
    inventoryItems: [],
    fixedAssets: [],
    otherCurrentAssets: 0,
    payables: [],
    loans: [],
    taxesPayable: [],
    payrollObligations: [],
    otherLiabilities: [],
  };

  const summaryA = calculateFinancialSummary(baseFinances);

  // Total Liquid Resources includes the eligible short-term investment:
  // 10,000 + 100,000 + 5,000 + 50,000 = 165,000
  assert.strictEqual(summaryA.totalLiquidResources, 165000);

  // Available Operating Cash EXCLUDES the short-term investment because availability is false:
  // 10,000 (cash) + 80,000 (avail bank) + 5,000 (other liquid) = 95,000
  assert.strictEqual(summaryA.availableOperatingCash, 95000);

  // Reserve shortfall check:
  // Available Operating Cash (95,000) - Minimum Reserve (150,000) = -55,000 (Shortfall)
  assert.strictEqual(summaryA.reserveSurplusOrShortfall, -55000);
  assert.strictEqual(summaryA.isReserveSurplus, false, "Must detect reserve shortfall");

  // Receivables and Inventory must NEVER be added to Available Operating Cash:
  const financesWithReceivables: OnboardingOpeningFinances = {
    ...baseFinances,
    receivables: [
      {
        id: "r1",
        customerName: "Buyer",
        invoiceNumber: "INV-99",
        invoiceDate: "2026-10-20",
        dueDate: "2026-11-20",
        invoiceAmount: 500000,
        amountReceived: 0,
        expectedCollectionDate: "2026-11-20",
        outstandingBalance: 500000,
      },
    ],
    inventoryItems: [
      {
        id: "inv1",
        itemName: "Finished Units",
        estimatedValue: 300000,
        valuationDate: "2026-10-24",
      },
    ],
  };

  const summaryWithRecs = calculateFinancialSummary(financesWithReceivables);
  // Available cash must still remain strictly 95,000!
  assert.strictEqual(
    summaryWithRecs.availableOperatingCash,
    95000,
    "Receivables and inventory must NEVER inflate immediately available operating cash"
  );
  // But Total Recorded Assets must increase by 500k + 300k = 800k (165,000 + 800,000 = 965,000)
  assert.strictEqual(summaryWithRecs.totalRecordedAssets, 965000);
});

// =========================================================================
// TEST SUITE 4: FINANCIAL INPUT VALIDATION RULES
// =========================================================================
test("Financial Input Validation: Identifies negative amounts, inconsistencies, and missing fields", () => {
  // Case 1: Negative amounts and missing bank name
  const invalid1: OnboardingOpeningFinances = {
    cashInHand: -500, // Negative cash
    bankAccounts: [
      {
        id: "b1",
        bankName: "", // Missing bank name
        accountNickname: "Current A/C",
        accountType: "current",
        accountNumberMasked: "••••1234",
        currentBalance: 50000,
        restrictedAmount: 60000, // Inconsistent: restricted exceeds current balance
        availableBalance: 0,
        lastUpdatedDate: "2026-10-24",
      },
    ],
    reservedCash: 0,
    minimumReserve: -1000, // Negative reserve
    otherLiquidFunds: 0,
    shortTermInvestments: 0,
    receivables: [
      {
        id: "r1",
        customerName: "", // Missing customer name
        invoiceNumber: "", // Missing invoice number
        invoiceDate: "2026-10-20",
        dueDate: "2026-11-20",
        invoiceAmount: 10000,
        amountReceived: 15000, // Inconsistent: received exceeds invoice total
        expectedCollectionDate: "2026-11-20",
        outstandingBalance: 0,
      },
    ],
    supplierAdvances: [],
    inventoryItems: [],
    fixedAssets: [],
    otherCurrentAssets: 0,
    payables: [
      {
        id: "p1",
        vendorName: "", // Missing vendor name
        invoiceNumber: "BILL-1",
        dueDate: "2026-11-10",
        totalAmount: 20000,
        paidAmount: 25000, // Inconsistent: paid exceeds total amount
        outstandingBalance: 0,
        category: "Supplies",
      },
    ],
    loans: [
      {
        id: "l1",
        liabilityType: "loan",
        name: "Negative Loan",
        amount: -10000, // Negative loan
      },
    ],
    taxesPayable: [],
    payrollObligations: [],
    otherLiabilities: [],
  };

  const validation = validateFinancialInputs(invalid1);
  assert.strictEqual(validation.isValid, false, "Invalid finances must fail validation");

  const fieldsWithErrors = validation.errors.map((e) => e.field);

  // Check specific validations triggered
  assert.ok(fieldsWithErrors.includes("cashInHand"), "Must detect negative cash in hand");
  assert.ok(fieldsWithErrors.includes("minimumReserve"), "Must detect negative minimum reserve");
  assert.ok(
    validation.errors.some((e) => e.message.includes("requires a valid bank institution name")),
    "Must detect missing bank name"
  );
  assert.ok(
    validation.errors.some((e) => e.message.includes("restricted funds") && e.message.includes("exceed")),
    "Must detect restricted funds exceeding current balance"
  );
  assert.ok(
    validation.errors.some((e) => e.message.includes("amount received") && e.message.includes("exceeds")),
    "Must detect receivable amount received exceeding invoice total"
  );
  assert.ok(
    validation.errors.some((e) => e.message.includes("amount paid") && e.message.includes("exceeds")),
    "Must detect payable amount paid exceeding bill total"
  );
  assert.ok(
    validation.errors.some((e) => e.message.includes("requires a customer name")),
    "Must detect missing customer name"
  );
  assert.ok(
    validation.errors.some((e) => e.message.includes("requires a vendor name")),
    "Must detect missing vendor name"
  );
  assert.ok(
    validation.errors.some((e) => e.message.includes("cannot have a negative balance")),
    "Must detect negative loan amount"
  );

  // Case 2: Clean, consistent finances
  const cleanFinances: OnboardingOpeningFinances = {
    cashInHand: 25000,
    bankAccounts: [
      {
        id: "b1",
        bankName: "ICICI Bank",
        accountNickname: "Operating",
        accountType: "current",
        accountNumberMasked: "••••9999",
        currentBalance: 200000,
        restrictedAmount: 10000,
        availableBalance: 190000,
        lastUpdatedDate: "2026-10-24",
      },
    ],
    reservedCash: 10000,
    minimumReserve: 100000,
    otherLiquidFunds: 0,
    shortTermInvestments: 0,
    receivables: [
      {
        id: "r1",
        customerName: "Good Client",
        invoiceNumber: "INV-100",
        invoiceDate: "2026-10-24",
        dueDate: "2026-11-24",
        invoiceAmount: 50000,
        amountReceived: 10000,
        expectedCollectionDate: "2026-11-24",
        outstandingBalance: 40000,
      },
    ],
    supplierAdvances: [],
    inventoryItems: [],
    fixedAssets: [],
    otherCurrentAssets: 0,
    payables: [
      {
        id: "p1",
        vendorName: "Good Supplier",
        invoiceNumber: "BILL-200",
        dueDate: "2026-11-15",
        totalAmount: 30000,
        paidAmount: 5000,
        outstandingBalance: 25000,
        category: "Supplies",
      },
    ],
    loans: [],
    taxesPayable: [],
    payrollObligations: [],
    otherLiabilities: [],
  };

  const cleanValidation = validateFinancialInputs(cleanFinances);
  assert.strictEqual(cleanValidation.isValid, true, "Clean finances must pass validation");
  assert.strictEqual(cleanValidation.errors.length, 0, "No errors for valid finances");
});

// =========================================================================
// TEST SUITE 5: FORECAST ENGINE INTEGRATION & USER VERIFICATION EXAMPLE
// =========================================================================
test("Forecast Engine: User explicit verification example (Opening 100k + Inflows 40k - Outflows 80k = Closing 60k)", () => {
  // Opening cash = ₹100,000
  // Expected receipts = ₹40,000
  // Supplier payment = ₹50,000
  // Payroll = ₹30,000
  // Expected closing cash = ₹60,000
  const verification = calculateVerificationExample();
  assert.strictEqual(verification.openingCash, 100000);
  assert.strictEqual(verification.expectedReceipts, 40000);
  assert.strictEqual(verification.supplierPayment, 50000);
  assert.strictEqual(verification.payroll, 30000);
  assert.strictEqual(verification.actualClosingCash, 60000);
  assert.strictEqual(verification.isVerified, true);

  // Closing cash formula: Closing = Opening + Inflows - Outflows
  const formulaClosing = calculateClosingCash(100000, 40000, 50000 + 30000);
  assert.strictEqual(formulaClosing, 60000);
});

test("Forecast Engine: Continuity verification across daily timeline (Day N+1 Opening = Day N Closing)", () => {
  const refDate = new Date("2026-10-24T00:00:00Z");

  const records: FinancialRecord[] = [];
  const receivables: Receivable[] = [
    {
      id: "rec-1",
      customerName: "Client A",
      invoiceNumber: "INV-101",
      issueDate: "2026-10-20",
      dueDate: "2026-10-28", // Day 4
      totalAmount: 75000,
      paidAmount: 25000,
      balanceDue: 50000,
      status: "pending",
      daysOverdue: 0,
    },
  ];
  const payables: Payable[] = [
    {
      id: "pay-1",
      vendorName: "Vendor B",
      invoiceNumber: "BILL-202",
      issueDate: "2026-10-20",
      dueDate: "2026-10-30", // Day 6
      totalAmount: 40000,
      paidAmount: 10000,
      balanceDue: 30000,
      status: "pending",
      category: "Raw Materials",
    },
  ];

  const items = buildForecastItemsWithAssumptions(
    records,
    receivables,
    payables,
    undefined,
    refDate,
    30
  );

  const forecast = generateCashForecast({
    openingCash: 120000,
    items,
    horizonDays: 30,
    referenceDate: refDate,
    minimumReserve: 80000,
  });

  assert.strictEqual(forecast.openingCash, 120000);
  // Receivable balance due: 50,000 (unpaid balance only, never counting already paid 25k)
  assert.strictEqual(forecast.totalInflows, 50000);
  // Payable balance due: 30,000 (unpaid balance only, never counting already paid 10k)
  assert.strictEqual(forecast.totalOutflows, 30000);
  // Final closing cash: 120,000 + 50,000 - 30,000 = 140,000
  assert.strictEqual(forecast.closingCash, 140000);

  // Strict daily continuity assertion: Opening(t) === Closing(t-1)
  for (let t = 1; t < forecast.dailyPoints.length; t++) {
    const prevDay = forecast.dailyPoints[t - 1];
    const currDay = forecast.dailyPoints[t];
    assert.strictEqual(
      currDay.openingCash,
      prevDay.closingCash,
      `Day ${t} opening cash (${currDay.openingCash}) must equal Day ${t - 1} closing cash (${prevDay.closingCash})`
    );
    assert.strictEqual(
      currDay.closingCash,
      safeSub(safeAdd(currDay.openingCash, currDay.inflows), currDay.outflows),
      `Day ${t} closing cash must equal opening + inflows - outflows`
    );
  }
});
