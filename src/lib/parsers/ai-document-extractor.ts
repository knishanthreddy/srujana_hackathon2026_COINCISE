import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedTransactionItem, DocumentType } from "../document-types.ts";
import { normalizeDate } from "./csv-parser.ts";

interface AIExtractionOptions {
  buffer?: Buffer;
  mimeType?: string;
  textContent?: string;
  fileName: string;
}

interface RawAIItem {
  date?: string;
  description?: string;
  amount?: number;
  type?: "income" | "expense";
  counterparty?: string;
  reference?: string;
  invoiceNumber?: string;
  dueDate?: string;
  category?: string;
  taxAmount?: number;
  runningBalance?: number;
  confidence?: number;
}

interface RawAIResponse {
  documentType?: DocumentType;
  metadata?: {
    counterparty?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    taxAmount?: number;
    dueDate?: string;
    currency?: string;
  };
  items?: RawAIItem[];
  warnings?: string[];
}

export async function extractWithGemini(
  options: AIExtractionOptions
): Promise<{
  success: boolean;
  transactions: ExtractedTransactionItem[];
  documentType: DocumentType;
  metadata?: Record<string, unknown>;
  warnings: string[];
  isAIGenerated: boolean;
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      transactions: [],
      documentType: "unknown",
      warnings: ["GEMINI_API_KEY is not configured on the server."],
      isAIGenerated: false,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
      systemInstruction: `You are an expert financial document extraction engine for Indian MSMEs and businesses.
Your task is to accurately extract financial transactions, invoices, bills, receipts, or bank statements into structured JSON.

Return ONLY a valid JSON object matching this schema:
{
  "documentType": "invoice" | "bill" | "bank_statement" | "receipt" | "generic_ledger",
  "metadata": {
    "counterparty": string or null,
    "invoiceNumber": string or null,
    "totalAmount": number or null,
    "taxAmount": number or null,
    "dueDate": "YYYY-MM-DD" or null,
    "currency": "INR"
  },
  "items": [
    {
      "date": "YYYY-MM-DD",
      "description": string,
      "amount": number (positive strictly),
      "type": "income" | "expense",
      "counterparty": string or null,
      "reference": string or null,
      "invoiceNumber": string or null,
      "dueDate": "YYYY-MM-DD" or null,
      "category": string or null,
      "taxAmount": number or null,
      "runningBalance": number or null,
      "confidence": number between 0.5 and 1.0
    }
  ],
  "warnings": [string]
}

STRICT FINANCIAL RULES:
1. All amounts must be clean non-negative numbers.
2. Invoices issued to customers are "income" (Receivables).
3. Vendor bills/supplier invoices and purchase receipts are "expense" (Payables).
4. Deposits, inward NEFT/RTGS/UPI credits are "income".
5. Withdrawals, vendor debits, utility charges are "expense".
6. If the document is an invoice/bill, output the line item or invoice summary item with correct invoiceNumber, dueDate, and counterparty.
7. Dates must be standard YYYY-MM-DD format.`,
    });

    const prompt = `Extract all financial records from this document: ${options.fileName}. Extract exact dates, amounts, invoice numbers, counterparties, and tax values.`;

    let result;
    let source: "ai_vision" | "ai_text" = "ai_text";

    if (options.buffer && options.mimeType && options.mimeType.startsWith("image/")) {
      source = "ai_vision";
      const base64Data = options.buffer.toString("base64");
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: options.mimeType,
          },
        },
      ]);
    } else if (options.buffer && options.mimeType === "application/pdf") {
      source = "ai_vision";
      const base64Data = options.buffer.toString("base64");
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf",
          },
        },
      ]);
    } else if (options.textContent) {
      source = "ai_text";
      result = await model.generateContent(`${prompt}\n\nDocument Text Content:\n${options.textContent.slice(0, 15000)}`);
    } else {
      return {
        success: false,
        transactions: [],
        documentType: "unknown",
        warnings: ["No valid content provided for AI extraction."],
        isAIGenerated: false,
      };
    }

    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed: RawAIResponse = JSON.parse(cleanJson);

    const docType: DocumentType = parsed.documentType || "generic_ledger";
    const transactions: ExtractedTransactionItem[] = (parsed.items || []).map((item, idx) => {
      const isSalesInvoice = docType === "invoice";
      const isVendorBill = docType === "bill";

      let suggestedAction: ExtractedTransactionItem["reconciliation"]["suggestedAction"] = "create_record";
      if (isSalesInvoice) suggestedAction = "create_receivable";
      else if (isVendorBill) suggestedAction = "create_payable";

      return {
        id: `ai-${idx + 1}-${Date.now()}`,
        date: normalizeDate(item.date || ""),
        description: (item.description || `${docType.toUpperCase()} item`).slice(0, 180),
        amount: Math.abs(Number(item.amount) || 0),
        type: item.type === "income" ? "income" : "expense",
        counterparty: item.counterparty || undefined,
        reference: item.reference || undefined,
        invoiceNumber: item.invoiceNumber || undefined,
        dueDate: item.dueDate ? normalizeDate(item.dueDate) : undefined,
        category: item.category || undefined,
        taxAmount: item.taxAmount ? Math.abs(Number(item.taxAmount)) : undefined,
        runningBalance: item.runningBalance ? Math.abs(Number(item.runningBalance)) : undefined,
        confidence: typeof item.confidence === "number" ? Math.max(0.5, Math.min(1.0, item.confidence)) : 0.88,
        warnings: [],
        extractionSource: source,
        reconciliation: {
          suggestedAction,
          selectedAction: suggestedAction,
          matchScore: 0,
          isDuplicate: false,
        },
      };
    });

    return {
      success: true,
      transactions,
      documentType: docType,
      metadata: parsed.metadata,
      warnings: parsed.warnings || [],
      isAIGenerated: true,
    };
  } catch (err) {
    return {
      success: false,
      transactions: [],
      documentType: "unknown",
      warnings: [err instanceof Error ? err.message : "AI extraction encountered an error."],
      isAIGenerated: false,
    };
  }
}
