"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOnboardingData } from "@/lib/onboarding-service";
import { createInvoice, calculateLineItem, calculateInvoiceTotals } from "@/lib/invoice-service";
import { formatCurrency } from "@/lib/utils";

interface LineItemState {
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

export default function NewInvoicePage() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(getOnboardingData());

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [paymentTerms, setPaymentTerms] = useState("Net 30");

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("Bengaluru");
  const [customerState, setCustomerState] = useState("Karnataka");
  const [customerPostalCode, setCustomerPostalCode] = useState("560001");

  // Line items
  const [items, setItems] = useState<LineItemState[]>([
    {
      description: "",
      hsnSac: "",
      quantity: 1,
      unit: "pcs",
      unitPrice: 0,
      discountPercent: 0,
      taxRate: 18,
    },
  ]);

  const [notes, setNotes] = useState("Thank you for your business. Please quote this invoice number on all remittances.");
  const [terms, setTerms] = useState("Payment is due within agreed terms. Late payments accrue interest at 18% p.a. per MSMED Act.");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setOnboarding(getOnboardingData());
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        hsnSac: "",
        quantity: 1,
        unit: "pcs",
        unitPrice: 0,
        discountPercent: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = <K extends keyof LineItemState>(
    index: number,
    field: K,
    val: LineItemState[K]
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Live Totals Calculation
  const sellerState = onboarding.profile.state || "Karnataka";
  const computedItems = items.map((it, idx) => {
    const calc = calculateLineItem(it);
    return {
      id: `it-${idx}`,
      ...it,
      taxableAmount: calc.taxableAmount,
      taxAmount: calc.taxAmount,
      totalAmount: calc.totalAmount,
    };
  });

  const totals = calculateInvoiceTotals(computedItems, sellerState, customerState);

  const handleSubmit = (status: "draft" | "issued") => {
    setFormErrors({});

    if (!customerName.trim()) {
      setFormErrors({ customerName: "Customer or Company name is required." });
      return;
    }

    if (items.some((it) => !it.description.trim() || it.unitPrice <= 0)) {
      setFormErrors({ items: "All items must have a valid description and unit price greater than 0." });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = createInvoice({
        invoiceNumber: invoiceNumber.trim() || undefined,
        issueDate,
        dueDate,
        paymentTerms,
        customer: {
          name: customerName.trim(),
          gstin: customerGstin.trim() || undefined,
          email: customerEmail.trim() || undefined,
          phone: customerPhone.trim() || undefined,
          address: customerAddress.trim() || "Facility Address",
          city: customerCity.trim() || "Bengaluru",
          state: customerState,
          postalCode: customerPostalCode.trim() || "560001",
        },
        items: items.map((it) => ({
          description: it.description.trim(),
          hsnSac: it.hsnSac.trim() || undefined,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent,
          taxRate: it.taxRate,
        })),
        notes,
        termsConditions: terms,
        status,
      });

      if (res.success) {
        router.push("/invoices");
      } else {
        setFormErrors(res.errors || { general: "Failed to generate invoice." });
      }
    } catch (err) {
      setFormErrors({ general: err instanceof Error ? err.message : "Error creating invoice." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E1D5] hover:bg-[#F7F3EA] flex items-center justify-center text-[#242321] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#242321] tracking-tight">Create Tax Invoice</h1>
            <p className="text-xs text-[#7A7369] mt-0.5">
              Generate a professional GST-compliant invoice linked directly with your Receivables and Cash-Flow Forecast.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSubmit("draft")}
            disabled={isSubmitting}
            className="rounded-xl text-xs border-[#E8E1D5]"
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSubmit("issued")}
            disabled={isSubmitting}
            className="rounded-xl text-xs bg-[#F15A35] text-white hover:bg-[#d94825] shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Generate & Issue Invoice
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 bg-[#FCE4D8] border border-[#F15A35]/30 rounded-2xl flex items-start gap-3 text-xs text-[#F15A35]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Please resolve the following:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {Object.values(formErrors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Seller & Invoice Metadata */}
          <Card className="p-5 bg-white border border-[#E8E1D5] rounded-3xl shadow-sm">
            <h3 className="font-bold text-sm text-[#242321] mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#F15A35]" />
              Seller & Invoice Details
            </h3>

            {/* Seller profile snapshot */}
            <div className="p-3.5 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5] text-xs text-[#7A7369] mb-4 flex flex-col sm:flex-row justify-between gap-2">
              <div>
                <strong className="text-[#242321]">
                  {onboarding.profile.tradeName || onboarding.profile.mcaLegalName || "Acme Precision Technologies"}
                </strong>
                <p className="mt-0.5 font-mono text-[11px]">
                  GSTIN: {onboarding.profile.gstin || "29AABCU9603R1ZM"} • State: {sellerState}
                </p>
              </div>
              <Link href="/settings" className="text-xs text-[#F15A35] font-semibold hover:underline self-start">
                Edit Profile
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">
                  Invoice Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto (e.g. INV-2026-003)"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-mono text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">Issue Date *</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-medium text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">Payment Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-medium text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>
            </div>
          </Card>

          {/* 2. Customer Details */}
          <Card className="p-5 bg-white border border-[#E8E1D5] rounded-3xl shadow-sm">
            <h3 className="font-bold text-sm text-[#242321] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#138C83]" />
              Billed To (Customer Details)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Solutions Ltd"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-semibold text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">Customer GSTIN</label>
                <input
                  type="text"
                  placeholder="e.g. 29AAACA2201R1Z8"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-mono text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">State (Place of Supply) *</label>
                <select
                  value={customerState}
                  onChange={(e) => setCustomerState(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs font-medium text-[#242321] outline-none focus:border-[#F15A35]"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st} {st === sellerState ? "(Intra-State: CGST+SGST)" : "(Inter-State: IGST)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="billing@customer.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Building, Street, Industrial Area"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl px-3 py-2 text-xs text-[#242321] outline-none focus:border-[#F15A35]"
                />
              </div>
            </div>
          </Card>

          {/* 3. Itemized Products & Services */}
          <Card className="p-5 bg-white border border-[#E8E1D5] rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#242321]">Products & Services (Line Items)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="text-xs rounded-xl flex items-center gap-1 border-[#E8E1D5]"
              >
                <Plus className="w-3.5 h-3.5 text-[#F15A35]" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const lineCalc = calculateLineItem(item);
                return (
                  <div
                    key={index}
                    className="p-3.5 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-[#7A7369] mb-1">
                          Item Description / Specification *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CNC Milled Aluminum Components"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          className="w-full bg-white border border-[#E8E1D5] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242321] outline-none focus:border-[#F15A35]"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 hover:bg-white rounded-lg text-[#F15A35] transition-colors mt-5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-[#7A7369]">HSN / SAC</label>
                        <input
                          type="text"
                          placeholder="84069000"
                          value={item.hsnSac}
                          onChange={(e) => handleItemChange(index, "hsnSac", e.target.value)}
                          className="w-full bg-white border border-[#E8E1D5] rounded-lg px-2 py-1 text-xs font-mono text-[#242321] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#7A7369]">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-white border border-[#E8E1D5] rounded-lg px-2 py-1 text-xs font-semibold text-[#242321] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#7A7369]">Unit Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-white border border-[#E8E1D5] rounded-lg px-2 py-1 text-xs font-semibold text-[#242321] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#7A7369]">Discount %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) =>
                            handleItemChange(index, "discountPercent", parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-white border border-[#E8E1D5] rounded-lg px-2 py-1 text-xs text-[#242321] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#7A7369]">GST Rate %</label>
                        <select
                          value={item.taxRate}
                          onChange={(e) =>
                            handleItemChange(index, "taxRate", parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-white border border-[#E8E1D5] rounded-lg px-2 py-1 text-xs font-medium text-[#242321] outline-none"
                        >
                          <option value="0">0% (Nil)</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18% (Standard)</option>
                          <option value="28">28% (Luxury/Heavy)</option>
                        </select>
                      </div>
                    </div>

                    {/* Calculated row subtotal */}
                    <div className="flex justify-between items-center text-[11px] text-[#7A7369] pt-1 border-t border-[#E8E1D5]/60">
                      <span>
                        Taxable: <strong className="text-[#242321]">{formatCurrency(lineCalc.taxableAmount)}</strong> •
                        GST ({item.taxRate}%): <strong className="text-[#242321]">{formatCurrency(lineCalc.taxAmount)}</strong>
                      </span>
                      <span className="font-bold text-xs text-[#242321]">
                        Line Total: {formatCurrency(lineCalc.totalAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 4. Notes & Payment Terms */}
          <Card className="p-5 bg-white border border-[#E8E1D5] rounded-3xl shadow-sm space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">
                Notes / Special Payment Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl p-2.5 text-xs text-[#242321] outline-none focus:border-[#F15A35]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#7A7369] mb-1">Terms & Conditions</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full bg-[#F7F3EA] border border-[#E8E1D5] rounded-xl p-2.5 text-xs text-[#7A7369] outline-none focus:border-[#F15A35]"
              />
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Financial Summary Card */}
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-[#E8E1D5] rounded-3xl shadow-sm sticky top-24">
            <h3 className="font-bold text-base text-[#242321] pb-3 border-b border-[#E8E1D5]">
              Live Invoice Calculation
            </h3>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#7A7369]">
                <span>Gross Subtotal:</span>
                <span className="font-mono text-[#242321]">{formatCurrency(totals.subtotal)}</span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-[#138C83]">
                  <span>Total Discount:</span>
                  <span className="font-mono">- {formatCurrency(totals.totalDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#7A7369] font-medium border-t border-[#E8E1D5]/60 pt-2">
                <span>Taxable Value:</span>
                <span className="font-mono text-[#242321]">{formatCurrency(totals.taxableSubtotal)}</span>
              </div>

              {totals.isInterState ? (
                <div className="flex justify-between text-[#7A7369]">
                  <span>IGST (Integrated Tax):</span>
                  <span className="font-mono text-[#242321]">{formatCurrency(totals.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[#7A7369]">
                    <span>CGST (Central Tax):</span>
                    <span className="font-mono text-[#242321]">{formatCurrency(totals.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[#7A7369]">
                    <span>SGST (State Tax):</span>
                    <span className="font-mono text-[#242321]">{formatCurrency(totals.sgstAmount)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-sm font-extrabold text-[#242321] border-t-2 border-[#242321] pt-3 mt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-lg text-[#F15A35]">{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>

            {/* Statutory Tax Mode notice */}
            <div className="p-3 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5] text-[11px] text-[#7A7369] space-y-1">
              <span className="font-bold text-[#242321] block">Tax Regime:</span>
              <p>
                {totals.isInterState ? (
                  <>
                    <strong className="text-[#F15A35]">Inter-State Supply</strong> ({sellerState} &rarr; {customerState}). IGST applied at standard rates.
                  </>
                ) : (
                  <>
                    <strong className="text-[#138C83]">Intra-State Supply</strong> (Within {sellerState}). Split equally into 50% CGST + 50% SGST.
                  </>
                )}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                variant="primary"
                onClick={() => handleSubmit("issued")}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-2xl text-xs font-bold bg-[#F15A35] text-white hover:bg-[#d94825] shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Issue & Add to Receivables
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSubmit("draft")}
                disabled={isSubmitting}
                className="w-full py-2 rounded-2xl text-xs border-[#E8E1D5]"
              >
                Save as Draft
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
