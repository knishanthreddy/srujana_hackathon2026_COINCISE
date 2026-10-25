import {
  ExtractedTransactionItem,
  ImportBatchSummary,
} from "./document-types";
import {
  addFinancialRecord,
  addReceivable,
  addPayable,
  recordReceivablePayment,
  recordPayablePayment,
  getFinancialRecords,
  getReceivables,
  getPayables,
} from "./data-service";
import { reconcileExtractedBatch } from "./reconciliation-engine";

const STORAGE_KEY_IMPORT_HISTORY = "coincise_import_history_v1";
const EVENT_IMPORT_HISTORY_CHANGED = "coincise_import_history_changed";

let memoryImportHistory: ImportBatchSummary[] | null = null;

export function getImportHistory(): ImportBatchSummary[] {
  if (typeof window === "undefined") {
    return memoryImportHistory || [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_IMPORT_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryImportHistory = parsed;
      return parsed;
    }
    return [];
  } catch {
    return memoryImportHistory || [];
  }
}

export function saveImportBatch(batch: ImportBatchSummary): void {
  const current = getImportHistory();
  const updated = [batch, ...current];
  memoryImportHistory = updated;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY_IMPORT_HISTORY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_IMPORT_HISTORY_CHANGED, { detail: updated }));
    } catch {
      // quota or storage error handled gracefully
    }
  }
}

