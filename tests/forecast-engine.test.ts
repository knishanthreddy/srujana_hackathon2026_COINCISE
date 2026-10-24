import test from "node:test";
import assert from "node:assert";
import {
  calculateClosingCash,
  calculateVerificationExample,
  generateCashForecast,
  extractForecastItemsFromData,
  applyScenarioModifiers,
} from "../src/lib/forecast-engine.ts";
import type { CashFlowInputItem } from "../src/lib/forecast-engine.ts";
import type { FinancialRecord, Receivable, Payable } from "../src/lib/types.ts";

// =========================================================================
// TEST SUITE 1: USER'S EXPLICIT VERIFICATION EXAMPLE
// =========================================================================
test("Verification Example: Opening ₹1,00,000 + Receipts ₹40,000 - Supplier ₹50,000 - Payroll ₹30,000 = Closing ₹60,000", () => {
  const result = calculateVerificationExample();

  assert.strictEqual(result.openingCash, 100000, "Opening cash must be 100,000");
  assert.strictEqual(result.expectedReceipts, 40000, "Expected receipts must be 40,000");
  assert.strictEqual(result.supplierPayment, 50000, "Supplier payment must be 50,000");
  assert.strictEqual(result.payroll, 30000, "Payroll must be 30,000");
  assert.strictEqual(result.actualClosingCash, 60000, "Calculated closing cash must be 60,000");
  assert.strictEqual(result.expectedClosingCash, 60000, "Expected closing cash matches 60,000");
  assert.strictEqual(result.isVerified, true, "Verification flag must be true");

  // Also verify via the general mathematical helper
  const closing = calculateClosingCash(100000, 40000, 50000 + 30000);
  assert.strictEqual(closing, 60000, "Direct formula result must equal 60,000");
});

// =========================================================================
// TEST SUITE 2: NORMAL MULTI-DAY CASH FLOW FORECAST CALCULATIONS
// =========================================================================
test("Normal Calculations: Daily Continuity and Horizon Summaries (7, 30, 60, 90 days)", () => {
  const refDate = new Date("2026-10-24T00:00:00Z");
  const items: CashFlowInputItem[] = [
    {
      id: "in-1",
      name: "Client Milestone",
      date: "2026-10-27", // Day 3
      amount: 150000,
      type: "inflow",
      category: "receivable",
    },
    {
      id: "out-1",
      name: "Vendor Invoice",
      date: "2026-10-29", // Day 5
      amount: 80000,
      type: "outflow",
      category: "payable",
    },
    {
      id: "out-2",
      name: "Office Rent",
      date: "2026-11-03", // Day 10
      amount: 45000,
      type: "outflow",
      category: "other_expense",
    },
  ];

  const forecast = generateCashForecast({
    openingCash: 200000,
    items,
    horizonDays: 30,
    referenceDate: refDate,
    minimumReserve: 100000,
  });

  assert.strictEqual(forecast.openingCash, 200000, "Opening cash matches input");
  assert.strictEqual(forecast.totalInflows, 150000, "Total inflows across 30 days is 150,000");
  assert.strictEqual(forecast.totalOutflows, 125000, "Total outflows across 30 days is 125,000");
  assert.strictEqual(forecast.netCashFlow, 25000, "Net cash flow is 25,000");
  assert.strictEqual(forecast.closingCash, 225000, "Final closing cash is 225,000 (200k + 25k)");

  // Verify daily continuity: Opening(t) === Closing(t-1)
  for (let i = 1; i < forecast.dailyPoints.length; i++) {
    const prev = forecast.dailyPoints[i - 1];
    const curr = forecast.dailyPoints[i];
    assert.strictEqual(
      curr.openingCash,
      prev.closingCash,
      `Daily continuity breached at day ${curr.dayOffset}: ${curr.openingCash} !== ${prev.closingCash}`
    );
    assert.strictEqual(
      curr.closingCash,
      curr.openingCash + curr.inflows - curr.outflows,
      `Daily formula breached at day ${curr.dayOffset}`
    );
  }

  // Verify Day 3 reflects the inflow
  const day3 = forecast.dailyPoints[3];
  assert.strictEqual(day3.inflows, 150000, "Day 3 inflows match 150,000");

  // Verify Day 5 reflects the outflow
  const day5 = forecast.dailyPoints[5];
  assert.strictEqual(day5.outflows, 80000, "Day 5 outflows match 80,000");

  // Verify weekly summaries exist and are mathematically coherent
  assert.ok(forecast.weeklySummaries.length > 0, "Weekly summaries generated");
  const sumWeeklyInflows = forecast.weeklySummaries.reduce((s, w) => s + w.totalInflows, 0);
  assert.strictEqual(sumWeeklyInflows, forecast.totalInflows, "Sum of weekly inflows equals total inflows");
});

