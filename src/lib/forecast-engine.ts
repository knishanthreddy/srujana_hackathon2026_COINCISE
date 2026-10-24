import type { FinancialRecord, Receivable, Payable } from "./types";

export type CashFlowCategory =
  | "receivable"
  | "sales"
  | "payable"
  | "payroll"
  | "loan"
  | "other_expense"
  | "other_income";

export interface CashFlowInputItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  amount: number; // positive number
  type: "inflow" | "outflow";
  category: CashFlowCategory;
  status?: string;
  sourceId?: string;
  notes?: string;
}

export interface UnexpectedExpenseConfig {
  id: string;
  name: string;
  amount: number;
  dayOffset: number;
  notes?: string;
}

export interface ScenarioModifiers {
  customerDelayDays?: number; // e.g. +15, +30 days delay for receivables
  salesPercentageChange?: number; // e.g. -20 for 20% drop, +15 for 15% increase
  unexpectedExpenses?: UnexpectedExpenseConfig[];
  supplierShiftDays?: number; // e.g. -7 (pay earlier) or +14 (deferred)
  payrollPercentageChange?: number; // e.g. +10% or -10%
  loanPaymentChange?: {
    extraPayment?: number;
    effectiveDay?: number;
    deferredDays?: number;
  };
}

export interface DailyCashForecast {
  dayOffset: number;
  date: string;
  dayOfWeek: string;
  openingCash: number;
  inflows: number;
  outflows: number;
  netCashFlow: number;
  closingCash: number;
  minimumReserve: number;
  isReserveBreached: boolean;
  isCashDeficit: boolean;
  status: "safe" | "warning" | "shortage";
  inflowDetails: Array<{ name: string; amount: number; category: string }>;
  outflowDetails: Array<{ name: string; amount: number; category: string }>;
}

export interface PeriodSummary {
  periodIndex: number;
  label: string;
  startDate: string;
  endDate: string;
  startDayOffset: number;
  endDayOffset: number;
  openingCash: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingCash: number;
  lowestCash: number;
  status: "safe" | "warning" | "shortage";
}

export interface ForecastSummary {
  horizonDays: 7 | 30 | 60 | 90;
  startDate: string;
  endDate: string;
  openingCash: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingCash: number;
  minimumReserve: number;
  lowestCashBalance: number;
  lowestCashDate: string | null;
  lowestCashDayOffset: number | null;
  firstShortageDate: string | null; // closingCash < 0
  firstShortageDayOffset: number | null;
  firstReserveBreachDate: string | null; // closingCash < minimumReserve
  firstReserveBreachDayOffset: number | null;
  maximumCashShortfall: number; // how much below 0 (cash deficit)
  maximumReserveShortfall: number; // how much below minimum reserve
  isReserveBreached: boolean;
  isCashDeficit: boolean;
  dailyPoints: DailyCashForecast[];
  weeklySummaries: PeriodSummary[];
  monthlySummaries: PeriodSummary[];
  inputItemCount: {
    inflows: number;
    outflows: number;
  };
}

/**
 * Fundamental deterministic cash-flow formula:
 * Closing Cash = Opening Cash + Inflows - Outflows
 */
export function calculateClosingCash(
  openingCash: number,
  inflows: number,
  outflows: number
): number {
  return openingCash + inflows - outflows;
}

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Add days to a Date object without mutating original
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Extract testable cash flow forecast items from application data structures.
 *
 * Rules:
 * - Never treats expected income as cash already received.
 * - Extracts only outstanding unpaid balances (balanceDue = totalAmount - paidAmount).
 * - Avoids double-counting transactions linked between records and invoices.
 */
