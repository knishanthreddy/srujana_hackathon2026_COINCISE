import type {
  FullInvoice,
  InvoiceFormData,
  InvoiceItem,
  InvoicePartyDetails,
  InvoiceStatus,
} from "./invoice-types.ts";
import {
  addReceivable,
  updateReceivable,
  recordReceivablePayment,
  getReceivables,
} from "./data-service.ts";
import { getOnboardingData } from "./onboarding-service.ts";

const STORAGE_KEY_INVOICES = "coincise_invoices_v1";
const EVENT_INVOICES_CHANGED = "coincise_invoices_changed";

let memoryInvoices: FullInvoice[] | null = null;

/**
 * Calculates line-level financials (gross, discount, taxable, GST).
 */
export function calculateLineItem(
  item: Omit<InvoiceItem, "id" | "taxableAmount" | "taxAmount" | "totalAmount">
): { taxableAmount: number; taxAmount: number; totalAmount: number } {
  const qty = Math.max(0, item.quantity);
  const price = Math.max(0, item.unitPrice);
  const gross = qty * price;
  const discPercent = Math.min(100, Math.max(0, item.discountPercent || 0));
  const discountAmount = gross * (discPercent / 100);
  const taxableAmount = Math.round((gross - discountAmount) * 100) / 100;
  const taxRate = Math.max(0, item.taxRate || 0);
  const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return { taxableAmount, taxAmount, totalAmount };
}

/**
 * Calculates aggregate invoice totals, discounts, and intra-state (CGST+SGST) vs inter-state (IGST) split.
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  sellerState = "Karnataka",
  customerState = "Karnataka"
) {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableSubtotal = 0;
  let totalTax = 0;
  let totalAmount = 0;

  items.forEach((it) => {
    const gross = it.quantity * it.unitPrice;
    const discount = gross * ((it.discountPercent || 0) / 100);
    subtotal += gross;
    totalDiscount += discount;
    taxableSubtotal += it.taxableAmount;
    totalTax += it.taxAmount;
    totalAmount += it.totalAmount;
  });

  const isInterState = sellerState.trim().toLowerCase() !== customerState.trim().toLowerCase();
  const cgstAmount = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igstAmount = isInterState ? Math.round(totalTax * 100) / 100 : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableSubtotal: Math.round(taxableSubtotal * 100) / 100,
    isInterState,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Generates next collision-free invoice number for the current calendar/fiscal year (e.g. INV-2026-001).
 */