export function subscribeToImportHistory(callback: (history: ImportBatchSummary[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<ImportBatchSummary[]>;
    callback(customEvent.detail || getImportHistory());
  };

  window.addEventListener(EVENT_IMPORT_HISTORY_CHANGED, handleCustomEvent);
  return () => window.removeEventListener(EVENT_IMPORT_HISTORY_CHANGED, handleCustomEvent);
}

/**
 * Commits reviewed items into actual COINCISE modules without duplicate entries or double-counting.
 */
export function commitReviewedImport(
  fileName: string,
  fileSize: number,
  items: ExtractedTransactionItem[]
): {
  success: boolean;
  batch: ImportBatchSummary;
  recordsCreated: number;
  receivablesReconciled: number;
  payablesReconciled: number;
  invoicesCreated: number;
  errors: string[];
} {
  const batchId = `imp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const createdRecordIds: string[] = [];
  const reconciledReceivableIds: string[] = [];
  const reconciledPayableIds: string[] = [];
  const errors: string[] = [];

  let recordsCreated = 0;
  let receivablesReconciled = 0;
  let payablesReconciled = 0;
  let invoicesCreated = 0;

  for (const item of items) {
    const action = item.reconciliation.selectedAction;

    try {
      switch (action) {
        case "skip_duplicate":
          // Skip safely as requested
          break;

        case "create_record": {
          const res = addFinancialRecord({
            date: item.date,
            type: item.type,
            category: item.category || (item.type === "income" ? "Sales & Revenue" : "Operating Expense"),
            amount: item.amount,
            paidAmount: item.amount,
            paymentStatus: "completed",
            description: item.description,
            paymentMethod: item.paymentMethod || "Bank Transfer (NEFT)",
            reference: item.reference || `IMP-${Date.now().toString().slice(-6)}`,
            notes: `Imported via Document Centre from ${fileName}`,
          });

          if (res.success && res.record) {
            createdRecordIds.push(res.record.id);
            recordsCreated++;
          } else {
            errors.push(`Row "${item.description}": ${JSON.stringify(res.errors)}`);
          }
          break;
        }

        case "internal_transfer": {
          const res = addFinancialRecord({
            date: item.date,
            type: "expense",
            category: "Internal Bank Transfer",
            amount: item.amount,
            paidAmount: item.amount,
            paymentStatus: "completed",
            description: `[Transfer] ${item.description}`,
            paymentMethod: "Bank Transfer (Internal)",
            reference: item.reference || `TRF-${Date.now().toString().slice(-6)}`,
            notes: `Internal company transfer between accounts (no P&L impact). Source: ${fileName}`,
          });

          if (res.success && res.record) {
            createdRecordIds.push(res.record.id);
            recordsCreated++;
          }
          break;
        }

        case "reconcile_receivable": {
          if (item.reconciliation.matchedEntityId) {
            const payRes = recordReceivablePayment(item.reconciliation.matchedEntityId, {
              paymentDate: item.date,
              paymentAmount: item.amount,
              paymentMethod: "Bank Transfer (NEFT)",
              reference: item.reference || `REC-IMP-${Date.now().toString().slice(-6)}`,
              notes: `Auto-reconciled from imported statement: ${fileName}`,
              syncToCashLedger: true,
            });

            if (payRes.success && payRes.receivable) {
              reconciledReceivableIds.push(payRes.receivable.id);
              receivablesReconciled++;
            } else {
              errors.push(`Reconciling invoice: ${payRes.error}`);
            }
          }
          break;
        }

        case "reconcile_payable": {
          if (item.reconciliation.matchedEntityId) {
            const billRes = recordPayablePayment(item.reconciliation.matchedEntityId, {
              paymentDate: item.date,
              paymentAmount: item.amount,
              paymentMethod: "Bank Transfer (NEFT)",
              reference: item.reference || `BILL-IMP-${Date.now().toString().slice(-6)}`,
              notes: `Auto-reconciled from imported statement: ${fileName}`,
              syncToCashLedger: true,
            });

            if (billRes.success && billRes.payable) {
              reconciledPayableIds.push(billRes.payable.id);
              payablesReconciled++;
            } else {
              errors.push(`Reconciling payable: ${billRes.error}`);
            }
          }
          break;
        }

        case "create_receivable": {
          const invNum = item.invoiceNumber || `INV-${Date.now().toString().slice(-5)}`;
          const custName = item.counterparty || "Direct Client";
          const res = addReceivable({
            invoiceNumber: invNum,
            customerName: custName,
            totalAmount: item.amount,
            paidAmount: 0,
            issueDate: item.date,
            dueDate: item.dueDate || item.date,
            notes: `Extracted from ${fileName}`,
          });

          if (res.success && res.receivable) {
            reconciledReceivableIds.push(res.receivable.id);
            invoicesCreated++;
          } else {
            errors.push(`Invoice creation error: ${JSON.stringify(res.errors)}`);
          }
          break;
        }

        case "create_payable": {
          const billNum = item.invoiceNumber || `BILL-${Date.now().toString().slice(-5)}`;
          const vendorName = item.counterparty || "Vendor";
          const res = addPayable({
            invoiceNumber: billNum,
            vendorName,
            totalAmount: item.amount,
            paidAmount: 0,
            issueDate: item.date,
            dueDate: item.dueDate || item.date,
            category: item.category || "Raw Materials & Supplies",
            notes: `Extracted from ${fileName}`,
          });

          if (res.success && res.payable) {
            reconciledPayableIds.push(res.payable.id);
            invoicesCreated++;
          } else {
            errors.push(`Bill creation error: ${JSON.stringify(res.errors)}`);
          }
          break;
        }
      }
    } catch (itemErr) {
      errors.push(`Failed to process row "${item.description}": ${itemErr instanceof Error ? itemErr.message : "Error"}`);
    }
  }

  const totalImported = recordsCreated + receivablesReconciled + payablesReconciled + invoicesCreated;
  const batchSummary: ImportBatchSummary = {
    id: batchId,
    fileName,
    fileSize,
    documentType: "bank_statement",
    uploadedAt: new Date().toISOString(),
    recordsExtracted: items.length,
    recordsImported: totalImported,
    status: totalImported > 0 ? (errors.length > 0 ? "partial" : "completed") : "failed",
    extractionEngine: items[0]?.extractionSource || "deterministic",
    createdRecordIds,
    reconciledReceivableIds,
    reconciledPayableIds,
    warnings: errors,
  };

  saveImportBatch(batchSummary);

  return {
    success: totalImported > 0,
    batch: batchSummary,
    recordsCreated,
    receivablesReconciled,
    payablesReconciled,
    invoicesCreated,
    errors,
  };
}

/**
 * Helper to reconcile against live in-memory/storage data.
 */
export function reconcileWithCurrentData(items: ExtractedTransactionItem[]): ExtractedTransactionItem[] {
  const records = getFinancialRecords();
  const receivables = getReceivables();
  const payables = getPayables();

  return reconcileExtractedBatch(items, { records, receivables, payables });
}
