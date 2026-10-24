export type TransactionType = 'income' | 'expense';

export type PaymentStatus = 'expected' | 'partially_paid' | 'completed';

export type RecordStatus = 'cleared' | 'pending' | 'reconciled';

export interface FinancialRecord {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  description: string;
  paymentMethod: string;
  status?: RecordStatus;
  reference?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type InvoiceStatus = 'paid' | 'pending' | 'partially_paid' | 'overdue';

export interface Receivable {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  daysOverdue: number;
  contactEmail?: string;
  notes?: string;
}

export interface Payable {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  category: string;
  contactEmail?: string;
  notes?: string;
}

export interface ForecastPoint {
  date: string;
  dayOffset: number;
  openingCash: number;
  projectedInflow: number;
  projectedOutflow: number;
  netCashFlow: number;
  closingCash: number;
  minimumReserve: number;
  status: 'safe' | 'warning' | 'shortage';
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  date: string;
  triggerType: 'cash_shortage' | 'overdue_invoice' | 'reserve_breach' | 'large_payable' | 'dispute_escalation';
  suggestedAction: string;
  actionLink?: string;
  isRead: boolean;
}

export interface ScenarioItem {
  id: string;
  name: string;
  description: string;
  category: 'delayed_receipts' | 'drop_in_sales' | 'emergency_expense' | 'supplier_advance';
  cashImpact: number;
  effectiveDay: number;
  isActive: boolean;
}

export interface DecisionOption {
  id: string;
  title: string;
  category: 'financing' | 'negotiation' | 'cost_cutting' | 'discounting';
  description: string;
  projectedCashImprovement: number;
  timeToImplement: string;
  riskLevel: 'low' | 'medium' | 'high';
  pros: string[];
  cons: string[];
  recommended: boolean;
}

export type DisputeStatus =
  | 'draft'
  | 'counterparty_notified'
  | 'evidence_submitted'
  | 'settlement_proposed'
  | 'resolved'
  | 'escalated_to_odr';

export interface DisputeCase {
  id: string;
  caseNumber: string;
  counterpartyName: string;
  disputeAmount: number;
  invoiceNumber: string;
  originalDueDate: string;
  issueCategory: 'delayed_payment' | 'defective_goods' | 'deduction_unauthorized' | 'scope_dispute';
  status: DisputeStatus;
  lastUpdated: string;
  settlementOfferAmount?: number;
  settlementTerms?: string;
  evidenceItems: {
    id: string;
    title: string;
    type: 'invoice' | 'delivery_proof' | 'email_thread' | 'contract';
    uploadedAt: string;
  }[];
  notes: string;
}

export interface BusinessSummary {
  businessName: string;
  currency: string;
  availableCash: number;
  minimumReserve: number;
  expectedReceipts30d: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  upcomingExpenses30d: number;
  projectedCash30d: number;
  overdueReceivablesCount: number;
  overduePayablesCount: number;
  activeAlertsCount: number;
}
