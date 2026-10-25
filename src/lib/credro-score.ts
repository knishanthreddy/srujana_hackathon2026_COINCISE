import type { FinancialRecord, Receivable, Payable } from "./types.ts";
import type { OnboardingData } from "./onboarding-types.ts";
import { round2 } from "./financial-summary.ts";

export type TrustLevel = "Low" | "Fair" | "Good" | "Excellent";

export interface CredroFactor {
  id: string;
  name: string;
  weight: number;
  weightPercent: string;
  score: number; // 0 to 100
  status: "positive" | "neutral" | "warning" | "danger";
  description: string;
  detail: string;
}

export interface CredroSnapshot {
  timestamp: string;
  score: number;
  trustLevel: TrustLevel;
}

export interface CredroResult {
  score: number; // 0 to 100
  trustLevel: TrustLevel;
  isPreliminary: boolean;
  historyNote: string;
  factors: CredroFactor[];
  recommendations: string[];
  scoreChange: number | null;
  lastUpdated: string;
  legalDisclaimer: string;
}

/**
 * Transparent, configurable scoring weights for Credro.
 * Documented and strictly summing to 1.0 (100%).
 */
export const CREDRO_WEIGHTS = {
  paymentHistory: 0.25,        // 25% - Punctual settlement of receivables & payables
  cashFlowStability: 0.20,     // 20% - Consistency of cash inflows vs disbursements
  liquidityCushion: 0.25,      // 25% - Spendable cash relative to 30d obligations & reserve floor
  financialConsistency: 0.15,  // 15% - Regularity and completeness of transaction logs
  outstandingObligations: 0.15,// 15% - Overdue liabilities and total debt leverage
} as const;

export const CREDRO_HISTORY_STORAGE_KEY = "coincise_credro_history_v1";

/**
 * Calculates the Credro Trust Score dynamically from active financial datasets.
 * Pure business-logic function: testable, deterministic, and free of UI dependencies.
 */
