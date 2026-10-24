"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Scale,
  ExternalLink,
  ShieldAlert,
  FileText,
  MessageSquare,
  CheckCircle,
  PlusCircle,
  DollarSign,
  ArrowRight,
  Clock,
  AlertCircle,
  Upload,
  CheckCircle2,
  XCircle,
  FileCheck,
  Send,
  AlertOctagon,
  Sparkles,
  History,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  getDisputes,
  createDispute,
  addDisputeEvidence,
  submitDisputeResponse,
  proposeDisputeSettlement,
  acceptDisputeSettlement,
  rejectDisputeSettlement,
  recordSettlementPayment,
  escalateDisputeToODR,
  subscribeToDisputes,
  MSME_ODR_PORTAL_URL,
} from "@/lib/dispute-service";
import { getReceivables } from "@/lib/data-service";
import { DisputeCase, DisputeStatus, Receivable } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FairResolvePage() {
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isNewDisputeModalOpen, setIsNewDisputeModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Form states
  const [newDisputeForm, setNewDisputeForm] = useState({
    invoiceNumber: "",
    counterpartyName: "",
    disputeAmount: "",
    originalDueDate: "",
    issueCategory: "delayed_payment" as DisputeCase["issueCategory"],
    sellerStatement: "",
  });

  const [settlementForm, setSettlementForm] = useState({
    offerAmount: "",
    terms: "",
  });

  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    type: "delivery_proof" as "invoice" | "delivery_proof" | "email_thread" | "contract",
  });

  const [responseForm, setResponseForm] = useState({
    party: "buyer" as "buyer" | "seller",
    statement: "",
  });

  const [paymentAmount, setPaymentAmount] = useState("");

  // Subscribe to live dispute updates
  useEffect(() => {
    const load = () => {
      const data = getDisputes();
      setDisputes(data);
      if (data.length > 0 && !selectedDisputeId) {
        setSelectedDisputeId(data[0].id);
      }
    };
    load();
    const unsub = subscribeToDisputes(() => {
      load();
      setRefreshTrigger((n) => n + 1);
    });
    return () => unsub();
  }, [selectedDisputeId]);

  const activeDispute = useMemo(() => {
    return disputes.find((d) => d.id === selectedDisputeId) || disputes[0];
  }, [disputes, selectedDisputeId]);

  const receivables = useMemo(() => {
    return getReceivables();
  }, [refreshTrigger]);

  // Handlers
  const handleSelectInvoiceForDispute = (invNum: string) => {
    const target = receivables.find((r) => r.invoiceNumber === invNum);
    if (target) {
      setNewDisputeForm({
        invoiceNumber: target.invoiceNumber,
        counterpartyName: target.customerName,
        disputeAmount: String(target.balanceDue),
        originalDueDate: target.dueDate,
        issueCategory: target.daysOverdue > 15 ? "delayed_payment" : "scope_dispute",
        sellerStatement: `Goods supplied per purchase order terms. Payment overdue since ${formatDate(target.dueDate)}.`,
      });
    }
  };

  const handleCreateDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisputeForm.invoiceNumber || !newDisputeForm.disputeAmount) return;

    const created = createDispute({
      counterpartyName: newDisputeForm.counterpartyName,
      invoiceNumber: newDisputeForm.invoiceNumber,
      disputeAmount: Number(newDisputeForm.disputeAmount),
      originalDueDate: newDisputeForm.originalDueDate || new Date().toISOString().split("T")[0],
      issueCategory: newDisputeForm.issueCategory,
      sellerStatement: newDisputeForm.sellerStatement,
    });

    setIsNewDisputeModalOpen(false);
    setSelectedDisputeId(created.id);
  };

  const handleProposeSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute || !settlementForm.offerAmount) return;

    proposeDisputeSettlement(
      activeDispute.id,
      Number(settlementForm.offerAmount),
      settlementForm.terms || `Proposed settlement of ${formatCurrency(Number(settlementForm.offerAmount))} in full and final satisfaction.`
    );

    setIsSettlementModalOpen(false);
    setSettlementForm({ offerAmount: "", terms: "" });
  };

  const handleAddEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute || !evidenceForm.title) return;

    addDisputeEvidence(activeDispute.id, evidenceForm.title, evidenceForm.type);
    setIsEvidenceModalOpen(false);
    setEvidenceForm({ title: "", type: "delivery_proof" });
  };

  const handleSubmitResponseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute || !responseForm.statement) return;

    submitDisputeResponse(activeDispute.id, responseForm.party, responseForm.statement);
    setIsResponseModalOpen(false);
    setResponseForm({ party: "buyer", statement: "" });
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute || !paymentAmount) return;

    recordSettlementPayment(activeDispute.id, Number(paymentAmount));
    setIsPaymentModalOpen(false);
    setPaymentAmount("");
  };

  return (
    <div className="space-y-6">
      {/* Official MSME ODR Alignment & Legal Disclaimer */}
      <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-amber-950 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded">
                STATUTORY DISPUTE FRAMEWORK
              </span>
              <span className="font-semibold">Direct Commercial Settlement Protocol</span>
            </div>
            <p className="mt-1 leading-relaxed text-amber-900/90">
              FairResolve facilitates structured dispute communication, evidence logging, and consensual settlement formulation between commercial buyers and sellers.
              <strong> FairResolve is not a government-authorized arbitration or judicial service.</strong>
              If direct negotiations deadlock, eligible enterprises can escalate directly to the official statutory Online Dispute Resolution portal.
            </p>
          </div>
        </div>

        <a
          href={MSME_ODR_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 bg-white text-amber-900 hover:bg-amber-100 font-semibold"
          >
            <span>Official MSME ODR Portal</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </a>
      </div>

      {/* Main Dispute Control Bar */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>FairResolve Payment Dispute Workspace</span>
            <Badge variant="neutral" className="text-xs">
              {disputes.length} Cases Logged
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain transparent audit trails, formal responses, documentary proof, and mutual settlement agreements without double-counting ledger transactions.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsNewDisputeModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Open New Dispute Case
        </Button>
      </div>

      {/* Workspace Grid: Left Case List, Right Active Case Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Active Dispute Cases List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 px-1">
            Active Dispute Cases ({disputes.length})
          </h3>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {disputes.map((caseItem) => {
              const isSelected = activeDispute?.id === caseItem.id;
              const statusColor =
                caseItem.status === "resolved"
                  ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20"
                  : caseItem.status === "escalated_to_odr"
                  ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20"
                  : caseItem.status === "settlement_proposed"
                  ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:bg-slate-50";

              return (
                <div
                  key={caseItem.id}
                  onClick={() => setSelectedDisputeId(caseItem.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected ? statusColor : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {caseItem.caseNumber}
                    </span>
                    <Badge
                      variant={
                        caseItem.status === "resolved"
                          ? "success"
                          : caseItem.status === "escalated_to_odr"
                          ? "danger"
                          : caseItem.status === "settlement_proposed"
                          ? "info"
                          : "warning"
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {caseItem.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 truncate">
                    {caseItem.counterpartyName}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Bill #{caseItem.invoiceNumber} &bull; Due {formatDate(caseItem.originalDueDate)}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Disputed Sum:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(caseItem.disputeAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Detailed Case Workspace */}
        <div className="lg:col-span-8 space-y-5">
          {activeDispute ? (
            <>
              {/* Case Header Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {activeDispute.caseNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {activeDispute.counterpartyName}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Linked Invoice: <span className="font-mono font-semibold text-slate-700">#{activeDispute.invoiceNumber}</span> |
                      Original Due Date: <span className="font-mono">{formatDate(activeDispute.originalDueDate)}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Claim Value</p>
                    <p className="text-xl font-bold font-mono text-rose-600">
                      {formatCurrency(activeDispute.disputeAmount)}
                    </p>
                  </div>
                </div>

                {/* Status Stage Stepper */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div
                    className={`p-2 rounded-lg font-semibold ${
                      activeDispute.status !== "draft"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    1. Notified
                  </div>
                  <div
                    className={`p-2 rounded-lg font-semibold ${
                      activeDispute.evidenceItems.length > 0
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    2. Evidence
                  </div>
                  <div
                    className={`p-2 rounded-lg font-semibold ${
                      activeDispute.status === "settlement_proposed" ||
                      activeDispute.status === "resolved"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    3. Proposal
                  </div>
                  <div
                    className={`p-2 rounded-lg font-semibold ${
                      activeDispute.status === "resolved"
                        ? "bg-emerald-100 text-emerald-800"
                        : activeDispute.status === "escalated_to_odr"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    4. {activeDispute.status === "escalated_to_odr" ? "ODR Escalated" : "Resolved"}
                  </div>
                </div>

                {/* Neutral Rule-Based Fact Summary */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Objective Rule-Based Fact Summary (Neutral)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeDispute.ruleSummary || "Fact summary compiled from submitted documentary evidence and party statements."}
                  </p>
                </div>
              </div>

              {/* Both Parties' Positions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seller Position */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                      <span>Seller Position (You)</span>
                      <button
                        onClick={() => {
                          setResponseForm({ party: "seller", statement: activeDispute.sellerResponse || "" });
                          setIsResponseModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-normal"
                      >
                        Edit Statement
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 leading-relaxed">
                    {activeDispute.sellerResponse || "No official seller statement recorded yet."}
                  </CardContent>
                </Card>

                {/* Buyer Position */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                      <span>Buyer Formal Response</span>
                      <button
                        onClick={() => {
                          setResponseForm({ party: "buyer", statement: activeDispute.buyerResponse || "" });
                          setIsResponseModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-normal"
                      >
                        Log Counterparty Reply
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 leading-relaxed">
                    {activeDispute.buyerResponse || "Awaiting formal response from buyer."}
                  </CardContent>
                </Card>
              </div>

              {/* Settlement Offer & Mutual Payment Progress */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Settlement Negotiation & Payout Tracking</span>
                    </CardTitle>
                    <CardDescription>
                      Consensual settlement terms agreed between buyer and seller
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeDispute.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSettlementForm({
                            offerAmount: String(activeDispute.settlementOfferAmount || Math.round(activeDispute.disputeAmount * 0.9)),
                            terms: activeDispute.settlementTerms || "10% commercial credit discount in exchange for full payment within 5 business days.",
                          });
                          setIsSettlementModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1" />
                        Propose Settlement Offer
                      </Button>
                    )}

                    {activeDispute.status === "resolved" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPaymentAmount("");
                          setIsPaymentModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-1" />
                        Record Payout
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {activeDispute.status === "settlement_proposed" && activeDispute.settlementOfferAmount && (
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-900 font-bold uppercase tracking-wide">
                            Pending Settlement Offer
                          </p>
                          <p className="text-lg font-bold font-mono text-blue-900 mt-0.5">
                            {formatCurrency(activeDispute.settlementOfferAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptDisputeSettlement(activeDispute.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Accept Settlement
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectDisputeSettlement(activeDispute.id, "Counterparty requested revised terms.")}
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Decline Offer
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-blue-800">
                        <strong>Terms:</strong> {activeDispute.settlementTerms}
                      </p>
                    </div>
                  )}

                  {activeDispute.status === "resolved" && activeDispute.settlementPaymentProgress && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-emerald-900 font-bold uppercase tracking-wide">
                            Mutually Accepted Settlement Agreement
                          </p>
                          <p className="text-lg font-bold font-mono text-emerald-900 mt-0.5">
                            Agreed: {formatCurrency(activeDispute.settlementPaymentProgress.agreedAmount)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            activeDispute.settlementPaymentProgress.paymentStatus === "completed"
                              ? "success"
                              : "warning"
                          }
                        >
                          {activeDispute.settlementPaymentProgress.paymentStatus.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Payment Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-emerald-800 font-mono mb-1">
                          <span>
                            Paid: {formatCurrency(activeDispute.settlementPaymentProgress.paidAmount)}
                          </span>
                          <span>
                            Remaining: {formatCurrency(Math.max(0, activeDispute.settlementPaymentProgress.agreedAmount - activeDispute.settlementPaymentProgress.paidAmount))}
                          </span>
                        </div>
                        <div className="w-full bg-emerald-200 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (activeDispute.settlementPaymentProgress.paidAmount /
                                  activeDispute.settlementPaymentProgress.agreedAmount) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-emerald-800">
                        <strong>Settlement Terms:</strong> {activeDispute.settlementTerms || "Terms finalized in consent agreement."}
                      </p>
                    </div>
                  )}

                  {activeDispute.status !== "settlement_proposed" && activeDispute.status !== "resolved" && (
                    <p className="text-xs text-slate-500 italic">
                      No active settlement offer pending. Click &quot;Propose Settlement Offer&quot; above to submit terms to {activeDispute.counterpartyName}.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Documentary Evidence Vault */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      <span>Documentary Proof & Evidence Vault ({activeDispute.evidenceItems.length})</span>
                    </CardTitle>
                    <CardDescription>
                      Invoices, delivery challans, and inspection sign-offs
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEvidenceModalOpen(true)}
                    className="text-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Log Evidence Item
                  </Button>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {activeDispute.evidenceItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{item.type.replace("_", " ")}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {formatDate(item.uploadedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chronological Activity Timeline */}
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" />
                    <span>Chronological Dispute Activity Log</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {(activeDispute.activityLogs || []).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-xs">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{log.action}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {log.timestamp.slice(0, 10)}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{log.details}</p>
                          <span className="text-[10px] text-blue-600 font-semibold">{log.actor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ODR Escalation Bar */}
              {activeDispute.status !== "resolved" && activeDispute.status !== "escalated_to_odr" && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Direct Negotiations Deadlocked?
                    </h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      You can formally escalate this claim to the Ministry of MSME Online Dispute Resolution Portal.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => escalateDisputeToODR(activeDispute.id)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs shrink-0"
                  >
                    <AlertOctagon className="w-3.5 h-3.5 mr-1.5" />
                    Escalate to MSME ODR
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-600">No dispute case selected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Open New Dispute */}
      {isNewDisputeModalOpen && (
        <Modal
          isOpen={isNewDisputeModalOpen}
          onClose={() => setIsNewDisputeModalOpen(false)}
          title="Open New Buyer-Seller Dispute Case"
          className="max-w-lg"
        >
          <form onSubmit={handleCreateDisputeSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Existing Customer Invoice (from Receivables)
              </label>
              <select
                value={newDisputeForm.invoiceNumber}
                onChange={(e) => handleSelectInvoiceForDispute(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                required
              >
                <option value="">-- Choose an overdue or pending invoice --</option>
                {receivables.map((r) => (
                  <option key={r.id} value={r.invoiceNumber}>
                    {r.invoiceNumber} - {r.customerName} ({formatCurrency(r.balanceDue)} due {r.dueDate})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Counterparty (Buyer Name)
                </label>
                <input
                  type="text"
                  required
                  value={newDisputeForm.counterpartyName}
                  onChange={(e) => setNewDisputeForm({ ...newDisputeForm, counterpartyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Disputed Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={newDisputeForm.disputeAmount}
                  onChange={(e) => setNewDisputeForm({ ...newDisputeForm, disputeAmount: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contention Category
              </label>
              <select
                value={newDisputeForm.issueCategory}
                onChange={(e) => setNewDisputeForm({ ...newDisputeForm, issueCategory: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="delayed_payment">Delayed Payment Beyond Credit Terms</option>
                <option value="defective_goods">Alleged Quality / Specification Non-Conformance</option>
                <option value="deduction_unauthorized">Unauthorized Debit Note / Price Deduction</option>
                <option value="scope_dispute">Purchase Order Scope & Deliverable Dispute</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seller Opening Statement
              </label>
              <textarea
                required
                rows={3}
                value={newDisputeForm.sellerStatement}
                onChange={(e) => setNewDisputeForm({ ...newDisputeForm, sellerStatement: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="State the facts of dispatch, signed challan, and payment default..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewDisputeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Register Dispute Case
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Propose Settlement */}
      {isSettlementModalOpen && (
        <Modal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          title="Propose Settlement Terms"
          className="max-w-md"
        >
          <form onSubmit={handleProposeSettlementSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Proposed Settlement Offer Amount (₹)
              </label>
              <input
                type="number"
                required
                value={settlementForm.offerAmount}
                onChange={(e) => setSettlementForm({ ...settlementForm, offerAmount: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Settlement Conditions & Terms
              </label>
              <textarea
                required
                rows={3}
                value={settlementForm.terms}
                onChange={(e) => setSettlementForm({ ...settlementForm, terms: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 10% credit discount provided full payment is cleared via RTGS within 5 business days..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSettlementModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Submit Proposal
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Evidence */}
      {isEvidenceModalOpen && (
        <Modal
          isOpen={isEvidenceModalOpen}
          onClose={() => setIsEvidenceModalOpen(false)}
          title="Log Documentary Evidence Item"
          className="max-w-md"
        >
          <form onSubmit={handleAddEvidenceSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Signed Delivery Challan #DEL-8802"
                value={evidenceForm.title}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Document Type
              </label>
              <select
                value={evidenceForm.type}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, type: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="delivery_proof">Proof of Delivery / Signed Challan</option>
                <option value="invoice">Commercial Tax Invoice</option>
                <option value="email_thread">Email Correspondence / Acceptance</option>
                <option value="contract">Purchase Order / Contract Agreement</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEvidenceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save to Evidence Vault
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Submit Party Response */}
      {isResponseModalOpen && (
        <Modal
          isOpen={isResponseModalOpen}
          onClose={() => setIsResponseModalOpen(false)}
          title={`Update ${responseForm.party === "buyer" ? "Buyer Counterparty" : "Seller"} Position Statement`}
          className="max-w-md"
        >
          <form onSubmit={handleSubmitResponseSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Position Statement
              </label>
              <textarea
                required
                rows={4}
                value={responseForm.statement}
                onChange={(e) => setResponseForm({ ...responseForm, statement: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsResponseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Statement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Record Settlement Payout */}
      {isPaymentModalOpen && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Record Settlement Payment Received"
          className="max-w-md"
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Disbursed Settlement Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="e.g. 50000"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirm Payout
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