// =========================================================================
// TEST SUITE 3: PARTIAL PAYMENTS & DOUBLE-COUNTING PREVENTION
// =========================================================================
test("Partial Payments & Data Extraction: Only Unpaid Balances Projected Without Double Counting", () => {
  const refDate = new Date("2026-10-24T00:00:00Z");

  const receivables: Receivable[] = [
    {
      id: "rec-1",
      invoiceNumber: "INV-101",
      customerName: "Alpha Corp",
      totalAmount: 100000,
      paidAmount: 30000, // Partially paid ₹30k
      balanceDue: 70000, // Only ₹70k is expected in future
      issueDate: "2026-10-01",
      dueDate: "2026-10-30",
      status: "partially_paid",
      daysOverdue: 0,
    },
    {
      id: "rec-2",
      invoiceNumber: "INV-102",
      customerName: "Beta Corp",
      totalAmount: 50000,
      paidAmount: 50000, // Fully paid
      balanceDue: 0, // Should NOT be in forecast
      issueDate: "2026-10-01",
      dueDate: "2026-10-28",
      status: "paid",
      daysOverdue: 0,
    },
  ];

  const payables: Payable[] = [
    {
      id: "pay-1",
      invoiceNumber: "SUP-201",
      vendorName: "Steel Suppliers Ltd",
      totalAmount: 80000,
      paidAmount: 20000, // Partially paid ₹20k
      balanceDue: 60000, // Only ₹60k is expected in future
      issueDate: "2026-10-05",
      dueDate: "2026-11-02",
      status: "partially_paid",
      category: "Raw Materials",
    },
  ];

  const records: FinancialRecord[] = [
    {
      id: "rec-tx-1",
      date: "2026-10-20",
      type: "income",
      category: "Customer Inflow",
      amount: 30000,
      paidAmount: 30000,
      paymentStatus: "completed",
      status: "cleared", // Already cleared in bank! Should NOT be a future inflow
      description: "Receipt from Alpha Corp",
      paymentMethod: "NEFT",
      reference: "INV-101",
    },
    {
      id: "rec-tx-2",
      date: "2026-11-05",
      type: "expense",
      category: "Salaries & Payroll",
      amount: 75000,
      paidAmount: 0,
      paymentStatus: "expected",
      status: "pending", // Scheduled future payroll
      description: "Monthly staff salary run",
      paymentMethod: "Bank Transfer",
    },
  ];

  const extracted = extractForecastItemsFromData(records, receivables, payables, refDate);

  // 1. Should have Alpha Corp for 70,000 (not 100,000)
  const alphaItem = extracted.find((i) => i.id === "rec-item-rec-1");
  assert.ok(alphaItem, "Alpha Corp receivable must be included");
  assert.strictEqual(alphaItem.amount, 70000, "Only remaining balance of 70,000 must be expected");

  // 2. Beta Corp (fully paid) must NOT be included
  const betaItem = extracted.find((i) => i.id === "rec-item-rec-2");
  assert.strictEqual(betaItem, undefined, "Fully paid invoice must NOT be included as expected inflow");

  // 3. Steel Suppliers payable must be 60,000 (not 80,000)
  const steelItem = extracted.find((i) => i.id === "pay-item-pay-1");
  assert.ok(steelItem, "Steel Suppliers payable must be included");
  assert.strictEqual(steelItem.amount, 60000, "Only remaining balance of 60,000 must be expected");

  // 4. Cleared record `rec-tx-1` must NOT be counted as future inflow
  const clearedTx = extracted.find((i) => i.id === "record-item-rec-tx-1");
  assert.strictEqual(clearedTx, undefined, "Cleared past transaction must not be counted as future cash flow");

  // 5. Future payroll `rec-tx-2` must be included under category 'payroll'
  const payrollTx = extracted.find((i) => i.id === "record-item-rec-tx-2");
  assert.ok(payrollTx, "Future payroll record must be included");
  assert.strictEqual(payrollTx.category, "payroll", "Category identified as payroll");
  assert.strictEqual(payrollTx.amount, 75000, "Payroll amount is 75,000");
});

