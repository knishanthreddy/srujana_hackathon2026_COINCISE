"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DEMO_DISPUTES } from "@/lib/demo-data";
import { DisputeCase } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FairResolvePage() {
  const [disputes, setDisputes] = useState<DisputeCase[]>(DEMO_DISPUTES);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string>("disp-01");
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementOffer, setSettlementOffer] = useState("");
  const [settlementTerms, setSettlementTerms] = useState("");
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<"invoice" | "delivery_proof" | "email_thread" | "contract">("invoice");

  const activeDispute =
    disputes.find((d) => d.id === selectedDisputeId) || disputes[0];

  const handleProposeSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementOffer || isNaN(Number(settlementOffer))) return;

    setDisputes((prev) =>
      prev.map((d) =>
        d.id === activeDispute.id
          ? {
              ...d,
              status: "settlement_proposed",
              settlementOfferAmount: Number(settlementOffer),
              settlementTerms: settlementTerms || `Proposed settlement of ${formatCurrency(Number(settlementOffer))} with terms agreed.`,
              lastUpdated: new Date().toISOString().split("T")[0],
            }
          : d
      )
    );

    setIsSettlementModalOpen(false);
    setSettlementOffer("");
    setSettlementTerms("");
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle) return;

    const newEvidence = {
      id: `ev-${Date.now()}`,
      title: evidenceTitle,
      type: evidenceType,
      uploadedAt: new Date().toISOString().split("T")[0],
    };

    setDisputes((prev) =>
      prev.map((d) =>
        d.id === activeDispute.id
          ? {
              ...d,
              evidenceItems: [...d.evidenceItems, newEvidence],
              lastUpdated: new Date().toISOString().split("T")[0],
            }
          : d
      )
    );

    setIsEvidenceModalOpen(false);
    setEvidenceTitle("");
  };

  const handleAcceptSettlement = (id: string) => {
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "resolved",
              lastUpdated: new Date().toISOString().split("T")[0],
            }
          : d
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Official Legal Disclaimer & MSME ODR Portal Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              COMMERCIAL AMICABLE SETTLEMENT
            </span>
            <span className="text-xs text-slate-300">
              FairResolve Direct Dispute Workspace
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Pre-Dispute Mediation & Payment Recovery
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Streamline disputed receivables with counterparties, exchange audit-ready evidence, and structure mutual discount settlements before statutory legal escalation.
          </p>
        </div>

        {/* Official Portal External Link */}
        <div className="p-3 bg-white/10 rounded-xl border border-white/20 shrink-0 flex flex-col sm:items-end gap-1.5">
          <span className="text-[11px] text-slate-300">Statutory Redressal Portal</span>
          <a
            href="https://odr.msme.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <span>Official MSME ODR Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-[10px] text-slate-400">Under MSMED Act 2006</span>
        </div>
      </div>

      {/* Mandatory Statutory Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wide text-amber-800">
            Regulatory Disclosure:
          </span>{" "}
          FairResolve is an internal business tool for informal communication, evidence collation, and amicable settlement between buyers and sellers. It is <strong>NOT</strong> a government-authorized dispute resolution agency or court. If mutual consensus is not reached, formal statutory conciliation should be filed on the{" "}
          <a
            href="https://odr.msme.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline font-semibold"
          >
            official Government MSME ODR Portal
          </a>.
        </div>
      </div>

      {/* Dispute Management Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Dispute Cases List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Disputed Cases</CardTitle>
              <CardDescription>
                {disputes.length} active commercial disputes tracked
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {disputes.map((caseItem) => {
              const isSelected = caseItem.id === activeDispute.id;
              return (
                <div
                  key={caseItem.id}
                  onClick={() => setSelectedDisputeId(caseItem.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {caseItem.caseNumber}
                    </span>
                    <Badge
                      variant={
                        caseItem.status === "resolved"
                          ? "success"
                          : caseItem.status === "settlement_proposed"
                          ? "primary"
                          : "warning"
                      }
                      size="sm"
                    >
                      {caseItem.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                    {caseItem.counterpartyName}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">
                    Invoice: {caseItem.invoiceNumber} • Due: {formatDate(caseItem.originalDueDate)}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Disputed Sum:</span>
                    <span className="font-bold text-rose-600">
                      {formatCurrency(caseItem.disputeAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right: Active Case Detail & Resolution Workspace */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{activeDispute.counterpartyName}</CardTitle>
                <span className="text-xs font-mono text-slate-500">
                  [{activeDispute.caseNumber}]
                </span>
              </div>
              <CardDescription>
                Invoice: {activeDispute.invoiceNumber} • Category: {activeDispute.issueCategory.replace("_", " ")}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEvidenceModalOpen(true)}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload Evidence
              </Button>
              {activeDispute.status !== "resolved" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSettlementOffer(
                      activeDispute.settlementOfferAmount
                        ? activeDispute.settlementOfferAmount.toString()
                        : Math.round(activeDispute.disputeAmount * 0.9).toString()
                    );
                    setSettlementTerms(activeDispute.settlementTerms || "");
                    setIsSettlementModalOpen(true);
                  }}
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                  Propose Settlement
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-0">
            {/* Amount & Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Original Claim</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatCurrency(activeDispute.disputeAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Settlement Target</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  {activeDispute.settlementOfferAmount
                    ? formatCurrency(activeDispute.settlementOfferAmount)
                    : "Under Negotiation"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Last Updated</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {formatDate(activeDispute.lastUpdated)}
                </p>
              </div>
            </div>

            {/* Case Background Notes */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Case Background & Counterparty Notes
              </h4>
              <p className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                {activeDispute.notes}
              </p>
            </div>

            {/* Settlement Offer Summary */}
            {activeDispute.settlementTerms && (
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-indigo-600" />
                    Proposed Amicable Settlement Terms
                  </span>
                  <Badge variant="primary" size="sm">
                    Active Offer
                  </Badge>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed mb-3">
                  {activeDispute.settlementTerms}
                </p>
                {activeDispute.status !== "resolved" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                      onClick={() => handleAcceptSettlement(activeDispute.id)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Mark Settlement Mutually Accepted
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Collateral Evidence Repository */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Supporting Documentation & Audit Trail ({activeDispute.evidenceItems.length})
                </h4>
              </div>

              <div className="space-y-2">
                {activeDispute.evidenceItems.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900">{ev.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          Type: {ev.type.replace("_", " ")} • Filed: {formatDate(ev.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="neutral" size="sm">
                      Verified
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Escalation Options */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Settlement stalled? Prepare dossier for formal conciliation:
              </span>
              <a
                href="https://odr.msme.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <span>Proceed to MSME ODR Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Propose Settlement Modal */}
      <Modal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        title="Formulate Settlement Offer"
        description={`Draft a structured payment compromise for ${activeDispute.counterpartyName}`}
      >
        <form onSubmit={handleProposeSettlement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Settlement Amount (₹) *
            </label>
            <input
              type="number"
              required
              placeholder="e.g. 200000"
              value={settlementOffer}
              onChange={(e) => setSettlementOffer(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-500">
              Original claim: {formatCurrency(activeDispute.disputeAmount)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Settlement Terms & Concessions *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Issue credit note of ₹20,000 against future orders provided remainder is paid within 5 days..."
              value={settlementTerms}
              onChange={(e) => setSettlementTerms(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettlementModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Send Offer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Evidence Modal */}
      <Modal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        title="Add Supporting Evidence"
        description="Attach documented evidence (POs, quality inspections, email chains)"
      >
        <form onSubmit={handleAddEvidence} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Quality Inspection Calibration Sheet"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Category
            </label>
            <select
              value={evidenceType}
              onChange={(e) =>
                setEvidenceType(
                  e.target.value as "invoice" | "delivery_proof" | "email_thread" | "contract"
                )
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="invoice">Invoice / Delivery Challan</option>
              <option value="delivery_proof">Delivery Proof / Inspection Sign-off</option>
              <option value="email_thread">Written Email Correspondence</option>
              <option value="contract">Purchase Agreement / Terms</option>
            </select>
          </div>

          <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-700">Simulate Document Attachment</p>
            <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEvidenceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Evidence
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
