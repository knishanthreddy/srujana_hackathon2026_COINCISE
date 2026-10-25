import { test } from "node:test";
import assert from "node:assert";
import { reconcileItem, reconcileExtractedBatch } from "../src/lib/reconciliation-engine.ts";
import type { ExtractedTransactionItem } from "../src/lib/document-types.ts";
import type { FinancialRecord, Receivable, Payable } from "../src/lib/types.ts";

const mockRecords: FinancialRecord[] = [
  {
    id: "rec-1",
    date: "2026-10-10",
    type: "income",
    category: "Product Sales",
    amount: 145000,
    paidAmount: 145000,
    paymentStatus: "completed",
    description: "Cleared client payment",
    paymentMethod: "Bank Transfer (NEFT)",
    reference: "UTR-EXISTING-101",
  },
];

const mockReceivables: Receivable[] = [
  {
    id: "ar-101",
    invoiceNumber: "INV-2026-078",
    customerName: "Apex Solutions",
    totalAmount: 145000,
    paidAmount: 0,
    balanceDue: 145000,
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    status: "pending",
    daysOverdue: 0,
  },
  {
    id: "ar-102",
    invoiceNumber: "INV-2026-092",
    customerName: "Blue Ocean Tech",
    totalAmount: 200000,
    paidAmount: 50000,
    balanceDue: 150000,
    issueDate: "2026-10-05",
    dueDate: "2026-10-25",
    status: "partially_paid",
    daysOverdue: 0,
  },
];

const mockPayables: Payable[] = [
  {
    id: "ap-201",
    invoiceNumber: "BILL-8891",
    vendorName: "Steel Corp India",
    totalAmount: 64000,
    paidAmount: 0,
    balanceDue: 64000,
    issueDate: "2026-10-02",
    dueDate: "2026-10-28",
    status: "pending",
    category: "Raw Materials",
  },
];

test("Duplicate Detection: Flags transactions matching reference or date+amount+desc", () => {
  const item: ExtractedTransactionItem = {
    id: "test-1",
    date: "2026-10-10",
    description: "Bank Inward Credit",
    amount: 145000,
    type: "income",
    reference: "UTR-EXISTING-101",
    confidence: 0.95,
    warnings: [],
    extractionSource: "deterministic",
    reconciliation: {
      suggestedAction: "create_record",
      selectedAction: "create_record",
      matchScore: 0,
      isDuplicate: false,
    },
  };

  const reconciled = reconcileItem(item, {
    records: mockRecords,
    receivables: mockReceivables,
    payables: mockPayables,
  });

  assert.strictEqual(reconciled.reconciliation.isDuplicate, true);
  assert.strictEqual(reconciled.reconciliation.suggestedAction, "skip_duplicate");
  assert.ok(reconciled.reconciliation.duplicateReason?.includes("UTR-EXISTING-101"));
});

test("Internal Account Transfer: Flags inter-account sweep and self transfers", () => {
  const item: ExtractedTransactionItem = {
    id: "test-2",
    date: "2026-10-18",
    description: "Self Transfer to Current Account HDFC 9912",
    amount: 50000,
    type: "expense",
    confidence: 0.9,
    warnings: [],
    extractionSource: "deterministic",
    reconciliation: {
      suggestedAction: "create_record",
      selectedAction: "create_record",
      matchScore: 0,
      isDuplicate: false,
    },
  };

  const reconciled = reconcileItem(item, {
    records: mockRecords,
    receivables: mockReceivables,
    payables: mockPayables,
  });

  assert.strictEqual(reconciled.reconciliation.suggestedAction, "internal_transfer");
  assert.strictEqual(reconciled.reconciliation.isDuplicate, false);
});

test("Receivable Inflow Matching: Matches customer invoice by invoice number and exact amount", () => {
  const item: ExtractedTransactionItem = {
    id: "test-3",
    date: "2026-10-19",
    description: "NEFT CR-APEX SOLUTIONS-INV-2026-078",
    amount: 145000,
    type: "income",
    reference: "UTR-NEW-9911",
    invoiceNumber: "INV-2026-078",
    confidence: 0.95,
    warnings: [],
    extractionSource: "deterministic",
    reconciliation: {
      suggestedAction: "create_record",
      selectedAction: "create_record",
      matchScore: 0,
      isDuplicate: false,
    },
  };

  const reconciled = reconcileItem(item, {
    records: mockRecords,
    receivables: mockReceivables,
    payables: mockPayables,
  });

  assert.strictEqual(reconciled.reconciliation.suggestedAction, "reconcile_receivable");
  assert.strictEqual(reconciled.reconciliation.matchedEntityId, "ar-101");
  assert.ok(reconciled.reconciliation.matchScore >= 90);
});

test("Payable Outflow Matching: Matches vendor bill by bill number and amount", () => {
  const item: ExtractedTransactionItem = {
    id: "test-4",
    date: "2026-10-20",
    description: "RTGS PYMT TO STEEL CORP INDIA FOR BILL-8891",
    amount: 64000,
    type: "expense",
    reference: "RTGS-992288",
    invoiceNumber: "BILL-8891",
    confidence: 0.95,
    warnings: [],
    extractionSource: "deterministic",
    reconciliation: {
      suggestedAction: "create_record",
      selectedAction: "create_record",
      matchScore: 0,
      isDuplicate: false,
    },
  };

  const reconciled = reconcileItem(item, {
    records: mockRecords,
    receivables: mockReceivables,
    payables: mockPayables,
  });

  assert.strictEqual(reconciled.reconciliation.suggestedAction, "reconcile_payable");
  assert.strictEqual(reconciled.reconciliation.matchedEntityId, "ap-201");
  assert.ok(reconciled.reconciliation.matchScore >= 90);
});
