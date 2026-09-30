import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createPaymentSchema = z.object({
  billOccurrenceId: z.string().uuid("Invalid bill occurrence ID"),
  accountId: z.string().uuid("Invalid payment account ID"),
  amount: z.coerce
    .number()
    .positive("Payment amount must be greater than zero")
    .max(100000000, "Payment amount exceeds maximum permitted limit"),
  paymentDate: z
    .string()
    .regex(dateRegex, "Payment date must be in YYYY-MM-DD format"),
  paymentReference: z
    .string()
    .max(100, "Payment reference cannot exceed 100 characters")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export const deletePaymentSchema = z.object({
  id: z.string().uuid("Invalid payment ID"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type DeletePaymentInput = z.infer<typeof deletePaymentSchema>;