export function extractForecastItemsFromData(
  records: FinancialRecord[],
  receivables: Receivable[],
  payables: Payable[],
  referenceDate: Date = new Date("2026-10-24T00:00:00Z")
): CashFlowInputItem[] {
  const items: CashFlowInputItem[] = [];
  const linkedRefCodes = new Set<string>();

  // 1. Expected Customer Inflows from Receivables (only unpaid balance due)
  for (const r of receivables) {
    if (r.balanceDue > 0 && r.status !== "paid") {
      items.push({
        id: `rec-item-${r.id}`,
        name: `Receivable: ${r.customerName} (#${r.invoiceNumber})`,
        date: r.dueDate,
        amount: r.balanceDue,
        type: "inflow",
        category: "receivable",
        status: r.status,
        sourceId: r.id,
        notes: r.notes,
      });

      // Track reference codes to prevent double-counting from records
      if (r.invoiceNumber) {
        linkedRefCodes.add(r.invoiceNumber.toUpperCase());
        linkedRefCodes.add(`INV-${r.invoiceNumber.toUpperCase()}`);
      }
    }
  }

  // 2. Scheduled Vendor Outflows from Payables (only unpaid balance due)
  for (const p of payables) {
    if (p.balanceDue > 0 && p.status !== "paid") {
      items.push({
        id: `pay-item-${p.id}`,
        name: `Payable: ${p.vendorName} (#${p.invoiceNumber})`,
        date: p.dueDate,
        amount: p.balanceDue,
        type: "outflow",
        category: "payable",
        status: p.status,
        sourceId: p.id,
        notes: p.notes,
      });

      if (p.invoiceNumber) {
        linkedRefCodes.add(p.invoiceNumber.toUpperCase());
        linkedRefCodes.add(`BILL-${p.invoiceNumber.toUpperCase()}`);
        linkedRefCodes.add(`PAY-VEN-${p.invoiceNumber.toUpperCase()}`);
      }
    }
  }

  // 3. Pending/Expected Scheduled Transactions from Financial Records
  // (e.g. Payroll, recurring utility bills, loan EMI, unexpected sales)
  for (const rec of records) {
    // Only pending or expected items represent future cash flows.
    // Cleared/completed transactions are already part of opening bank balance!
    const isFuturePending =
      rec.paymentStatus === "expected" ||
      rec.paymentStatus === "partially_paid" ||
      rec.status === "pending";

    if (!isFuturePending) {
      continue;
    }

    // Check if this record is already accounted for by an invoice reference
    if (rec.reference) {
      const upperRef = rec.reference.toUpperCase();
      let isDuplicate = false;
      for (const linked of Array.from(linkedRefCodes)) {
        if (upperRef.includes(linked)) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) {
        continue; // Prevent double-counting
      }
    }

    const remainingAmount = Math.max(0, rec.amount - (rec.paidAmount || 0));
    if (remainingAmount <= 0) continue;

    // Classify category
    let category: CashFlowCategory = "other_expense";
    const lowerCat = rec.category.toLowerCase();
    const lowerDesc = rec.description.toLowerCase();

    if (rec.type === "income") {
      category = lowerCat.includes("sale") ? "sales" : "other_income";
    } else {
      if (lowerCat.includes("salary") || lowerCat.includes("payroll") || lowerDesc.includes("salary")) {
        category = "payroll";
      } else if (lowerCat.includes("loan") || lowerCat.includes("emi") || lowerDesc.includes("loan")) {
        category = "loan";
      } else {
        category = "other_expense";
      }
    }

    items.push({
      id: `record-item-${rec.id}`,
      name: `${rec.description} (${rec.category})`,
      date: rec.date,
      amount: remainingAmount,
      type: rec.type === "income" ? "inflow" : "outflow",
      category,
      status: rec.paymentStatus,
      sourceId: rec.id,
      notes: rec.notes,
    });
  }

  return items;
}

/**
 * Pure function: applies hypothetical scenario modifiers without mutating original data.
 */
