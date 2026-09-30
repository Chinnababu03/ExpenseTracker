import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBillsAction, getOccurrencesAction, deleteBillAction } from "@/app/actions/bills";
import { BillDialog } from "./bill-dialog";
import { OccurrencesView } from "./occurrences-view";

interface BillsPageProps {
  searchParams: Promise<{ period?: string; tab?: string }>;
}

export default async function BillsPage({ searchParams }: BillsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const now = new Date();
  const currentPeriod =
    params.period ||
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const activeTab = params.tab || "occurrences";

  // 1. Fetch Occurrences for the period
  const occurrencesResult = await getOccurrencesAction(currentPeriod);
  const occurrences = occurrencesResult.data || [];

  // 2. Fetch Recurring Bill Definitions
  const billsResult = await getBillsAction();
  const bills = billsResult.data || [];

  // 3. Fetch Expense Categories for new bill form
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("category_type", "EXPENSE")
    .order("name", { ascending: true });

  // 4. Fetch Active Accounts for payment disbursements
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, account_type, currency")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bills & Recurring Obligations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your recurring commitments and period-by-period bill instances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BillDialog categories={categories || []} />
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-medium">
          <a
            href={`/bills?tab=occurrences&period=${currentPeriod}`}
            className={`pb-3 px-1 border-b-2 font-semibold transition ${
              activeTab === "occurrences"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Monthly Occurrences ({occurrences.length})
          </a>
          <a
            href={`/bills?tab=definitions&period=${currentPeriod}`}
            className={`pb-3 px-1 border-b-2 font-semibold transition ${
              activeTab === "definitions"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Recurring Bill Rules ({bills.length})
          </a>
        </nav>
      </div>

      {/* Tab 1: Monthly Occurrences */}
      {activeTab === "occurrences" && (
        <OccurrencesView
          initialOccurrences={occurrences}
          currentPeriod={currentPeriod}
          accounts={accounts || []}
        />
      )}

      {/* Tab 2: Recurring Definitions */}
      {activeTab === "definitions" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {bills.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-500">No recurring bill definitions created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Bill Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Frequency</th>
                    <th className="px-6 py-3">Default Due Day</th>
                    <th className="px-6 py-3">Start / End Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {bill.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {bill.categories?.name || "General"}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                        ₹{Number(bill.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {bill.frequency} • {bill.bill_type}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                        Day {bill.default_due_day}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {bill.start_date} {bill.end_date ? `→ ${bill.end_date}` : "(ongoing)"}
                      </td>
                      <td className="px-6 py-4">
                        {bill.is_active ? (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">Paused</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form
                          action={async () => {
                            "use server";
                            await deleteBillAction(bill.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
