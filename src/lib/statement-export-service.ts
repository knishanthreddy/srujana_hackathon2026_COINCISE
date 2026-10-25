import * as XLSX from "xlsx";
import type {
  ProfitAndLossStatement,
  CashFlowStatement,
  BalanceSheetStatement,
  StatementSection,
} from "./financial-statements.ts";

/**
 * Format currency number or null into display string for Excel export.
 */
function formatExcelAmount(amount: number | null): string | number {
  if (amount === null || typeof amount === "undefined") {
    return "Not recorded";
  }
  return amount;
}

/**
 * Export Profit and Loss Statement to structured Excel (.xlsx) file.
 */
export function exportProfitAndLossToExcel(stmt: ProfitAndLossStatement, filename?: string) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  // Header metadata
  rows.push([stmt.businessName.toUpperCase()]);
  if (stmt.mcaLegalName && stmt.mcaLegalName !== stmt.businessName) {
    rows.push([stmt.mcaLegalName]);
  }
  rows.push([`CIN: ${stmt.cin || "N/A"}`, "", `GSTIN: ${stmt.gstin || "N/A"}`]);
  rows.push(["STATEMENT OF PROFIT AND LOSS"]);
  rows.push([`Reporting Period: ${stmt.periodLabel}`, "", `Financial Year: ${stmt.financialYear}`]);
  rows.push([`Accounting Basis: ${stmt.basis.toUpperCase()} BASIS`, "", "Currency: Indian Rupees (INR ₹)"]);
  rows.push([]); // blank line

  // Column Headers
  rows.push(["Particulars", "Amount (INR ₹)", "Notes / Disclosures"]);

  const appendSection = (section: StatementSection) => {
    rows.push([`--- ${section.title.toUpperCase()} ---`, "", ""]);
    section.items.forEach((item) => {
      rows.push([
        `   ${item.label}`,
        formatExcelAmount(item.amount),
        item.notes || (item.status === "unrecorded" ? "Unrecorded in operational ledger" : ""),
      ]);
    });
    if (section.subtotal !== null && typeof section.subtotal !== "undefined") {
      rows.push([`Subtotal - ${section.title}`, section.subtotal, ""]);
    }
    rows.push([]);
  };

  appendSection(stmt.revenueSection);
  appendSection(stmt.directCostsSection);
  rows.push(["GROSS PROFIT / (LOSS)", stmt.grossProfit, "Revenue minus Direct Costs"]);
  rows.push([]);

  appendSection(stmt.operatingExpensesSection);
  rows.push(["OPERATING PROFIT / (LOSS)", stmt.operatingProfit, "Gross Profit minus Operating Overheads"]);
  rows.push([]);

  appendSection(stmt.taxesAndFinancingSection);
  rows.push(["NET PROFIT / (LOSS) FOR THE PERIOD", stmt.netProfitOrLoss, "Operating Profit minus Taxes & Finance Obligations"]);
  rows.push([]);

  // Disclosures
  rows.push(["STATUTORY & ACCOUNTING DISCLOSURES"]);
  stmt.disclosures.forEach((disc, idx) => {
    rows.push([`${idx + 1}. ${disc}`, "", ""]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 45 }, { wch: 18 }, { wch: 50 }];

  XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
  const fname = filename || `coincise-pnl-${stmt.basis}-${stmt.startDate}-to-${stmt.endDate}.xlsx`;
  XLSX.writeFile(wb, fname);
}

/**
 * Export Cash Flow Statement to structured Excel (.xlsx) file.
 */
