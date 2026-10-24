import type { DisputeCase, DisputeStatus, DisputeActivityLog } from "./types";
import { DEMO_DISPUTES } from "./demo-data.ts";
import { formatCurrency, formatDate } from "./utils.ts";

const STORAGE_KEY_DISPUTES = "coincise_disputes_v1";
const EVENT_DISPUTES_CHANGED = "coincise_disputes_changed";

let memoryDisputes: DisputeCase[] | null = null;

export const MSME_ODR_PORTAL_URL = "https://odr.msme.gov.in/";

/**
 * Generates an objective, neutral rule-based summary of the dispute facts,
 * claims, counterclaims, and settlement state without bias.
 */
export function generateNeutralRuleSummary(dispute: Partial<DisputeCase>): string {
  const parts: string[] = [];

  parts.push(
    `Dispute concerning Invoice #${dispute.invoiceNumber || "N/A"} with counterparty "${dispute.counterpartyName || "Counterparty"}" for a claim value of ${formatCurrency(dispute.disputeAmount || 0)}.`
  );

  const catMap: Record<string, string> = {
    delayed_payment: "unjustified payment delay beyond contractual credit period",
    defective_goods: "alleged dimensional tolerance non-conformance or material defect",
    deduction_unauthorized: "unilateral unauthorized debit note or penalty deduction",
    scope_dispute: "discrepancy between purchase order terms and final delivered deliverables",
  };
  parts.push(`Primary contention category: ${catMap[dispute.issueCategory || ""] || "commercial terms mismatch"}.`);

  if (dispute.buyerResponse?.trim()) {
    parts.push(`Buyer Position: "${dispute.buyerResponse.trim()}"`);
  } else {
    parts.push("Buyer formal response is currently awaiting submission.");
  }

  if (dispute.sellerResponse?.trim()) {
    parts.push(`Seller Position: "${dispute.sellerResponse.trim()}"`);
  } else {
    parts.push("Seller formal response is recorded on file.");
  }

  const evidenceCount = dispute.evidenceItems?.length || 0;
  parts.push(`${evidenceCount} documentary proof item(s) logged in the evidence vault.`);

  if (dispute.status === "settlement_proposed" && dispute.settlementOfferAmount) {
    parts.push(
      `Active settlement proposition: ${formatCurrency(dispute.settlementOfferAmount)} under review.`
    );
  } else if (dispute.status === "resolved") {
    parts.push("Parties have executed a mutually agreed settlement terms agreement.");
  } else if (dispute.status === "escalated_to_odr") {
    parts.push("Direct settlement concluded without resolution; escalated to official MSME ODR mediation.");
  }

  return parts.join(" ");
}

/**
 * Hydrates demo disputes with activity logs and rule summaries if missing
 */
function hydrateDisputes(cases: DisputeCase[]): DisputeCase[] {
  return cases.map((c) => {
    const logs: DisputeActivityLog[] = c.activityLogs || [
      {
        id: `log-init-${c.id}`,
        timestamp: c.lastUpdated ? `${c.lastUpdated}T10:00:00Z` : "2026-10-23T10:00:00Z",
        actor: "System",
        action: "Case Registered",
        details: `Dispute ${c.caseNumber} registered for Invoice #${c.invoiceNumber}.`,
      },
    ];

    const ruleSummary = c.ruleSummary || generateNeutralRuleSummary(c);

    return {
      ...c,
      activityLogs: logs,
      ruleSummary,
      buyerResponse: c.buyerResponse || "Buyer asserts goods did not match dimensional specifications on inspection.",
      sellerResponse: c.sellerResponse || "Seller provided QA batch test certificate and signed delivery proof challan.",
      settlementPaymentProgress: c.settlementPaymentProgress || {
        agreedAmount: c.settlementOfferAmount || c.disputeAmount,
        paidAmount: c.status === "resolved" ? c.settlementOfferAmount || c.disputeAmount : 0,
        paymentStatus: c.status === "resolved" ? "completed" : "pending",
        dueDate: c.originalDueDate,
      },
    };
  });
}

export function getDisputes(): DisputeCase[] {
  if (memoryDisputes) {
    return memoryDisputes;
  }

  if (typeof window === "undefined") {
    memoryDisputes = hydrateDisputes(DEMO_DISPUTES);
    return memoryDisputes;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DISPUTES);
    if (!raw) {
      const initial = hydrateDisputes(DEMO_DISPUTES);
      window.localStorage.setItem(STORAGE_KEY_DISPUTES, JSON.stringify(initial));
      memoryDisputes = initial;
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryDisputes = parsed;
      return parsed;
    }
    const fallback = hydrateDisputes(DEMO_DISPUTES);
    window.localStorage.setItem(STORAGE_KEY_DISPUTES, JSON.stringify(fallback));
    memoryDisputes = fallback;
    return fallback;
  } catch {
    return memoryDisputes || hydrateDisputes(DEMO_DISPUTES);
  }
}