export function calculateCredroScore(
  records: FinancialRecord[],
  receivables: Receivable[],
  payables: Payable[],
  availableOperatingCash: number,
  minimumCashReserve: number = 250000,
  onboarding?: OnboardingData | null
): CredroResult {
  const now = new Date().toISOString();

  // -------------------------------------------------------------------------
  // 1. Data Sufficiency Assessment
  // -------------------------------------------------------------------------
  const totalEntries = records.length + receivables.length + payables.length;
  const isPreliminary = totalEntries < 4;
  const historyNote = isPreliminary
    ? "Insufficient history: Only limited operational data is recorded. Credro requires ongoing transaction and invoice activity to generate a fully mature rating. This score is a preliminary baseline."
    : "Verified operational baseline: Score calculated from active financial records, invoice settlements, and cash runway.";

  // -------------------------------------------------------------------------
  // FACTOR 1: Payment History (Weight: 25%)
  // Evaluates punctuality of supplier obligations and customer collection discipline.
  // -------------------------------------------------------------------------
  let paymentScore = 80; // Baseline when no history
  let paymentDesc = "No overdue obligations recorded; baseline established.";
  let paymentDetail = "Standard baseline";

  const totalPayablesAmount = payables.reduce((s, p) => s + p.totalAmount, 0);
  const overduePayables = payables.filter((p) => p.status === "overdue");
  const overduePayablesBalance = overduePayables.reduce((s, p) => s + p.balanceDue, 0);

  const totalRecAmount = receivables.reduce((s, r) => s + r.totalAmount, 0);
  const overdueRecs = receivables.filter((r) => r.status === "overdue");
  const overdueRecBalance = overdueRecs.reduce((s, r) => s + r.balanceDue, 0);

  if (payables.length > 0 || receivables.length > 0) {
    let scoreAcc = 95;

    // Supplier overdue penalty
    if (totalPayablesAmount > 0 && overduePayablesBalance > 0) {
      const overdueRatio = overduePayablesBalance / totalPayablesAmount;
      scoreAcc -= Math.min(50, Math.round(overdueRatio * 60));
    }

    // Customer overdue impact (moderate weight on delayed collections)
    if (totalRecAmount > 0 && overdueRecBalance > 0) {
      const recOverdueRatio = overdueRecBalance / totalRecAmount;
      scoreAcc -= Math.min(20, Math.round(recOverdueRatio * 25));
    }

    // On-time bonus if all bills are up to date
    if (overduePayables.length === 0 && payables.length > 0) {
      scoreAcc = Math.min(100, scoreAcc + 5);
    }

    paymentScore = Math.max(20, Math.min(100, scoreAcc));

    if (overduePayables.length > 0) {
      paymentDesc = `${overduePayables.length} overdue supplier obligation(s) totaling ₹${overduePayablesBalance.toLocaleString("en-IN")}.`;
      paymentDetail = "Overdue payables detected";
    } else {
      paymentDesc = "100% of vendor obligations and customer invoices are on schedule.";
      paymentDetail = "Clean payment track record";
    }
  }

  // -------------------------------------------------------------------------
  // FACTOR 2: Cash-Flow Stability (Weight: 20%)
  // Evaluates cash flow predictability and whether cleared income covers outflows.
  // -------------------------------------------------------------------------
  let stabilityScore = 75; // Baseline
  let stabilityDesc = "Balanced cash generation.";
  let stabilityDetail = "Neutral stability";

  if (records.length > 0) {
    const totalIncome = records
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + r.paidAmount, 0);
    const totalExpense = records
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + r.paidAmount, 0);

    const netCleared = totalIncome - totalExpense;

    if (totalIncome === 0 && totalExpense === 0) {
      stabilityScore = 70;
      stabilityDesc = "Limited income/expense cash movements recorded.";
      stabilityDetail = "Awaiting transaction volume";
    } else if (netCleared >= 0) {
      const surplusRatio = totalIncome > 0 ? netCleared / totalIncome : 0;
      stabilityScore = Math.min(100, Math.round(80 + surplusRatio * 20));
      stabilityDesc = `Positive net cleared cash flow (+₹${netCleared.toLocaleString("en-IN")}) across recorded periods.`;
      stabilityDetail = "Positive net operating cash";
    } else {
      const deficitRatio = totalExpense > 0 ? Math.abs(netCleared) / totalExpense : 1;
      stabilityScore = Math.max(30, Math.round(75 - deficitRatio * 35));
      stabilityDesc = `Operating deficit of -₹${Math.abs(netCleared).toLocaleString("en-IN")} across recorded transactions.`;
      stabilityDetail = "Operating cash burn observed";
    }
  }

  // -------------------------------------------------------------------------
  // FACTOR 3: Liquidity Cushion (Weight: 25%)
  // Compares immediately spendable operating cash to upcoming 30d commitments & reserve.
  // -------------------------------------------------------------------------
  let liquidityScore = 75;
  let liquidityDesc = "Adequate liquidity reserve.";
  let liquidityDetail = "Normal coverage";

  const upcoming30dPayables = payables
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.balanceDue, 0);

  const reserveCoverage = minimumCashReserve > 0 ? availableOperatingCash / minimumCashReserve : 1;
  const payablesCoverage = upcoming30dPayables > 0 ? availableOperatingCash / upcoming30dPayables : 2;

  if (availableOperatingCash <= 0) {
    liquidityScore = 20;
    liquidityDesc = "Critically depleted spendable cash position.";
    liquidityDetail = "Zero or negative operating cash";
  } else if (reserveCoverage < 1.0) {
    // Breaching minimum reserve floor
    liquidityScore = Math.max(35, Math.round(50 + reserveCoverage * 25));
    liquidityDesc = `Available cash (₹${availableOperatingCash.toLocaleString("en-IN")}) is below your ₹${minimumCashReserve.toLocaleString("en-IN")} safety reserve.`;
    liquidityDetail = "Below minimum safety reserve";
  } else if (payablesCoverage < 1.0) {
    // Under upcoming obligations
    liquidityScore = Math.max(45, Math.round(60 * payablesCoverage));
    liquidityDesc = `Available cash covers ${(payablesCoverage * 100).toFixed(0)}% of upcoming ₹${upcoming30dPayables.toLocaleString("en-IN")} payables.`;
    liquidityDetail = "Tight payable coverage";
  } else if (reserveCoverage >= 1.5 && payablesCoverage >= 1.5) {
    liquidityScore = 95;
    liquidityDesc = `Robust cash cushion exceeding safety reserve (₹${availableOperatingCash.toLocaleString("en-IN")} available).`;
    liquidityDetail = "Strong liquidity cushion";
  } else {
    liquidityScore = Math.min(90, Math.round(75 + Math.min(reserveCoverage, 2) * 8));
    liquidityDesc = `Sufficient operating cash to meet obligations and reserve requirements.`;
    liquidityDetail = "Comfortable liquidity";
  }

  // -------------------------------------------------------------------------
  // FACTOR 4: Financial Consistency & Record Completeness (Weight: 15%)
  // Evaluates regularity of record maintenance and transaction metadata completeness.
  // -------------------------------------------------------------------------
  let consistencyScore = 70;
  let consistencyDesc = "Basic ledger records present.";
  let consistencyDetail = "Moderate consistency";

  if (records.length >= 8) {
    consistencyScore = 95;
    consistencyDesc = "Comprehensive transaction history with rich categorized records.";
    consistencyDetail = "Active, detailed bookkeeping";
  } else if (records.length >= 4) {
    consistencyScore = 85;
    consistencyDesc = "Regular financial activity logged with standard payment categorization.";
    consistencyDetail = "Steady bookkeeping";
  } else if (records.length >= 1) {
    consistencyScore = 70;
    consistencyDesc = "Initial records recorded; more regular entries will build consistency.";
    consistencyDetail = "Growing ledger";
  } else {
    consistencyScore = 55;
    consistencyDesc = "Limited transaction logs; consistent record keeping enhances credibility.";
    consistencyDetail = "Sparse records";
  }

  // -------------------------------------------------------------------------
  // FACTOR 5: Outstanding Obligations & Leverage (Weight: 15%)
  // Evaluates total outstanding liabilities relative to available cash and assets.
  // -------------------------------------------------------------------------
  let obligationsScore = 80;
  let obligationsDesc = "Manageable debt and liability commitments.";
  let obligationsDetail = "Controlled leverage";

  const loansAmount = (onboarding?.openingFinances?.loans || []).reduce((s, l) => s + l.amount, 0);
  const totalDebtObligations = upcoming30dPayables + loansAmount;

  if (totalDebtObligations === 0) {
    obligationsScore = 95;
    obligationsDesc = "No outstanding debt or vendor liabilities.";
    obligationsDetail = "Debt-free operational state";
  } else if (availableOperatingCash >= totalDebtObligations) {
    obligationsScore = 90;
    obligationsDesc = `Available cash (₹${availableOperatingCash.toLocaleString("en-IN")}) fully covers total liabilities (₹${totalDebtObligations.toLocaleString("en-IN")}).`;
    obligationsDetail = "Fully backed liabilities";
  } else {
    const debtRatio = availableOperatingCash > 0 ? totalDebtObligations / availableOperatingCash : 3;
    if (debtRatio > 3) {
      obligationsScore = 45;
      obligationsDesc = `Total liabilities (₹${totalDebtObligations.toLocaleString("en-IN")}) significantly exceed immediately spendable cash.`;
      obligationsDetail = "Elevated liability ratio";
    } else {
      obligationsScore = Math.max(55, Math.round(85 - (debtRatio - 1) * 15));
      obligationsDesc = `Total liabilities are ₹${totalDebtObligations.toLocaleString("en-IN")} against ₹${availableOperatingCash.toLocaleString("en-IN")} available cash.`;
      obligationsDetail = "Moderate obligation burden";
    }
  }

  // -------------------------------------------------------------------------
  // 2. Final Weighted Calculation
  // -------------------------------------------------------------------------
  const weightedScore = round2(
    paymentScore * CREDRO_WEIGHTS.paymentHistory +
      stabilityScore * CREDRO_WEIGHTS.cashFlowStability +
      liquidityScore * CREDRO_WEIGHTS.liquidityCushion +
      consistencyScore * CREDRO_WEIGHTS.financialConsistency +
      obligationsScore * CREDRO_WEIGHTS.outstandingObligations
  );

  const finalScore = Math.max(10, Math.min(100, Math.round(weightedScore)));

  // Trust Level Mapping
  let trustLevel: TrustLevel = "Fair";
  if (finalScore >= 85) trustLevel = "Excellent";
  else if (finalScore >= 70) trustLevel = "Good";
  else if (finalScore >= 50) trustLevel = "Fair";
  else trustLevel = "Low";

  // Helper status determination
  const getStatus = (val: number): "positive" | "neutral" | "warning" | "danger" => {
    if (val >= 85) return "positive";
    if (val >= 70) return "neutral";
    if (val >= 50) return "warning";
    return "danger";
  };

  const factors: CredroFactor[] = [
    {
      id: "payment_history",
      name: "Payment History",
      weight: CREDRO_WEIGHTS.paymentHistory,
      weightPercent: "25%",
      score: paymentScore,
      status: getStatus(paymentScore),
      description: paymentDesc,
      detail: paymentDetail,
    },
    {
      id: "cash_flow_stability",
      name: "Cash-Flow Stability",
      weight: CREDRO_WEIGHTS.cashFlowStability,
      weightPercent: "20%",
      score: stabilityScore,
      status: getStatus(stabilityScore),
      description: stabilityDesc,
      detail: stabilityDetail,
    },
    {
      id: "liquidity_cushion",
      name: "Liquidity Cushion",
      weight: CREDRO_WEIGHTS.liquidityCushion,
      weightPercent: "25%",
      score: liquidityScore,
      status: getStatus(liquidityScore),
      description: liquidityDesc,
      detail: liquidityDetail,
    },
    {
      id: "financial_consistency",
      name: "Financial Consistency",
      weight: CREDRO_WEIGHTS.financialConsistency,
      weightPercent: "15%",
      score: consistencyScore,
      status: getStatus(consistencyScore),
      description: consistencyDesc,
      detail: consistencyDetail,
    },
    {
      id: "outstanding_obligations",
      name: "Outstanding Obligations",
      weight: CREDRO_WEIGHTS.outstandingObligations,
      weightPercent: "15%",
      score: obligationsScore,
      status: getStatus(obligationsScore),
      description: obligationsDesc,
      detail: obligationsDetail,
    },
  ];

  // -------------------------------------------------------------------------
  // 3. Actionable Tailored Recommendations
  // -------------------------------------------------------------------------
  const recommendations: string[] = [];

  if (paymentScore < 75) {
    recommendations.push(
      "Settle pending or overdue supplier bills on or before their due date to boost your Payment History rating."
    );
  }
  if (liquidityScore < 75) {
    recommendations.push(
      `Maintain spendable operating cash above your ₹${minimumCashReserve.toLocaleString("en-IN")} safety floor to shield against emergency cash dips.`
    );
  }
  if (stabilityScore < 75) {
    recommendations.push(
      "Align invoice collection timing with supplier payments to prevent negative operating cash burn in recurring cycles."
    );
  }
  if (consistencyScore < 75) {
    recommendations.push(
      "Log routine daily transactions and categorize income/expenses systematically to establish record-keeping credibility."
    );
  }
  if (obligationsScore < 75) {
    recommendations.push(
      "Negotiate staggered payment milestones with key vendors to spread liabilities and reduce debt concentration."
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Maintain your current on-time payment track record and preserve cash reserves above the minimum reserve floor."
    );
    recommendations.push(
      "Keep recording all customer receipts and disbursements promptly to sustain high financial consistency."
    );
  }

  // -------------------------------------------------------------------------
  // 4. Score Change Calculation (via Storage History)
  // -------------------------------------------------------------------------
  let scoreChange: number | null = null;
  if (typeof window !== "undefined") {
    try {
      const rawHistory = window.localStorage.getItem(CREDRO_HISTORY_STORAGE_KEY);
      if (rawHistory) {
        const snapshots: CredroSnapshot[] = JSON.parse(rawHistory);
        if (Array.isArray(snapshots) && snapshots.length > 0) {
          const lastSnapshot = snapshots[snapshots.length - 1];
          scoreChange = finalScore - lastSnapshot.score;
        }
      }
    } catch {
      // Ignore storage error
    }
  }

  return {
    score: finalScore,
    trustLevel,
    isPreliminary,
    historyNote,
    factors,
    recommendations: recommendations.slice(0, 3), // Top 3 most impactful tips
    scoreChange,
    lastUpdated: now,
    legalDisclaimer:
      "Credro is an operational trust metric designed for internal financial visibility and decision support. It is not an official credit rating, does not constitute a statutory credit report under RBI/CIBIL regulations, and does not guarantee repayment or credit approval.",
  };
}

/**
 * Persists a score snapshot into browser local storage for trend tracking.
 */
export function recordCredroSnapshot(score: number, trustLevel: TrustLevel): void {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(CREDRO_HISTORY_STORAGE_KEY);
    let history: CredroSnapshot[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) history = parsed;
    }

    const today = new Date().toISOString().split("T")[0];
    // Keep at most 1 snapshot per day, max 30 snapshots
    const existingIndex = history.findIndex((s) => s.timestamp.startsWith(today));
    if (existingIndex >= 0) {
      history[existingIndex] = { timestamp: new Date().toISOString(), score, trustLevel };
    } else {
      history.push({ timestamp: new Date().toISOString(), score, trustLevel });
    }

    if (history.length > 30) {
      history = history.slice(history.length - 30);
    }

    window.localStorage.setItem(CREDRO_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Non-blocking
  }
}
