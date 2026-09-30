"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateOccurrencesAction,
  updateOccurrenceAction,
} from "@/app/actions/bills";
import {
  PaymentModal,
  AccountOption,
  PaymentModalOccurrence,
} from "./payment-modal";
import {
  PaymentHistoryDialog,
  PaymentRecord,
} from "./payment-history-dialog";

export interface OccurrenceItem {
  id: string;
  bill_id: string;
  period_month: string;
  due_date: string;
  amount: number;
  status: string;
  bills: {
    id: string;
    name: string;
    frequency: string;
    bill_type: string;
    categories: {
      id: string;
      name: string;
    } | null;
  } | null;
  payments?: PaymentRecord[];
}

interface OccurrencesViewProps {
  initialOccurrences: OccurrenceItem[];
  currentPeriod: string; // YYYY-MM-01
  accounts: AccountOption[];
}

export function OccurrencesView({
  initialOccurrences,
  currentPeriod,
  accounts,
}: OccurrencesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [selectedPayOccurrence, setSelectedPayOccurrence] = useState<PaymentModalOccurrence | null>(null);
  const [historyOccurrence, setHistoryOccurrence] = useState<{
    billName: string;
    expectedAmount: number;
    payments: PaymentRecord[];
  } | null>(null);

  const [yearStr, monthStr] = currentPeriod.split("-");
  const currentYear = parseInt(yearStr, 10);
  const currentMonth = parseInt(monthStr, 10);

  const handlePeriodChange = (deltaMonths: number) => {
    let newYear = currentYear;
    let newMonth = currentMonth + deltaMonths;
    if (newMonth > 12) {
      newYear += 1;
      newMonth = 1;
    } else if (newMonth < 1) {
      newYear -= 1;
      newMonth = 12;
    }
    const newPeriod = `${newYear}-${String(newMonth).padStart(2, "0")}-01`;
    router.push(`/bills?period=${newPeriod}`);
  };

  const handleGenerate = () => {
    startTransition(async () => {
      setMsg(null);
      const res = await generateOccurrencesAction(currentPeriod);
      if (res.success) {
        setMsg({
          text: `Generated/verified occurrences for this month (${res.data?.generatedCount || 0} candidate(s)).`,
          type: "success",
        });
        router.refresh();
      } else {
        setMsg({ text: res.error || "Failed to generate occurrences", type: "error" });
      }
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("status", newStatus);
      const res = await updateOccurrenceAction(id, formData);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Calculate actual total paid based on itemized payments
  const totalExpected = initialOccurrences.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalPaid = initialOccurrences.reduce((acc, curr) => {
    const occPaymentsTotal = (curr.payments || []).reduce(
      (pSum, p) => pSum + Number(p.amount),
      0
    );
    return acc + occPaymentsTotal;
  }, 0);
  const totalRemaining = Math.max(0, totalExpected - totalPaid);

  const statusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">PAID</span>;
      case "PARTIAL":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">PARTIAL</span>;
      case "PENDING":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">PENDING</span>;
      case "OVERDUE":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">OVERDUE</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation & Generation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handlePeriodChange(-1)}
            disabled={isPending}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600 text-sm font-semibold"
          >
            ← Prev
          </button>
          <span className="text-lg font-bold text-slate-900 min-w-[160px] text-center">
            {monthName}
          </span>
          <button
            type="button"
            onClick={() => handlePeriodChange(1)}
            disabled={isPending}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600 text-sm font-semibold"
          >
            Next →
          </button>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 transition shadow-sm disabled:opacity-50"
        >
          <span>{isPending ? "Generating..." : "⚡ Generate / Sync Occurrences"}</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-3 text-xs rounded-md border ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expected</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">₹{totalExpected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-0.5">{initialOccurrences.length} occurrence(s)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-0.5">Disbursed payments</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">₹{totalRemaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-0.5">Outstanding obligations</p>
        </div>
      </div>

      {/* Occurrences Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {initialOccurrences.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-500">No bill occurrences found for {monthName}.</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="text-xs font-semibold text-emerald-600 underline hover:text-emerald-700"
            >
              Click here to generate occurrences from your active recurring bills.
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Bill Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Expected Amount</th>
                  <th className="px-5 py-3">Paid / Remaining</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialOccurrences.map((occ) => {
                  const occPayments = occ.payments || [];
                  const occPaid = occPayments.reduce(
                    (sum, p) => sum + Number(p.amount),
                    0
                  );
                  const expected = Number(occ.amount);
                  const remaining = Math.max(0, expected - occPaid);
                  const canPay = remaining > 0 && occ.status !== "CANCELLED" && occ.status !== "SKIPPED";

                  return (
                    <tr key={occ.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {occ.bills?.name || "Unnamed Bill"}
                        <span className="block text-xs font-normal text-slate-400">
                          {occ.bills?.frequency} • {occ.bills?.bill_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {occ.bills?.categories?.name || "General"}
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-mono text-xs">
                        {occ.due_date}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 font-mono">
                        ₹{expected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs">
                          <span className="text-emerald-700 font-semibold">
                            ₹{occPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          {remaining > 0 && (
                            <span className="text-slate-400 block mt-0.5">
                              Rem: ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {statusBadge(occ.status)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Record Payment Button */}
                          {canPay && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPayOccurrence({
                                  id: occ.id,
                                  billName: occ.bills?.name || "Bill",
                                  expectedAmount: expected,
                                  totalPaid: occPaid,
                                  remainingAmount: remaining,
                                  dueDate: occ.due_date,
                                })
                              }
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                            >
                              + Pay
                            </button>
                          )}

                          {/* View Payment Disbursements Button */}
                          {occPayments.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setHistoryOccurrence({
                                  billName: occ.bills?.name || "Bill",
                                  expectedAmount: expected,
                                  payments: occPayments,
                                })
                              }
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                            >
                              Disbursements ({occPayments.length})
                            </button>
                          )}

                          {/* Quick Admin Override */}
                          <select
                            value={occ.status}
                            disabled={isPending}
                            onChange={(e) => handleStatusChange(occ.id, e.target.value)}
                            className="text-xs rounded border border-slate-200 px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="PAID">Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="CANCELLED">Cancel</option>
                            <option value="SKIPPED">Skip</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <PaymentModal
        occurrence={selectedPayOccurrence}
        accounts={accounts}
        isOpen={Boolean(selectedPayOccurrence)}
        onClose={() => setSelectedPayOccurrence(null)}
      />

      {/* View Itemized Disbursements Dialog */}
      <PaymentHistoryDialog
        billName={historyOccurrence?.billName || ""}
        expectedAmount={historyOccurrence?.expectedAmount || 0}
        payments={historyOccurrence?.payments || []}
        isOpen={Boolean(historyOccurrence)}
        onClose={() => setHistoryOccurrence(null)}
      />
    </div>
  );
}
