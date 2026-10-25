export type DocumentType =
  | "bank_statement"
  | "invoice"
  | "bill"
  | "receipt"
  | "generic_ledger"
  | "unknown";

export type ReconciliationAction =
  | "create_record"
  | "reconcile_receivable"
  | "reconcile_payable"
  | "create_receivable"
  | "create_payable"
  | "internal_transfer"
  | "skip_duplicate";

export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0.0 to 1.0
  source?: "deterministic" | "pdf_text" | "ai_vision" | "ai_text" | "heuristic" | "user_override";
}

export interface ExtractedTransactionItem {
  id: string; // client temporary id
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "income" | "expense";
  counterparty?: string;
  reference?: string;
  invoiceNumber?: string;
  dueDate?: string;
  category?: string;
  paymentMethod?: string;
  taxAmount?: number;
  runningBalance?: number;
  confidence: number; // average confidence 0-1
  warnings: string[];
  extractionSource: "deterministic" | "pdf_text" | "ai_vision" | "ai_text" | "heuristic";

  // Reconciliation state
  reconciliation: {
    suggestedAction: ReconciliationAction;
    selectedAction: ReconciliationAction;
    matchedEntityId?: string;
    matchedEntityName?: string;
    matchedEntityType?: "receivable" | "payable" | "record";
    matchScore: number; // 0 to 100
    isDuplicate: boolean;
    duplicateReason?: string;
    notes?: string;
  };
}

export interface DocumentParseResult {
  success: boolean;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  itemCount: number;
  transactions: ExtractedTransactionItem[];
  metadata?: {
    accountNumberMasked?: string;
    statementPeriod?: { from?: string; to?: string };
    currency?: string;
    openingBalance?: number;
    closingBalance?: number;
    merchantName?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    taxAmount?: number;
    subtotal?: number;
  };
  errors?: string[];
  warnings?: string[];
  extractionEngine: "csv_native" | "excel_native" | "ofx_qif_native" | "pdf_text" | "gemini_multimodal" | "fallback_heuristic";
}

export interface ImportBatchSummary {
  id: string;
  fileName: string;
  fileSize: number;
  documentType: DocumentType;
  uploadedAt: string;
  recordsExtracted: number;
  recordsImported: number;
  status: "completed" | "partial" | "pending_review" | "failed";
  extractionEngine: string;
  createdRecordIds: string[];
  reconciledReceivableIds: string[];
  reconciledPayableIds: string[];
  warnings: string[];
}
