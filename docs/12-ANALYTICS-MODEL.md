# Analytics Model Roadmap

## Initial

Use PostgreSQL analytical views.

## Intermediate

Introduce dbt:

raw
→ staging
→ intermediate
→ marts

## Example fact table

fact_transactions

Possible dimensions:
- dim_date
- dim_account
- dim_category
- dim_user
- dim_merchant

## Fact grain

Document grain explicitly.

Example:

One row in fact_transactions = one normalized financial transaction.

Never create a fact table without defining grain.

## Metrics

- total expense
- total income
- net cash flow
- category spend
- month-over-month change
- recurring spend
- credit utilization

## Incremental models

Only process newly arrived/changed source data where appropriate.

Understand:
- unique keys
- late-arriving data
- updates
- backfills
- full refresh

## Slowly changing dimensions

Introduce only when the application requires historical dimension changes.

Do not use SCD techniques merely to demonstrate them.
