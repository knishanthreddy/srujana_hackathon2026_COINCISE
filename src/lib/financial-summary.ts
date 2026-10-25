import type {
  OnboardingOpeningFinances,
  BankAccountItem,
  OpeningReceivableItem,
  OpeningPayableItem,
  InventoryItem,
  FixedAssetItem,
  SupplierAdvanceItem,
  LiabilityItem,
} from "./onboarding-types.ts";

/**
 * Decimal-safe arithmetic helpers to avoid IEEE-754 floating point precision issues.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function safeAdd(...numbers: number[]): number {
  const sum = numbers.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  return round2(sum);
}

export function safeSub(a: number, b: number): number {
  return round2((Number(a) || 0) - (Number(b) || 0));
}

export interface FinancialSummaryBreakdown {
  cashInHand: number;
  grossBankBalances: number;
  restrictedBankFunds: number;
  availableBankBalances: number;
  otherLiquidFunds: number;
  eligibleShortTermInvestments: number;
  restrictedShortTermInvestments: number;
  outstandingReceivables: number;
  supplierAdvances: number;
  inventoryValuation: number;
  fixedAssetsBookValue: number;
  otherCurrentAssets: number;
  outstandingPayables: number;
  loans: number;
  taxesPayable: number;
  payrollObligations: number;
  otherLiabilities: number;
}

export interface FinancialSummaryResult {
  // 1. Total liquid resources
  totalLiquidResources: number;
  // 2. Available operating cash
  availableOperatingCash: number;
  // 3. Minimum cash reserve
  minimumCashReserve: number;
  // 4. Reserve surplus or shortfall
  reserveSurplusOrShortfall: number;
  isReserveSurplus: boolean;
  // 5. Total recorded assets
  totalRecordedAssets: number;
  // 6. Total recorded liabilities
  totalRecordedLiabilities: number;
  // 7. Approximate net assets
  approximateNetAssets: number;
  // Labeling & breakdown
  isEstimate: boolean;
  legalDisclaimer: string;
  breakdown: FinancialSummaryBreakdown;
}

export interface FinancialValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Reusable pure calculation function for COINCISE financial summaries.
 * Strictly implements the definitions:
 *
 * Total Liquid Resources =
 * Cash in Hand + Bank Balances + Other Liquid Funds + Eligible Short-Term Investments
 *
 * Available Operating Cash =
 * Cash in Hand + Available Bank Balances + Other Immediately Available Funds
 * (where Available Bank Balances = currentBalance - restrictedAmount, restricted funds excluded once)
 * (Short-term investments included only when availability has been established)
 *
 * Reserve Surplus =
 * Available Operating Cash - Minimum Cash Reserve
 *
 * Approximate Net Assets =
 * Total Recorded Assets - Total Recorded Liabilities
 */
