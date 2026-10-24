import { z } from "zod";

export const financialRecordSchema = z
  .object({
    date: z
      .string()
      .min(1, "Transaction date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)"),
    type: z.enum(["income", "expense"], {
      errorMap: () => ({ message: "Type must be Income or Expense" }),
    }),
    category: z.string().min(1, "Please select or enter a category"),
    amount: z
      .number({ invalid_type_error: "Amount must be a valid number" })
      .positive("Amount must be greater than zero"),
    paidAmount: z
      .number({ invalid_type_error: "Paid amount must be a number" })
      .min(0, "Paid amount cannot be negative"),
    paymentStatus: z.enum(["expected", "partially_paid", "completed"], {
      errorMap: () => ({ message: "Select a valid payment status" }),
    }),
    description: z
      .string()
      .min(2, "Description must be at least 2 characters")
      .max(250, "Description cannot exceed 250 characters"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    reference: z.string().max(50, "Reference code cannot exceed 50 characters").optional(),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  })
  .refine((data) => data.paidAmount <= data.amount, {
    message: "Actual paid amount cannot exceed total transaction amount",
    path: ["paidAmount"],
  })
  .refine(
    (data) => {
      if (data.paymentStatus === "completed") {
        return data.paidAmount === data.amount;
      }
      if (data.paymentStatus === "expected") {
        return data.paidAmount === 0;
      }
      if (data.paymentStatus === "partially_paid") {
        return data.paidAmount > 0 && data.paidAmount < data.amount;
      }
      return true;
    },
    {
      message:
        "Paid amount must align with status (Expected = ₹0, Partially Paid = between ₹1 and Total, Completed = 100% of Total)",
      path: ["paidAmount"],
    }
  );

export type FinancialRecordFormData = z.infer<typeof financialRecordSchema>;
