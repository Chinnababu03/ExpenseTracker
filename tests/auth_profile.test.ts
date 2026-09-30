import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { signInSchema, signUpSchema, updateProfileSchema } from "../lib/validations/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("Phase 2: Validation Schemas", () => {
  it("validates correct sign-in inputs", () => {
    const valid = signInSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid emails and short passwords", () => {
    const invalidEmail = signInSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(invalidEmail.success).toBe(false);

    const shortPassword = signInSchema.safeParse({
      email: "test@example.com",
      password: "123",
    });
    expect(shortPassword.success).toBe(false);
  });

  it("validates sign-up schema with full name", () => {
    const valid = signUpSchema.safeParse({
      email: "alice@example.com",
      password: "password123",
      fullName: "Alice Sharma",
    });
    expect(valid.success).toBe(true);

    const emptyName = signUpSchema.safeParse({
      email: "alice@example.com",
      password: "password123",
      fullName: "   ",
    });
    expect(emptyName.success).toBe(false);
  });

  it("enforces 3-letter currency code and transforms to uppercase", () => {
    const valid = updateProfileSchema.safeParse({
      displayName: "Alice S.",
      currency: "usd",
      timezone: "America/New_York",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.currency).toBe("USD");
    }

    const invalidCurrency = updateProfileSchema.safeParse({
      displayName: "Alice S.",
      currency: "US",
      timezone: "America/New_York",
    });
    expect(invalidCurrency.success).toBe(false);
  });
});

describe("Phase 2: Database RLS & Profile Security Integration", () => {
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  it("blocks unauthenticated access from reading profiles under RLS", async () => {
    const { data, error } = await anonClient.from("profiles").select("*");
    // Under RLS, unauthenticated SELECT on profiles returns 0 rows
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("authenticates as Alice and reads own profile", async () => {
    const aliceClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData, error: authError } = await aliceClient.auth.signInWithPassword({
      email: "alice@example.com",
      password: "password123",
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();

    // Alice reads her profile
    const { data: profile, error: profileError } = await aliceClient
      .from("profiles")
      .select("*")
      .eq("id", authData.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.email).toBe("alice@example.com");
  });

  it("prevents Alice from querying or modifying Bob's profile under RLS", async () => {
    const aliceClient = createClient(SUPABASE_URL, ANON_KEY);
    await aliceClient.auth.signInWithPassword({
      email: "alice@example.com",
      password: "password123",
    });

    const bobId = "b0000000-0000-0000-0000-000000000002";

    // 1. Cross-user SELECT returns no rows
    const { data: bobProfile } = await aliceClient
      .from("profiles")
      .select("*")
      .eq("id", bobId);

    expect(bobProfile).toHaveLength(0);

    // 2. Cross-user UPDATE affects 0 rows
    const { data: updateResult } = await aliceClient
      .from("profiles")
      .update({ display_name: "Hacked by Alice" })
      .eq("id", bobId)
      .select();

    expect(updateResult).toHaveLength(0);
  });

  it("allows Alice to update her own profile preferences", async () => {
    const aliceClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData } = await aliceClient.auth.signInWithPassword({
      email: "alice@example.com",
      password: "password123",
    });

    const { error: updateError } = await aliceClient
      .from("profiles")
      .update({
        display_name: "Alice Sharma Updated",
        currency: "INR",
        timezone: "Asia/Kolkata",
      })
      .eq("id", authData.user!.id);

    expect(updateError).toBeNull();

    // Verify persisted value
    const { data: profile } = await aliceClient
      .from("profiles")
      .select("display_name, currency, timezone")
      .eq("id", authData.user!.id)
      .single();

    expect(profile.display_name).toBe("Alice Sharma Updated");
    expect(profile.currency).toBe("INR");
    expect(profile.timezone).toBe("Asia/Kolkata");
  });
});
