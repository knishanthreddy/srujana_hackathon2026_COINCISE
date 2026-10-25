import type {
  FinancialRecord,
  Receivable,
  Payable,
  InvoiceStatus,
  TransactionType,
  PaymentStatus,
  BusinessSummary,
} from "./types.ts";
import {
  extractForecastItemsFromData,
  buildForecastItemsWithAssumptions,
  applyScenarioModifiers,
  generateCashForecast,
  type ScenarioModifiers,
  type ForecastSummary,
} from "./forecast-engine.ts";
import { getOnboardingData } from "./onboarding-service.ts";
import { calculateFinancialSummary } from "./financial-summary.ts";
import { DEMO_RECORDS, DEMO_RECEIVABLES, DEMO_PAYABLES, DEMO_SUMMARY } from "./demo-data.ts";
import { financialRecordSchema, type FinancialRecordFormData } from "./validations/record.ts";
import {
  receivableSchema,
  type ReceivableFormData,
  payableSchema,
  type PayableFormData,
  paymentRecordSchema,
  type PaymentRecordFormData,
} from "./validations/invoice.ts";

const STORAGE_KEY_RECORDS = "coincise_financial_records_v1";
const STORAGE_KEY_RECEIVABLES = "coincise_receivables_v1";
const STORAGE_KEY_PAYABLES = "coincise_payables_v1";

const EVENT_RECORDS_CHANGED = "coincise_records_changed";
const EVENT_RECEIVABLES_CHANGED = "coincise_receivables_changed";
const EVENT_PAYABLES_CHANGED = "coincise_payables_changed";

// In-memory fallbacks
let memoryRecords: FinancialRecord[] | null = null;
let memoryReceivables: Receivable[] | null = null;
let memoryPayables: Payable[] | null = null;
let storageError: string | null = null;

export function getStorageError(): string | null {
  return storageError;
}

/**
 * Automatically computes Invoice Status and Days Overdue based on due date & balances.
 */
export function computeInvoiceStatusAndOverdue(
  dueDateStr: string,
  totalAmount: number,
  paidAmount: number,
  referenceDateStr?: string
): { status: InvoiceStatus; daysOverdue: number; balanceDue: number } {
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  if (balanceDue <= 0) {
    return { status: "paid", daysOverdue: 0, balanceDue: 0 };
  }

  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  refDate.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = refDate.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { status: "overdue", daysOverdue: diffDays, balanceDue };
  }

  if (paidAmount > 0) {
    return { status: "partially_paid", daysOverdue: 0, balanceDue };
  }

  return { status: "pending", daysOverdue: 0, balanceDue };
}

// ==========================================
// 1. FINANCIAL RECORDS (Cash Transactions)
// ==========================================

export function getFinancialRecords(): FinancialRecord[] {
  if (typeof window === "undefined") return DEMO_RECORDS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(DEMO_RECORDS));
      memoryRecords = [...DEMO_RECORDS];
      return memoryRecords;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryRecords = parsed;
      return parsed;
    }
    window.localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(DEMO_RECORDS));
    memoryRecords = [...DEMO_RECORDS];
    return memoryRecords;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Storage unavailable";
    return memoryRecords || [...DEMO_RECORDS];
  }
}

function persistRecords(records: FinancialRecord[]): boolean {
  memoryRecords = records;
  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    storageError = null;
    window.dispatchEvent(new CustomEvent(EVENT_RECORDS_CHANGED, { detail: records }));
    return true;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Failed to persist records";
    window.dispatchEvent(new CustomEvent(EVENT_RECORDS_CHANGED, { detail: records }));
    return false;
  }
}

