import type { ExtractedTransactionItem, DocumentType } from "../document-types.ts";
import { normalizeDate, parseCleanNumber } from "./csv-parser.ts";

/**
 * Heuristic parser for raw text extracted from invoices, receipts, and bank statements.
 */
export function extractTransactionsFromText(
  rawText: string,
  fileName = "document.pdf"
): {
  transactions: ExtractedTransactionItem[];
  documentType: DocumentType;
  metadata?: Record<string, unknown>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Check document type indicators
  const lowerText = rawText.toLowerCase();
  let docType: DocumentType = "unknown";

  const isInvoice = lowerText.includes("tax invoice") || lowerText.includes("invoice no") || lowerText.includes("bill to") || lowerText.includes("gstin");
  const isReceipt = lowerText.includes("receipt") || lowerText.includes("cash memo") || lowerText.includes("pos order");
  const isBank = lowerText.includes("account statement") || lowerText.includes("statement of account") || lowerText.includes("withdrawal") || lowerText.includes("deposit");

  if (isInvoice) docType = "invoice";
  else if (isReceipt) docType = "receipt";
  else if (isBank) docType = "bank_statement";
  else docType = "generic_ledger";

  // If it's an Invoice / Receipt, look for header level fields
  if (docType === "invoice" || docType === "receipt") {
    // 1. Invoice Number
    const invMatch = rawText.match(/\b(?:invoice\s*(?:no|num|number|#)|inv\s*(?:no|num|#)?)[:.\s]+([A-Za-z0-9\-_/]+)/i);
    const invoiceNumber = invMatch ? invMatch[1].trim() : undefined;

    // 2. Invoice Date
    const dateMatch = rawText.match(/(?:date|invoice\s*date|dated)[:.\s]*([0-9]{1,2}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4}|[0-9]{4}-[0-9]{1,2}-[0-9]{1,2})/i);
    const invoiceDate = dateMatch ? normalizeDate(dateMatch[1]) : new Date().toISOString().slice(0, 10);

    // 3. Due Date
    const dueDateMatch = rawText.match(/(?:due\s*date|payment\s*due)[:.\s]*([0-9]{1,2}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4}|[0-9]{4}-[0-9]{1,2}-[0-9]{1,2})/i);
    const dueDate = dueDateMatch ? normalizeDate(dueDateMatch[1]) : undefined;

    // 4. Total Amount
    const totalMatch = rawText.match(/(?:grand\s*total|total\s*amount|amount\s*payable|net\s*payable|total)[:.\s]*₹?\s*([0-9,]+\.?[0-9]*)/i);
    const totalAmount = totalMatch ? parseCleanNumber(totalMatch[1]) : 0;

    // 5. Tax / GST Amount
    const taxMatch = rawText.match(/(?:total\s*gst|cgst\s*\+\s*sgst|igst|tax\s*amount)[:.\s]*₹?\s*([0-9,]+\.?[0-9]*)/i);
    const taxAmount = taxMatch ? parseCleanNumber(taxMatch[1]) : undefined;

    // 6. Customer or Supplier Name
    let counterparty: string | undefined;
    const billToMatch = rawText.match(/(?:bill\s*to|billed\s*to|customer\s*name|client)[:.\s]*\n?([^\n\r,]+)/i);
    if (billToMatch && billToMatch[1].trim()) {
      counterparty = billToMatch[1].trim().slice(0, 80);
    }

    if (totalAmount > 0) {
      const isSalesInvoice = lowerText.includes("tax invoice") && !lowerText.includes("vendor") && !lowerText.includes("purchase invoice");

      return {
        transactions: [
          {
            id: `doc-${Date.now()}-1`,
            date: invoiceDate,
            description: `${isSalesInvoice ? "Invoice" : "Bill"} ${invoiceNumber || "Doc"} - ${counterparty || "Direct Counterparty"}`,
            amount: totalAmount,
            type: isSalesInvoice ? "income" : "expense",
            counterparty,
            invoiceNumber,
            dueDate,
            taxAmount,
            confidence: 0.88,
            warnings: [],
            extractionSource: "pdf_text",
            reconciliation: {
              suggestedAction: isSalesInvoice ? "create_receivable" : "create_payable",
              selectedAction: isSalesInvoice ? "create_receivable" : "create_payable",
              matchScore: 0,
              isDuplicate: false,
            },
          },
        ],
        documentType: isSalesInvoice ? "invoice" : "bill",
        metadata: {
          invoiceNumber,
          totalAmount,
          taxAmount,
          counterparty,
        },
        warnings,
      };
    }
  }

  // Otherwise, treat as lines of bank statement / transaction list
  const transactions: ExtractedTransactionItem[] = [];
  const lineRegex = /([0-9]{1,2}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4}|[0-9]{4}-[0-9]{1,2}-[0-9]{1,2})\s+([A-Za-z0-9\s/_\-.*#]+?)\s+(?:₹\s*)?([0-9,]+\.[0-9]{2})(?:\s+(?:₹\s*)?([0-9,]+\.[0-9]{2}))?/g;

  for (const line of lines) {
    const match = lineRegex.exec(line);
    if (match) {
      const rawDate = match[1];
      const desc = match[2].trim();
      const num1 = parseCleanNumber(match[3]);
      const num2 = match[4] ? parseCleanNumber(match[4]) : undefined;

      if (num1 > 0) {
        const isCr = line.toLowerCase().includes("cr") || desc.toLowerCase().includes("deposit");
        transactions.push({
          id: `pdf-row-${transactions.length + 1}-${Date.now()}`,
          date: normalizeDate(rawDate),
          description: desc.slice(0, 180),
          amount: num1,
          type: isCr ? "income" : "expense",
          runningBalance: num2,
          confidence: 0.75,
          warnings: [],
          extractionSource: "pdf_text",
          reconciliation: {
            suggestedAction: "create_record",
            selectedAction: "create_record",
            matchScore: 0,
            isDuplicate: false,
          },
        });
      }
    }
  }

  if (transactions.length === 0) {
    warnings.push("Could not reliably extract structured tabular rows using text heuristics.");
  }

  return { transactions, documentType: docType, warnings };
}

/**
 * Parse text-based PDF using pdf-parse.
 */
export async function parsePDF(buffer: Buffer, fileName = "document.pdf"): Promise<{
  text: string;
  transactions: ExtractedTransactionItem[];
  documentType: DocumentType;
  metadata?: Record<string, unknown>;
  warnings: string[];
}> {
  try {
    // Dynamic import to support various runtime environments
    const pdfParseModule = (await import("pdf-parse")) as unknown as
      | { default?: (buf: Buffer) => Promise<{ text: string }> }
      | ((buf: Buffer) => Promise<{ text: string }>);
    const pdfParse =
      typeof pdfParseModule === "function"
        ? pdfParseModule
        : pdfParseModule.default || (pdfParseModule as (buf: Buffer) => Promise<{ text: string }>);
    const data = await pdfParse(buffer);
    const rawText = data.text || "";

    const extraction = extractTransactionsFromText(rawText, fileName);

    return {
      text: rawText,
      transactions: extraction.transactions,
      documentType: extraction.documentType,
      metadata: extraction.metadata,
      warnings: extraction.warnings,
    };
  } catch (err) {
    return {
      text: "",
      transactions: [],
      documentType: "unknown",
      warnings: [err instanceof Error ? err.message : "PDF text extraction failed."],
    };
  }
}
