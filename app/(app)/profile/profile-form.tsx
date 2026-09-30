"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileActionResult } from "@/app/actions/profile";

interface ProfileFormProps {
  initialProfile: {
    email: string;
    display_name: string | null;
    currency: string;
    timezone: string;
  };
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ProfileActionResult | null, FormData>(
    updateProfileAction,
    null
  );

  return (
    <form action={formAction} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      {state?.error && (
        <div className="rounded-md bg-rose-50 p-4 border border-rose-200 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-700">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          disabled
          value={initialProfile.email}
          className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 sm:text-sm cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-slate-400">Email address is managed via your authentication credentials.</p>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
          Display Name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          defaultValue={initialProfile.display_name || ""}
          placeholder="Alice Sharma"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-slate-700">
            Preferred Currency Code (3 uppercase letters)
          </label>
          <input
            id="currency"
            name="currency"
            type="text"
            required
            maxLength={3}
            defaultValue={initialProfile.currency || "INR"}
            placeholder="INR"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 uppercase font-mono focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">Standard ISO 4217 code (e.g. INR, USD, EUR, GBP).</p>
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            type="text"
            required
            defaultValue={initialProfile.timezone || "Asia/Kolkata"}
            placeholder="Asia/Kolkata"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">Standard IANA timezone (e.g. Asia/Kolkata, UTC).</p>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="py-2.5 px-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
        >
          {isPending ? "Saving changes..." : "Save Preferences"}
        </button>
      </div>
    </form>
  );
}
