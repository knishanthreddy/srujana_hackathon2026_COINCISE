import { FinancialRecord, TransactionType, PaymentStatus } from "./types";
import { DEMO_RECORDS } from "./demo-data";
import { financialRecordSchema, FinancialRecordFormData } from "./validations/record";

const STORAGE_KEY = "coincise_financial_records_v1";
const CHANGE_EVENT_NAME = "coincise_records_changed";

// In-memory fallback in case localStorage is disabled or fails
let memoryCache: FinancialRecord[] | null = null;
let storageError: string | null = null;

export function getStorageError(): string | null {
  return storageError;
}

/**
 * Retrieve all financial records.
 * Falls back to in-memory store if localStorage is blocked or unavailable.
 */
export function getFinancialRecords(): FinancialRecord[] {
  if (typeof window === "undefined") {
    return DEMO_RECORDS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with initial demo records
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_RECORDS));
      memoryCache = [...DEMO_RECORDS];
      storageError = null;
      return memoryCache;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryCache = parsed;
      storageError = null;
      return parsed;
    }

    // Corrupted or empty array - fallback to demo
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_RECORDS));
    memoryCache = [...DEMO_RECORDS];
    return memoryCache;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "LocalStorage access restricted";
    if (!memoryCache) {
      memoryCache = [...DEMO_RECORDS];
    }
    return memoryCache;
  }
}

/**
 * Save records list to storage and notify all subscribers.
 */
function persistRecords(records: FinancialRecord[]): boolean {
  memoryCache = records;

  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    storageError = null;
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT_NAME, { detail: records })
    );
    return true;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Failed to persist to localStorage";
    // Still dispatch event with memory cache so UI updates
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT_NAME, { detail: records })
    );
    return false;
  }
}

/**
 * Add a new record with Zod validation.
 */
export function addFinancialRecord(
  data: FinancialRecordFormData
): { success: boolean; record?: FinancialRecord; errors?: Record<string, string> } {
  const validation = financialRecordSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      errors[field] = err.message;
    });
    return { success: false, errors };
  }

  const validData = validation.data;
  const current = getFinancialRecords();

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

/**
 * Update an existing record with Zod validation.
 */
export function updateFinancialRecord(
  id: string,
  data: FinancialRecordFormData
): { success: boolean; record?: FinancialRecord; errors?: Record<string, string> } {
  const validation = financialRecordSchema.safeParse(data);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      errors[field] = err.message;
    });
    return { success: false, errors };
  }

  const current = getFinancialRecords();
  const index = current.findIndex((r) => r.id === id);
  if (index === -1) {
    return {
      success: false,
      errors: { general: "Record not found" },
    };
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

/**
 * Delete a financial record by ID.
 */
export function deleteFinancialRecord(id: string): boolean {
  const current = getFinancialRecords();
  const filtered = current.filter((r) => r.id !== id);
  if (filtered.length === current.length) return false;
  return persistRecords(filtered);
}

/**
 * Reset back to initial baseline demo data.
 */
export function resetFinancialRecords(): FinancialRecord[] {
  persistRecords([...DEMO_RECORDS]);
  return [...DEMO_RECORDS];
}

/**
 * Calculate accurate financial totals adhering strictly to the principle:
 * - Realized / Cleared Inflow is ONLY what has actually been paid/received (paidAmount).
 * - Expected Inflow is (amount - paidAmount) for expected/partial records, NEVER treated as cash.
 */
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

  const netClearedCash = clearedInflows - clearedOutflows;

  return {
    clearedInflows,
    clearedOutflows,
    netClearedCash,
    expectedInflows,
    expectedOutflows,
    totalRecords: records.length,
    completedCount: records.filter((r) => r.paymentStatus === "completed").length,
    partiallyPaidCount: records.filter((r) => r.paymentStatus === "partially_paid").length,
    expectedCount: records.filter((r) => r.paymentStatus === "expected").length,
  };
}

/**
 * Subscribe to record updates across components and tabs.
 */
export function subscribeToFinancialRecords(
  callback: (records: FinancialRecord[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<FinancialRecord[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getFinancialRecords());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {
        callback(getFinancialRecords());
      }
    }
  };

  window.addEventListener(CHANGE_EVENT_NAME, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(CHANGE_EVENT_NAME, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
