"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPaymentAction } from "@/app/actions/payments";

export interface AccountOption {
  id: string;
  name: string;
  account_type: string;
  currency: string;
}

export interface PaymentModalOccurrence {
  id: string;
  billName: string;
  expectedAmount: number;
  totalPaid: number;
  remainingAmount: number;
  dueDate: string;
}

interface PaymentModalProps {
  occurrence: PaymentModalOccurrence | null;
  accounts: AccountOption[];
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentModal({
  occurrence,
  accounts,
  isOpen,
  onClose,
}: PaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [payType, setPayType] = useState<"full" | "custom">("full");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  if (!isOpen || !occurrence) return null;

  const remaining = Math.max(0, occurrence.remainingAmount);
  const amountToPay = payType === "full" ? remaining : parseFloat(customAmount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError("Please select a disbursement account.");
      return;
    }

    if (amountToPay <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (amountToPay > remaining) {
      setError(`Payment cannot exceed the remaining balance of ₹${remaining.toFixed(2)}.`);
      return;
    }

    startTransition(async () => {
      const res = await recordPaymentAction({
        billOccurrenceId: occurrence.id,
        accountId,
        amount: amountToPay,
        paymentDate,
        paymentReference: paymentReference.trim() || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to record payment.");
      } else {
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Record Bill Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {occurrence.billName} • Due {occurrence.dueDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* Balance Snapshot */}
        <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Expected</p>
            <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
              ₹{occurrence.expectedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Paid So Far</p>
            <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
              ₹{occurrence.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Remaining</p>
            <p className="text-sm font-bold text-amber-600 font-mono mt-0.5">
              ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-md border border-rose-200">
              {error}
            </div>
          )}

          {/* Payment Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Option
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayType("full")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                  payType === "full"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Pay Full (₹{remaining.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => setPayType("custom")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                  payType === "custom"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Partial / Custom Amount
              </button>
            </div>
          </div>

          {/* Custom Amount Input */}
          {payType === "custom" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={`Up to ${remaining.toFixed(2)}`}
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 font-mono focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          )}

          {/* Disbursement Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Disburse From Account *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:border-emerald-500 focus:outline-none"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.account_type})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Date & Reference Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2 font-mono focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / Transaction #
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. UPI-1234, Cheque #5"
                className="w-full text-sm rounded-lg border border-slate-300 p-2 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid half now, remaining next Friday"
              className="w-full text-sm rounded-lg border border-slate-300 p-2 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || amountToPay <= 0}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
            >
              {isPending
                ? "Recording..."
                : `Confirm Payment (₹${amountToPay.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