export function calculateFinancialSummary(
  finances: OnboardingOpeningFinances
): FinancialSummaryResult {
  const cashInHand = round2(Math.max(0, Number(finances.cashInHand) || 0));

  // Bank Balances:
  // Gross = sum(b.currentBalance)
  // Restricted = sum(b.restrictedAmount)
  // Available = sum(max(0, b.currentBalance - b.restrictedAmount))
  let grossBankBalances = 0;
  let restrictedBankFunds = 0;
  let availableBankBalances = 0;

  for (const b of finances.bankAccounts || []) {
    const bal = round2(Math.max(0, Number(b.currentBalance) || 0));
    const restr = round2(Math.max(0, Number(b.restrictedAmount) || 0));
    const avail = round2(Math.max(0, bal - restr));

    grossBankBalances = safeAdd(grossBankBalances, bal);
    restrictedBankFunds = safeAdd(restrictedBankFunds, restr);
    availableBankBalances = safeAdd(availableBankBalances, avail);
  }

  const otherLiquidFunds = round2(Math.max(0, Number(finances.otherLiquidFunds) || 0));

  // Short-term investments:
  // Eligible for Total Liquid Resources
  const rawShortTerm = round2(Math.max(0, Number(finances.shortTermInvestments) || 0));
  // Short-term investments must be included in immediately available cash ONLY when availability has been established
  const isShortTermImmediate = Boolean(finances.isShortTermInvestmentImmediatelyAvailable);
  const eligibleShortTermInvestments = rawShortTerm;
  const immediateShortTermInvestments = isShortTermImmediate ? rawShortTerm : 0;
  const restrictedShortTermInvestments = isShortTermImmediate ? 0 : rawShortTerm;

  // 1. Total Liquid Resources = Cash in Hand + Bank Balances + Other Liquid Funds + Eligible Short-Term Investments
  const totalLiquidResources = safeAdd(
    cashInHand,
    grossBankBalances,
    otherLiquidFunds,
    eligibleShortTermInvestments
  );

  // 2. Available Operating Cash = Cash in Hand + Available Bank Balances + Other Immediately Available Funds
  // (Notice: restricted funds are excluded once through Available Bank Balances and NOT subtracted twice!)
  const otherImmediatelyAvailableFunds = safeAdd(otherLiquidFunds, immediateShortTermInvestments);
  const availableOperatingCash = safeAdd(
    cashInHand,
    availableBankBalances,
    otherImmediatelyAvailableFunds
  );

  // 3. Minimum Cash Reserve
  const minimumCashReserve = round2(Math.max(0, Number(finances.minimumReserve) || 0));

  // 4. Reserve Surplus or Shortfall = Available Operating Cash - Minimum Cash Reserve
  const reserveSurplusOrShortfall = safeSub(availableOperatingCash, minimumCashReserve);
  const isReserveSurplus = reserveSurplusOrShortfall >= 0;

  // Working Capital Assets:
  // Outstanding Receivables = sum(max(0, invoiceAmount - amountReceived))
  let outstandingReceivables = 0;
  for (const r of finances.receivables || []) {
    const invAmt = round2(Math.max(0, Number(r.invoiceAmount) || 0));
    const recdAmt = round2(Math.max(0, Number(r.amountReceived) || 0));
    outstandingReceivables = safeAdd(outstandingReceivables, Math.max(0, invAmt - recdAmt));
  }

  // Supplier Advances
  let supplierAdvances = 0;
  for (const a of finances.supplierAdvances || []) {
    supplierAdvances = safeAdd(supplierAdvances, Math.max(0, Number(a.advanceAmount) || 0));
  }

  // Inventory Valuation
  let inventoryValuation = 0;
  for (const i of finances.inventoryItems || []) {
    inventoryValuation = safeAdd(inventoryValuation, Math.max(0, Number(i.estimatedValue) || 0));
  }

  // Fixed Assets Net Book Value
  let fixedAssetsBookValue = 0;
  for (const fa of finances.fixedAssets || []) {
    fixedAssetsBookValue = safeAdd(
      fixedAssetsBookValue,
      Math.max(0, Number(fa.currentEstimatedValue) || 0)
    );
  }

  const otherCurrentAssets = round2(Math.max(0, Number(finances.otherCurrentAssets) || 0));

  // 5. Total Recorded Assets = Total Liquid Resources + Outstanding Receivables + Supplier Advances + Inventory Valuation + Fixed Assets + Other Current Assets
  // (Strict rule: Receivables, inventory, advances, and fixed assets are NOT treated as spendable cash, but are recorded as balance sheet assets!)
  const totalRecordedAssets = safeAdd(
    totalLiquidResources,
    outstandingReceivables,
    supplierAdvances,
    inventoryValuation,
    fixedAssetsBookValue,
    otherCurrentAssets
  );

  // Liabilities:
  // Outstanding Payables = sum(max(0, totalAmount - paidAmount))
  let outstandingPayables = 0;
  for (const p of finances.payables || []) {
    const tot = round2(Math.max(0, Number(p.totalAmount) || 0));
    const pd = round2(Math.max(0, Number(p.paidAmount) || 0));
    outstandingPayables = safeAdd(outstandingPayables, Math.max(0, tot - pd));
  }

  let loans = 0;
  for (const l of finances.loans || []) {
    loans = safeAdd(loans, Math.max(0, Number(l.amount) || 0));
  }

  let taxesPayable = 0;
  for (const t of finances.taxesPayable || []) {
    taxesPayable = safeAdd(taxesPayable, Math.max(0, Number(t.amount) || 0));
  }

  let payrollObligations = 0;
  for (const pr of finances.payrollObligations || []) {
    payrollObligations = safeAdd(payrollObligations, Math.max(0, Number(pr.amount) || 0));
  }

  let otherLiabilities = 0;
  for (const o of finances.otherLiabilities || []) {
    otherLiabilities = safeAdd(otherLiabilities, Math.max(0, Number(o.amount) || 0));
  }

  // 6. Total Recorded Liabilities
  const totalRecordedLiabilities = safeAdd(
    outstandingPayables,
    loans,
    taxesPayable,
    payrollObligations,
    otherLiabilities
  );

  // 7. Approximate Net Assets = Total Recorded Assets - Total Recorded Liabilities
  const approximateNetAssets = safeSub(totalRecordedAssets, totalRecordedLiabilities);

  return {
    totalLiquidResources,
    availableOperatingCash,
    minimumCashReserve,
    reserveSurplusOrShortfall,
    isReserveSurplus,
    totalRecordedAssets,
    totalRecordedLiabilities,
    approximateNetAssets,
    isEstimate: true,
    legalDisclaimer:
      "Management Financial Estimate: This summary is calculated from user-declared figures and operational records for cash-flow forecasting and decision support. It does not constitute an audited financial statement or statutory balance sheet under the Companies Act / ICAI standards.",
    breakdown: {
      cashInHand,
      grossBankBalances,
      restrictedBankFunds,
      availableBankBalances,
      otherLiquidFunds,
      eligibleShortTermInvestments,
      restrictedShortTermInvestments,
      outstandingReceivables,
      supplierAdvances,
      inventoryValuation,
      fixedAssetsBookValue,
      otherCurrentAssets,
      outstandingPayables,
      loans,
      taxesPayable,
      payrollObligations,
      otherLiabilities,
    },
  };
}