export function generateNextInvoiceNumber(existingInvoices: FullInvoice[]): string {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const matchingNumbers = existingInvoices
    .map((inv) => inv.invoiceNumber)
    .filter((num) => num.startsWith(prefix))
    .map((num) => {
      const suffix = num.replace(prefix, "");
      const parsed = parseInt(suffix, 10);
      return isNaN(parsed) ? 0 : parsed;
    });

  const nextSeq = matchingNumbers.length > 0 ? Math.max(...matchingNumbers) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

/**
 * Initial demo invoices seed linked to existing receivables.
 */
function createInitialInvoicesSeed(): FullInvoice[] {
  return [
    {
      id: "inv-seed-1",
      invoiceNumber: "INV-2026-078",
      issueDate: "2026-10-01",
      dueDate: "2026-10-31",
      status: "issued",
      source: "generated",
      seller: {
        name: "Acme Precision Technologies Pvt Ltd",
        tradeName: "Acme Precision",
        gstin: "29AABCU9603R1ZM",
        pan: "AABCU9603R",
        email: "billing@acmeprecision.in",
        phone: "+91 98765 43210",
        address: "Plot 42, Peenya Industrial Area, Phase 2",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560058",
      },
      customer: {
        name: "Apex Solutions Ltd",
        tradeName: "Apex Solutions",
        gstin: "29AAACA2201R1Z8",
        email: "accounts@apexsolutions.in",
        phone: "+91 80 4123 4567",
        address: "7th Cross, Electronic City Phase 1",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560100",
      },
      items: [
        {
          id: "item-1",
          description: "High-Tolerance CNC Aluminum Housings (Batch #AL-402)",
          hsnSac: "84069000",
          quantity: 250,
          unit: "pcs",
          unitPrice: 491.52,
          discountPercent: 0,
          taxRate: 18,
          taxableAmount: 122880,
          taxAmount: 22120,
          totalAmount: 145000,
        },
      ],
      subtotal: 122880,
      totalDiscount: 0,
      taxableSubtotal: 122880,
      isInterState: false,
      cgstAmount: 11060,
      sgstAmount: 11060,
      igstAmount: 0,
      totalTax: 22120,
      totalAmount: 145000,
      paidAmount: 0,
      balanceDue: 145000,
      paymentTerms: "Net 30",
      bankDetails: {
        bankName: "HDFC Bank",
        accountNumber: "50200088992211",
        ifsc: "HDFC0000240",
        accountName: "Acme Precision Technologies Pvt Ltd",
        upiId: "acmeprecision@hdfcbank",
        branch: "Peenya Branch",
      },
      notes: "Standard 30-day payment terms apply. Goods inspected and dispatched as per PO specifications.",
      termsConditions: "Interest @ 18% p.a. will be charged on overdue payments beyond due date.",
      receivableId: "ar-1",
      history: [
        {
          id: "hist-1",
          timestamp: "2026-10-01T10:00:00Z",
          action: "created",
          actor: "System Administrator",
          notes: "Invoice issued to Apex Solutions Ltd",
        },
      ],
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:00:00Z",
    },
    {
      id: "inv-seed-2",
      invoiceNumber: "INV-2026-092",
      issueDate: "2026-10-05",
      dueDate: "2026-10-25",
      status: "partially_paid",
      source: "generated",
      seller: {
        name: "Acme Precision Technologies Pvt Ltd",
        tradeName: "Acme Precision",
        gstin: "29AABCU9603R1ZM",
        pan: "AABCU9603R",
        email: "billing@acmeprecision.in",
        phone: "+91 98765 43210",
        address: "Plot 42, Peenya Industrial Area, Phase 2",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560058",
      },
      customer: {
        name: "Zenith Automotive Systems",
        tradeName: "Zenith Auto",
        gstin: "27AABCT9981R1Z2",
        email: "procurement@zenithauto.co.in",
        phone: "+91 22 2590 1122",
        address: "MIDC Industrial Estate, Bhosari",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411026",
      },
      items: [
        {
          id: "item-2",
          description: "Engine Mount Brackets & Flange Bushings (Batch #EM-19)",
          hsnSac: "87082900",
          quantity: 100,
          unit: "sets",
          unitPrice: 1694.92,
          discountPercent: 0,
          taxRate: 18,
          taxableAmount: 169492,
          taxAmount: 30508,
          totalAmount: 200000,
        },
      ],
      subtotal: 169492,
      totalDiscount: 0,
      taxableSubtotal: 169492,
      isInterState: true, // Maharashtra vs Karnataka -> IGST
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 30508,
      totalTax: 30508,
      totalAmount: 200000,
      paidAmount: 50000,
      balanceDue: 150000,
      paymentTerms: "Net 20",
      bankDetails: {
        bankName: "HDFC Bank",
        accountNumber: "50200088992211",
        ifsc: "HDFC0000240",
        accountName: "Acme Precision Technologies Pvt Ltd",
        upiId: "acmeprecision@hdfcbank",
        branch: "Peenya Branch",
      },
      notes: "Advance of ₹50,000 received on 08-Oct-2026. Balance due ₹1,50,000.",
      receivableId: "ar-2",
      history: [
        {
          id: "hist-2",
          timestamp: "2026-10-05T11:00:00Z",
          action: "created",
          actor: "Billing Manager",
        },
        {
          id: "hist-3",
          timestamp: "2026-10-08T14:30:00Z",
          action: "payment_recorded",
          actor: "Finance Team",
          notes: "Advance payment of ₹50,000 received via IMPS",
        },
      ],
      createdAt: "2026-10-05T11:00:00Z",
      updatedAt: "2026-10-08T14:30:00Z",
    },
  ];
}

export function getInvoices(): FullInvoice[] {
  if (typeof window === "undefined") {
    return memoryInvoices || createInitialInvoicesSeed();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_INVOICES);
    if (!raw) {
      const seed = createInitialInvoicesSeed();
      window.localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(seed));
      memoryInvoices = seed;
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryInvoices = parsed;
      return parsed;
    }
    const seed = createInitialInvoicesSeed();
    window.localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(seed));
    memoryInvoices = seed;
    return seed;
  } catch {
    return memoryInvoices || createInitialInvoicesSeed();
  }
}

function persistInvoices(invoices: FullInvoice[]): boolean {
  memoryInvoices = invoices;
  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
    window.dispatchEvent(new CustomEvent(EVENT_INVOICES_CHANGED, { detail: invoices }));
    return true;
  } catch {
    return false;
  }
}

