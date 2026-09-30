"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionResult } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signInAction,
    null
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            Sign In to ExpenseFlow
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Or{" "}
            <Link
              href="/signup"
              className="font-medium text-emerald-600 hover:text-emerald-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        {state?.error && (
          <div className="rounded-md bg-rose-50 p-4 border border-rose-200 text-sm text-rose-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="alice@example.com"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
