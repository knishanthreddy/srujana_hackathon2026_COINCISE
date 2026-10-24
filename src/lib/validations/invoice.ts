import { z } from "zod";

export const receivableSchema = z
  .object({
    invoiceNumber: z
      .string()
      .min(1, "Invoice number is required")
      .max(50, "Invoice number too long"),
    customerName: z
      .string()
      .min(2, "Customer name must be at least 2 characters")
      .max(100, "Customer name too long"),
    totalAmount: z
      .number({ invalid_type_error: "Total amount must be a number" })
      .positive("Total invoice amount must be greater than zero"),
    paidAmount: z
      .number({ invalid_type_error: "Received amount must be a number" })
      .min(0, "Received amount cannot be negative"),
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format"),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format"),
    contactEmail: z
      .string()
      .email("Must be a valid email address")
      .optional()
      .or(z.literal("")),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  })
  .refine((data) => data.paidAmount <= data.totalAmount, {
    message: "Received amount cannot exceed total invoice amount",
    path: ["paidAmount"],
  });

export type ReceivableFormData = z.infer<typeof receivableSchema>;

export const payableSchema = z
  .object({
    invoiceNumber: z
      .string()
      .min(1, "Bill/Invoice number is required")
      .max(50, "Bill number too long"),
    vendorName: z
      .string()
      .min(2, "Vendor/Supplier name must be at least 2 characters")
      .max(100, "Vendor name too long"),
    totalAmount: z
      .number({ invalid_type_error: "Total amount must be a number" })
      .positive("Total bill amount must be greater than zero"),
    paidAmount: z
      .number({ invalid_type_error: "Paid amount must be a number" })
      .min(0, "Paid amount cannot be negative"),
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format"),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format"),
    category: z.string().min(1, "Expense category is required"),
    contactEmail: z
      .string()
      .email("Must be a valid email address")
      .optional()
      .or(z.literal("")),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  })
  .refine((data) => data.paidAmount <= data.totalAmount, {
    message: "Paid amount cannot exceed total bill amount",
    path: ["paidAmount"],
  });

export type PayableFormData = z.infer<typeof payableSchema>;

export const paymentRecordSchema = z.object({
  paymentAmount: z
    .number({ invalid_type_error: "Payment amount must be a number" })
    .positive("Payment amount must be greater than zero"),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be in YYYY-MM-DD format"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().max(50, "Reference too long").optional(),
  syncToCashLedger: z.boolean().default(true),
  notes: z.string().max(300, "Notes too long").optional(),
});

export type PaymentRecordFormData = z.infer<typeof paymentRecordSchema>;
