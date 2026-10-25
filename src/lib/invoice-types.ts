export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type InvoiceSource = "generated" | "imported" | "manual";

export interface InvoiceItem {
  id: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unit: string; // e.g. 'pcs', 'hrs', 'units', 'kg', 'box'
  unitPrice: number;
  discountPercent: number; // 0 to 100
  taxRate: number; // GST rate: 0, 5, 12, 18, 28
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface InvoicePartyDetails {
  name: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  state: string; // 2-letter state code or name for GST inter-state determination
  postalCode: string;
}

export interface InvoiceBankDetails {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountName: string;
  upiId?: string;
  branch?: string;
}

export interface InvoiceHistoryEvent {
  id: string;
  timestamp: string;
  action: "created" | "issued" | "payment_recorded" | "edited" | "cancelled";
  actor: string;
  notes?: string;
}

export interface FullInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  source: InvoiceSource;
  
  // Parties
  seller: InvoicePartyDetails;
  customer: InvoicePartyDetails;
  
  // Line Items
  items: InvoiceItem[];
  
  // Financial Summary
  subtotal: number;
  totalDiscount: number;
  taxableSubtotal: number;
  isInterState: boolean; // true = IGST, false = CGST + SGST
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  
  // Terms & Payment Details
  paymentTerms: string; // e.g., 'Net 30', 'Net 15', 'Due on Receipt'
  bankDetails: InvoiceBankDetails;
  notes?: string;
  termsConditions?: string;
  
  // Audit & Linked IDs
  receivableId?: string; // Links to Customer Receivables
  sourceDocumentName?: string; // If imported
  history: InvoiceHistoryEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFormData {
  invoiceNumber?: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  customer: {
    name: string;
    tradeName?: string;
    gstin?: string;
    email?: string;
    phone?: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: Array<{
    description: string;
    hsnSac?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
  }>;
  bankDetails?: Partial<InvoiceBankDetails>;
  notes?: string;
  termsConditions?: string;
  status?: "draft" | "issued";
}
