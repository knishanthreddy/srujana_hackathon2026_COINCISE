import { NextRequest } from "next/server";
import { parseCSV } from "@/lib/parsers/csv-parser";
import { parseExcel } from "@/lib/parsers/excel-parser";
import { parseOFX, parseQIF } from "@/lib/parsers/ofx-qif-parser";
import { parsePDF } from "@/lib/parsers/pdf-parser";
import { extractWithGemini } from "@/lib/parsers/ai-document-extractor";
import { DocumentParseResult, DocumentType } from "@/lib/document-types";

// Maximum upload size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "csv",
  "xlsx",
  "xls",
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "ofx",
  "qfx",
  "qif",
];

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentTypeHint = (formData.get("documentTypeHint") as string) || "auto";

    if (!file) {
      return Response.json(
        { success: false, errors: ["No file provided in upload request."] },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type || "application/octet-stream";
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    // 1. Validate file extension
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return Response.json(
        {
          success: false,
          errors: [
            `Unsupported file type ".${extension}". Supported formats: CSV, XLSX, XLS, PDF, OFX, QFX, QIF, JPG, PNG, WEBP.`,
          ],
        },
        { status: 400 }
      );
    }

    // 2. Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return Response.json(
        {
          success: false,
          errors: [`File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit.`],
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parseResult: DocumentParseResult = {
      success: false,
      documentType: "unknown",
      fileName,
      fileSize,
      mimeType,
      itemCount: 0,
      transactions: [],
      extractionEngine: "fallback_heuristic",
      warnings: [],
      errors: [],
    };

    // Priority 1: CSV Direct Parsing
    if (extension === "csv") {
      const text = buffer.toString("utf-8");
      const csvRes = parseCSV(text, fileName);
      parseResult = {
        success: csvRes.transactions.length > 0,
        documentType: csvRes.documentType,
        fileName,
        fileSize,
        mimeType,
        itemCount: csvRes.transactions.length,
        transactions: csvRes.transactions,
        extractionEngine: "csv_native",
        warnings: csvRes.warnings,
      };
    }
    // Priority 1b: Excel Spreadsheets
    else if (extension === "xlsx" || extension === "xls") {
      const xlsRes = parseExcel(buffer, fileName);
      parseResult = {
        success: xlsRes.transactions.length > 0,
        documentType: xlsRes.documentType,
        fileName,
        fileSize,
        mimeType,
        itemCount: xlsRes.transactions.length,
        transactions: xlsRes.transactions,
        extractionEngine: "excel_native",
        warnings: xlsRes.warnings,
      };
    }
    // Priority 2: Structured Bank Statement Formats (OFX, QFX, QIF)
    else if (extension === "ofx" || extension === "qfx") {
      const text = buffer.toString("utf-8");
      const ofxRes = parseOFX(text);
      parseResult = {
        success: ofxRes.transactions.length > 0,
        documentType: ofxRes.documentType,
        fileName,
        fileSize,
        mimeType,
        itemCount: ofxRes.transactions.length,
        transactions: ofxRes.transactions,
        extractionEngine: "ofx_qif_native",
        warnings: ofxRes.warnings,
      };
    } else if (extension === "qif") {
      const text = buffer.toString("utf-8");
      const qifRes = parseQIF(text);
      parseResult = {
        success: qifRes.transactions.length > 0,
        documentType: qifRes.documentType,
        fileName,
        fileSize,
        mimeType,
        itemCount: qifRes.transactions.length,
        transactions: qifRes.transactions,
        extractionEngine: "ofx_qif_native",
        warnings: qifRes.warnings,
      };
    }
    // Priority 3: PDF Ingestion
    else if (extension === "pdf") {
      // Step 3a: Attempt text-based extraction first
      const pdfTextRes = await parsePDF(buffer, fileName);

      if (pdfTextRes.transactions.length > 0) {
        parseResult = {
          success: true,
          documentType: pdfTextRes.documentType,
          fileName,
          fileSize,
          mimeType,
          itemCount: pdfTextRes.transactions.length,
          transactions: pdfTextRes.transactions,
          metadata: pdfTextRes.metadata,
          extractionEngine: "pdf_text",
          warnings: pdfTextRes.warnings,
        };
      } else {
        // Step 3b: Text extraction yielded 0 rows or it's a scanned PDF -> Use AI Multimodal
        const aiRes = await extractWithGemini({
          buffer,
          mimeType: "application/pdf",
          textContent: pdfTextRes.text || undefined,
          fileName,
        });

        if (aiRes.success && aiRes.transactions.length > 0) {
          parseResult = {
            success: true,
            documentType: aiRes.documentType,
            fileName,
            fileSize,
            mimeType,
            itemCount: aiRes.transactions.length,
            transactions: aiRes.transactions,
            metadata: aiRes.metadata,
            extractionEngine: "gemini_multimodal",
            warnings: aiRes.warnings,
          };
        } else {
          parseResult = {
            success: false,
            documentType: "unknown",
            fileName,
            fileSize,
            mimeType,
            itemCount: 0,
            transactions: [],
            extractionEngine: "pdf_text",
            warnings: [
              ...pdfTextRes.warnings,
              ...aiRes.warnings,
              "No structured transactions could be parsed from this PDF.",
            ],
          };
        }
      }
    }
    // Priority 4: Images (Scanned Receipts & Invoices)
    else if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
      const aiRes = await extractWithGemini({
        buffer,
        mimeType: mimeType || `image/${extension === "jpg" ? "jpeg" : extension}`,
        fileName,
      });

      if (aiRes.success && aiRes.transactions.length > 0) {
        parseResult = {
          success: true,
          documentType: aiRes.documentType,
          fileName,
          fileSize,
          mimeType,
          itemCount: aiRes.transactions.length,
          transactions: aiRes.transactions,
          metadata: aiRes.metadata,
          extractionEngine: "gemini_multimodal",
          warnings: aiRes.warnings,
        };
      } else {
        parseResult = {
          success: false,
          documentType: "unknown",
          fileName,
          fileSize,
          mimeType,
          itemCount: 0,
          transactions: [],
          extractionEngine: "gemini_multimodal",
          warnings: [
            ...aiRes.warnings,
            "Could not parse transactions from this image. Ensure GEMINI_API_KEY is configured or upload a CSV/PDF statement.",
          ],
        };
      }
    }

    return Response.json(parseResult);
  } catch (error) {
    console.error("Document parse error:", error);
    return Response.json(
      {
        success: false,
        errors: [error instanceof Error ? error.message : "Internal document parsing error."],
      },
      { status: 500 }
    );
  }
}