export function addFinancialRecord(
  data: FinancialRecordFormData
): { success: boolean; record?: FinancialRecord; errors?: Record<string, string> } {
  const validation = financialRecordSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      errors[err.path.join(".")] = err.message;
    });
    return { success: false, errors };
  }

  const validData = validation.data;
  const current = getFinancialRecords();

  // Prevent duplicate transaction entry check
  if (validData.reference) {
    const exists = current.some(
      (r) =>
        r.reference?.toLowerCase() === validData.reference?.toLowerCase() &&
        r.amount === validData.amount &&
        r.date === validData.date
    );
    if (exists) {
      return {
        success: false,
        errors: { reference: "A record with this reference, amount, and date already exists." },
      };
    }
  }

  const now = new Date().toISOString();
  const newRecord: FinancialRecord = {
    id: `rec-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    date: validData.date,
    type: validData.type,
    category: validData.category,
    amount: validData.amount,
    paidAmount: validData.paidAmount,
    paymentStatus: validData.paymentStatus,
    description: validData.description,
    paymentMethod: validData.paymentMethod,
    reference: validData.reference || `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
    notes: validData.notes,
    createdAt: now,
    updatedAt: now,
    status: validData.paymentStatus === "completed" ? "cleared" : "pending",
  };

  const updated = [newRecord, ...current];
  persistRecords(updated);
  return { success: true, record: newRecord };
}

export function updateFinancialRecord(
  id: string,
  data: FinancialRecordFormData
): { success: boolean; record?: FinancialRecord; errors?: Record<string, string> } {
  const validation = financialRecordSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      errors[err.path.join(".")] = err.message;
    });
    return { success: false, errors };
  }

  const current = getFinancialRecords();
  const index = current.findIndex((r) => r.id === id);
  if (index === -1) {
    return { success: false, errors: { general: "Record not found" } };
  }

  const validData = validation.data;
  const existing = current[index];
  const updatedRecord: FinancialRecord = {
    ...existing,
    date: validData.date,
    type: validData.type,
    category: validData.category,
    amount: validData.amount,
    paidAmount: validData.paidAmount,
    paymentStatus: validData.paymentStatus,
    description: validData.description,
    paymentMethod: validData.paymentMethod,
    reference: validData.reference || existing.reference,
    notes: validData.notes,
    updatedAt: new Date().toISOString(),
    status: validData.paymentStatus === "completed" ? "cleared" : "pending",
  };

  const updatedList = [...current];
  updatedList[index] = updatedRecord;
  persistRecords(updatedList);
  return { success: true, record: updatedRecord };
}

export function deleteFinancialRecord(id: string): boolean {
  const current = getFinancialRecords();
  const filtered = current.filter((r) => r.id !== id);
  if (filtered.length === current.length) return false;
  return persistRecords(filtered);
}

export function resetFinancialRecords(): FinancialRecord[] {
  persistRecords([...DEMO_RECORDS]);
  return [...DEMO_RECORDS];
}

export function calculateFinancialTotals(records: FinancialRecord[]) {
  let clearedInflows = 0;
  let clearedOutflows = 0;
  let expectedInflows = 0;
  let expectedOutflows = 0;

  records.forEach((rec) => {
    if (rec.type === "income") {
      clearedInflows += rec.paidAmount;
      const pending = Math.max(0, rec.amount - rec.paidAmount);
      expectedInflows += pending;
    } else {
      clearedOutflows += rec.paidAmount;
      const pending = Math.max(0, rec.amount - rec.paidAmount);
      expectedOutflows += pending;
    }
  });

  return {
    clearedInflows,
    clearedOutflows,
    netClearedCash: clearedInflows - clearedOutflows,
    expectedInflows,
    expectedOutflows,
    totalRecords: records.length,
    completedCount: records.filter((r) => r.paymentStatus === "completed").length,
    partiallyPaidCount: records.filter((r) => r.paymentStatus === "partially_paid").length,
    expectedCount: records.filter((r) => r.paymentStatus === "expected").length,
  };
}

