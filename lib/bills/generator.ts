/**
 * Utilities for calculating and clamping recurring bill occurrence dates
 */

export function getDaysInMonth(year: number, monthIndexZeroBased: number): number {
  return new Date(year, monthIndexZeroBased + 1, 0).getDate();
}

/**
 * Calculates a clamped ISO date string (YYYY-MM-DD) for a given year, month, and target day.
 * Example: clampDueDate(2026, 2, 31) -> "2026-02-28"
 */
export function clampDueDate(year: number, monthOneBased: number, targetDay: number): string {
  const maxDays = getDaysInMonth(year, monthOneBased - 1);
  const actualDay = Math.min(Math.max(1, targetDay), maxDays);
  const mm = String(monthOneBased).padStart(2, "0");
  const dd = String(actualDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function formatPeriodMonth(year: number, monthOneBased: number): string {
  const mm = String(monthOneBased).padStart(2, "0");
  return `${year}-${mm}-01`;
}

export interface BillDefinition {
  id: string;
  name: string;
  amount: number;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  default_due_day: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface GeneratedOccurrence {
  bill_id: string;
  period_month: string;
  due_date: string;
  amount: number;
  status: "PENDING";
}

/**
 * Generates candidate occurrences for a bill definition within a target month.
 */
export function generateOccurrencesForMonth(
  bill: BillDefinition,
  year: number,
  monthOneBased: number
): GeneratedOccurrence[] {
  if (!bill.is_active) return [];

  const periodMonth = formatPeriodMonth(year, monthOneBased);
  const monthStart = new Date(`${periodMonth}T00:00:00Z`);
  const daysInMonth = getDaysInMonth(year, monthOneBased - 1);
  const monthEnd = new Date(`${year}-${String(monthOneBased).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}T23:59:59Z`);

  const billStart = new Date(`${bill.start_date}T00:00:00Z`);
  const billEnd = bill.end_date ? new Date(`${bill.end_date}T23:59:59Z`) : null;

  // If the bill definition is outside the target month, generate nothing
  if (billStart > monthEnd) return [];
  if (billEnd && billEnd < monthStart) return [];

  const occurrences: GeneratedOccurrence[] = [];

  if (bill.frequency === "MONTHLY") {
    const dueDateStr = clampDueDate(year, monthOneBased, bill.default_due_day);
    const dueDate = new Date(`${dueDateStr}T00:00:00Z`);
    if (dueDate >= billStart && (!billEnd || dueDate <= billEnd)) {
      occurrences.push({
        bill_id: bill.id,
        period_month: periodMonth,
        due_date: dueDateStr,
        amount: Number(bill.amount),
        status: "PENDING",
      });
    }
  } else if (bill.frequency === "WEEKLY" || bill.frequency === "BIWEEKLY") {
    // Generate dates based on start_date interval falling within this month
    const stepDays = bill.frequency === "WEEKLY" ? 7 : 14;
    let curr = new Date(billStart.getTime());

    // Advance curr to on or before monthStart
    while (curr < monthStart) {
      curr = new Date(curr.getTime() + stepDays * 24 * 60 * 60 * 1000);
    }

    while (curr <= monthEnd) {
      if (!billEnd || curr <= billEnd) {
        const yyyy = curr.getUTCFullYear();
        const mm = String(curr.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(curr.getUTCDate()).padStart(2, "0");
        occurrences.push({
          bill_id: bill.id,
          period_month: periodMonth,
          due_date: `${yyyy}-${mm}-${dd}`,
          amount: Number(bill.amount),
          status: "PENDING",
        });
      }
      curr = new Date(curr.getTime() + stepDays * 24 * 60 * 60 * 1000);
    }
  } else if (bill.frequency === "QUARTERLY" || bill.frequency === "YEARLY") {
    const startMonth = billStart.getUTCMonth() + 1;
    const intervalMonths = bill.frequency === "QUARTERLY" ? 3 : 12;
    const monthDiff = (year - billStart.getUTCFullYear()) * 12 + (monthOneBased - startMonth);

    if (monthDiff >= 0 && monthDiff % intervalMonths === 0) {
      const dueDateStr = clampDueDate(year, monthOneBased, bill.default_due_day);
      const dueDate = new Date(`${dueDateStr}T00:00:00Z`);
      if (dueDate >= billStart && (!billEnd || dueDate <= billEnd)) {
        occurrences.push({
          bill_id: bill.id,
          period_month: periodMonth,
          due_date: dueDateStr,
          amount: Number(bill.amount),
          status: "PENDING",
        });
      }
    }
  }

  return occurrences;
}