export function applyScenarioModifiers(
  items: CashFlowInputItem[],
  modifiers: ScenarioModifiers,
  referenceDate: Date = new Date("2026-10-24T00:00:00Z")
): CashFlowInputItem[] {
  const result: CashFlowInputItem[] = [];

  for (const item of items) {
    let modifiedDate = item.date;
    let modifiedAmount = item.amount;

    // 1. Customer payment delay (delays receivables forward)
    if (
      (item.category === "receivable" || item.category === "sales" || item.category === "other_income") &&
      modifiers.customerDelayDays &&
      modifiers.customerDelayDays !== 0
    ) {
      const currentItemDate = new Date(item.date);
      const delayed = addDays(currentItemDate, modifiers.customerDelayDays);
      modifiedDate = formatDateISO(delayed);
    }

    // 2. Sales decrease/increase percentage
    if (
      (item.category === "receivable" || item.category === "sales" || item.category === "other_income") &&
      typeof modifiers.salesPercentageChange === "number" &&
      modifiers.salesPercentageChange !== 0
    ) {
      const multiplier = Math.max(0, 1 + modifiers.salesPercentageChange / 100);
      modifiedAmount = Math.round(modifiedAmount * multiplier);
    }

    // 3. Supplier payment date shift (e.g. paying earlier -7 days or delaying +14 days)
    if (
      item.category === "payable" &&
      modifiers.supplierShiftDays &&
      modifiers.supplierShiftDays !== 0
    ) {
      const currentItemDate = new Date(item.date);
      const shifted = addDays(currentItemDate, modifiers.supplierShiftDays);
      modifiedDate = formatDateISO(shifted);
    }

    // 4. Payroll expense changes (e.g. +10% increment or -10% reduction)
    if (
      item.category === "payroll" &&
      typeof modifiers.payrollPercentageChange === "number" &&
      modifiers.payrollPercentageChange !== 0
    ) {
      const multiplier = Math.max(0, 1 + modifiers.payrollPercentageChange / 100);
      modifiedAmount = Math.round(modifiedAmount * multiplier);
    }

    // 5. Loan repayment changes
    if (item.category === "loan" && modifiers.loanPaymentChange) {
      if (modifiers.loanPaymentChange.deferredDays) {
        const currentItemDate = new Date(item.date);
        const shifted = addDays(currentItemDate, modifiers.loanPaymentChange.deferredDays);
        modifiedDate = formatDateISO(shifted);
      }
      if (modifiers.loanPaymentChange.extraPayment) {
        modifiedAmount += modifiers.loanPaymentChange.extraPayment;
      }
    }

    if (modifiedAmount > 0) {
      result.push({
        ...item,
        date: modifiedDate,
        amount: modifiedAmount,
      });
    }
  }

  // 6. Unexpected expenses (injected on specific day offsets)
  if (modifiers.unexpectedExpenses && modifiers.unexpectedExpenses.length > 0) {
    for (const exp of modifiers.unexpectedExpenses) {
      if (exp.amount > 0) {
        const expDate = addDays(referenceDate, exp.dayOffset);
        result.push({
          id: `sim-exp-${exp.id}`,
          name: `Unexpected: ${exp.name}`,
          date: formatDateISO(expDate),
          amount: exp.amount,
          type: "outflow",
          category: "other_expense",
          notes: exp.notes || "Hypothetical emergency capital outlay",
        });
      }
    }
  }

  return result;
}