export function subscribeToFinancialRecords(callback: (records: FinancialRecord[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<FinancialRecord[]>;
    callback(customEvent.detail || getFinancialRecords());
  };

  window.addEventListener(EVENT_RECORDS_CHANGED, handleCustomEvent);
  return () => window.removeEventListener(EVENT_RECORDS_CHANGED, handleCustomEvent);
}

// ==========================================
// 2. RECEIVABLES (Customer Invoices)
// ==========================================

export function getReceivables(): Receivable[] {
  if (typeof window === "undefined") return DEMO_RECEIVABLES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_RECEIVABLES);
    if (!raw) {
      // Recompute initial demo receivables status dynamically
      const formatted = DEMO_RECEIVABLES.map((ar) => {
        const comp = computeInvoiceStatusAndOverdue(ar.dueDate, ar.totalAmount, ar.paidAmount);
        return { ...ar, status: comp.status, daysOverdue: comp.daysOverdue, balanceDue: comp.balanceDue };
      });
      window.localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(formatted));
      memoryReceivables = formatted;
      return memoryReceivables;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryReceivables = parsed;
      return parsed;
    }
    window.localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(DEMO_RECEIVABLES));
    memoryReceivables = [...DEMO_RECEIVABLES];
    return memoryReceivables;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Storage error";
    return memoryReceivables || [...DEMO_RECEIVABLES];
  }
}

function persistReceivables(receivables: Receivable[]): boolean {
  memoryReceivables = receivables;
  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(receivables));
    storageError = null;
    window.dispatchEvent(new CustomEvent(EVENT_RECEIVABLES_CHANGED, { detail: receivables }));
    return true;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Failed to persist receivables";
    window.dispatchEvent(new CustomEvent(EVENT_RECEIVABLES_CHANGED, { detail: receivables }));
    return false;
  }
}

