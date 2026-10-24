import { z } from "zod";

export const scenarioModifierSchema = z.object({
  scenarioName: z
    .string()
    .min(3, "Scenario name must be at least 3 characters")
    .max(80, "Scenario name too long")
    .optional(),
  customerDelayDays: z
    .number()
    .int("Customer delay must be a whole number of days")
    .min(-30, "Delay cannot be less than -30 days")
    .max(120, "Delay cannot exceed 120 days")
    .default(0),
  salesPercentageChange: z
    .number()
    .min(-100, "Sales drop cannot exceed -100%")
    .max(100, "Sales increase cannot exceed +100%")
    .default(0),
  supplierShiftDays: z
    .number()
    .int("Supplier shift must be a whole number of days")
    .min(-60, "Cannot advance supplier payment by more than 60 days")
    .max(90, "Cannot defer supplier payment by more than 90 days")
    .default(0),
  payrollPercentageChange: z
    .number()
    .min(-50, "Payroll reduction cannot exceed -50%")
    .max(50, "Payroll increment cannot exceed +50%")
    .default(0),
  unexpectedExpenseAmount: z
    .number()
    .min(0, "Unexpected expense cannot be negative")
    .max(10000000, "Unexpected expense exceeds limit")
    .default(0),
  unexpectedExpenseDay: z
    .number()
    .int("Day offset must be an integer")
    .min(0, "Day offset must be 0 or greater")
    .max(90, "Day offset must be within 90 days")
    .default(15),
  unexpectedExpenseName: z
    .string()
    .max(100, "Description too long")
    .default("Emergency Contingency Outlay"),
  loanDeferredDays: z
    .number()
    .int("Loan deferral must be an integer")
    .min(0, "Deferral cannot be negative")
    .max(90, "Deferral cannot exceed 90 days")
    .default(0),
  loanExtraPayment: z
    .number()
    .min(0, "Extra payment cannot be negative")
    .default(0),
});

export type ScenarioModifierFormData = z.infer<typeof scenarioModifierSchema>;

export const PRESET_SCENARIOS = {
  base: {
    id: "base",
    title: "Base-Case (Actual Live Data)",
    description: "Realistic forecast based on current ledger, cleared receipts, and scheduled obligations without adjustments.",
    modifiers: {
      customerDelayDays: 0,
      salesPercentageChange: 0,
      supplierShiftDays: 0,
      payrollPercentageChange: 0,
      unexpectedExpenseAmount: 0,
      unexpectedExpenseDay: 15,
      unexpectedExpenseName: "Emergency Contingency Outlay",
      loanDeferredDays: 0,
      loanExtraPayment: 0,
    },
  },
  optimistic: {
    id: "optimistic",
    title: "Optimistic Scenario",
    description: "Strong sales growth (+15%), early customer settlements (-5 days delay), supplier term extensions (+10 days), and zero unexpected capital drains.",
    modifiers: {
      customerDelayDays: -5,
      salesPercentageChange: 15,
      supplierShiftDays: 10,
      payrollPercentageChange: 0,
      unexpectedExpenseAmount: 0,
      unexpectedExpenseDay: 15,
      unexpectedExpenseName: "Emergency Contingency Outlay",
      loanDeferredDays: 0,
      loanExtraPayment: 0,
    },
  },
  pessimistic: {
    id: "pessimistic",
    title: "Pessimistic Stress Test",
    description: "Severe revenue contraction (-25%), severe customer payment delays (+30 days), supplier demanding 7 days faster settlement, and ₹1,00,000 emergency repair on Day 12.",
    modifiers: {
      customerDelayDays: 30,
      salesPercentageChange: -25,
      supplierShiftDays: -7,
      payrollPercentageChange: 0,
      unexpectedExpenseAmount: 100000,
      unexpectedExpenseDay: 12,
      unexpectedExpenseName: "CNC Spindle Breakdown & Tooling",
      loanDeferredDays: 0,
      loanExtraPayment: 0,
    },
  },
};
