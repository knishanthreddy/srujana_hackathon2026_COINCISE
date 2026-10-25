import * as XLSX from "xlsx";
import type { ExtractedTransactionItem, DocumentType } from "../document-types.ts";
import { normalizeDate, parseCleanNumber } from "./csv-parser.ts";

export function parseExcel(buffer: Buffer, fileName = "statement.xlsx"): {
  transactions: ExtractedTransactionItem[];
  documentType: DocumentType;
  warnings: string[];
} {
  const warnings: string[] = [];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { transactions: [], documentType: "unknown", warnings: ["Excel workbook has no sheets."] };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown as unknown[][];

    if (!rawRows || rawRows.length < 2) {
      return { transactions: [], documentType: "unknown", warnings: ["Excel sheet is empty or contains insufficient data."] };
    }

    // Locate header row
    let headerRowIdx = 0;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = (rawRows[i] || []).map((c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
      const hasDate = row.some((c) => c.includes("date"));
      const hasAmount = row.some((c) => c.includes("amount") || c.includes("debit") || c.includes("credit") || c.includes("deposit") || c.includes("withdrawal"));
      if (hasDate && hasAmount) {
        headerRowIdx = i;
        headers = (rawRows[i] || []).map((c) => String(c || "").toLowerCase().trim());
        break;
      }
    }

    if (headers.length === 0) {
      headers = (rawRows[0] || []).map((c) => String(c || "").toLowerCase().trim());
    }

    const findCol = (terms: string[]) =>
      headers.findIndex((h) => terms.some((t) => h.includes(t)));

    const dateIdx = findCol(["date", "txn date", "txndate", "value date", "trans date"]);
    const descIdx = findCol(["narration", "description", "particulars", "details", "remark", "notes", "memo"]);
    const refIdx = findCol(["reference", "ref no", "refno", "cheque", "chq", "utr", "txn id"]);

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
    const invoiceNumIdx = findCol(["invoice", "inv no", "bill no"]);

    const transactions: ExtractedTransactionItem[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawDate = dateIdx >= 0 ? String(row[dateIdx] || "") : "";
      const cleanDate = normalizeDate(rawDate);
      const desc = descIdx >= 0 ? String(row[descIdx] || "") : String(row[1] || "Imported transaction");
      const ref = refIdx >= 0 ? String(row[refIdx] || "") : "";
      const invNum = invoiceNumIdx >= 0 ? String(row[invoiceNumIdx] || "") : undefined;

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
          const rawType = String(row[typeIdx] || "").toLowerCase();
          if (rawType.includes("cr") || rawType.includes("credit") || rawType.includes("deposit") || rawType.includes("in")) {
            type = "income";
          } else {
            type = "expense";
          }
        } else {
          const strVal = String(row[amountIdx] || "");
          if (strVal.includes("-")) {
            type = "expense";
          } else {
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
        id: `xls-row-${r}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

    let docType: DocumentType = "bank_statement";
    if (invoiceNumIdx >= 0 || fileName.toLowerCase().includes("invoice")) {
      docType = "invoice";
    } else if (fileName.toLowerCase().includes("bill") || fileName.toLowerCase().includes("payable")) {
      docType = "bill";
    }

    return { transactions, documentType: docType, warnings };
  } catch (err) {
    return {
      transactions: [],
      documentType: "unknown",
      warnings: [err instanceof Error ? err.message : "Failed to parse Excel workbook."],
    };
  }
}