export function addReceivable(
  data: ReceivableFormData
): { success: boolean; receivable?: Receivable; errors?: Record<string, string> } {
  const validation = receivableSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      errors[err.path.join(".")] = err.message;
    });
    return { success: false, errors };
  }

  const valid = validation.data;
  const current = getReceivables();

  // Duplicate invoice check
  if (current.some((r) => r.invoiceNumber.toLowerCase() === valid.invoiceNumber.toLowerCase())) {
    return {
      success: false,
      errors: { invoiceNumber: `Invoice number ${valid.invoiceNumber} already exists.` },
    };
  }

  const comp = computeInvoiceStatusAndOverdue(valid.dueDate, valid.totalAmount, valid.paidAmount);

  const newReceivable: Receivable = {
    id: `ar-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    invoiceNumber: valid.invoiceNumber.trim(),
    customerName: valid.customerName.trim(),
    totalAmount: valid.totalAmount,
    paidAmount: valid.paidAmount,
    balanceDue: comp.balanceDue,
    issueDate: valid.issueDate,
    dueDate: valid.dueDate,
    status: comp.status,
    daysOverdue: comp.daysOverdue,
    contactEmail: valid.contactEmail || undefined,
    notes: valid.notes || undefined,
  };

  const updated = [newReceivable, ...current];
  persistReceivables(updated);
  return { success: true, receivable: newReceivable };
}

export function updateReceivable(
  id: string,
  data: ReceivableFormData
): { success: boolean; receivable?: Receivable; errors?: Record<string, string> } {
  const validation = receivableSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      errors[err.path.join(".")] = err.message;
    });
    return { success: false, errors };
  }

  const current = getReceivables();
  const index = current.findIndex((r) => r.id === id);
  if (index === -1) {
    return { success: false, errors: { general: "Invoice not found" } };
  }

  const valid = validation.data;
  // Duplicate check if invoice number was changed
  const dup = current.find(
    (r) => r.id !== id && r.invoiceNumber.toLowerCase() === valid.invoiceNumber.toLowerCase()
  );
  if (dup) {
    return {
      success: false,
      errors: { invoiceNumber: `Invoice number ${valid.invoiceNumber} is already used by another record.` },
    };
  }

  const comp = computeInvoiceStatusAndOverdue(valid.dueDate, valid.totalAmount, valid.paidAmount);

  const updatedReceivable: Receivable = {
    ...current[index],
    invoiceNumber: valid.invoiceNumber.trim(),
    customerName: valid.customerName.trim(),
    totalAmount: valid.totalAmount,
    paidAmount: valid.paidAmount,
    balanceDue: comp.balanceDue,
    issueDate: valid.issueDate,
    dueDate: valid.dueDate,
    status: comp.status,
    daysOverdue: comp.daysOverdue,
    contactEmail: valid.contactEmail || undefined,
    notes: valid.notes || undefined,
  };

  const updatedList = [...current];
  updatedList[index] = updatedReceivable;
  persistReceivables(updatedList);
  return { success: true, receivable: updatedReceivable };
}

export function deleteReceivable(id: string): boolean {
  const current = getReceivables();
  const filtered = current.filter((r) => r.id !== id);
  if (filtered.length === current.length) return false;
  return persistReceivables(filtered);
}

/**
 * Record a customer payment on a receivable.
 * Updates receivable paid amount & balance due, and optionally creates
 * a matching cleared cash income transaction in the ledger without double-counting.
 */
export function recordReceivablePayment(
  receivableId: string,
  paymentData: PaymentRecordFormData
): { success: boolean; receivable?: Receivable; error?: string } {
  const current = getReceivables();
  const index = current.findIndex((r) => r.id === receivableId);
  if (index === -1) return { success: false, error: "Receivable not found" };

  const target = current[index];
  if (paymentData.paymentAmount > target.balanceDue) {
    return {
      success: false,
      error: `Payment amount (${paymentData.paymentAmount}) cannot exceed outstanding balance (${target.balanceDue})`,
    };
  }

  const newPaidAmount = target.paidAmount + paymentData.paymentAmount;
  const comp = computeInvoiceStatusAndOverdue(target.dueDate, target.totalAmount, newPaidAmount);

  const updatedReceivable: Receivable = {
    ...target,
    paidAmount: newPaidAmount,
    balanceDue: comp.balanceDue,
    status: comp.status,
    daysOverdue: comp.daysOverdue,
  };

  const updatedList = [...current];
  updatedList[index] = updatedReceivable;
  persistReceivables(updatedList);

  // Sync to cash ledger if selected
  if (paymentData.syncToCashLedger) {
    const refCode = paymentData.reference?.trim() || `PAY-REC-${target.invoiceNumber}`;
    addFinancialRecord({
      date: paymentData.paymentDate,
      type: "income",
      category: "Client Milestone Payment",
      amount: paymentData.paymentAmount,
      paidAmount: paymentData.paymentAmount,
      paymentStatus: "completed",
      description: `Payment received from ${target.customerName} (${target.invoiceNumber})`,
      paymentMethod: paymentData.paymentMethod,
      reference: refCode,
      notes: paymentData.notes || `Receipt recorded for invoice ${target.invoiceNumber}`,
    });
  }

  return { success: true, receivable: updatedReceivable };
}

export function calculateReceivablesTotals(receivables: Receivable[]) {
  const totalReceivables = receivables.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPaid = receivables.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalBalanceDue = receivables.reduce((sum, r) => sum + r.balanceDue, 0);

  const overdueItems = receivables.filter((r) => r.status === "overdue");
  const overdueBalance = overdueItems.reduce((sum, r) => sum + r.balanceDue, 0);
  const overdueCount = overdueItems.length;

  const currentItems = receivables.filter((r) => r.status === "pending" || r.status === "partially_paid");
  const currentBalance = currentItems.reduce((sum, r) => sum + r.balanceDue, 0);

  return {
    totalReceivables,
    totalPaid,
    totalBalanceDue,
    overdueCount,
    overdueBalance,
    currentBalance,
    paidCount: receivables.filter((r) => r.status === "paid").length,
  };
}

export function subscribeToReceivables(callback: (receivables: Receivable[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<Receivable[]>;
    callback(customEvent.detail || getReceivables());
  };

  window.addEventListener(EVENT_RECEIVABLES_CHANGED, handleCustomEvent);
  return () => window.removeEventListener(EVENT_RECEIVABLES_CHANGED, handleCustomEvent);
}

// ==========================================
// 3. PAYABLES (Supplier Liabilities)
// ==========================================

export function getPayables(): Payable[] {
  if (typeof window === "undefined") return DEMO_PAYABLES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PAYABLES);
    if (!raw) {
      const formatted = DEMO_PAYABLES.map((ap) => {
        const comp = computeInvoiceStatusAndOverdue(ap.dueDate, ap.totalAmount, ap.paidAmount);
        return { ...ap, status: comp.status, balanceDue: comp.balanceDue };
      });
      window.localStorage.setItem(STORAGE_KEY_PAYABLES, JSON.stringify(formatted));
      memoryPayables = formatted;
      return memoryPayables;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryPayables = parsed;
      return parsed;
    }
    window.localStorage.setItem(STORAGE_KEY_PAYABLES, JSON.stringify(DEMO_PAYABLES));
    memoryPayables = [...DEMO_PAYABLES];
    return memoryPayables;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Storage error";
    return memoryPayables || [...DEMO_PAYABLES];
  }
}

function persistPayables(payables: Payable[]): boolean {
  memoryPayables = payables;
  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(STORAGE_KEY_PAYABLES, JSON.stringify(payables));
    storageError = null;
    window.dispatchEvent(new CustomEvent(EVENT_PAYABLES_CHANGED, { detail: payables }));
    return true;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Failed to persist payables";
    window.dispatchEvent(new CustomEvent(EVENT_PAYABLES_CHANGED, { detail: payables }));
    return false;
  }
}

export function addPayable(
  data: PayableFormData
): { success: boolean; payable?: Payable; errors?: Record<string, string> } {
  const validation = payableSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      errors[err.path.join(".")] = err.message;
    });
    return { success: false, errors };
  }

  const valid = validation.data;
  const current = getPayables();

  // Duplicate bill check
  if (current.some((p) => p.invoiceNumber.toLowerCase() === valid.invoiceNumber.toLowerCase())) {
    return {
      success: false,
      errors: { invoiceNumber: `Vendor bill number ${valid.invoiceNumber} already exists.` },
    };
  }

  const comp = computeInvoiceStatusAndOverdue(valid.dueDate, valid.totalAmount, valid.paidAmount);

  const newPayable: Payable = {
    id: `ap-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    invoiceNumber: valid.invoiceNumber.trim(),
    vendorName: valid.vendorName.trim(),
    totalAmount: valid.totalAmount,
    paidAmount: valid.paidAmount,
    balanceDue: comp.balanceDue,
    issueDate: valid.issueDate,
    dueDate: valid.dueDate,
    status: comp.status,
    category: valid.category,
    contactEmail: valid.contactEmail || undefined,
    notes: valid.notes || undefined,
  };

  const updated = [newPayable, ...current];
  persistPayables(updated);
  return { success: true, payable: newPayable };
}

