import type { ExtractedTransactionItem, ReconciliationAction } from "./document-types.ts";
import type { FinancialRecord, Receivable, Payable } from "./types.ts";

export interface ReconciliationContext {
  records: FinancialRecord[];
  receivables: Receivable[];
  payables: Payable[];
}

/**
 * Normalizes text for fuzzy token matching.
 */
function cleanText(str?: string): string {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Checks if description contains internal account transfer signals.
 */
function isInternalTransfer(desc: string): boolean {
  const lower = desc.toLowerCase();
  const transferKeywords = [
    "self transfer",
    "contra",
    "sweep",
    "to own a/c",
    "from own a/c",
    "internal transfer",
    "inter account",
    "self-transfer",
    "funds transfer to account",
    "sweep trf",
  ];
  return transferKeywords.some((kw) => lower.includes(kw));
}

/**
 * Matches an extracted transaction item against existing COINCISE ledger, receivables, and payables.
 */
export function reconcileItem(
  item: ExtractedTransactionItem,
  context: ReconciliationContext
): ExtractedTransactionItem {
  const { records, receivables, payables } = context;
  const desc = item.description || "";
  const cleanedDesc = cleanText(desc);
  const ref = cleanText(item.reference);
  const invNum = cleanText(item.invoiceNumber);

  // 1. DUPLICATE CHECK against existing Financial Records
  const exactLedgerDup = records.find((rec) => {
    const recRef = cleanText(rec.reference);
    const sameRef = ref && recRef && ref === recRef;
    const sameAmount = Math.abs(rec.amount - item.amount) < 0.01;
    const sameDate = rec.date === item.date;
    const sameDesc = cleanText(rec.description) === cleanedDesc;

    if (sameRef && sameAmount) return true;
    if (sameDate && sameAmount && sameDesc) return true;
    return false;
  });

  if (exactLedgerDup) {
    return {
      ...item,
      reconciliation: {
        suggestedAction: "skip_duplicate",
        selectedAction: "skip_duplicate",
        matchedEntityId: exactLedgerDup.id,
        matchedEntityName: exactLedgerDup.description,
        matchedEntityType: "record",
        matchScore: 99,
        isDuplicate: true,
        duplicateReason: `Matches existing ledger record (${exactLedgerDup.reference || exactLedgerDup.date} - ₹${exactLedgerDup.amount.toLocaleString("en-IN")})`,
      },
    };
  }

  // 2. CHECK FOR INTERNAL ACCOUNT TRANSFER
  if (isInternalTransfer(desc)) {
    return {
      ...item,
      reconciliation: {
        suggestedAction: "internal_transfer",
        selectedAction: "internal_transfer",
        matchScore: 90,
        isDuplicate: false,
        notes: "Identified as internal transfer between company accounts (no P&L impact).",
      },
    };
  }

  // 3. INFLOW -> Match against Unpaid Customer Receivables
  if (item.type === "income") {
    // Check invoice number match or description match
    let bestMatch: Receivable | null = null;
    let highestScore = 0;

    for (const ar of receivables) {
      if (ar.status === "paid" || ar.balanceDue <= 0) continue;

      let score = 0;
      const arInvClean = cleanText(ar.invoiceNumber);
      const custClean = cleanText(ar.customerName);

      // Check if invoice number appears in ref, invNum, or description
      if (arInvClean && (ref.includes(arInvClean) || invNum.includes(arInvClean) || cleanedDesc.includes(arInvClean))) {
        score += 55;
      }

      // Check customer name appearance
      if (custClean && (cleanedDesc.includes(custClean) || cleanText(item.counterparty).includes(custClean))) {
        score += 25;
      }

      // Check amount match
      if (Math.abs(ar.balanceDue - item.amount) < 0.01) {
        score += 35; // exact balance settlement
      } else if (item.amount < ar.balanceDue) {
        score += 15; // partial payment candidate
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = ar;
      }
    }

    if (bestMatch && highestScore >= 50) {
      return {
        ...item,
        reconciliation: {
          suggestedAction: "reconcile_receivable",
          selectedAction: "reconcile_receivable",
          matchedEntityId: bestMatch.id,
          matchedEntityName: `${bestMatch.invoiceNumber} (${bestMatch.customerName})`,
          matchedEntityType: "receivable",
          matchScore: Math.min(100, highestScore),
          isDuplicate: false,
          notes: `Likely payment for customer invoice ${bestMatch.invoiceNumber}. Outstanding: ₹${bestMatch.balanceDue.toLocaleString("en-IN")}`,
        },
      };
    }
  }

  // 4. OUTFLOW -> Match against Unpaid Supplier Payables
  if (item.type === "expense") {
    let bestMatch: Payable | null = null;
    let highestScore = 0;

    for (const ap of payables) {
      if (ap.status === "paid" || ap.balanceDue <= 0) continue;

      let score = 0;
      const apInvClean = cleanText(ap.invoiceNumber);
      const vendorClean = cleanText(ap.vendorName);

      if (apInvClean && (ref.includes(apInvClean) || invNum.includes(apInvClean) || cleanedDesc.includes(apInvClean))) {
        score += 55;
      }

      if (vendorClean && (cleanedDesc.includes(vendorClean) || cleanText(item.counterparty).includes(vendorClean))) {
        score += 25;
      }

      if (Math.abs(ap.balanceDue - item.amount) < 0.01) {
        score += 35;
      } else if (item.amount < ap.balanceDue) {
        score += 15;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = ap;
      }
    }

    if (bestMatch && highestScore >= 50) {
      return {
        ...item,
        reconciliation: {
          suggestedAction: "reconcile_payable",
          selectedAction: "reconcile_payable",
          matchedEntityId: bestMatch.id,
          matchedEntityName: `${bestMatch.invoiceNumber} (${bestMatch.vendorName})`,
          matchedEntityType: "payable",
          matchScore: Math.min(100, highestScore),
          isDuplicate: false,
          notes: `Likely settlement for vendor bill ${bestMatch.invoiceNumber}. Outstanding: ₹${bestMatch.balanceDue.toLocaleString("en-IN")}`,
        },
      };
    }
  }

  // 5. If item came from an invoice/bill creation intent, keep that action
  if (item.reconciliation.suggestedAction === "create_receivable" || item.reconciliation.suggestedAction === "create_payable") {
    return item;
  }

  // 6. Default: Create regular financial record
  return {
    ...item,
    reconciliation: {
      suggestedAction: "create_record",
      selectedAction: "create_record",
      matchScore: 0,
      isDuplicate: false,
    },
  };
}

/**
 * Reconciles an entire array of extracted transaction items against the current system state.
 */
export function reconcileExtractedBatch(
  items: ExtractedTransactionItem[],
  context: ReconciliationContext
): ExtractedTransactionItem[] {
  return items.map((item) => reconcileItem(item, context));
}