// =========================================================================
// TEST SUITE 4: DELAYED PAYMENTS & SCENARIO LAB MODIFIERS
// =========================================================================
test("Scenario Modifiers: Delayed Receipts, Sales Contraction, and Emergency Expenses", () => {
  const refDate = new Date("2026-10-24T00:00:00Z");

  const baseItems: CashFlowInputItem[] = [
    {
      id: "rec-1",
      name: "Zenith Aero Components",
      date: "2026-10-31", // 7 days from refDate
      amount: 100000,
      type: "inflow",
      category: "receivable",
    },
    {
      id: "pay-1",
      name: "Vendor Parts",
      date: "2026-11-05",
      amount: 40000,
      type: "outflow",
      category: "payable",
    },
  ];

  // Apply scenario: 20 days delay on customer receipt, -15% sales, and unexpected expense of 50k on day 10
  const modified = applyScenarioModifiers(
    baseItems,
    {
      customerDelayDays: 20,
      salesPercentageChange: -15,
      unexpectedExpenses: [
        {
          id: "exp-1",
          name: "Equipment Breakdown",
          amount: 50000,
          dayOffset: 10,
        },
      ],
    },
    refDate
  );

  const modifiedRec = modified.find((i) => i.id === "rec-1");
  assert.ok(modifiedRec, "Modified receivable exists");
  assert.strictEqual(modifiedRec.date, "2026-11-20", "Date delayed from 2026-10-31 by 20 days to 2026-11-20");
  assert.strictEqual(modifiedRec.amount, 85000, "Amount reduced by 15% from 100,000 to 85,000");

  const emergencyExp = modified.find((i) => i.id === "sim-exp-exp-1");
  assert.ok(emergencyExp, "Emergency expense injected");
  assert.strictEqual(emergencyExp.amount, 50000, "Emergency expense amount is 50,000");
  assert.strictEqual(emergencyExp.date, "2026-11-03", "Emergency expense occurs on day offset 10 (2026-11-03)");
});

// =========================================================================
// TEST SUITE 5: CASH SHORTAGES & MINIMUM RESERVE BREACHES
// =========================================================================
test("Shortage & Breach Detection: Identifies First Shortage Date and Maximum Shortfall", () => {
  const refDate = new Date("2026-10-24T00:00:00Z");

  const items: CashFlowInputItem[] = [
    {
      id: "out-large",
      name: "Heavy Machinery Capex",
      date: "2026-10-28", // Day 4
      amount: 350000,
      type: "outflow",
      category: "other_expense",
    },
    {
      id: "in-late",
      name: "Recovery Receipt",
      date: "2026-11-10", // Day 17
      amount: 200000,
      type: "inflow",
      category: "receivable",
    },
  ];

  const forecast = generateCashForecast({
    openingCash: 200000, // Starts at 200,000
    items,
    horizonDays: 30,
    referenceDate: refDate,
    minimumReserve: 250000, // Minimum safety buffer
  });

  // At Day 0: cash is 200,000 (< minimumReserve 250,000), so reserve breached on Day 0
  assert.strictEqual(forecast.firstReserveBreachDate, "2026-10-24", "First reserve breach detected on Day 0");
  assert.strictEqual(forecast.isReserveBreached, true, "Reserve breach flag is true");

  // At Day 4: cash drops by 350,000 -> 200,000 - 350,000 = -150,000 (shortage below 0!)
  assert.strictEqual(forecast.firstShortageDate, "2026-10-28", "First cash deficit (< 0) occurs on 2026-10-28");
  assert.strictEqual(forecast.firstShortageDayOffset, 4, "Shortage occurs on day offset 4");
  assert.strictEqual(forecast.lowestCashBalance, -150000, "Lowest cash balance is -150,000");
  assert.strictEqual(forecast.maximumCashShortfall, 150000, "Maximum cash shortfall below zero is 150,000");
  assert.strictEqual(forecast.maximumReserveShortfall, 400000, "Maximum shortfall below reserve is 400,000 (250k - (-150k))");
  assert.strictEqual(forecast.isCashDeficit, true, "Cash deficit flag is true");
});
