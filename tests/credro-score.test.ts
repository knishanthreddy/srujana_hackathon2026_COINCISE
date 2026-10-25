import test from "node:test";
import assert from "node:assert";
import {
  calculateCredroScore,
  CREDRO_WEIGHTS,
  type CredroResult,
} from "../src/lib/credro-score.ts";
import type { FinancialRecord, Receivable, Payable } from "../src/lib/types.ts";
import type { OnboardingData } from "../src/lib/onboarding-types.ts";

// =========================================================================
// TEST SUITE 1: CREDRO WEIGHT CONFIGURATION INTEGRITY
// =========================================================================
test("Credro Weights: Configuration weights strictly sum to 1.0 (100%)", () => {
  const sum =
    CREDRO_WEIGHTS.paymentHistory +
    CREDRO_WEIGHTS.cashFlowStability +
    CREDRO_WEIGHTS.liquidityCushion +
    CREDRO_WEIGHTS.financialConsistency +
    CREDRO_WEIGHTS.outstandingObligations;

  assert.strictEqual(
    Math.round(sum * 100) / 100,
    1.0,
    "Credro weights must sum exactly to 1.0"
  );
  assert.strictEqual(CREDRO_WEIGHTS.paymentHistory, 0.25);
  assert.strictEqual(CREDRO_WEIGHTS.cashFlowStability, 0.20);
  assert.strictEqual(CREDRO_WEIGHTS.liquidityCushion, 0.25);
  assert.strictEqual(CREDRO_WEIGHTS.financialConsistency, 0.15);
  assert.strictEqual(CREDRO_WEIGHTS.outstandingObligations, 0.15);
});

// =========================================================================
// TEST SUITE 2: DATA SUFFICIENCY & PRELIMINARY SCORE HANDLING
// =========================================================================
test("Credro Data Sufficiency: Flags preliminary status when transaction history is insufficient", () => {
  // Empty data
  const emptyRecords: FinancialRecord[] = [];
  const emptyReceivables: Receivable[] = [];
  const emptyPayables: Payable[] = [];

  const res = calculateCredroScore(
    emptyRecords,
    emptyReceivables,
    emptyPayables,
    100000,
    250000,
    null
  );

  assert.strictEqual(res.isPreliminary, true, "Must flag as preliminary when total entries < 4");
  assert.ok(
    res.historyNote.toLowerCase().includes("insufficient history"),
    "History note must clearly explain insufficient history"
  );
  assert.ok(res.score >= 0 && res.score <= 100, "Score must remain within 0-100");
  assert.ok(
    res.legalDisclaimer.includes("operational trust metric"),
    "Disclaimer must clarify it is an internal metric"
  );
});

// =========================================================================
// TEST SUITE 3: NORMAL FINANCES & 5 INFLUENCING FACTORS
// =========================================================================
test("Credro Calculation: Computes high score for disciplined, solvent business", () => {
  const records: FinancialRecord[] = [
    {
      id: "rec-1",
      date: "2026-10-10",
      type: "income",
      category: "Product Sales",
      amount: 150000,
      paidAmount: 150000,
      paymentStatus: "completed",
      description: "Batch delivery 01",
      paymentMethod: "Bank Transfer (NEFT)",
    },
    {
      id: "rec-2",
      date: "2026-10-15",
      type: "income",
      category: "Consulting",
      amount: 100000,
      paidAmount: 100000,
      paymentStatus: "completed",
      description: "Retainer client",
      paymentMethod: "Bank Transfer (NEFT)",
    },
    {
      id: "rec-3",
      date: "2026-10-18",
      type: "expense",
      category: "Raw Materials",
      amount: 50000,
      paidAmount: 50000,
      paymentStatus: "completed",
      description: "Steel ingots",
      paymentMethod: "Bank Transfer (NEFT)",
    },
    {
      id: "rec-4",
      date: "2026-10-20",
      type: "expense",
      category: "Facility & Utilities",
      amount: 25000,
      paidAmount: 25000,
      paymentStatus: "completed",
      description: "Factory power bill",
      paymentMethod: "UPI",
    },
    {
      id: "rec-5",
      date: "2026-10-22",
      type: "income",
      category: "Product Sales",
      amount: 80000,
      paidAmount: 80000,
      paymentStatus: "completed",
      description: "Machine parts",
      paymentMethod: "Bank Transfer (NEFT)",
    },
  ];

  const receivables: Receivable[] = [
    {
      id: "ar-1",
      customerName: "Zenith Aero",
      invoiceNumber: "INV-101",
      issueDate: "2026-10-15",
      dueDate: "2026-11-15",
      totalAmount: 120000,
      paidAmount: 40000,
      balanceDue: 80000,
      status: "pending",
      daysOverdue: 0,
    },
  ];

  const payables: Payable[] = [
    {
      id: "ap-1",
      vendorName: "Precision Tooling Ltd",
      invoiceNumber: "BILL-202",
      issueDate: "2026-10-10",
      dueDate: "2026-11-10",
      totalAmount: 40000,
      paidAmount: 20000,
      balanceDue: 20000,
      status: "pending",
      category: "Tooling",
    },
  ];

  // Strong available cash: ₹450,000 against upcoming payables ₹20,000 and ₹250,000 reserve
  const res = calculateCredroScore(
    records,
    receivables,
    payables,
    450000,
    250000,
    null
  );

  assert.strictEqual(res.isPreliminary, false, "Must not be preliminary with 7 entries");
  assert.ok(res.score >= 80, `Healthy business should score >= 80, got ${res.score}`);
  assert.ok(res.trustLevel === "Good" || res.trustLevel === "Excellent");
  assert.strictEqual(res.factors.length, 5, "Must provide all 5 key factors");

  // Verify factor weights
  const factorIds = res.factors.map((f) => f.id);
  assert.ok(factorIds.includes("payment_history"));
  assert.ok(factorIds.includes("cash_flow_stability"));
  assert.ok(factorIds.includes("liquidity_cushion"));
  assert.ok(factorIds.includes("financial_consistency"));
  assert.ok(factorIds.includes("outstanding_obligations"));
});

