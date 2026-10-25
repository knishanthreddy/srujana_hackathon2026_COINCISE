import type { ExtractedTransactionItem, DocumentType } from "../document-types.ts";

/**
 * Standardize dates from various common Indian and international formats into YYYY-MM-DD.
 */
export function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const clean = raw.trim();

  // 1. ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const parts = clean.split("-");
    const y = parts[0];
    const m = parts[1].padStart(2, "0");
    const d = parts[2].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (slashMatch) {
    const d = slashMatch[1].padStart(2, "0");
    const m = slashMatch[2].padStart(2, "0");
    let y = slashMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`;
    }
    return `${y}-${m}-${d}`;
  }

  // 3. DD-MMM-YYYY (e.g., 14-Oct-2026 or 14-OCT-26)
  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };
  const namedMatch = clean.match(/^(\d{1,2})[/\-\s]([A-Za-z]{3})[/\-\s](\d{2,4})$/);
  if (namedMatch) {
    const d = namedMatch[1].padStart(2, "0");
    const mon = monthNames[namedMatch[2].toLowerCase()];
    let y = namedMatch[3];
    if (y.length === 2) {
      y = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`;
    }
    if (mon) return `${y}-${mon}-${d}`;
  }

  // Fallback parse attempt
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Clean numeric string removing currency symbols, spaces, Indian lakh/crore commas.
 */
export function parseCleanNumber(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : Math.abs(val);
  if (!val) return 0;
  const str = String(val).replace(/[₹$,\s]/g, "").trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Split CSV line respecting double quotes.
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV text into extracted transaction records.
 */
export function parseCSV(content: string, fileName = "statement.csv"): {
  transactions: ExtractedTransactionItem[];
  documentType: DocumentType;
  warnings: string[];
} {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const warnings: string[] = [];
  if (lines.length < 2) {
    return { transactions: [], documentType: "unknown", warnings: ["File contains insufficient rows."] };
  }

  // Detect delimiter
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  let delimiter = ",";
  if (tabCount > commaCount && tabCount > semiCount) delimiter = "\t";
  else if (semiCount > commaCount && semiCount > tabCount) delimiter = ";";

  // Locate header row (skip preamble if metadata rows exist)
  let headerRowIdx = 0;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = parseCSVLine(lines[i], delimiter).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const hasDate = cols.some((c) => c.includes("date"));
    const hasAmount = cols.some((c) => c.includes("amount") || c.includes("debit") || c.includes("credit") || c.includes("deposit") || c.includes("withdrawal"));
    if (hasDate && hasAmount) {
      headerRowIdx = i;
      headers = parseCSVLine(lines[i], delimiter).map((h) => h.toLowerCase().trim());
      break;
    }
  }

  if (headers.length === 0) {
    headers = parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());
  }

  // Column index finders
  const findCol = (terms: string[]) =>
    headers.findIndex((h) => terms.some((t) => h.includes(t)));

  const dateIdx = findCol(["date", "txn date", "txndate", "value date", "trans date"]);
  const descIdx = findCol(["narration", "description", "particulars", "details", "remark", "notes", "memo"]);
  const refIdx = findCol(["reference", "ref no", "refno", "cheque", "chq", "utr", "txn id", "transaction id"]);

  const debitIdx = headers.findIndex((h) => {
    const clean = h.replace(/[^a-z0-9]/g, "");
    return (
      clean === "debit" ||
      clean === "dr" ||
      clean === "withdrawal" ||
      clean === "withdrawals" ||
      h.includes("debit") ||
      h.includes("withdrawal")
    ) && !h.includes("cr") && !h.includes("/");
  });

  const creditIdx = headers.findIndex((h) => {
    const clean = h.replace(/[^a-z0-9]/g, "");
    return (
      clean === "credit" ||
      clean === "cr" ||
      clean === "deposit" ||
      clean === "deposits" ||
      h.includes("credit") ||
      h.includes("deposit")
    ) && !h.includes("dr") && !h.includes("/");
  });

  const amountIdx = headers.findIndex((h) => {
    const clean = h.replace(/[^a-z0-9]/g, "");
    return clean === "amount" || clean === "netamount" || clean === "total" || h.includes("amount");
  });

  const typeIdx = headers.findIndex((h) => {
    const clean = h.replace(/[^a-z0-9]/g, "");
    return (
      clean === "type" ||
      clean === "drcr" ||
      clean === "direction" ||
      h.includes("dr/cr") ||
      h.includes("cr/dr")
    );
  });

  const balanceIdx = findCol(["balance", "running balance", "closing balance"]);
  const invoiceNumIdx = findCol(["invoice", "inv no", "bill no", "voucher"]);

  const transactions: ExtractedTransactionItem[] = [];

  for (let r = headerRowIdx + 1; r < lines.length; r++) {
    const row = parseCSVLine(lines[r], delimiter);
    if (row.length < 2) continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : "";
    const cleanDate = normalizeDate(rawDate);
    const desc = descIdx >= 0 ? row[descIdx] : row[1] || "Imported transaction";
    const ref = refIdx >= 0 ? row[refIdx] : "";
    const invNum = invoiceNumIdx >= 0 ? row[invoiceNumIdx] : undefined;

    let amount = 0;
    let type: "income" | "expense" = "expense";

    if (debitIdx >= 0 && creditIdx >= 0) {
      const debitVal = parseCleanNumber(row[debitIdx]);
      const creditVal = parseCleanNumber(row[creditIdx]);

      if (creditVal > 0) {
        amount = creditVal;
        type = "income";
      } else if (debitVal > 0) {
        amount = debitVal;
        type = "expense";
      }
    } else if (amountIdx >= 0) {
      amount = parseCleanNumber(row[amountIdx]);
      if (typeIdx >= 0) {
        const rawType = row[typeIdx].toLowerCase();
        if (rawType.includes("cr") || rawType.includes("credit") || rawType.includes("deposit") || rawType.includes("in")) {
          type = "income";
        } else {
          type = "expense";
        }
      } else {
        // Look at sign if negative
        if (row[amountIdx].includes("-")) {
          type = "expense";
        } else {
          // Check description for common inflow clues
          const lowerDesc = desc.toLowerCase();
          if (lowerDesc.includes("received") || lowerDesc.includes("credit") || lowerDesc.includes("deposit") || lowerDesc.includes("refund")) {
            type = "income";
          } else {
            type = "expense";
          }
        }
      }
    }

    if (amount <= 0) continue;

    const runningBal = balanceIdx >= 0 ? parseCleanNumber(row[balanceIdx]) : undefined;

    transactions.push({
      id: `row-${r}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: cleanDate,
      description: desc.slice(0, 180),
      amount,
      type,
      reference: ref || undefined,
      invoiceNumber: invNum || undefined,
      runningBalance: runningBal,
      confidence: 0.95,
      warnings: [],
      extractionSource: "deterministic",
      reconciliation: {
        suggestedAction: "create_record",
        selectedAction: "create_record",
        matchScore: 0,
        isDuplicate: false,
      },
    });
  }

  // Determine document type
  let docType: DocumentType = "bank_statement";
  if (invoiceNumIdx >= 0 || fileName.toLowerCase().includes("invoice")) {
    docType = "invoice";
  } else if (fileName.toLowerCase().includes("bill") || fileName.toLowerCase().includes("payable")) {
    docType = "bill";
  }

  return { transactions, documentType: docType, warnings };
}
