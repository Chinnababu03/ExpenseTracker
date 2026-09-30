"use client";

import { useState, useActionState } from "react";
import { createBillAction, type ActionResult } from "@/app/actions/bills";

interface CategoryOption {
  id: string;
  name: string;
}

interface BillDialogProps {
  categories: CategoryOption[];
}

export function BillDialog({ categories }: BillDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const res = await createBillAction(prev, formData);
      if (res.success) {
        setIsOpen(false);
      }
      return res;
    },
    null
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
      >
        <span>+ New Recurring Bill</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Recurring Bill Definition</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {state?.error && (
              <div className="p-3 text-xs rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                {state.error}
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Bill Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Apartment Rent, Netflix, Wifi"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="categoryId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Amount (₹)
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="25000.00"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="frequency" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    defaultValue="MONTHLY"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 bg-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Biweekly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="billType" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    id="billType"
                    name="billType"
                    defaultValue="FIXED"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 bg-white"
                  >
                    <option value="FIXED">Fixed</option>
                    <option value="VARIABLE">Variable</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="defaultDueDay" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Due Day (1-31)
                  </label>
                  <input
                    id="defaultDueDay"
                    name="defaultDueDay"
                    type="number"
                    min="1"
                    max="31"
                    required
                    defaultValue="5"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    End Date (Optional)
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm disabled:opacity-50 transition"
                >
                  {isPending ? "Creating..." : "Save Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
