import type { ExtractedTransactionItem, DocumentType } from "../document-types.ts";
import { normalizeDate, parseCleanNumber } from "./csv-parser.ts";

/**
 * Parse QIF (Quicken Interchange Format) text.
 */
export function parseQIF(content: string): {
  transactions: ExtractedTransactionItem[];
  documentType: DocumentType;
  warnings: string[];
} {
  const lines = content.split(/\r?\n/);
  const transactions: ExtractedTransactionItem[] = [];
  const warnings: string[] = [];

  let currentDate = "";
  let currentAmount = 0;
  let currentType: "income" | "expense" = "expense";
  let currentDesc = "";
  let currentRef = "";
  let currentMemo = "";

  const resetCurrent = () => {
    currentDate = "";
    currentAmount = 0;
    currentType = "expense";
    currentDesc = "";
    currentRef = "";
    currentMemo = "";
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("!")) {
      // Header line like !Type:Bank
      continue;
    }

    if (line.startsWith("^")) {
      // End of record
      if (currentAmount > 0) {
        transactions.push({
          id: `qif-${transactions.length + 1}-${Date.now()}`,
          date: normalizeDate(currentDate),
          description: (currentDesc || currentMemo || "QIF Transaction").slice(0, 180),
          amount: currentAmount,
          type: currentType,
          reference: currentRef || undefined,
          confidence: 0.98,
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
      resetCurrent();
      continue;
    }

    const code = line[0];
    const val = line.slice(1).trim();

    switch (code) {
      case "D":
        currentDate = val;
        break;
      case "T": {
        const num = parseFloat(val.replace(/,/g, ""));
        if (!isNaN(num)) {
          currentAmount = Math.abs(num);
          currentType = num >= 0 ? "income" : "expense";
        }
        break;
      }
      case "P":
        currentDesc = val;
        break;
      case "M":
        currentMemo = val;
        break;
      case "N":
        currentRef = val;
        break;
    }
  }

  // Trailing record if no trailing ^
  if (currentAmount > 0) {
    transactions.push({
      id: `qif-${transactions.length + 1}-${Date.now()}`,
      date: normalizeDate(currentDate),
      description: (currentDesc || currentMemo || "QIF Transaction").slice(0, 180),
      amount: currentAmount,
      type: currentType,
      reference: currentRef || undefined,
      confidence: 0.98,
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

  return { transactions, documentType: "bank_statement", warnings };
}

/**
 * Parse OFX / QFX (Open Financial Exchange XML/SGML) text.
 */
export function parseOFX(content: string): {
  transactions: ExtractedTransactionItem[];
  documentType: DocumentType;
  warnings: string[];
} {
  const transactions: ExtractedTransactionItem[] = [];
  const warnings: string[] = [];

  // Find all <STMTTRN>...</STMTTRN> or unclosed <STMTTRN> blocks
  const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
  let match;

  const extractTag = (block: string, tag: string): string => {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
    const res = block.match(regex);
    return res ? res[1].trim() : "";
  };

  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1];
    if (!block.trim()) continue;

    const trnType = extractTag(block, "TRNTYPE").toUpperCase();
    const dtPostedRaw = extractTag(block, "DTPOSTED");
    const trnAmtRaw = extractTag(block, "TRNAMT");
    const fitId = extractTag(block, "FITID");
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");

    // Format DTPOSTED: YYYYMMDD[HHMMSS]
    let dateStr = "";
    if (dtPostedRaw.length >= 8) {
      const y = dtPostedRaw.substring(0, 4);
      const m = dtPostedRaw.substring(4, 6);
      const d = dtPostedRaw.substring(6, 8);
      dateStr = `${y}-${m}-${d}`;
    } else {
      dateStr = normalizeDate(dtPostedRaw);
    }

    const amtNum = parseFloat(trnAmtRaw.replace(/,/g, ""));
    if (isNaN(amtNum) || amtNum === 0) continue;

    const amount = Math.abs(amtNum);
    let type: "income" | "expense" = amtNum > 0 ? "income" : "expense";
    if (trnType === "CREDIT" || trnType === "DEP") type = "income";
    if (trnType === "DEBIT" || trnType === "CHECK" || trnType === "PAYMENT") type = "expense";

    const desc = (name || memo || "OFX Transaction").slice(0, 180);

    transactions.push({
      id: `ofx-${transactions.length + 1}-${Date.now()}`,
      date: dateStr,
      description: desc,
      amount,
      type,
      reference: fitId || undefined,
      confidence: 0.98,
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

  return { transactions, documentType: "bank_statement", warnings };
}
