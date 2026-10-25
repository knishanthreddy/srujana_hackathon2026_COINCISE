"use client";

import React, { useRef } from "react";
import {
  Printer,
  Download,
  Share2,
  X,
  Building2,
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { FullInvoice } from "@/lib/invoice-types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoicePreviewModalProps {
  invoice: FullInvoice | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Convert number to Indian currency words representation.
 */
function numberToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  const num = Math.floor(amount);
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert2(n: number): string {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const unitPart = units[n % 10];
    return tens[Math.floor(n / 10)] + (unitPart ? " " + unitPart : "");
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const rem = num % 100;

  const parts: string[] = [];
  if (crore > 0) parts.push(convert2(crore) + " Crore");
  if (lakh > 0) parts.push(convert2(lakh) + " Lakh");
  if (thousand > 0) parts.push(convert2(thousand) + " Thousand");
  if (hundred > 0) parts.push(convert2(hundred) + " Hundred");
  if (rem > 0) parts.push(convert2(rem));

  return parts.join(" ") + " Rupees Only";
}

export function InvoicePreviewModal({ invoice, isOpen, onClose }: InvoicePreviewModalProps) {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Container */}
      <div className="bg-[#F7F3EA] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-[#E8E1D5] overflow-hidden">
        {/* Top Header & Actions Bar (Hidden during print) */}
        <div className="p-4 sm:px-6 bg-white border-b border-[#E8E1D5] flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FCE4D8] text-[#F15A35] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#242321]">
                Invoice Preview: {invoice.invoiceNumber}
              </h3>
              <p className="text-[11px] text-[#7A7369]">
                Professional Tax Invoice • Status: <span className="capitalize font-semibold">{invoice.status}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs rounded-xl hidden sm:flex items-center gap-1.5 border-[#E8E1D5]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#138C83]" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? "Link Copied" : "Share"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs rounded-xl flex items-center gap-1.5 border-[#E8E1D5]"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[#F7F3EA] flex items-center justify-center text-[#7A7369] hover:text-[#242321] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Sheet */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-[#F7F3EA] print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printRef}
            className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-[#E8E1D5] shadow-sm max-w-3xl mx-auto print:border-0 print:shadow-none print:max-w-none print:p-0"
          >
            {/* Invoice Top Branding */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[#E8E1D5]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl font-extrabold tracking-tight text-[#242321]">COINCISE</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DDEFE8] text-[#138C83] border border-[#138C83]/20">
                    MSME VERIFIED
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#242321]">{invoice.seller.name}</h2>
                {invoice.seller.tradeName && invoice.seller.tradeName !== invoice.seller.name && (
                  <p className="text-xs text-[#7A7369] font-medium">{invoice.seller.tradeName}</p>
                )}
                <p className="text-xs text-[#7A7369] mt-1 max-w-xs">{invoice.seller.address}</p>
                <p className="text-xs text-[#7A7369]">
                  {invoice.seller.city}, {invoice.seller.state} - {invoice.seller.postalCode}
                </p>
                <div className="mt-2 text-xs text-[#242321] font-mono">
                  {invoice.seller.gstin && (
                    <span className="mr-3">
                      GSTIN: <strong>{invoice.seller.gstin}</strong>
                    </span>
                  )}
                  {invoice.seller.pan && (
                    <span>
                      PAN: <strong>{invoice.seller.pan}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="text-left sm:text-right">
                <span className="text-2xl font-black text-[#F15A35] tracking-tight block">TAX INVOICE</span>
                <p className="text-sm font-mono font-bold text-[#242321] mt-1">#{invoice.invoiceNumber}</p>
                <div className="mt-3 space-y-1 text-xs text-[#7A7369]">
                  <div>
                    Invoice Date: <strong className="text-[#242321]">{formatDate(invoice.issueDate)}</strong>
                  </div>
                  <div>
                    Payment Due: <strong className="text-[#242321]">{formatDate(invoice.dueDate)}</strong>
                  </div>
                  <div>
                    Terms: <strong className="text-[#242321]">{invoice.paymentTerms}</strong>
                  </div>
                  <div>
                    Place of Supply:{" "}
                    <strong className="text-[#242321]">
                      {invoice.customer.state} ({invoice.isInterState ? "Inter-State / IGST" : "Intra-State / CGST+SGST"})
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To / Client Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-[#E8E1D5]">
              <div>
                <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block mb-1">
                  Billed To (Customer)
                </span>
                <h3 className="font-bold text-sm text-[#242321]">{invoice.customer.name}</h3>
                <p className="text-xs text-[#7A7369] mt-0.5">{invoice.customer.address}</p>
                <p className="text-xs text-[#7A7369]">
                  {invoice.customer.city}, {invoice.customer.state} - {invoice.customer.postalCode}
                </p>
                {invoice.customer.gstin && (
                  <p className="text-xs font-mono text-[#242321] mt-1">
                    GSTIN: <strong>{invoice.customer.gstin}</strong>
                  </p>
                )}
                {invoice.customer.phone && <p className="text-xs text-[#7A7369]">Phone: {invoice.customer.phone}</p>}
                {invoice.customer.email && <p className="text-xs text-[#7A7369]">Email: {invoice.customer.email}</p>}
              </div>

              {/* Banking & Remittance Instructions */}
              <div className="p-3.5 bg-[#F7F3EA] rounded-2xl border border-[#E8E1D5] text-xs">
                <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block mb-1">
                  Bank Settlement Details
                </span>
                <div className="space-y-1 text-[#242321]">
                  <div>Bank: <strong>{invoice.bankDetails.bankName}</strong></div>
                  <div className="font-mono">A/C No: <strong>{invoice.bankDetails.accountNumber}</strong></div>
                  <div className="font-mono">IFSC: <strong>{invoice.bankDetails.ifsc}</strong></div>
                  <div>A/C Name: <strong>{invoice.bankDetails.accountName}</strong></div>
                  {invoice.bankDetails.upiId && (
                    <div>UPI VPA: <strong className="text-[#138C83]">{invoice.bankDetails.upiId}</strong></div>
                  )}
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F3EA] border-b border-[#E8E1D5] text-[#7A7369] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-center">GST Rate</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E1D5]/60 text-[#242321]">
                  {invoice.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-3 px-3 text-[#7A7369] font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold max-w-xs">{it.description}</td>
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-[#7A7369]">
                        {it.hsnSac || "—"}
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(it.taxableAmount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-[11px]">{it.taxRate}%</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {formatCurrency(it.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#E8E1D5]">
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block">
                    Amount in Words
                  </span>
                  <p className="text-xs font-semibold text-[#242321] mt-0.5 italic">
                    {numberToWords(invoice.totalAmount)}
                  </p>
                </div>

                {invoice.notes && (
                  <div>
                    <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block">
                      Notes & Instructions
                    </span>
                    <p className="text-xs text-[#7A7369] mt-0.5 leading-relaxed">{invoice.notes}</p>
                  </div>
                )}

                {invoice.termsConditions && (
                  <div>
                    <span className="text-[11px] font-bold text-[#7A7369] uppercase tracking-wider block">
                      Terms & Conditions
                    </span>
                    <p className="text-[11px] text-[#7A7369] mt-0.5 leading-relaxed">
                      {invoice.termsConditions}
                    </p>
                  </div>
                )}
              </div>

              {/* Numbers Summary */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 text-[#7A7369]">
                  <span>Subtotal (Gross):</span>
                  <span className="font-mono text-[#242321]">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between py-1 text-[#138C83]">
                    <span>Discount:</span>
                    <span className="font-mono">- {formatCurrency(invoice.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-[#7A7369] font-medium border-t border-[#E8E1D5]/60 pt-1">
                  <span>Taxable Amount:</span>
                  <span className="font-mono text-[#242321]">{formatCurrency(invoice.taxableSubtotal)}</span>
                </div>

                {invoice.isInterState ? (
                  <div className="flex justify-between py-1 text-[#7A7369]">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-mono text-[#242321]">{formatCurrency(invoice.igstAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1 text-[#7A7369]">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono text-[#242321]">{formatCurrency(invoice.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-[#7A7369]">
                      <span>State GST (SGST):</span>
                      <span className="font-mono text-[#242321]">{formatCurrency(invoice.sgstAmount)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-2 text-sm font-extrabold text-[#242321] border-t-2 border-[#242321]">
                  <span>Total Invoice Value:</span>
                  <span className="font-mono text-base text-[#F15A35]">{formatCurrency(invoice.totalAmount)}</span>
                </div>

                {invoice.paidAmount > 0 && (
                  <div className="flex justify-between py-1 text-xs text-[#138C83] font-semibold">
                    <span>Amount Paid / Settled:</span>
                    <span className="font-mono">- {formatCurrency(invoice.paidAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 text-xs font-bold text-[#242321] bg-[#F7F3EA] px-3 rounded-xl border border-[#E8E1D5]">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(invoice.balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Signature & Statutory Disclaimer */}
            <div className="mt-8 pt-6 border-t border-[#E8E1D5] flex flex-col sm:flex-row items-end justify-between gap-6">
              <div className="text-[10px] text-[#A69C8D] max-w-sm">
                <p>
                  <strong>Statutory Notice:</strong> This document is a commercial invoice generated via COINCISE.
                  Regulated B2B supplies with turnover exceeding statutory thresholds require electronic invoice authentication (e-Invoice / IRN) through the official GSTN portal.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-[#7A7369]">For {invoice.seller.name}</p>
                <div className="h-12 w-36 border-b border-[#242321] mt-2 ml-auto" />
                <p className="text-[11px] font-bold text-[#242321] mt-1">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