export function updatePayable(
  id: string,
  data: PayableFormData
): { success: boolean; payable?: Payable; errors?: Record<string, string> } {
  const validation = payableSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      errors[err.path.join(".")] = err.message;
    });
    return { success: false, errors };
  }

  const current = getPayables();
  const index = current.findIndex((p) => p.id === id);
  if (index === -1) {
    return { success: false, errors: { general: "Payable not found" } };
  }

  const valid = validation.data;
  const dup = current.find(
    (p) => p.id !== id && p.invoiceNumber.toLowerCase() === valid.invoiceNumber.toLowerCase()
  );
  if (dup) {
    return {
      success: false,
      errors: { invoiceNumber: `Bill number ${valid.invoiceNumber} is already used by another record.` },
    };
  }

  const comp = computeInvoiceStatusAndOverdue(valid.dueDate, valid.totalAmount, valid.paidAmount);

  const updatedPayable: Payable = {
    ...current[index],
    invoiceNumber: valid.invoiceNumber.trim(),
    vendorName: valid.vendorName.trim(),
    totalAmount: valid.totalAmount,
    paidAmount: valid.paidAmount,
    balanceDue: comp.balanceDue,
    issueDate: valid.issueDate,
    dueDate: valid.dueDate,
    status: comp.status,
    category: valid.category,
    contactEmail: valid.contactEmail || undefined,
    notes: valid.notes || undefined,
  };

  const updatedList = [...current];
  updatedList[index] = updatedPayable;
  persistPayables(updatedList);
  return { success: true, payable: updatedPayable };
}

