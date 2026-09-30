# ExpenseFlow — Development & Agent Documentation Pack

This repository is the canonical handoff package for building ExpenseFlow.

## Project objective

Build a personal-finance web application that is useful in production while deliberately teaching backend and Data Engineering concepts.

## Developer focus

The developer focuses on:
- PostgreSQL and SQL
- relational modeling
- constraints and indexes
- RLS/security
- transactions
- query optimization
- ETL/ELT
- data quality
- idempotency
- incremental processing
- dimensional modeling
- dbt
- Python ingestion
- observability
- CI/CD

The coding agent owns frontend implementation unless explicitly asked otherwise.

## Recommended implementation order

1. Project constitution
2. PRD
3. Architecture
4. ADRs
5. Data model / ERD
6. PostgreSQL migrations
7. RLS/security
8. Backend contracts
9. Authentication
10. Core CRUD
11. Dashboard SQL
12. Frontend
13. Testing
14. Import pipeline
15. Data quality
16. Python ingestion
17. dbt / analytics
18. CI/CD
19. Observability
20. Operations/runbook

## Agent rule

Do not build the entire application in one pass. Work artifact-by-artifact, verify each stage, and preserve existing working code.

## Important

Frontend design is not the primary learning objective. The agent should implement it, while explanations focus on backend/data-engineering decisions.
