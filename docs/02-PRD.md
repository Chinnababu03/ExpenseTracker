# ExpenseFlow — Product Requirements Document

## Product vision

A private personal-finance platform for planning bills, recording payments, tracking credit cards and transactions, viewing historical financial periods, and eventually ingesting bank data automatically.

## Users

Initial scope: individual authenticated users.

Each user's financial data is private and isolated at database level.

## MVP features

### Authentication
- email/password
- optional Google OAuth
- session management
- protected application routes
- profile

### Dashboard
- month/year selector
- total expected obligations
- total paid
- remaining amount
- overdue amount
- category breakdown
- payment progress
- recent transactions
- credit-card summary

### Bills
- create/edit/delete
- recurring bill definition
- bill occurrences
- due dates
- paid dates
- partial payments
- status
- categories

### Payments
- payment against a bill occurrence
- payment account
- partial payments
- payment date
- notes/reference

### Accounts
- bank
- cash
- credit card
- loan
- other

### Transactions
- manual transaction
- date
- description
- merchant
- amount
- account
- category
- transaction type
- source
- external ID

### Credit cards
- card metadata
- statement dates
- due dates
- credit limit
- statement balances
- amount paid
- status
- utilization

### Imports
MVP can include CSV import. PDF ingestion is later.

## Non-functional requirements

- database-enforced user isolation
- migration-based schema management
- auditable financial mutations
- responsive UI
- accessible forms
- automated tests
- secure secrets
- predictable error handling
- documented deployment
- backup/recovery plan

## Future features

- bank statement PDF ingestion
- automated categorization
- recurring transaction detection
- monthly forecasting
- budget management
- income tracking
- cash-flow analytics
- warehouse
- dbt
- pipeline observability
- advanced data quality

## Out of scope for MVP

- microservices
- Kubernetes
- Kafka
- Spark
- Airflow
- GraphQL
- separate API gateway
- real-time banking integrations
- LLM-based extraction
