"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createBillSchema,
  updateBillSchema,
  updateOccurrenceSchema,
} from "@/lib/validations/bills";
import {
  generateOccurrencesForMonth,
  formatPeriodMonth,
  type BillDefinition,
} from "@/lib/bills/generator";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getBillsAction(): Promise<ActionResult<any[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("bills")
    .select(`
      id,
      name,
      amount,
      frequency,
      bill_type,
      default_due_day,
      start_date,
      end_date,
      is_active,
      created_at,
      categories (
        id,
        name
      )
    `)
    .order("name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

export async function createBillAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const rawData = {
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency") || "MONTHLY",
    billType: formData.get("billType") || "FIXED",
    defaultDueDay: formData.get("defaultDueDay"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  };

  const parsed = createBillSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Invalid bill input",
    };
  }

  // Insert Bill Definition (database enforces composite FK to user's category)
  const { data: newBill, error: insertError } = await supabase
    .from("bills")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      category_id: parsed.data.categoryId,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      bill_type: parsed.data.billType,
      default_due_day: parsed.data.defaultDueDay,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate || null,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Automatically generate occurrence for the current month if applicable
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const candidates = generateOccurrencesForMonth(
    newBill as BillDefinition,
    currentYear,
    currentMonth
  );

  if (candidates.length > 0) {
    await supabase.from("bill_occurrences").upsert(
      candidates.map((c) => ({
        ...c,
        user_id: user.id,
      })),
      { onConflict: "user_id,bill_id,due_date" }
    );
  }

  revalidatePath("/bills");
  return { success: true };
}

export async function updateBillAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const rawData: Record<string, unknown> = {};
  if (formData.has("name")) rawData.name = formData.get("name");
  if (formData.has("categoryId")) rawData.categoryId = formData.get("categoryId");
  if (formData.has("amount")) rawData.amount = formData.get("amount");
  if (formData.has("frequency")) rawData.frequency = formData.get("frequency");
  if (formData.has("billType")) rawData.billType = formData.get("billType");
  if (formData.has("defaultDueDay")) rawData.defaultDueDay = formData.get("defaultDueDay");
  if (formData.has("startDate")) rawData.startDate = formData.get("startDate");
  if (formData.has("endDate")) rawData.endDate = formData.get("endDate");
  if (formData.has("isActive")) rawData.isActive = formData.get("isActive") === "true";

  const parsed = updateBillSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Invalid update input",
    };
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.categoryId !== undefined) updatePayload.category_id = parsed.data.categoryId;
  if (parsed.data.amount !== undefined) updatePayload.amount = parsed.data.amount;
  if (parsed.data.frequency !== undefined) updatePayload.frequency = parsed.data.frequency;
  if (parsed.data.billType !== undefined) updatePayload.bill_type = parsed.data.billType;
  if (parsed.data.defaultDueDay !== undefined) updatePayload.default_due_day = parsed.data.defaultDueDay;
  if (parsed.data.startDate !== undefined) updatePayload.start_date = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updatePayload.end_date = parsed.data.endDate || null;
  if (parsed.data.isActive !== undefined) updatePayload.is_active = parsed.data.isActive;

  const { error } = await supabase
    .from("bills")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/bills");
  return { success: true };
}

export async function deleteBillAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("bills")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/bills");
  return { success: true };
}

export async function getOccurrencesAction(periodMonth: string): Promise<ActionResult<any[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("bill_occurrences")
    .select(`
      id,
      bill_id,
      period_month,
      due_date,
      amount,
      status,
      created_at,
      bills (
        id,
        name,
        frequency,
        bill_type,
        categories (
          id,
          name
        )
      ),
      payments (
        id,
        amount,
        payment_date,
        payment_reference,
        notes,
        account_id,
        accounts (
          id,
          name,
          account_type
        )
      )
    `)
    .eq("period_month", periodMonth)
    .order("due_date", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

export async function generateOccurrencesAction(
  periodMonth: string
): Promise<ActionResult<{ generatedCount: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const [yearStr, monthStr] = periodMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return { success: false, error: "Invalid period month format (expected YYYY-MM-01)" };
  }

  // 1. Fetch active bills for this user
  const { data: bills, error: billsError } = await supabase
    .from("bills")
    .select("id, name, amount, frequency, default_due_day, start_date, end_date, is_active")
    .eq("is_active", true);

  if (billsError) {
    return { success: false, error: billsError.message };
  }

  if (!bills || bills.length === 0) {
    return { success: true, data: { generatedCount: 0 } };
  }

  // 2. Generate candidates
  const allCandidates: Array<{
    user_id: string;
    bill_id: string;
    period_month: string;
    due_date: string;
    amount: number;
    status: string;
  }> = [];

  for (const bill of bills) {
    const candidates = generateOccurrencesForMonth(
      bill as BillDefinition,
      year,
      month
    );
    for (const c of candidates) {
      allCandidates.push({
        ...c,
        user_id: user.id,
      });
    }
  }

  if (allCandidates.length === 0) {
    return { success: true, data: { generatedCount: 0 } };
  }

  // 3. Insert candidates idempotently (conflict target: user_id, bill_id, due_date)
  const { error: upsertError } = await supabase
    .from("bill_occurrences")
    .upsert(allCandidates, { onConflict: "user_id,bill_id,due_date", ignoreDuplicates: true });

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  revalidatePath("/bills");
  return { success: true, data: { generatedCount: allCandidates.length } };
}

export async function updateOccurrenceAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const rawData: Record<string, unknown> = {};
  if (formData.has("amount")) rawData.amount = formData.get("amount");
  if (formData.has("status")) rawData.status = formData.get("status");
  if (formData.has("dueDate")) rawData.dueDate = formData.get("dueDate");

  const parsed = updateOccurrenceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Invalid occurrence input",
    };
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.amount !== undefined) updatePayload.amount = parsed.data.amount;
  if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
  if (parsed.data.dueDate !== undefined) updatePayload.due_date = parsed.data.dueDate;

  const { error } = await supabase
    .from("bill_occurrences")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/bills");
  return { success: true };
}
