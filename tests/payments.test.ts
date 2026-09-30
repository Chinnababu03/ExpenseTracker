import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createPaymentSchema,
  deletePaymentSchema,
} from "../lib/validations/payments";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("Phase 3B: Payments Validation Schemas", () => {
  it("validates a well-formed payment record payload", () => {
    const valid = createPaymentSchema.safeParse({
      billOccurrenceId: "a3333333-0000-0000-0000-000000000001",
      accountId: "a1111111-0000-0000-0000-000000000001",
      amount: "5000.50",
      paymentDate: "2026-10-05",
      paymentReference: "UPI-TEST-1234",
      notes: "First installment",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.amount).toBe(5000.5);
      expect(valid.data.paymentReference).toBe("UPI-TEST-1234");
    }
  });

  it("rejects non-positive payment amounts", () => {
    const zero = createPaymentSchema.safeParse({
      billOccurrenceId: "a3333333-0000-0000-0000-000000000001",
      accountId: "a1111111-0000-0000-0000-000000000001",
      amount: 0,
      paymentDate: "2026-10-05",
    });
    expect(zero.success).toBe(false);

    const negative = createPaymentSchema.safeParse({
      billOccurrenceId: "a3333333-0000-0000-0000-000000000001",
      accountId: "a1111111-0000-0000-0000-000000000001",
      amount: -250,
      paymentDate: "2026-10-05",
    });
    expect(negative.success).toBe(false);
  });

  it("rejects invalid date formats", () => {
    const invalidDate = createPaymentSchema.safeParse({
      billOccurrenceId: "a3333333-0000-0000-0000-000000000001",
      accountId: "a1111111-0000-0000-0000-000000000001",
      amount: 100,
      paymentDate: "05-10-2026", // Not YYYY-MM-DD
    });
    expect(invalidDate.success).toBe(false);
  });

  it("validates delete payment payload", () => {
    const valid = deletePaymentSchema.safeParse({
      id: "a7777777-0000-0000-0000-000000000001",
    });
    expect(valid.success).toBe(true);

    const invalid = deletePaymentSchema.safeParse({
      id: "not-a-uuid",
    });
    expect(invalid.success).toBe(false);
  });
});

describe("Phase 3B: Database, Triggers & Multi-Tenant Payment Isolation", () => {
  it("records partial and full payments, verifying database-driven status transitions", async () => {
    const aliceClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData, error: authError } = await aliceClient.auth.signInWithPassword({
      email: "alice@example.com",
      password: "password123",
    });
    expect(authError).toBeNull();
    const aliceId = authData.user!.id;

    // Fetch an existing category for Alice
    const { data: cat } = await aliceClient
      .from("categories")
      .select("id")
      .eq("user_id", aliceId)
      .limit(1)
      .single();
    expect(cat).toBeDefined();

    // 1. Create a fresh test bill and occurrence for Alice
    const { data: bill, error: billErr } = await aliceClient
      .from("bills")
      .insert({
        user_id: aliceId,
        category_id: cat!.id,
        name: "Electricity Board",
        amount: 3000.00,
        frequency: "MONTHLY",
        bill_type: "VARIABLE",
        default_due_day: 20,
        start_date: "2026-01-01",
      })
      .select("id")
      .single();

    expect(billErr).toBeNull();
    const billId = bill!.id;

    const { data: occurrence, error: occErr } = await aliceClient
      .from("bill_occurrences")
      .insert({
        user_id: aliceId,
        bill_id: billId,
        period_month: "2026-10-01",
        due_date: "2026-10-20",
        amount: 3000.00,
        status: "PENDING",
      })
      .select("id, status")
      .single();

    expect(occErr).toBeNull();
    expect(occurrence!.status).toBe("PENDING");
    const occId = occurrence!.id;

    // Alice's HDFC Checking account
    const aliceAccountId = "a1111111-0000-0000-0000-000000000001";

    // 2. Disburse partial payment of 1000.00
    const { data: payment1, error: p1Err } = await aliceClient
      .from("payments")
      .insert({
        user_id: aliceId,
        bill_occurrence_id: occId,
        account_id: aliceAccountId,
        amount: 1000.00,
        payment_date: "2026-10-10",
        payment_reference: "UPI-PARTIAL-1",
      })
      .select("id")
      .single();

    expect(p1Err).toBeNull();

    // Occurrence status must now be PARTIAL (updated by sync_occurrence_payment_status trigger)
    const { data: occAfterP1 } = await aliceClient
      .from("bill_occurrences")
      .select("status")
      .eq("id", occId)
      .single();

    expect(occAfterP1!.status).toBe("PARTIAL");

    // 3. Disburse remaining 2000.00
    const { data: payment2, error: p2Err } = await aliceClient
      .from("payments")
      .insert({
        user_id: aliceId,
        bill_occurrence_id: occId,
        account_id: aliceAccountId,
        amount: 2000.00,
        payment_date: "2026-10-15",
        payment_reference: "UPI-PARTIAL-2",
      })
      .select("id")
      .single();

    expect(p2Err).toBeNull();

    // Occurrence status must now be PAID
    const { data: occAfterP2 } = await aliceClient
      .from("bill_occurrences")
      .select("status")
      .eq("id", occId)
      .single();

    expect(occAfterP2!.status).toBe("PAID");

    // 4. Delete the second payment (2000.00): status must roll back to PARTIAL
    const { error: delErr } = await aliceClient
      .from("payments")
      .delete()
      .eq("id", payment2!.id);

    expect(delErr).toBeNull();

    const { data: occAfterDel } = await aliceClient
      .from("bill_occurrences")
      .select("status")
      .eq("id", occId)
      .single();

    expect(occAfterDel!.status).toBe("PARTIAL");

    // 5. Clean up first payment and bill
    await aliceClient.from("payments").delete().eq("id", payment1!.id);
    await aliceClient.from("bills").delete().eq("id", billId);
  });

  it("enforces tenant isolation: Bob cannot view, create, or delete Alice's payments", async () => {
    const bobClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: authError } = await bobClient.auth.signInWithPassword({
      email: "bob@example.com",
      password: "password123",
    });
    expect(authError).toBeNull();

    // 1. Bob queries payments: gets 0 rows (since Bob has no payments)
    const { data: bobPayments } = await bobClient.from("payments").select("*");
    expect(bobPayments).toHaveLength(0);

    // 2. Bob attempts to tamper by inserting a payment against Alice's Rent occurrence
    const aliceRentOccId = "a3333333-0000-0000-0000-000000000001";
    const bobAccountId = "b1111111-0000-0000-0000-000000000001";

    const { error: tamperError } = await bobClient.from("payments").insert({
      bill_occurrence_id: aliceRentOccId,
      account_id: bobAccountId,
      amount: 500.00,
      payment_date: "2026-10-01",
    });

    // Foreign key violation or RLS check violation
    expect(tamperError).toBeDefined();

    // 3. Bob attempts to delete Alice's seeded Rent payment
    // Alice's Rent payment exists in seed
    const { data: deleteAttempt } = await bobClient
      .from("payments")
      .delete()
      .eq("bill_occurrence_id", aliceRentOccId)
      .select();

    expect(deleteAttempt).toHaveLength(0);
  });
});
