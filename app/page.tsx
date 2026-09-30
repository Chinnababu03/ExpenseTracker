import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto py-12">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-6">
        <span>🔐 Row-Level Security Enforced</span>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
        Personal Finance with True Data Integrity.
      </h1>
      <p className="text-lg text-slate-600 mb-8 leading-relaxed">
        ExpenseFlow provides private financial planning, bill tracking, and ledger analytics backed directly by PostgreSQL transactional constraints.
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/signup"
          className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm"
        >
          Create an Account
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