export function subscribeToInvoices(callback: (invoices: FullInvoice[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<FullInvoice[]>;
    callback(customEvent.detail || getInvoices());
  };

  window.addEventListener(EVENT_INVOICES_CHANGED, handleCustomEvent);
  return () => window.removeEventListener(EVENT_INVOICES_CHANGED, handleCustomEvent);
}

export function getInvoiceById(id: string): FullInvoice | undefined {
  return getInvoices().find((inv) => inv.id === id);
}

/**
 * Creates and issues a new professional invoice.
 * Automatically computes subtotals, tax splits, synchronizes to Customer Receivables,
 * and maintains audit history.
 */
export function createInvoice(
  formData: InvoiceFormData
): { success: boolean; invoice?: FullInvoice; errors?: Record<string, string> } {
  const currentInvoices = getInvoices();
  const onboarding = getOnboardingData();

  // 1. Validation
  const errors: Record<string, string> = {};
  if (!formData.customer.name.trim()) errors["customer.name"] = "Customer name is required";
  if (!formData.issueDate) errors.issueDate = "Issue date is required";
  if (!formData.dueDate) errors.dueDate = "Due date is required";
  if (new Date(formData.dueDate) < new Date(formData.issueDate)) {
    errors.dueDate = "Due date cannot be before issue date";
  }
  if (!formData.items || formData.items.length === 0) {
    errors.items = "At least one product or service line item is required";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // 2. Invoice Number
  const invoiceNumber =
    formData.invoiceNumber?.trim() || generateNextInvoiceNumber(currentInvoices);

  // Prevent duplicate invoice number
  if (currentInvoices.some((inv) => inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase())) {
    return {
      success: false,
      errors: { invoiceNumber: `Invoice number ${invoiceNumber} is already used.` },
    };
  }

  // 3. Seller Details (from Business Profile)
  const profile = onboarding?.profile as any;
  const seller: InvoicePartyDetails = {
    name: profile?.mcaLegalName || "Acme Precision Technologies Pvt Ltd",
    tradeName: profile?.tradeName || profile?.mcaLegalName || "Acme Precision",
    gstin: profile?.gstin || "29AABCU9603R1ZM",
    pan: profile?.pan || (profile?.gstin ? profile.gstin.slice(2, 12) : "AABCU9603R"),
    email: profile?.email || "billing@acmeprecision.in",
    phone: profile?.phone || "+91 98765 43210",
    address: profile?.registeredAddress || "Plot 42, Peenya Industrial Area, Phase 2",
    city: profile?.city || "Bengaluru",
    state: profile?.state || "Karnataka",
    postalCode: profile?.postalCode || "560058",
  };

  // 4. Line Items Calculation
  const computedItems: InvoiceItem[] = formData.items.map((it, idx) => {
    const lineCalc = calculateLineItem(it);
    return {
      id: `item-${Date.now()}-${idx + 1}`,
      description: it.description,
      hsnSac: it.hsnSac || undefined,
      quantity: it.quantity,
      unit: it.unit || "units",
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent || 0,
      taxRate: it.taxRate || 0,
      taxableAmount: lineCalc.taxableAmount,
      taxAmount: lineCalc.taxAmount,
      totalAmount: lineCalc.totalAmount,
    };
  });

  // 5. Aggregate Totals
  const totals = calculateInvoiceTotals(
    computedItems,
    seller.state,
    formData.customer.state || seller.state
  );

  // 6. Bank Details (from Primary Bank Account)
  const primaryBank = onboarding?.openingFinances?.bankAccounts?.[0] as any;
  const bankDetails = {
    bankName: formData.bankDetails?.bankName || primaryBank?.bankName || "HDFC Bank",
    accountNumber:
      formData.bankDetails?.accountNumber ||
      primaryBank?.accountNumberMasked ||
      "50200088992211",
    ifsc: formData.bankDetails?.ifsc || "HDFC0000240",
    accountName: formData.bankDetails?.accountName || seller.name,
    upiId: formData.bankDetails?.upiId || "acmeprecision@hdfcbank",
    branch: formData.bankDetails?.branch || "Peenya Industrial Branch",
  };

  const status: InvoiceStatus = formData.status === "draft" ? "draft" : "issued";
  const now = new Date().toISOString();
  const invoiceId = `inv-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const newInvoice: FullInvoice = {
    id: invoiceId,
    invoiceNumber,
    issueDate: formData.issueDate,
    dueDate: formData.dueDate,
    status,
    source: "generated",
    seller,
    customer: {
      name: formData.customer.name,
      tradeName: formData.customer.tradeName || formData.customer.name,
      gstin: formData.customer.gstin || undefined,
      email: formData.customer.email || undefined,
      phone: formData.customer.phone || undefined,
      address: formData.customer.address || "Client Facility",
      city: formData.customer.city || "Bengaluru",
      state: formData.customer.state || seller.state,
      postalCode: formData.customer.postalCode || "560001",
    },
    items: computedItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxableSubtotal: totals.taxableSubtotal,
    isInterState: totals.isInterState,
    cgstAmount: totals.cgstAmount,
    sgstAmount: totals.sgstAmount,
    igstAmount: totals.igstAmount,
    totalTax: totals.totalTax,
    totalAmount: totals.totalAmount,
    paidAmount: 0,
    balanceDue: totals.totalAmount,
    paymentTerms: formData.paymentTerms || "Net 30",
    bankDetails,
    notes: formData.notes || "Thank you for your business. Please quote the invoice number during settlement.",
    termsConditions:
      formData.termsConditions ||
      "Payment is due within stated terms. Interest @ 18% p.a. applies to delayed settlements under MSME D&C regulations.",
    history: [
      {
        id: `hist-${Date.now()}`,
        timestamp: now,
        action: status === "draft" ? "created" : "issued",
        actor: "Business Owner",
        notes: status === "draft" ? "Saved as draft" : "Officially generated and issued",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // 7. Synchronize with Customer Receivables if Issued
  if (status === "issued") {
    const recRes = addReceivable({
      invoiceNumber: newInvoice.invoiceNumber,
      customerName: newInvoice.customer.name,
      totalAmount: newInvoice.totalAmount,
      paidAmount: 0,
      issueDate: newInvoice.issueDate,
      dueDate: newInvoice.dueDate,
      contactEmail: newInvoice.customer.email,
      notes: `Generated via Invoice Manager (${newInvoice.items.length} line items)`,
    });

    if (recRes.success && recRes.receivable) {
      newInvoice.receivableId = recRes.receivable.id;
    }
  }

  const updatedInvoices = [newInvoice, ...currentInvoices];
  persistInvoices(updatedInvoices);

  return { success: true, invoice: newInvoice };
}

/**
 * Records payment against an invoice and keeps Receivables and Cash Ledger in perfect sync.
 */
export function recordInvoicePayment(
  invoiceId: string,
  paymentData: {
    paymentDate: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
  }
): { success: boolean; invoice?: FullInvoice; error?: string } {
  const currentInvoices = getInvoices();
  const index = currentInvoices.findIndex((inv) => inv.id === invoiceId);
  if (index === -1) return { success: false, error: "Invoice not found" };

  const target = currentInvoices[index];
  if (paymentData.amount > target.balanceDue) {
    return {
      success: false,
      error: `Payment amount (₹${paymentData.amount}) exceeds outstanding balance (₹${target.balanceDue})`,
    };
  }

  const newPaidAmount = Math.round((target.paidAmount + paymentData.amount) * 100) / 100;
  const newBalanceDue = Math.max(0, Math.round((target.totalAmount - newPaidAmount) * 100) / 100);
  const newStatus: InvoiceStatus = newBalanceDue <= 0 ? "paid" : "partially_paid";

  // Sync to Customer Receivables
  if (target.receivableId) {
    recordReceivablePayment(target.receivableId, {
      paymentDate: paymentData.paymentDate,
      paymentAmount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      reference: paymentData.reference || `PAY-${target.invoiceNumber}`,
      notes: paymentData.notes || `Disbursement recorded for ${target.invoiceNumber}`,
      syncToCashLedger: true,
    });
  }

  const updatedInvoice: FullInvoice = {
    ...target,
    paidAmount: newPaidAmount,
    balanceDue: newBalanceDue,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    history: [
      ...target.history,
      {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "payment_recorded",
        actor: "Finance Team",
        notes: `Recorded payment of ₹${paymentData.amount.toLocaleString("en-IN")} via ${paymentData.paymentMethod}`,
      },
    ],
  };

  const updatedList = [...currentInvoices];
  updatedList[index] = updatedInvoice;
  persistInvoices(updatedList);

  return { success: true, invoice: updatedInvoice };
}

/**
 * Cancels an invoice.
 */
export function cancelInvoice(
  invoiceId: string,
  reason = "Cancelled by user"
): { success: boolean; invoice?: FullInvoice; error?: string } {
  const currentInvoices = getInvoices();
  const index = currentInvoices.findIndex((inv) => inv.id === invoiceId);
  if (index === -1) return { success: false, error: "Invoice not found" };

  const target = currentInvoices[index];
  if (target.status === "paid") {
    return { success: false, error: "Cannot cancel a fully settled invoice." };
  }

  const updatedInvoice: FullInvoice = {
    ...target,
    status: "cancelled",
    updatedAt: new Date().toISOString(),
    history: [
      ...target.history,
      {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "cancelled",
        actor: "Business Owner",
        notes: reason,
      },
    ],
  };

  const updatedList = [...currentInvoices];
  updatedList[index] = updatedInvoice;
  persistInvoices(updatedList);

  return { success: true, invoice: updatedInvoice };
}