export function deletePayable(id: string): boolean {
  const current = getPayables();
  const filtered = current.filter((p) => p.id !== id);
  if (filtered.length === current.length) return false;
  return persistPayables(filtered);
}

/**
 * Record a disbursement to a vendor.
 * Updates payable paid amount & balance due, and optionally creates
 * a matching cleared cash expense transaction in the ledger without double-counting.
 */
export function recordPayablePayment(
  payableId: string,
  paymentData: PaymentRecordFormData
): { success: boolean; payable?: Payable; error?: string } {
  const current = getPayables();
  const index = current.findIndex((r) => r.id === payableId);
  if (index === -1) return { success: false, error: "Payable not found" };

  const target = current[index];
  if (paymentData.paymentAmount > target.balanceDue) {
    return {
      success: false,
      error: `Payment amount (${paymentData.paymentAmount}) cannot exceed outstanding balance (${target.balanceDue})`,
    };
  }

  const newPaidAmount = target.paidAmount + paymentData.paymentAmount;
  const comp = computeInvoiceStatusAndOverdue(target.dueDate, target.totalAmount, newPaidAmount);

  const updatedPayable: Payable = {
    ...target,
    paidAmount: newPaidAmount,
    balanceDue: comp.balanceDue,
    status: comp.status,
  };

  const updatedList = [...current];
  updatedList[index] = updatedPayable;
  persistPayables(updatedList);

  // Sync to cash ledger if selected
  if (paymentData.syncToCashLedger) {
    const refCode = paymentData.reference?.trim() || `PAY-VEN-${target.invoiceNumber}`;
    addFinancialRecord({
      date: paymentData.paymentDate,
      type: "expense",
      category: target.category || "Vendor Settlement",
      amount: paymentData.paymentAmount,
      paidAmount: paymentData.paymentAmount,
      paymentStatus: "completed",
      description: `Disbursement to ${target.vendorName} (Bill #${target.invoiceNumber})`,
      paymentMethod: paymentData.paymentMethod,
      reference: refCode,
      notes: paymentData.notes || `Vendor settlement for bill ${target.invoiceNumber}`,
    });
  }

  return { success: true, payable: updatedPayable };
}

export function calculatePayablesTotals(payables: Payable[]) {
  const totalPayables = payables.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = payables.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalBalanceDue = payables.reduce((sum, p) => sum + p.balanceDue, 0);

  const overdueItems = payables.filter((p) => p.status === "overdue");
  const overdueBalance = overdueItems.reduce((sum, p) => sum + p.balanceDue, 0);
  const overdueCount = overdueItems.length;

  const pendingItems = payables.filter((p) => p.status === "pending" || p.status === "partially_paid");
  const pendingBalance = pendingItems.reduce((sum, p) => sum + p.balanceDue, 0);

  return {
    totalPayables,
    totalPaid,
    totalBalanceDue,
    overdueCount,
    overdueBalance,
    pendingBalance,
    paidCount: payables.filter((p) => p.status === "paid").length,
  };
}

