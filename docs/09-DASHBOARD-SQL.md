# Dashboard and Analytics SQL Plan

## Core metrics

For selected month:
- expected bills
- paid bills
- pending bills
- overdue bills
- total payments
- total transaction expenses
- category spending
- credit-card outstanding
- credit utilization

## Query principle

Compute authoritative aggregates in PostgreSQL.

Do not fetch every transaction into the browser merely to calculate totals.

## Example monthly bill summary

SELECT
    COALESCE(SUM(amount), 0) AS total_expected,
    COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS total_paid,
    COALESCE(SUM(amount) FILTER (WHERE status IN ('PENDING','PARTIAL')), 0) AS total_remaining
FROM bill_occurrences
WHERE user_id = auth.uid()
AND period_month = $1;

## Month-over-month example

Use LAG():

SELECT
    month,
    total_expense,
    LAG(total_expense) OVER (ORDER BY month) AS previous_month
FROM monthly_expenses;

## Category summary

GROUP BY category.

## Performance

Start with normal views or direct SQL.

Use EXPLAIN ANALYZE when query cost becomes relevant.

Introduce materialized views only when:
- query cost is meaningful
- refresh frequency is understood
- stale results are acceptable

## Analytics views

Recommended:
- v_monthly_expense_summary
- v_category_monthly_spending
- v_monthly_cash_flow
- v_credit_card_summary
- v_bill_payment_status
