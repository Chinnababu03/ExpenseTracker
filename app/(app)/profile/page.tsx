import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile via user's authenticated context (enforces RLS auth.uid() = id)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email, display_name, currency, timezone")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200 text-sm text-amber-800">
          Profile record not found. It will be provisioned on your next sign-in.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Preferences</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your display name, base currency for analytics, and default timezone.
        </p>
      </div>

      <ProfileForm initialProfile={profile} />
    </div>
  );
}