export function subscribeToPayables(callback: (payables: Payable[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<Payable[]>;
    callback(customEvent.detail || getPayables());
  };

  window.addEventListener(EVENT_PAYABLES_CHANGED, handleCustomEvent);
  return () => window.removeEventListener(EVENT_PAYABLES_CHANGED, handleCustomEvent);
}

// ==========================================
// 4. UNIFIED BUSINESS SUMMARY FOR DASHBOARD
// ==========================================

export function getUnifiedDashboardMetrics() {
  const records = getFinancialRecords();
  const receivables = getReceivables();
  const payables = getPayables();

  const recordTotals = calculateFinancialTotals(records);
  const recTotals = calculateReceivablesTotals(receivables);
  const payTotals = calculatePayablesTotals(payables);

  const baselineTotals = calculateFinancialTotals(DEMO_RECORDS);
  const netDelta = recordTotals.netClearedCash - baselineTotals.netClearedCash;

  let baseOpeningCash = DEMO_SUMMARY.availableCash;
  if (typeof window !== "undefined") {
    try {
      const onboarding = getOnboardingData();
      if (onboarding && onboarding.isCompleted && onboarding.openingFinances) {
        const sum = calculateFinancialSummary(onboarding.openingFinances);
        if (typeof sum.availableOperatingCash === "number") {
          baseOpeningCash = sum.availableOperatingCash;
        }
      }
    } catch {
      // Keep DEMO_SUMMARY.availableCash
    }
  }

  const availableCash = Math.max(0, baseOpeningCash + netDelta);

  return {
    availableCash,
    outstandingReceivables: recTotals.totalBalanceDue,
    overdueReceivablesCount: recTotals.overdueCount,
    outstandingPayables: payTotals.totalBalanceDue,
    overduePayablesCount: payTotals.overdueCount,
    expectedReceipts30d: recTotals.totalBalanceDue,
    upcomingExpenses30d: payTotals.totalBalanceDue,
    projectedCash30d: availableCash + recTotals.totalBalanceDue - payTotals.totalBalanceDue,
  };
}

/**
 * Computes live, reactive cash-flow forecast derived directly from active records,
 * receivables, payables, and liquid available cash.
 */
export function getLiveForecast(
  horizon: 7 | 30 | 60 | 90 = 30,
  minimumReserve: number = 250000,
  modifiers?: ScenarioModifiers,
  customReferenceDate?: Date
): ForecastSummary {
  const records = getFinancialRecords();
  const receivables = getReceivables();
  const payables = getPayables();
  const metrics = getUnifiedDashboardMetrics();

  const onboarding = typeof window !== "undefined" ? getOnboardingData() : null;
  const assumptions = onboarding?.forecastAssumptions;
  const effectiveReserve = onboarding?.openingFinances?.minimumReserve || minimumReserve;

  const refDate = customReferenceDate || new Date("2026-10-24T00:00:00Z");
  let items = buildForecastItemsWithAssumptions(
    records,
    receivables,
    payables,
    assumptions,
    refDate,
    horizon
  );

  if (modifiers) {
    items = applyScenarioModifiers(items, modifiers, refDate);
  }

  return generateCashForecast({
    openingCash: metrics.availableCash,
    items,
    horizonDays: horizon,
    referenceDate: refDate,
    minimumReserve: effectiveReserve,
  });
}

/**
 * Resets local storage keys back to default baseline demo datasets.
 */
export function resetAllDataToDefaults(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY_RECORDS);
    window.localStorage.removeItem(STORAGE_KEY_RECEIVABLES);
    window.localStorage.removeItem(STORAGE_KEY_PAYABLES);
    window.localStorage.removeItem("coincise_disputes_v1");

    memoryRecords = null;
    memoryReceivables = null;
    memoryPayables = null;

    window.dispatchEvent(new CustomEvent(EVENT_RECORDS_CHANGED));
    window.dispatchEvent(new CustomEvent(EVENT_RECEIVABLES_CHANGED));
    window.dispatchEvent(new CustomEvent(EVENT_PAYABLES_CHANGED));
    window.dispatchEvent(new CustomEvent("coincise_disputes_changed"));
  } catch {
    // Ignore storage clear errors
  }
}
