"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Info,
  Check,
  X,
} from "lucide-react";
import {
  DocumentParseResult,
  ExtractedTransactionItem,
  ImportBatchSummary,
  ReconciliationAction,
} from "@/lib/document-types";
import {
  commitReviewedImport,
  getImportHistory,
  reconcileWithCurrentData,
  subscribeToImportHistory,
} from "@/lib/document-service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function DocumentCentrePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<DocumentParseResult | null>(null);
  const [items, setItems] = useState<ExtractedTransactionItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "matches" | "duplicates" | "records">("all");
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccessMessage, setCommitSuccessMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportBatchSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getImportHistory());
    const unsub = subscribeToImportHistory((updated) => setHistory(updated));
    return () => unsub();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setParseResult(null);
    setCommitSuccessMessage(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/documents/parse", {
        method: "POST",
        body: formData,
      });

      const data: DocumentParseResult = await res.json();

      if (!res.ok || !data.success) {
        setParseError(data.errors?.[0] || data.warnings?.[0] || "Failed to parse document.");
        setIsParsing(false);
        return;
      }

      setParseResult(data);
      // Run client-side reconciliation against active local storage / live records
      const reconciled = reconcileWithCurrentData(data.transactions);
      setItems(reconciled);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Network error uploading file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleActionChange = (itemId: string, newAction: ReconciliationAction) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              reconciliation: {
                ...item.reconciliation,
                selectedAction: newAction,
              },
            }
          : item
      )
    );
  };

  const handleFieldChange = (itemId: string, field: "description" | "amount" | "date", val: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: val };
        // re-run reconciliation for that item
        const [recomputed] = reconcileWithCurrentData([updated]);
        return recomputed;
      })
    );
  };

  const handleConfirmImport = () => {
    if (!file || items.length === 0) return;
    setIsCommitting(true);

    try {
      const res = commitReviewedImport(file.name, file.size, items);

      if (res.success) {
        const parts: string[] = [];
        if (res.recordsCreated > 0) parts.push(`${res.recordsCreated} cash transaction(s)`);
        if (res.receivablesReconciled > 0) parts.push(`${res.receivablesReconciled} customer invoice(s) settled`);
        if (res.payablesReconciled > 0) parts.push(`${res.payablesReconciled} vendor bill(s) settled`);
        if (res.invoicesCreated > 0) parts.push(`${res.invoicesCreated} new invoice(s) created`);

        setCommitSuccessMessage(
          `Successfully processed import: ${parts.join(", ")} saved to your COINCISE financial database.`
        );
        // Clear active staging
        setFile(null);
        setParseResult(null);
        setItems([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setParseError(res.errors[0] || "Import could not be committed.");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Error executing import.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setItems([]);
    setParseError(null);
    setCommitSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filtered rows for the review table
  const filteredItems = items.filter((item) => {
    if (selectedFilter === "matches") {
      return (
        item.reconciliation.selectedAction === "reconcile_receivable" ||
        item.reconciliation.selectedAction === "reconcile_payable"
      );
    }
    if (selectedFilter === "duplicates") {
      return item.reconciliation.isDuplicate || item.reconciliation.selectedAction === "skip_duplicate";
    }
    if (selectedFilter === "records") {
      return item.reconciliation.selectedAction === "create_record";
    }
    return true;
  });

  const duplicateCount = items.filter((i) => i.reconciliation.isDuplicate).length;
  const matchCount = items.filter(
    (i) =>
      i.reconciliation.selectedAction === "reconcile_receivable" ||
      i.reconciliation.selectedAction === "reconcile_payable"
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#242321] tracking-tight">Document Centre</h1>
            <Badge variant="neutral" className="bg-[#E8E1D5] text-[#242321] font-medium text-xs">
              Smart Import & Reconciliation
            </Badge>
          </div>
          <p className="text-sm text-[#7A7369] mt-1">
            Import statements, invoices, and bills directly into your ledger with tiered extraction and double-counting protection.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl bg-[#E8E1D5]/60 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "upload"
                ? "bg-[#242321] text-white shadow-sm"
                : "text-[#7A7369] hover:text-[#242321]"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload & Reconcile
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "history"
                ? "bg-[#242321] text-white shadow-sm"
                : "text-[#7A7369] hover:text-[#242321]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Import History ({history.length})
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {commitSuccessMessage && (
        <div className="bg-[#DDEFE8] border border-[#138C83]/30 rounded-2xl p-4 flex items-start gap-3 text-[#138C83]">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#138C83]" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-[#138C83]">Import Completed Successfully</h4>
            <p className="text-xs text-[#138C83]/90 mt-0.5">{commitSuccessMessage}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/records"
              className="text-xs font-semibold underline hover:text-[#0f6b64] flex items-center gap-1"
            >
              View Records <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {parseError && (
        <div className="bg-[#FCE4D8] border border-[#F15A35]/30 rounded-2xl p-4 flex items-start gap-3 text-[#F15A35]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#F15A35]" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Document Parsing Notice</h4>
            <p className="text-xs mt-0.5">{parseError}</p>
          </div>
          <button onClick={() => setParseError(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {activeTab === "upload" ? (
        <div className="space-y-6">
          {/* 1. Drag and Drop Upload Zone */}
          {!parseResult && (
            <Card className="p-6 sm:p-10 border-2 border-dashed border-[#E8E1D5] hover:border-[#F15A35]/50 transition-colors bg-white rounded-3xl">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center text-center cursor-pointer py-8 transition-colors ${
                  isDragging ? "bg-[#FCE4D8]/30 rounded-2xl" : ""
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.ofx,.qfx,.qif,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center mb-4 shadow-sm">
                  {isParsing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-lg font-bold text-[#242321]">
                  {isParsing
                    ? "Analyzing & Extracting Document..."
                    : "Drag & Drop Financial Document or Click to Browse"}
                </h3>
                <p className="text-xs text-[#7A7369] mt-1 max-w-md">
                  Upload CSV bank statements, Excel workbooks, PDF invoices/bills, OFX/QFX feeds, or scanned receipts up to 10MB.
                </p>

                {/* Formats Pills */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5]">
                    CSV Bank Statements
                  </span>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5]">
                    Excel (.xlsx, .xls)
                  </span>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5]">
                    PDF Invoices & Statements
                  </span>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5]">
                    OFX / QFX / QIF
                  </span>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F7F3EA] text-[#7A7369] border border-[#E8E1D5]">
                    Scanned Receipts (AI Vision)
                  </span>
                </div>
              </div>

              {/* Extraction Guarantee Note */}
              <div className="mt-6 pt-6 border-t border-[#E8E1D5] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#7A7369]">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#138C83] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#242321]">Double-Counting Safeguard:</strong> Invoices are matched with payments without duplicating cash ledger entries.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#F15A35] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#242321]">Tiered Extraction:</strong> Fast native deterministic parsing first, falling back to Gemini AI only when needed.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#138C83] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#242321]">User Review First:</strong> No records are silently committed until you verify dates, amounts, and matches.
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* 2. Review and Reconciliation Workspace */}
          {parseResult && (
            <div className="space-y-5">
              {/* Staging Summary Card */}
              <Card className="p-5 bg-white border border-[#E8E1D5] rounded-3xl shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#DDEFE8] text-[#138C83] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[#242321]">{parseResult.fileName}</h3>
                        <Badge variant="teal" className="text-[11px] capitalize">
                          {parseResult.documentType.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-[#7A7369]">
                          ({(parseResult.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <p className="text-xs text-[#7A7369] mt-0.5">
                        Extraction Engine:{" "}
                        <strong className="text-[#242321]">
                          {parseResult.extractionEngine === "csv_native" && "Deterministic CSV Parser"}
                          {parseResult.extractionEngine === "excel_native" && "Native SheetJS Excel Parser"}
                          {parseResult.extractionEngine === "ofx_qif_native" && "OFX/QIF Banking Parser"}
                          {parseResult.extractionEngine === "pdf_text" && "PDF Text Extractor"}
                          {parseResult.extractionEngine === "gemini_multimodal" && "Gemini 1.5 Flash Multimodal Vision"}
                          {parseResult.extractionEngine === "fallback_heuristic" && "Heuristic Rules"}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl text-xs">
                      Discard & Upload Another
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmImport}
                      disabled={isCommitting || items.length === 0}
                      className="rounded-xl text-xs bg-[#F15A35] text-white hover:bg-[#d94825] shadow-sm flex items-center gap-1.5"
                    >
                      {isCommitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Confirm & Import ({items.length} Records)
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Staging Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E8E1D5]">
                  <div className="p-3 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A7369]">Total Extracted</span>
                    <p className="text-base font-bold text-[#242321] mt-0.5">{items.length} Rows</p>
                  </div>
                  <div className="p-3 bg-[#DDEFE8]/50 rounded-2xl border border-[#138C83]/20">
                    <span className="text-[11px] text-[#138C83] font-medium">Reconciliation Matches</span>
                    <p className="text-base font-bold text-[#138C83] mt-0.5">{matchCount} Invoices/Bills</p>
                  </div>
                  <div className="p-3 bg-[#FCE4D8]/50 rounded-2xl border border-[#F15A35]/20">
                    <span className="text-[11px] text-[#F15A35] font-medium">Duplicate Warnings</span>
                    <p className="text-base font-bold text-[#F15A35] mt-0.5">{duplicateCount} Found</p>
                  </div>
                  <div className="p-3 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5]">
                    <span className="text-[11px] text-[#7A7369]">Avg Confidence</span>
                    <p className="text-base font-bold text-[#242321] mt-0.5">
                      {(
                        (items.reduce((acc, i) => acc + i.confidence, 0) / (items.length || 1)) *
                        100
                      ).toFixed(0)}
                      %
                    </p>
                  </div>
                </div>
              </Card>

              {/* Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFilter === "all"
                        ? "bg-[#242321] text-white"
                        : "bg-white text-[#7A7369] border border-[#E8E1D5] hover:text-[#242321]"
                    }`}
                  >
                    All Rows ({items.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter("matches")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFilter === "matches"
                        ? "bg-[#138C83] text-white"
                        : "bg-white text-[#7A7369] border border-[#E8E1D5] hover:text-[#138C83]"
                    }`}
                  >
                    Matches Found ({matchCount})
                  </button>
                  <button
                    onClick={() => setSelectedFilter("duplicates")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFilter === "duplicates"
                        ? "bg-[#F15A35] text-white"
                        : "bg-white text-[#7A7369] border border-[#E8E1D5] hover:text-[#F15A35]"
                    }`}
                  >
                    Duplicates ({duplicateCount})
                  </button>
                  <button
                    onClick={() => setSelectedFilter("records")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedFilter === "records"
                        ? "bg-[#242321] text-white"
                        : "bg-white text-[#7A7369] border border-[#E8E1D5] hover:text-[#242321]"
                    }`}
                  >
                    New Cash Records (
                    {items.filter((i) => i.reconciliation.selectedAction === "create_record").length})
                  </button>
                </div>

                <div className="text-xs text-[#7A7369]">
                  Showing <strong className="text-[#242321]">{filteredItems.length}</strong> of {items.length} rows
                </div>
              </div>

              {/* Data Review Table */}
              <Card className="bg-white border border-[#E8E1D5] rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F7F3EA] border-b border-[#E8E1D5] text-[#7A7369] font-medium uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description / Reference</th>
                        <th className="py-3 px-4">Flow</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                        <th className="py-3 px-4 text-center">Confidence</th>
                        <th className="py-3 px-4">Reconciliation & Assigned Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E1D5]/60 text-[#242321]">
                      {filteredItems.map((item) => {
                        const isIncome = item.type === "income";
                        const isDup = item.reconciliation.isDuplicate;

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-[#F7F3EA]/50 transition-colors ${
                              isDup ? "bg-[#FCE4D8]/20" : ""
                            }`}
                          >
                            {/* Date */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <input
                                type="date"
                                value={item.date}
                                onChange={(e) => handleFieldChange(item.id, "date", e.target.value)}
                                className="bg-transparent border border-transparent hover:border-[#E8E1D5] focus:border-[#F15A35] rounded px-1 py-0.5 font-medium text-xs text-[#242321] outline-none"
                              />
                            </td>

                            {/* Description */}
                            <td className="py-3 px-4 max-w-xs">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleFieldChange(item.id, "description", e.target.value)}
                                className="w-full bg-transparent border border-transparent hover:border-[#E8E1D5] focus:border-[#F15A35] rounded px-1 py-0.5 font-medium text-xs text-[#242321] outline-none truncate"
                              />
                              {item.reference && (
                                <span className="block text-[10px] text-[#7A7369] mt-0.5">
                                  Ref: {item.reference}
                                </span>
                              )}
                              {item.invoiceNumber && (
                                <span className="block text-[10px] text-[#138C83] mt-0.5">
                                  Inv #{item.invoiceNumber}
                                </span>
                              )}
                            </td>

                            {/* Flow */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                  isIncome
                                    ? "bg-[#DDEFE8] text-[#138C83]"
                                    : "bg-[#FCE4D8] text-[#F15A35]"
                                }`}
                              >
                                {isIncome ? (
                                  <>
                                    <ArrowDownLeft className="w-2.5 h-2.5" /> Inflow
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpRight className="w-2.5 h-2.5" /> Outflow
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-3 px-4 whitespace-nowrap text-right font-bold text-xs">
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) =>
                                  handleFieldChange(item.id, "amount", parseFloat(e.target.value) || 0)
                                }
                                className={`w-28 text-right bg-transparent border border-transparent hover:border-[#E8E1D5] focus:border-[#F15A35] rounded px-1 py-0.5 font-bold text-xs outline-none ${
                                  isIncome ? "text-[#138C83]" : "text-[#242321]"
                                }`}
                              />
                            </td>

                            {/* Confidence */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F7F3EA] border border-[#E8E1D5] text-[10px] font-semibold text-[#7A7369]">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.confidence >= 0.9
                                      ? "bg-[#138C83]"
                                      : item.confidence >= 0.75
                                      ? "bg-amber-500"
                                      : "bg-[#F15A35]"
                                  }`}
                                />
                                {(item.confidence * 100).toFixed(0)}%
                              </div>
                            </td>

                            {/* Reconciliation Selector */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1 min-w-[240px]">
                                <select
                                  value={item.reconciliation.selectedAction}
                                  onChange={(e) =>
                                    handleActionChange(item.id, e.target.value as ReconciliationAction)
                                  }
                                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-2.5 py-1 text-xs font-semibold text-[#242321] focus:border-[#F15A35] outline-none"
                                >
                                  <option value="create_record">
                                    Create Cash Record ({item.type === "income" ? "Income" : "Expense"})
                                  </option>
                                  {item.reconciliation.matchedEntityType === "receivable" && (
                                    <option value="reconcile_receivable">
                                      Match Invoice ({item.reconciliation.matchedEntityName})
                                    </option>
                                  )}
                                  {item.reconciliation.matchedEntityType === "payable" && (
                                    <option value="reconcile_payable">
                                      Match Bill ({item.reconciliation.matchedEntityName})
                                    </option>
                                  )}
                                  <option value="create_receivable">Create Customer Invoice (Receivable)</option>
                                  <option value="create_payable">Create Vendor Bill (Payable)</option>
                                  <option value="internal_transfer">Internal Bank Transfer (P&L Neutral)</option>
                                  <option value="skip_duplicate">Skip (Potential Duplicate / Exclude)</option>
                                </select>

                                {/* Reason / Match Notes */}
                                {item.reconciliation.duplicateReason && (
                                  <span className="text-[10px] text-[#F15A35] flex items-center gap-1 font-medium">
                                    <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                                    {item.reconciliation.duplicateReason}
                                  </span>
                                )}
                                {item.reconciliation.notes && !item.reconciliation.duplicateReason && (
                                  <span className="text-[10px] text-[#138C83] flex items-center gap-1 font-medium">
                                    <Check className="w-2.5 h-2.5 flex-shrink-0" />
                                    {item.reconciliation.notes}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom confirmation toolbar */}
                <div className="p-4 bg-[#F7F3EA] border-t border-[#E8E1D5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#7A7369]">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#7A7369]" />
                    <span>
                      Review and correct any field before proceeding. You can freely change actions per row.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl text-xs">
                      Discard
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmImport}
                      disabled={isCommitting || items.length === 0}
                      className="rounded-xl text-xs bg-[#F15A35] text-white hover:bg-[#d94825] shadow-sm flex items-center gap-1.5"
                    >
                      {isCommitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Confirm & Import ({items.length} Records)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Import History */
        <div className="space-y-4">
          {history.length === 0 ? (
            <Card className="p-10 text-center bg-white border border-[#E8E1D5] rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F3EA] text-[#7A7369] flex items-center justify-center mx-auto mb-3">
                <History className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#242321]">No Previous Imports Found</h3>
              <p className="text-xs text-[#7A7369] mt-1 max-w-sm mx-auto">
                Documents and statements imported via the Document Centre will be recorded here for auditing and traceability.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab("upload")}
                className="mt-4 rounded-xl text-xs bg-[#F15A35] text-white hover:bg-[#d94825]"
              >
                Upload First Document
              </Button>
            </Card>
          ) : (
            <Card className="bg-white border border-[#E8E1D5] rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F3EA] border-b border-[#E8E1D5] text-[#7A7369] font-medium uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Document / File</th>
                      <th className="py-3 px-4">Upload Date</th>
                      <th className="py-3 px-4">Document Type</th>
                      <th className="py-3 px-4 text-center">Extracted</th>
                      <th className="py-3 px-4 text-center">Imported</th>
                      <th className="py-3 px-4 text-center">Engine</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E1D5]/60 text-[#242321]">
                    {history.map((batch) => (
                      <tr key={batch.id} className="hover:bg-[#F7F3EA]/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-xs text-[#242321]">{batch.fileName}</div>
                          <span className="text-[10px] text-[#7A7369]">
                            {(batch.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-[#7A7369]">
                          {new Date(batch.uploadedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="neutral" className="text-[10px] capitalize">
                            {batch.documentType.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {batch.recordsExtracted}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#138C83]">
                          {batch.recordsImported}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-mono bg-[#F7F3EA] px-2 py-0.5 rounded border border-[#E8E1D5]">
                            {batch.extractionEngine}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              batch.status === "completed"
                                ? "bg-[#DDEFE8] text-[#138C83]"
                                : batch.status === "partial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-[#FCE4D8] text-[#F15A35]"
                            }`}
                          >
                            {batch.status === "completed" && <Check className="w-2.5 h-2.5" />}
                            {batch.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            href="/records"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F15A35] hover:underline"
                          >
                            View Records <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