function persistDisputes(cases: DisputeCase[]): boolean {
  memoryDisputes = cases;
  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(STORAGE_KEY_DISPUTES, JSON.stringify(cases));
    window.dispatchEvent(new CustomEvent(EVENT_DISPUTES_CHANGED, { detail: cases }));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent(EVENT_DISPUTES_CHANGED, { detail: cases }));
    return false;
  }
}

export interface CreateDisputeInput {
  counterpartyName: string;
  invoiceNumber: string;
  receivableId?: string;
  disputeAmount: number;
  originalDueDate: string;
  issueCategory: "delayed_payment" | "defective_goods" | "deduction_unauthorized" | "scope_dispute";
  sellerStatement: string;
  notes?: string;
}

export function createDispute(input: CreateDisputeInput): DisputeCase {
  const current = getDisputes();
  const caseId = `disp-${Date.now()}`;
  const caseNumber = `FR-2026-${String(current.length + 1).padStart(3, "0")}`;
  const nowISO = new Date().toISOString().split("T")[0];

  const newCase: DisputeCase = {
    id: caseId,
    caseNumber,
    counterpartyName: input.counterpartyName,
    invoiceNumber: input.invoiceNumber,
    receivableId: input.receivableId,
    disputeAmount: input.disputeAmount,
    originalDueDate: input.originalDueDate,
    issueCategory: input.issueCategory,
    status: "counterparty_notified",
    lastUpdated: nowISO,
    sellerResponse: input.sellerStatement,
    notes: input.notes || "Dispute initiated via FairResolve.",
    evidenceItems: [
      {
        id: `ev-${Date.now()}`,
        title: `Original Invoice #${input.invoiceNumber}`,
        type: "invoice",
        uploadedAt: nowISO,
      },
    ],
    activityLogs: [
      {
        id: `log-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: "Seller (You)",
        action: "Dispute Opened",
        details: `Created dispute ${caseNumber} for Invoice #${input.invoiceNumber} (Amount: ${formatCurrency(input.disputeAmount)}).`,
      },
      {
        id: `log-notice-${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        actor: "System",
        action: "Counterparty Notified",
        details: `Dispute notice and evidence packet dispatched to ${input.counterpartyName}.`,
      },
    ],
  };

  newCase.ruleSummary = generateNeutralRuleSummary(newCase);

  const updated = [newCase, ...current];
  persistDisputes(updated);
  return newCase;
}

export function addDisputeEvidence(
  disputeId: string,
  title: string,
  type: "invoice" | "delivery_proof" | "email_thread" | "contract"
): boolean {
  const current = getDisputes();
  const idx = current.findIndex((d) => d.id === disputeId);
  if (idx === -1) return false;

  const target = current[idx];
  const nowISO = new Date().toISOString().split("T")[0];

  const newEv = {
    id: `ev-${Date.now()}`,
    title,
    type,
    uploadedAt: nowISO,
  };

  const newLog: DisputeActivityLog = {
    id: `log-ev-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: "Seller (You)",
    action: "Evidence Document Logged",
    details: `Added documentary proof "${title}" (${type.replace("_", " ")}).`,
  };

  const updatedCase: DisputeCase = {
    ...target,
    evidenceItems: [...target.evidenceItems, newEv],
    activityLogs: [...(target.activityLogs || []), newLog],
    status: target.status === "draft" ? "evidence_submitted" : target.status,
    lastUpdated: nowISO,
  };

  updatedCase.ruleSummary = generateNeutralRuleSummary(updatedCase);
  current[idx] = updatedCase;
  return persistDisputes(current);
}

export function submitDisputeResponse(
  disputeId: string,
  party: "buyer" | "seller",
  statement: string
): boolean {
  const current = getDisputes();
  const idx = current.findIndex((d) => d.id === disputeId);
  if (idx === -1) return false;

  const target = current[idx];
  const nowISO = new Date().toISOString().split("T")[0];

  const newLog: DisputeActivityLog = {
    id: `log-resp-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: party === "buyer" ? `Buyer (${target.counterpartyName})` : "Seller (You)",
    action: "Formal Response Submitted",
    details: statement,
  };

  const updatedCase: DisputeCase = {
    ...target,
    buyerResponse: party === "buyer" ? statement : target.buyerResponse,
    sellerResponse: party === "seller" ? statement : target.sellerResponse,
    activityLogs: [...(target.activityLogs || []), newLog],
    lastUpdated: nowISO,
  };

  updatedCase.ruleSummary = generateNeutralRuleSummary(updatedCase);
  current[idx] = updatedCase;
  return persistDisputes(current);
}

export function proposeDisputeSettlement(
  disputeId: string,
  offerAmount: number,
  terms: string
): boolean {
  const current = getDisputes();
  const idx = current.findIndex((d) => d.id === disputeId);
  if (idx === -1) return false;

  const target = current[idx];
  const nowISO = new Date().toISOString().split("T")[0];

  const newLog: DisputeActivityLog = {
    id: `log-settle-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: "Seller (You)",
    action: "Settlement Offer Proposed",
    details: `Offered settlement of ${formatCurrency(offerAmount)}: "${terms}"`,
  };

  const updatedCase: DisputeCase = {
    ...target,
    settlementOfferAmount: offerAmount,
    settlementTerms: terms,
    status: "settlement_proposed",
    activityLogs: [...(target.activityLogs || []), newLog],
    lastUpdated: nowISO,
  };

  updatedCase.ruleSummary = generateNeutralRuleSummary(updatedCase);
  current[idx] = updatedCase;
  return persistDisputes(current);
}

export function acceptDisputeSettlement(disputeId: string): boolean {
  const current = getDisputes();
  const idx = current.findIndex((d) => d.id === disputeId);
  if (idx === -1) return false;

  const target = current[idx];
  const agreedAmount = target.settlementOfferAmount || target.disputeAmount;
  const nowISO = new Date().toISOString().split("T")[0];

  const newLog: DisputeActivityLog = {
    id: `log-accept-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: `Buyer (${target.counterpartyName})`,
    action: "Settlement Accepted",
    details: `Counterparty formally accepted agreed sum of ${formatCurrency(agreedAmount)}.`,
  };

  const updatedCase: DisputeCase = {
    ...target,
    status: "resolved",
    settlementPaymentProgress: {
      agreedAmount,
      paidAmount: 0,
      paymentStatus: "pending",
      dueDate: nowISO,
    },
    activityLogs: [...(target.activityLogs || []), newLog],
    lastUpdated: nowISO,
  };

  updatedCase.ruleSummary = generateNeutralRuleSummary(updatedCase);
  current[idx] = updatedCase;
  return persistDisputes(current);
}

export function rejectDisputeSettlement(disputeId: string, reason: string): boolean {
  const current = getDisputes();
  const idx = current.findIndex((d) => d.id === disputeId);
  if (idx === -1) return false;

  const target = current[idx];
  const nowISO = new Date().toISOString().split("T")[0];

  const newLog: DisputeActivityLog = {
    id: `log-reject-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: `Buyer (${target.counterpartyName})`,
    action: "Settlement Offer Declined",
    details: `Offer declined. Counter-reason: "${reason}"`,
  };

  const updatedCase: DisputeCase = {
    ...target,
    status: "evidence_submitted",
    activityLogs: [...(target.activityLogs || []), newLog],
    lastUpdated: nowISO,
  };

  updatedCase.ruleSummary = generateNeutralRuleSummary(updatedCase);
  current[idx] = updatedCase;
  return persistDisputes(current);
}

export function recordSettlementPayment(disputeId: string, paymentAmount: number): boolean {
  const current = getDisputes();
  const idx = current.findIndex((d) => d.id === disputeId);
  if (idx === -1) return false;

  const target = current[idx];
  const progress = target.settlementPaymentProgress || {
    agreedAmount: target.settlementOfferAmount || target.disputeAmount,
    paidAmount: 0,
    paymentStatus: "pending",
  };

  const newPaid = progress.paidAmount + paymentAmount;
  const isFullyPaid = newPaid >= progress.agreedAmount;
  const nowISO = new Date().toISOString().split("T")[0];

  const newLog: DisputeActivityLog = {
    id: `log-pay-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: `Buyer (${target.counterpartyName})`,
    action: "Settlement Payment Disbursed",
    details: `Payment of ${formatCurrency(paymentAmount)} received. (Total paid: ${formatCurrency(newPaid)} / ${formatCurrency(progress.agreedAmount)})`,
  };

  const updatedCase: DisputeCase = {
    ...target,
    settlementPaymentProgress: {
      ...progress,
      paidAmount: newPaid,
      paymentStatus: isFullyPaid ? "completed" : "partially_paid",
      lastPaymentDate: nowISO,
    },
    activityLogs: [...(target.activityLogs || []), newLog],
    lastUpdated: nowISO,
  };

  current[idx] = updatedCase;
  return persistDisputes(current);
}

export function escalateDisputeToODR(disputeId: string): boolean {
  const current = getDisputes();
  const idx = current.findIndex((d) => d.id === disputeId);
  if (idx === -1) return false;

  const target = current[idx];
  const nowISO = new Date().toISOString().split("T")[0];

  const newLog: DisputeActivityLog = {
    id: `log-odr-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: "Seller (You)",
    action: "Escalated to MSME ODR Portal",
    details: `Direct negotiations deadlocked. Case filed on official MSME Online Dispute Resolution portal (https://odr.msme.gov.in/).`,
  };

  const updatedCase: DisputeCase = {
    ...target,
    status: "escalated_to_odr",
    activityLogs: [...(target.activityLogs || []), newLog],
    lastUpdated: nowISO,
  };

  updatedCase.ruleSummary = generateNeutralRuleSummary(updatedCase);
  current[idx] = updatedCase;
  return persistDisputes(current);
}

export function subscribeToDisputes(callback: (disputes: DisputeCase[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<DisputeCase[]>;
    callback(customEvent.detail || getDisputes());
  };

  window.addEventListener(EVENT_DISPUTES_CHANGED, handleCustomEvent);
  return () => window.removeEventListener(EVENT_DISPUTES_CHANGED, handleCustomEvent);
}
