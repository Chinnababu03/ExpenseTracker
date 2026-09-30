"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePaymentAction } from "@/app/actions/payments";

export interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_reference: string | null;
  notes: string | null;
  account_id: string;
  accounts?: {
    id: string;
    name: string;
    account_type: string;
  } | null;
}

interface PaymentHistoryDialogProps {
  billName: string;
  expectedAmount: number;
  payments: PaymentRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentHistoryDialog({
  billName,
  expectedAmount,
  payments,
  isOpen,
  onClose,
}: PaymentHistoryDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalPaid = payments.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const remaining = Math.max(0, expectedAmount - totalPaid);

  const handleDelete = (paymentId: string) => {
    if (!confirm("Are you sure you want to void/delete this payment record? The occurrence status will be updated accordingly.")) {
      return;
    }

    setDeletingId(paymentId);
    setError(null);

    startTransition(async () => {
      const res = await deletePaymentAction(paymentId);
      setDeletingId(null);
      if (!res.success) {
        setError(res.error || "Failed to delete payment.");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Payment Disbursements</h3>
            <p className="text-xs text-slate-500 mt-0.5">{billName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 text-xs bg-rose-50 text-rose-800 rounded-md border border-rose-200">
            {error}
          </div>
        )}

        {/* Overview banner */}
        <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Obligation</p>
            <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
              ₹{expectedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Paid</p>
            <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
              ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Remaining</p>
            <p className="text-sm font-bold text-amber-600 font-mono mt-0.5">
              ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Itemized Payments List */}
        <div className="mt-5 space-y-3 max-h-72 overflow-y-auto">
          {payments.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">
              No payments recorded yet for this occurrence.
            </p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      ₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {p.accounts?.name || "Account"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Date: {p.payment_date}</span>
                    {p.payment_reference && (
                      <span className="font-mono text-slate-600">
                        Ref: {p.payment_reference}
                      </span>
                    )}
                  </div>
                  {p.notes && (
                    <p className="text-xs text-slate-400 italic">{p.notes}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending && deletingId === p.id}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition disabled:opacity-50"
                >
                  {isPending && deletingId === p.id ? "Voiding..." : "Void / Delete"}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
