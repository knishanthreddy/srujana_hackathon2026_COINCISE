import { SmartAlert, Receivable, Payable, FinancialRecord } from "./types";
import { ForecastSummary } from "./forecast-engine";
import { formatCurrency, formatDate } from "./utils";

/**
 * Pure deterministic calculation: generates structured Smart Alerts
 * directly from live cash flow forecasts, invoice aging, and vendor obligations.
 * Never generates random or fictional messages.
 */
export function generateSmartAlerts(
  records: FinancialRecord[],
  receivables: Receivable[],
  payables: Payable[],
  forecast: ForecastSummary,
  referenceDate: Date = new Date("2026-10-24T00:00:00Z")
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const refTime = referenceDate.getTime();
  const dateStr = forecast.startDate;

  // 1. Critical Cash Deficit (< ₹0 Solvency Threat)
  if (forecast.firstShortageDate && forecast.firstShortageDayOffset !== null) {
    alerts.push({
      id: "alert-solvency-shortage",
      severity: "critical",
      title: `Critical Solvency Alert: Cash Deficit on Day ${forecast.firstShortageDayOffset} (${formatDate(forecast.firstShortageDate)})`,
      message: `Projected liquid cash turns negative by Day ${forecast.firstShortageDayOffset}. Peak cash shortfall reaches ${formatCurrency(forecast.maximumCashShortfall)} below zero on Day ${forecast.lowestCashDayOffset}.`,
      date: dateStr,
      triggerType: "cash_shortage",
      suggestedAction: "Accelerate invoice collections via TReDS factoring or restructure supplier payment milestones immediately.",
      actionLink: "/decision-centre",
      isRead: false,
    });
  }

  // 2. Minimum Safety Reserve Breach
  if (
    forecast.firstReserveBreachDate &&
    forecast.firstReserveBreachDayOffset !== null &&
    !forecast.firstShortageDate
  ) {
    alerts.push({
      id: "alert-reserve-breach",
      severity: "warning",
      title: `Projected Reserve Breach: Cash Drops Below ${formatCurrency(forecast.minimumReserve)} on Day ${forecast.firstReserveBreachDayOffset}`,
      message: `Liquid balance dips to ${formatCurrency(forecast.lowestCashBalance)} on ${formatDate(forecast.firstReserveBreachDate)}, breaching your safety cushion by ${formatCurrency(forecast.maximumReserveShortfall)}.`,
      date: dateStr,
      triggerType: "reserve_breach",
      suggestedAction: "Negotiate vendor payment deferral or draw from standby overdraft to protect operating buffer.",
      actionLink: "/decision-centre",
      isRead: false,
    });
  }

  // 3. Overdue Customer Receivables
  const overdueReceivables = receivables
    .filter((r) => r.status === "overdue" && r.balanceDue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  for (const r of overdueReceivables) {
    const isSevere = r.daysOverdue >= 20 || r.balanceDue >= 200000;
    alerts.push({
      id: `alert-overdue-rec-${r.id}`,
      severity: isSevere ? "critical" : "warning",
      title: `Overdue Collection: ${r.customerName} (${formatCurrency(r.balanceDue)} overdue by ${r.daysOverdue} days)`,
      message: `Invoice #${r.invoiceNumber} was due on ${formatDate(r.dueDate)}. Outstanding balance of ${formatCurrency(r.balanceDue)} remains unpaid.`,
      date: dateStr,
      triggerType: "overdue_invoice",
      suggestedAction: isSevere
        ? "Review evidence in FairResolve and propose a structured settlement or prepare MSME Samadhaan escalation."
        : "Send prompt payment reminder with bank RTGS details and offer a 2% prompt settlement concession.",
      actionLink: isSevere ? "/fairresolve" : "/receivables",
      isRead: false,
    });
  }

  // 4. Upcoming Supplier Payment Obligations (Next 10 Days)
  const upcomingPayables = payables
    .filter((p) => p.status !== "paid" && p.balanceDue > 0)
    .map((p) => {
      const pDueDate = new Date(p.dueDate);
      const diffMs = pDueDate.getTime() - refTime;
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...p, daysUntilDue };
    })
    .filter((p) => p.daysUntilDue >= 0 && p.daysUntilDue <= 10)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  for (const p of upcomingPayables) {
    alerts.push({
      id: `alert-upcoming-pay-${p.id}`,
      severity: p.balanceDue >= 150000 ? "warning" : "info",
      title: `Upcoming Vendor Obligation: ${p.vendorName} (${formatCurrency(p.balanceDue)} due in ${p.daysUntilDue} days)`,
      message: `Bill #${p.invoiceNumber} for ${p.category} is scheduled for disbursement on ${formatDate(p.dueDate)}.`,
      date: dateStr,
      triggerType: "large_payable",
      suggestedAction: p.balanceDue >= 150000
        ? "Verify cleared cash balance before releasing bank transfer, or request a 14-day split."
        : "Authorize disbursement through scheduled batch payout.",
      actionLink: "/payables",
      isRead: false,
    });
  }

  return alerts;
}