export function exportCashFlowToExcel(stmt: CashFlowStatement, filename?: string) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  // Header metadata
  rows.push([stmt.businessName.toUpperCase()]);
  if (stmt.mcaLegalName && stmt.mcaLegalName !== stmt.businessName) {
    rows.push([stmt.mcaLegalName]);
  }
  rows.push([`CIN: ${stmt.cin || "N/A"}`, "", `Financial Year: ${stmt.financialYear}`]);
  rows.push(["STATEMENT OF CASH FLOWS"]);
  rows.push([`Reporting Period: ${stmt.periodLabel}`, "", "Currency: Indian Rupees (INR ₹)"]);
  rows.push([]); // blank line

  rows.push(["Particulars", "Amount (INR ₹)", "Notes"]);

  rows.push(["OPENING CASH & CASH EQUIVALENTS", stmt.openingCashBalance, "Live operating cash at period start"]);
  rows.push([]);

  const appendSection = (section: StatementSection) => {
    rows.push([`--- ${section.title.toUpperCase()} ---`, "", ""]);
    section.items.forEach((item) => {
      rows.push([
        `   ${item.label}`,
        formatExcelAmount(item.amount),
        item.notes || "",
      ]);
    });
    if (section.subtotal !== null && typeof section.subtotal !== "undefined") {
      rows.push([`Net Cash Flow - ${section.title}`, section.subtotal, ""]);
    }
    rows.push([]);
  };

  appendSection(stmt.operatingActivities);
  appendSection(stmt.investingActivities);
  appendSection(stmt.financingActivities);

  rows.push(["NET INCREASE / (DECREASE) IN CASH", stmt.netChangeInCash, "Sum of Operating, Investing & Financing flows"]);
  rows.push(["CLOSING CASH & CASH EQUIVALENTS", stmt.closingCashBalance, "Opening Cash + Net Change in Cash"]);
  rows.push([]);

  // Disclosures
  rows.push(["DISCLOSURES"]);
  stmt.disclosures.forEach((disc, idx) => {
    rows.push([`${idx + 1}. ${disc}`, "", ""]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 45 }, { wch: 18 }, { wch: 50 }];

  XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
  const fname = filename || `coincise-cashflow-${stmt.startDate}-to-${stmt.endDate}.xlsx`;
  XLSX.writeFile(wb, fname);
}

/**
 * Export Balance Sheet to structured Excel (.xlsx) file.
 */
export function exportBalanceSheetToExcel(stmt: BalanceSheetStatement, filename?: string) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  // Header metadata
  rows.push([stmt.businessName.toUpperCase()]);
  if (stmt.mcaLegalName && stmt.mcaLegalName !== stmt.businessName) {
    rows.push([stmt.mcaLegalName]);
  }
  rows.push([`CIN: ${stmt.cin || "N/A"}`, "", `GSTIN: ${stmt.gstin || "N/A"}`]);
  rows.push(["BALANCE SHEET"]);
  rows.push([`As of Date: ${stmt.asOfDate}`, "", `Financial Year: ${stmt.financialYear}`]);
  rows.push(["Currency: Indian Rupees (INR ₹)", "", ""]);
  rows.push([]); // blank line

  rows.push(["Particulars", "Amount (INR ₹)", "Notes / Classification"]);

  const appendSection = (section: StatementSection) => {
    rows.push([`--- ${section.title.toUpperCase()} ---`, "", ""]);
    section.items.forEach((item) => {
      rows.push([
        `   ${item.label}`,
        formatExcelAmount(item.amount),
        item.notes || "",
      ]);
    });
    if (section.subtotal !== null && typeof section.subtotal !== "undefined") {
      rows.push([`Total - ${section.title}`, section.subtotal, ""]);
    }
    rows.push([]);
  };

  // ASSETS
  rows.push(["=== ASSETS ===", "", ""]);
  appendSection(stmt.currentAssets);
  appendSection(stmt.nonCurrentAssets);
  rows.push(["TOTAL ASSETS", stmt.totalAssets, "Current Assets + Non-Current Assets"]);
  rows.push([]);

  // LIABILITIES
  rows.push(["=== LIABILITIES ===", "", ""]);
  appendSection(stmt.currentLiabilities);
  appendSection(stmt.nonCurrentLiabilities);
  rows.push(["TOTAL LIABILITIES", stmt.totalLiabilities, "Current Liabilities + Non-Current Liabilities"]);
  rows.push([]);

  // NET ASSETS
  rows.push(["APPROXIMATE NET ASSETS", stmt.approximateNetAssets, "Total Assets minus Total Liabilities"]);
  rows.push([]);

  // EQUITY
  rows.push(["=== EQUITY & CAPITAL ===", "", ""]);
  appendSection(stmt.equitySection);
  if (stmt.totalLiabilitiesAndEquity !== null) {
    rows.push(["TOTAL LIABILITIES AND EQUITY", stmt.totalLiabilitiesAndEquity, "Total Liabilities + Equity"]);
  }
  rows.push([]);

  // Disclosures
  rows.push(["DISCLOSURES"]);
  stmt.disclosures.forEach((disc, idx) => {
    rows.push([`${idx + 1}. ${disc}`, "", ""]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 45 }, { wch: 18 }, { wch: 50 }];

  XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
  const fname = filename || `coincise-balance-sheet-${stmt.asOfDate}.xlsx`;
  XLSX.writeFile(wb, fname);
}
