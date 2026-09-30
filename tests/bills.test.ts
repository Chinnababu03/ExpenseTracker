import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createBillSchema,
  updateBillSchema,
  updateOccurrenceSchema,
} from "../lib/validations/bills";
import {
  clampDueDate,
  generateOccurrencesForMonth,
  type BillDefinition,
} from "../lib/bills/generator";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("Phase 3A: Bills Validation Schemas", () => {
  it("validates a valid monthly bill creation payload", () => {
    const valid = createBillSchema.safeParse({
      name: "Internet Fiber",
      categoryId: "00000000-0000-0000-0000-000000000001",
      amount: "1199.50",
      frequency: "MONTHLY",
      billType: "FIXED",
      defaultDueDay: 15,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.amount).toBe(1199.5);
    }
  });

  it("rejects negative or zero amounts", () => {
    const zeroAmount = createBillSchema.safeParse({
      name: "Free Service",
      categoryId: "00000000-0000-0000-0000-000000000001",
      amount: 0,
      defaultDueDay: 5,
      startDate: "2026-01-01",
    });
    expect(zeroAmount.success).toBe(false);

    const negativeAmount = createBillSchema.safeParse({
      name: "Negative Bill",
      categoryId: "00000000-0000-0000-0000-000000000001",
      amount: -500,
      defaultDueDay: 5,
      startDate: "2026-01-01",
    });
    expect(negativeAmount.success).toBe(false);
  });

  it("rejects defaultDueDay outside 1 to 31", () => {
    const invalidDay = createBillSchema.safeParse({
      name: "Test Bill",
      categoryId: "00000000-0000-0000-0000-000000000001",
      amount: 500,
      defaultDueDay: 32,
      startDate: "2026-01-01",
    });
    expect(invalidDay.success).toBe(false);
  });

  it("rejects end date preceding start date", () => {
    const invalidDates = createBillSchema.safeParse({
      name: "Inverted Dates",
      categoryId: "00000000-0000-0000-0000-000000000001",
      amount: 500,
      defaultDueDay: 5,
      startDate: "2026-06-01",
      endDate: "2026-05-01",
    });
    expect(invalidDates.success).toBe(false);
  });
});

describe("Phase 3A: Occurrence Generator Engine", () => {
  it("correctly clamps due dates for months with fewer days", () => {
    // February 2026 (non-leap year, 28 days)
    expect(clampDueDate(2026, 2, 31)).toBe("2026-02-28");
    expect(clampDueDate(2026, 2, 29)).toBe("2026-02-28");

    // April 2026 (30 days)
    expect(clampDueDate(2026, 4, 31)).toBe("2026-04-30");

    // December 2026 (31 days)
    expect(clampDueDate(2026, 12, 31)).toBe("2026-12-31");
  });

  it("generates monthly occurrences for active bills", () => {
    const bill: BillDefinition = {
      id: "bill-1",
      name: "Rent",
      amount: 25000,
      frequency: "MONTHLY",
      default_due_day: 5,
      start_date: "2026-01-01",
      end_date: null,
      is_active: true,
    };

    const occurrences = generateOccurrencesForMonth(bill, 2026, 9);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].due_date).toBe("2026-09-05");
    expect(occurrences[0].amount).toBe(25000);
  });

  it("generates multiple occurrences for weekly bills in the same month", () => {
    const weeklyBill: BillDefinition = {
      id: "bill-weekly",
      name: "Weekly Cleaning",
      amount: 500,
      frequency: "WEEKLY",
      default_due_day: 1,
      start_date: "2026-09-01",
      end_date: null,
      is_active: true,
    };

    const occurrences = generateOccurrencesForMonth(weeklyBill, 2026, 9);
    // In Sept 2026, starting from 2026-09-01 (Tuesday), weekly dates: Sept 1, 8, 15, 22, 29 (5 occurrences)
    expect(occurrences.length).toBeGreaterThanOrEqual(4);
    expect(occurrences[0].period_month).toBe("2026-09-01");
  });
});

describe("Phase 3A: Database & RLS Integration", () => {
  it("authenticates as Alice and fetches seeded bills and occurrences", async () => {
    const aliceClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData, error: authError } = await aliceClient.auth.signInWithPassword({
      email: "alice@example.com",
      password: "password123",
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();

    // Alice queries bills
    const { data: bills, error: billsError } = await aliceClient
      .from("bills")
      .select("id, name, amount");

    expect(billsError).toBeNull();
    expect(bills).toBeDefined();
    expect(bills!.length).toBeGreaterThanOrEqual(2);

    // Alice queries occurrences for Sept 2026
    const { data: occurrences, error: occError } = await aliceClient
      .from("bill_occurrences")
      .select("id, bill_id, amount, status")
      .eq("period_month", "2026-09-01");

    expect(occError).toBeNull();
    expect(occurrences).toBeDefined();
    expect(occurrences!.length).toBeGreaterThanOrEqual(2);
  });

  it("enforces tenant isolation: Bob cannot view or modify Alice's bills", async () => {
    const bobClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData } = await bobClient.auth.signInWithPassword({
      email: "bob@example.com",
      password: "password123",
    });

    // 1. Bob queries bills: returns 0 rows (since Bob has no bills seeded)
    const { data: bobBills } = await bobClient.from("bills").select("*");
    expect(bobBills).toHaveLength(0);

    // 2. Bob attempts to query Alice's bill occurrences: returns 0 rows
    const { data: bobOccurrences } = await bobClient
      .from("bill_occurrences")
      .select("*")
      .eq("period_month", "2026-09-01");
    expect(bobOccurrences).toHaveLength(0);

    // 3. Bob attempts to delete Alice's rent bill: affects 0 rows
    const aliceRentBillId = "a2222222-0000-0000-0000-000000000001";
    const { data: deleteResult } = await bobClient
      .from("bills")
      .delete()
      .eq("id", aliceRentBillId)
      .select();
    expect(deleteResult).toHaveLength(0);
  });
});
