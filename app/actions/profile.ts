"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations/auth";

export type ProfileActionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function updateProfileAction(
  prevState: ProfileActionResult | null,
  formData: FormData
): Promise<ProfileActionResult> {
  const supabase = await createClient();

  // 1. Authoritative Server-Side User Identification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Unauthorized: Active session required",
    };
  }

  // 2. Input Boundary Validation
  const rawData = {
    displayName: formData.get("displayName"),
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
  };

  const parsed = updateProfileSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Invalid profile data",
    };
  }

  // 3. Database Mutation under RLS (using user.id derived from auth context)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Profile preferences updated successfully",
  };
}