/**
 * Validates financial inputs for consistency, negative numbers, and required fields.
 */
export function validateFinancialInputs(
  finances: OnboardingOpeningFinances
): { isValid: boolean; errors: FinancialValidationError[] } {
  const errors: FinancialValidationError[] = [];

  // 1. Cash in Hand
  if (finances.cashInHand < 0) {
    errors.push({
      field: "cashInHand",
      message: "Physical cash in hand cannot be negative.",
      severity: "error",
    });
  }

  // 2. Minimum Reserve
  if (finances.minimumReserve < 0) {
    errors.push({
      field: "minimumReserve",
      message: "Minimum cash reserve floor cannot be negative.",
      severity: "error",
    });
  }

  // 3. Bank Accounts
  for (let idx = 0; idx < (finances.bankAccounts || []).length; idx++) {
    const b = finances.bankAccounts[idx];
    if (!b.bankName || !b.bankName.trim()) {
      errors.push({
        field: `bankAccounts[${idx}].bankName`,
        message: `Bank account #${idx + 1} requires a valid bank institution name.`,
        severity: "error",
      });
    }

    if (b.currentBalance < 0) {
      errors.push({
        field: `bankAccounts[${idx}].currentBalance`,
        message: `Account "${b.accountNickname || b.bankName}" has a negative ledger balance.`,
        severity: "error",
      });
    }

    if (b.restrictedAmount < 0) {
      errors.push({
        field: `bankAccounts[${idx}].restrictedAmount`,
        message: `Account "${b.accountNickname || b.bankName}" restricted funds cannot be negative.`,
        severity: "error",
      });
    }

    // Inconsistent balance check
    if (b.restrictedAmount > b.currentBalance) {
      errors.push({
        field: `bankAccounts[${idx}].restrictedAmount`,
        message: `Account "${b.accountNickname || b.bankName}" restricted funds (₹${b.restrictedAmount.toLocaleString("en-IN")}) exceed the ledger balance (₹${b.currentBalance.toLocaleString("en-IN")}).`,
        severity: "error",
      });
    }
  }

  // 4. Receivables
  for (let idx = 0; idx < (finances.receivables || []).length; idx++) {
    const r = finances.receivables[idx];
    if (!r.customerName || !r.customerName.trim()) {
      errors.push({
        field: `receivables[${idx}].customerName`,
        message: `Receivable invoice #${r.invoiceNumber || idx + 1} requires a customer name.`,
        severity: "error",
      });
    }

    if (!r.invoiceNumber || !r.invoiceNumber.trim()) {
      errors.push({
        field: `receivables[${idx}].invoiceNumber`,
        message: `Receivable for "${r.customerName || "Customer"}" requires an invoice number.`,
        severity: "error",
      });
    }

    if (r.invoiceAmount <= 0) {
      errors.push({
        field: `receivables[${idx}].invoiceAmount`,
        message: `Invoice #${r.invoiceNumber || idx + 1} total amount must be greater than zero.`,
        severity: "error",
      });
    }

    if (r.amountReceived < 0) {
      errors.push({
        field: `receivables[${idx}].amountReceived`,
        message: `Invoice #${r.invoiceNumber || idx + 1} amount received cannot be negative.`,
        severity: "error",
      });
    }

    // Inconsistent balance check
    if (r.amountReceived > r.invoiceAmount) {
      errors.push({
        field: `receivables[${idx}].amountReceived`,
        message: `Invoice #${r.invoiceNumber} amount received (₹${r.amountReceived.toLocaleString("en-IN")}) exceeds invoice total (₹${r.invoiceAmount.toLocaleString("en-IN")}).`,
        severity: "error",
      });
    }
  }

  // 5. Payables
  for (let idx = 0; idx < (finances.payables || []).length; idx++) {
    const p = finances.payables[idx];
    if (!p.vendorName || !p.vendorName.trim()) {
      errors.push({
        field: `payables[${idx}].vendorName`,
        message: `Payable bill #${p.invoiceNumber || idx + 1} requires a vendor name.`,
        severity: "error",
      });
    }

    if (!p.invoiceNumber || !p.invoiceNumber.trim()) {
      errors.push({
        field: `payables[${idx}].invoiceNumber`,
        message: `Payable for "${p.vendorName || "Vendor"}" requires a bill/invoice number.`,
        severity: "error",
      });
    }

    if (p.totalAmount <= 0) {
      errors.push({
        field: `payables[${idx}].totalAmount`,
        message: `Payable bill #${p.invoiceNumber || idx + 1} total amount must be greater than zero.`,
        severity: "error",
      });
    }

    if (p.paidAmount < 0) {
      errors.push({
        field: `payables[${idx}].paidAmount`,
        message: `Payable bill #${p.invoiceNumber || idx + 1} paid amount cannot be negative.`,
        severity: "error",
      });
    }

    // Inconsistent balance check
    if (p.paidAmount > p.totalAmount) {
      errors.push({
        field: `payables[${idx}].paidAmount`,
        message: `Payable bill #${p.invoiceNumber} amount paid (₹${p.paidAmount.toLocaleString("en-IN")}) exceeds total bill (₹${p.totalAmount.toLocaleString("en-IN")}).`,
        severity: "error",
      });
    }
  }

  // 6. Liabilities
  for (const l of finances.loans || []) {
    if (l.amount < 0) {
      errors.push({
        field: `loans.${l.id}`,
        message: `Loan obligation "${l.name}" cannot have a negative balance.`,
        severity: "error",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
