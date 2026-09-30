import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, currency, timezone, created_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {profile?.display_name || user.email?.split("@")[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authenticated via Supabase Auth • Session securely isolated in PostgreSQL
          </p>
        </div>
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition shadow-sm"
          >
            Edit Preferences
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Profile</p>
          <p className="text-lg font-bold text-slate-900">{profile?.display_name || "Not set"}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Base Currency</p>
          <p className="text-2xl font-extrabold text-emerald-700">{profile?.currency || "INR"}</p>
          <p className="text-xs text-slate-500">Standard precision: 2 decimal places (NUMERIC)</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Timezone Context</p>
          <p className="text-lg font-bold text-slate-900">{profile?.timezone || "UTC"}</p>
          <p className="text-xs text-slate-500">All financial timestamps stored in TIMESTAMPTZ</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center space-y-3">
        <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
          ✓
        </div>
        <h3 className="text-base font-semibold text-slate-800">Phase 2 Authentication Operational</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Your session is authenticated, RLS rules isolate your tenant space, and profile preferences are persisted server-side.
        </p>
      </div>
    </div>
  );
}
