import { test } from "node:test";
import assert from "node:assert";
import {
  calculateLineItem,
  calculateInvoiceTotals,
  generateNextInvoiceNumber,
  createInvoice,
  recordInvoicePayment,
  cancelInvoice,
} from "../src/lib/invoice-service.ts";
import type { FullInvoice } from "../src/lib/invoice-types.ts";

test("Line Item Calculation: Gross, Discount %, Taxable, and GST Rate", () => {
  const line = calculateLineItem({
    description: "CNC Aluminum Enclosures",
    quantity: 100,
    unit: "pcs",
    unitPrice: 1000,
    discountPercent: 10, // 10% off
    taxRate: 18, // 18% GST
  });

  // Gross: 100 * 1000 = 100,000
  // Discount: 10,000 -> Taxable: 90,000
  assert.strictEqual(line.taxableAmount, 90000);
  // Tax: 90,000 * 18% = 16,200
  assert.strictEqual(line.taxAmount, 16200);
  // Total: 90,000 + 16,200 = 106,200
  assert.strictEqual(line.totalAmount, 106200);
});

test("Intra-State vs Inter-State GST Split: CGST+SGST vs IGST", () => {
  const sampleItems = [
    {
      id: "1",
      description: "Item A",
      quantity: 1,
      unit: "pcs",
      unitPrice: 10000,
      discountPercent: 0,
      taxRate: 18,
      taxableAmount: 10000,
      taxAmount: 1800,
      totalAmount: 11800,
    },
  ];

  // Intra-state (Karnataka to Karnataka)
  const intra = calculateInvoiceTotals(sampleItems, "Karnataka", "Karnataka");
  assert.strictEqual(intra.isInterState, false);
  assert.strictEqual(intra.cgstAmount, 900);
  assert.strictEqual(intra.sgstAmount, 900);
  assert.strictEqual(intra.igstAmount, 0);
  assert.strictEqual(intra.totalTax, 1800);
  assert.strictEqual(intra.totalAmount, 11800);

  // Inter-state (Karnataka to Maharashtra)
  const inter = calculateInvoiceTotals(sampleItems, "Karnataka", "Maharashtra");
  assert.strictEqual(inter.isInterState, true);
  assert.strictEqual(inter.cgstAmount, 0);
  assert.strictEqual(inter.sgstAmount, 0);
  assert.strictEqual(inter.igstAmount, 1800);
  assert.strictEqual(inter.totalAmount, 11800);
});

test("Sequential Invoice Numbering: Prevents collisions within the financial year", () => {
  const currentYear = new Date().getFullYear();
  const mockExisting: FullInvoice[] = [
    {
      id: "inv-1",
      invoiceNumber: `INV-${currentYear}-001`,
      issueDate: "2026-10-01",
      dueDate: "2026-10-31",
      status: "issued",
      source: "generated",
      seller: {} as any,
      customer: {} as any,
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      taxableSubtotal: 0,
      isInterState: false,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: 50000,
      paidAmount: 0,
      balanceDue: 50000,
      paymentTerms: "Net 30",
      bankDetails: {} as any,
      history: [],
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "inv-2",
      invoiceNumber: `INV-${currentYear}-002`,
      issueDate: "2026-10-02",
      dueDate: "2026-10-31",
      status: "issued",
      source: "generated",
      seller: {} as any,
      customer: {} as any,
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      taxableSubtotal: 0,
      isInterState: false,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: 75000,
      paidAmount: 0,
      balanceDue: 75000,
      paymentTerms: "Net 30",
      bankDetails: {} as any,
      history: [],
      createdAt: "",
      updatedAt: "",
    },
  ];

  const nextNumber = generateNextInvoiceNumber(mockExisting);
  assert.strictEqual(nextNumber, `INV-${currentYear}-003`);
});

test("Invoice Lifecycle: Create, Partial Payment, Full Payment, and Balance Synchronization", () => {
  const res = createInvoice({
    issueDate: "2026-10-20",
    dueDate: "2026-11-20",
    paymentTerms: "Net 30",
    customer: {
      name: "Triton Aerospace Pvt Ltd",
      gstin: "29AABCT1100R1Z5",
      address: "Whitefield Tech Zone",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560066",
    },
    items: [
      {
        description: "Titanium Fasteners M8",
        quantity: 500,
        unit: "pcs",
        unitPrice: 200,
        discountPercent: 0,
        taxRate: 18,
      },
    ],
    status: "issued",
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.invoice);
  const inv = res.invoice;

  // 500 * 200 = 100,000 + 18% GST = 118,000
  assert.strictEqual(inv.totalAmount, 118000);
  assert.strictEqual(inv.balanceDue, 118000);
  assert.strictEqual(inv.status, "issued");

  // Record Partial Payment of ₹50,000
  const partialRes = recordInvoicePayment(inv.id, {
    paymentDate: "2026-10-25",
    amount: 50000,
    paymentMethod: "Bank Transfer (NEFT)",
    reference: "UTR-TEST-PARTIAL",
  });

  assert.strictEqual(partialRes.success, true);
  assert.strictEqual(partialRes.invoice?.paidAmount, 50000);
  assert.strictEqual(partialRes.invoice?.balanceDue, 68000);
  assert.strictEqual(partialRes.invoice?.status, "partially_paid");

  // Record Full Settlement of remaining ₹68,000
  const fullRes = recordInvoicePayment(inv.id, {
    paymentDate: "2026-10-28",
    amount: 68000,
    paymentMethod: "Bank Transfer (NEFT)",
    reference: "UTR-TEST-FULL",
  });

  assert.strictEqual(fullRes.success, true);
  assert.strictEqual(fullRes.invoice?.paidAmount, 118000);
  assert.strictEqual(fullRes.invoice?.balanceDue, 0);
  assert.strictEqual(fullRes.invoice?.status, "paid");

  // Cannot cancel paid invoice
  const cancelRes = cancelInvoice(inv.id);
  assert.strictEqual(cancelRes.success, false);
});
