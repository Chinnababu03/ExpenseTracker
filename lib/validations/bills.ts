import { z } from "zod";

export const frequencyEnum = z.enum([
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
]);

export const billTypeEnum = z.enum(["FIXED", "VARIABLE"]);

export const occurrenceStatusEnum = z.enum([
  "PENDING",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "SKIPPED",
]);

export const createBillSchema = z
  .object({
    name: z.string().trim().min(1, "Bill name is required").max(100),
    categoryId: z.string().uuid("Please select a valid category"),
    amount: z.coerce
      .number({ invalid_type_error: "Amount must be a number" })
      .positive("Amount must be greater than zero")
      .transform((val) => Number(val.toFixed(2))),
    frequency: frequencyEnum.default("MONTHLY"),
    billType: billTypeEnum.default("FIXED"),
    defaultDueDay: z.coerce
      .number()
      .int()
      .min(1, "Due day must be between 1 and 31")
      .max(31, "Due day must be between 1 and 31"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.endDate && data.endDate !== "") {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date cannot precede start date",
      path: ["endDate"],
    }
  );

export const updateBillSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    categoryId: z.string().uuid().optional(),
    amount: z.coerce
      .number()
      .positive()
      .transform((val) => Number(val.toFixed(2)))
      .optional(),
    frequency: frequencyEnum.optional(),
    billType: billTypeEnum.optional(),
    defaultDueDay: z.coerce.number().int().min(1).max(31).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable()
      .or(z.literal("")),
    isActive: z.coerce.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate && data.endDate !== "") {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date cannot precede start date",
      path: ["endDate"],
    }
  );

export const updateOccurrenceSchema = z.object({
  amount: z.coerce.number().min(0, "Amount cannot be negative").optional(),
  status: occurrenceStatusEnum.optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type UpdateOccurrenceInput = z.infer<typeof updateOccurrenceSchema>;