// =========================================================================
// TEST SUITE 4: OVERDUE PAYABLES PENALTY SENSITIVITY
// =========================================================================
test("Credro Sensitivity: Overdue payables substantially reduce payment history factor", () => {
  const records: FinancialRecord[] = [
    {
      id: "rec-1",
      date: "2026-10-10",
      type: "income",
      category: "Sales",
      amount: 100000,
      paidAmount: 100000,
      paymentStatus: "completed",
      description: "Sales",
      paymentMethod: "Bank Transfer",
    },
    {
      id: "rec-2",
      date: "2026-10-15",
      type: "expense",
      category: "Utilities",
      amount: 30000,
      paidAmount: 30000,
      paymentStatus: "completed",
      description: "Utilities",
      paymentMethod: "Bank Transfer",
    },
    {
      id: "rec-3",
      date: "2026-10-20",
      type: "expense",
      category: "Supplies",
      amount: 20000,
      paidAmount: 20000,
      paymentStatus: "completed",
      description: "Supplies",
      paymentMethod: "Bank Transfer",
    },
  ];

  // 1. On-time bills
  const cleanPayables: Payable[] = [
    {
      id: "p-clean",
      vendorName: "Good Vendor",
      invoiceNumber: "BILL-1",
      issueDate: "2026-10-01",
      dueDate: "2026-11-01",
      totalAmount: 100000,
      paidAmount: 50000,
      balanceDue: 50000,
      status: "pending",
      category: "Supplies",
    },
  ];

  const scoreClean = calculateCredroScore(records, [], cleanPayables, 300000, 200000, null);

  // 2. Overdue bills
  const overduePayables: Payable[] = [
    {
      id: "p-overdue",
      vendorName: "Overdue Vendor",
      invoiceNumber: "BILL-2",
      issueDate: "2026-09-01",
      dueDate: "2026-10-01", // Past due
      totalAmount: 100000,
      paidAmount: 10000,
      balanceDue: 90000,
      status: "overdue",
      category: "Supplies",
    },
  ];

  const scoreOverdue = calculateCredroScore(records, [], overduePayables, 300000, 200000, null);

  const cleanPaymentFactor = scoreClean.factors.find((f) => f.id === "payment_history")!.score;
  const overduePaymentFactor = scoreOverdue.factors.find((f) => f.id === "payment_history")!.score;

  assert.ok(
    cleanPaymentFactor > overduePaymentFactor,
    `Clean payment history (${cleanPaymentFactor}) must score higher than overdue payment history (${overduePaymentFactor})`
  );
  assert.ok(
    scoreClean.score > scoreOverdue.score,
    `Overall score (${scoreClean.score}) must exceed overdue scenario score (${scoreOverdue.score})`
  );
  assert.ok(
    scoreOverdue.recommendations.some((r) => r.toLowerCase().includes("overdue")),
    "Recommendations must advise settling overdue supplier bills"
  );
});

// =========================================================================
// TEST SUITE 5: LIQUIDITY BUFFER & SHORTFALL PENALTY
// =========================================================================
test("Credro Sensitivity: Depleted cash cushion triggers reserve warning and lower score", () => {
  const records: FinancialRecord[] = [
    {
      id: "rec-1",
      date: "2026-10-10",
      type: "income",
      category: "Sales",
      amount: 100000,
      paidAmount: 100000,
      paymentStatus: "completed",
      description: "Sales",
      paymentMethod: "Bank Transfer",
    },
    {
      id: "rec-2",
      date: "2026-10-15",
      type: "expense",
      category: "Rent",
      amount: 50000,
      paidAmount: 50000,
      paymentStatus: "completed",
      description: "Rent",
      paymentMethod: "Bank Transfer",
    },
  ];

  // Strong cash: 500k vs 250k reserve
  const strongCashResult = calculateCredroScore(records, [], [], 500000, 250000, null);
  // Depleted cash: 30k vs 250k reserve
  const depletedCashResult = calculateCredroScore(records, [], [], 30000, 250000, null);

  const strongLiquidity = strongCashResult.factors.find((f) => f.id === "liquidity_cushion")!.score;
  const depletedLiquidity = depletedCashResult.factors.find((f) => f.id === "liquidity_cushion")!.score;

  assert.ok(
    strongLiquidity > depletedLiquidity,
    `Liquidity score with 500k (${strongLiquidity}) must exceed liquidity score with 30k (${depletedLiquidity})`
  );
  assert.ok(
    depletedCashResult.recommendations.some((r) => r.toLowerCase().includes("reserve") || r.toLowerCase().includes("cash")),
    "Depleted cash should generate recommendation to maintain reserve"
  );
});