export interface GenerateForecastParams {
  openingCash: number;
  items: CashFlowInputItem[];
  horizonDays: 7 | 30 | 60 | 90;
  referenceDate?: Date;
  minimumReserve?: number;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Core forecast generation engine: builds a day-by-day cash trajectory,
 * detecting shortages, reserve breaches, and compiling period summaries.
 */
export function generateCashForecast({
  openingCash,
  items,
  horizonDays,
  referenceDate = new Date("2026-10-24T00:00:00Z"),
  minimumReserve = 250000,
}: GenerateForecastParams): ForecastSummary {
  // Normalize referenceDate to start of day
  const startDate = new Date(referenceDate);
  startDate.setHours(0, 0, 0, 0);

  const dailyPoints: DailyCashForecast[] = [];
  let runningCash = openingCash;

  let lowestCashBalance = openingCash;
  let lowestCashDate: string | null = null;
  let lowestCashDayOffset: number | null = null;

  let firstShortageDate: string | null = null;
  let firstShortageDayOffset: number | null = null;

  let firstReserveBreachDate: string | null = null;
  let firstReserveBreachDayOffset: number | null = null;

  // Index items by date string (YYYY-MM-DD) for fast lookup
  const itemsByDate = new Map<string, CashFlowInputItem[]>();
  let inflowCount = 0;
  let outflowCount = 0;

  for (const item of items) {
    if (!itemsByDate.has(item.date)) {
      itemsByDate.set(item.date, []);
    }
    itemsByDate.get(item.date)!.push(item);
    if (item.type === "inflow") inflowCount++;
    else outflowCount++;
  }

  let totalInflowsSum = 0;
  let totalOutflowsSum = 0;

  for (let offset = 0; offset <= horizonDays; offset++) {
    const currentDate = addDays(startDate, offset);
    const dateStr = formatDateISO(currentDate);
    const dayOfWeek = DAYS_OF_WEEK[currentDate.getDay()];

    const dayItems = itemsByDate.get(dateStr) || [];
    const dayInflowsList = dayItems.filter((i) => i.type === "inflow");
    const dayOutflowsList = dayItems.filter((i) => i.type === "outflow");

    const dayInflows = dayInflowsList.reduce((sum, i) => sum + i.amount, 0);
    const dayOutflows = dayOutflowsList.reduce((sum, i) => sum + i.amount, 0);

    totalInflowsSum += dayInflows;
    totalOutflowsSum += dayOutflows;

    const dayOpening = runningCash;
    const netCashFlow = dayInflows - dayOutflows;
    const closingCash = calculateClosingCash(dayOpening, dayInflows, dayOutflows);

    const isReserveBreached = closingCash < minimumReserve;
    const isCashDeficit = closingCash < 0;

    let status: "safe" | "warning" | "shortage" = "safe";
    if (isCashDeficit) {
      status = "shortage";
    } else if (isReserveBreached) {
      status = "warning";
    }

    if (closingCash < lowestCashBalance || offset === 0) {
      lowestCashBalance = closingCash;
      lowestCashDate = dateStr;
      lowestCashDayOffset = offset;
    }

    if (isCashDeficit && firstShortageDate === null) {
      firstShortageDate = dateStr;
      firstShortageDayOffset = offset;
    }

    if (isReserveBreached && firstReserveBreachDate === null) {
      firstReserveBreachDate = dateStr;
      firstReserveBreachDayOffset = offset;
    }

    dailyPoints.push({
      dayOffset: offset,
      date: dateStr,
      dayOfWeek,
      openingCash: dayOpening,
      inflows: dayInflows,
      outflows: dayOutflows,
      netCashFlow,
      closingCash,
      minimumReserve,
      isReserveBreached,
      isCashDeficit,
      status,
      inflowDetails: dayInflowsList.map((i) => ({
        name: i.name,
        amount: i.amount,
        category: i.category,
      })),
      outflowDetails: dayOutflowsList.map((i) => ({
        name: i.name,
        amount: i.amount,
        category: i.category,
      })),
    });

    runningCash = closingCash;
  }

  const finalClosing = dailyPoints[dailyPoints.length - 1]?.closingCash ?? openingCash;
  const maximumCashShortfall = Math.max(0, -lowestCashBalance);
  const maximumReserveShortfall = Math.max(0, minimumReserve - lowestCashBalance);

  // Group into Weekly Summaries (7-day intervals)
  const weeklySummaries: PeriodSummary[] = [];
  const weekCount = Math.ceil(horizonDays / 7);
  for (let w = 0; w < weekCount; w++) {
    const startIdx = w * 7;
    const endIdx = Math.min(startIdx + 6, horizonDays);
    const slice = dailyPoints.slice(startIdx, endIdx + 1);
    if (slice.length === 0) continue;

    const wOpening = slice[0].openingCash;
    const wClosing = slice[slice.length - 1].closingCash;
    const wInflows = slice.reduce((s, d) => s + d.inflows, 0);
    const wOutflows = slice.reduce((s, d) => s + d.outflows, 0);
    const wNet = wInflows - wOutflows;
    const wLowest = Math.min(...slice.map((d) => d.closingCash));

    let wStatus: "safe" | "warning" | "shortage" = "safe";
    if (wLowest < 0) wStatus = "shortage";
    else if (wLowest < minimumReserve) wStatus = "warning";

    weeklySummaries.push({
      periodIndex: w + 1,
      label: `Week ${w + 1} (${slice[0].date.slice(5)} to ${slice[slice.length - 1].date.slice(5)})`,
      startDate: slice[0].date,
      endDate: slice[slice.length - 1].date,
      startDayOffset: startIdx,
      endDayOffset: endIdx,
      openingCash: wOpening,
      totalInflows: wInflows,
      totalOutflows: wOutflows,
      netCashFlow: wNet,
      closingCash: wClosing,
      lowestCash: wLowest,
      status: wStatus,
    });
  }

  // Group into Monthly Summaries (30-day intervals)
  const monthlySummaries: PeriodSummary[] = [];
  const monthCount = Math.ceil(horizonDays / 30);
  for (let m = 0; m < monthCount; m++) {
    const startIdx = m * 30;
    const endIdx = Math.min(startIdx + 29, horizonDays);
    const slice = dailyPoints.slice(startIdx, endIdx + 1);
    if (slice.length === 0) continue;

    const mOpening = slice[0].openingCash;
    const mClosing = slice[slice.length - 1].closingCash;
    const mInflows = slice.reduce((s, d) => s + d.inflows, 0);
    const mOutflows = slice.reduce((s, d) => s + d.outflows, 0);
    const mNet = mInflows - mOutflows;
    const mLowest = Math.min(...slice.map((d) => d.closingCash));

    let mStatus: "safe" | "warning" | "shortage" = "safe";
    if (mLowest < 0) mStatus = "shortage";
    else if (mLowest < minimumReserve) mStatus = "warning";

    monthlySummaries.push({
      periodIndex: m + 1,
      label: `Month ${m + 1} (Day ${startIdx} - Day ${endIdx})`,
      startDate: slice[0].date,
      endDate: slice[slice.length - 1].date,
      startDayOffset: startIdx,
      endDayOffset: endIdx,
      openingCash: mOpening,
      totalInflows: mInflows,
      totalOutflows: mOutflows,
      netCashFlow: mNet,
      closingCash: mClosing,
      lowestCash: mLowest,
      status: mStatus,
    });
  }

  return {
    horizonDays,
    startDate: dailyPoints[0]?.date ?? formatDateISO(startDate),
    endDate: dailyPoints[dailyPoints.length - 1]?.date ?? formatDateISO(startDate),
    openingCash,
    totalInflows: totalInflowsSum,
    totalOutflows: totalOutflowsSum,
    netCashFlow: totalInflowsSum - totalOutflowsSum,
    closingCash: finalClosing,
    minimumReserve,
    lowestCashBalance,
    lowestCashDate,
    lowestCashDayOffset,
    firstShortageDate,
    firstShortageDayOffset,
    firstReserveBreachDate,
    firstReserveBreachDayOffset,
    maximumCashShortfall,
    maximumReserveShortfall,
    isReserveBreached: lowestCashBalance < minimumReserve,
    isCashDeficit: lowestCashBalance < 0,
    dailyPoints,
    weeklySummaries,
    monthlySummaries,
    inputItemCount: {
      inflows: inflowCount,
      outflows: outflowCount,
    },
  };
}

/**
 * Exact verification helper matching the user's explicit test case:
 * Opening cash = ₹100,000
 * Expected receipts = ₹40,000
 * Supplier payment = ₹50,000
 * Payroll = ₹30,000
 * Expected closing cash = ₹60,000
 */
export function calculateVerificationExample(): {
  openingCash: number;
  expectedReceipts: number;
  supplierPayment: number;
  payroll: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  isVerified: boolean;
} {
  const openingCash = 100000;
  const expectedReceipts = 40000;
  const supplierPayment = 50000;
  const payroll = 30000;

  const totalInflows = expectedReceipts;
  const totalOutflows = supplierPayment + payroll;
  const actualClosingCash = calculateClosingCash(openingCash, totalInflows, totalOutflows);
  const expectedClosingCash = 60000;

  return {
    openingCash,
    expectedReceipts,
    supplierPayment,
    payroll,
    expectedClosingCash,
    actualClosingCash,
    isVerified: actualClosingCash === expectedClosingCash,
  };
}
