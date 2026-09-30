"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createPaymentSchema,
  deletePaymentSchema,
} from "@/lib/validations/payments";

export type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};

export interface PaymentItem {
  id: string;
  bill_occurrence_id: string;
  account_id: string;
  amount: number;
  payment_date: string;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  accounts?: {
    id: string;
    name: string;
    account_type: string;
  } | null;
}

export async function recordPaymentAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResult<{ paymentId: string; newStatus: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Convert FormData to raw object if needed
  let rawData: Record<string, unknown>;
  if (formData instanceof FormData) {
    rawData = {
      billOccurrenceId: formData.get("billOccurrenceId"),
      accountId: formData.get("accountId"),
      amount: formData.get("amount"),
      paymentDate: formData.get("paymentDate"),
      paymentReference: formData.get("paymentReference") || null,
      notes: formData.get("notes") || null,
    };
  } else {
    rawData = formData;
  }

  const parsed = createPaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Invalid payment data",
    };
  }

  const {
    billOccurrenceId,
    accountId,
    amount,
    paymentDate,
    paymentReference,
    notes,
  } = parsed.data;

  // 1. Fetch occurrence and existing payment sum to prevent overpayment per data quality spec
  const { data: occurrence, error: occError } = await supabase
    .from("bill_occurrences")
    .select("id, amount, status")
    .eq("id", billOccurrenceId)
    .eq("user_id", user.id)
    .single();

  if (occError || !occurrence) {
    return { success: false, error: "Bill occurrence not found or unauthorized" };
  }

  const { data: existingPayments, error: sumError } = await supabase
    .from("payments")
    .select("amount")
    .eq("bill_occurrence_id", billOccurrenceId)
    .eq("user_id", user.id);

  if (sumError) {
    return { success: false, error: sumError.message };
  }

  const currentPaid = (existingPayments || []).reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  );
  const remaining = Number(occurrence.amount) - currentPaid;

  // Round comparison to 2 decimal places to avoid floating point anomalies
  const roundedRemaining = Math.round(remaining * 100) / 100;
  const roundedAmount = Math.round(amount * 100) / 100;

  if (roundedAmount > roundedRemaining) {
    return {
      success: false,
      error: `Payment amount (₹${roundedAmount.toFixed(
        2
      )}) exceeds remaining balance (₹${Math.max(0, roundedRemaining).toFixed(2)})`,
    };
  }

  // 2. Insert payment record.
  // Note: PostgreSQL composite FK fk_payments_account_user ensures account_id belongs to user.id
  const { data: newPayment, error: insertError } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      bill_occurrence_id: billOccurrenceId,
      account_id: accountId,
      amount: roundedAmount,
      payment_date: paymentDate,
      payment_reference: paymentReference || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 3. Fetch updated occurrence status (maintained by database trigger)
  const { data: updatedOcc } = await supabase
    .from("bill_occurrences")
    .select("status")
    .eq("id", billOccurrenceId)
    .single();

  revalidatePath("/bills");
  return {
    success: true,
    data: {
      paymentId: newPayment.id,
      newStatus: updatedOcc?.status || "PARTIAL",
    },
  };
}

export async function getOccurrencePaymentsAction(
  billOccurrenceId: string
): Promise<ActionResult<PaymentItem[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      id,
      bill_occurrence_id,
      account_id,
      amount,
      payment_date,
      payment_reference,
      notes,
      created_at,
      accounts (
        id,
        name,
        account_type
      )
    `
    )
    .eq("bill_occurrence_id", billOccurrenceId)
    .eq("user_id", user.id)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as unknown as PaymentItem[]) || [] };
}

export async function deletePaymentAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = deletePaymentSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "Invalid payment ID" };
  }

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/bills");
  return { success: true };
}
