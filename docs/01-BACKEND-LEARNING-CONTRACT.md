# Backend Learning Contract

## Purpose

The agent implements the application, but important backend decisions must remain visible to the developer.

For every significant backend decision explain:
1. Problem
2. Selected approach
3. Alternatives
4. Why selected
5. Pros
6. Cons
7. Scaling implications
8. Data Engineering lesson

## Required learning areas

### PostgreSQL
- data types
- PK/FK
- CHECK/UNIQUE/NOT NULL
- indexes
- transactions
- isolation
- views
- materialized views
- functions
- triggers
- EXPLAIN / EXPLAIN ANALYZE

### SQL
- joins
- aggregation
- CTEs
- window functions
- CASE
- FILTER
- date/time operations
- UPSERT
- analytical queries

### Security
- authentication
- authorization
- RLS
- roles/grants
- least privilege
- secret handling

### Data Engineering
- raw/staging/core layers
- ingestion
- validation
- deduplication
- idempotency
- incremental loads
- retries
- backfills
- observability

### Analytics Engineering
- facts/dimensions
- date dimensions
- marts
- dbt
- tests
- incremental models

## ORM policy

Do not introduce an ORM solely to hide SQL. If an ORM is used, explain generated SQL, transaction behavior, migrations, performance, and escape hatches.

## Query policy

Important analytical SQL should remain inspectable in SQL files, database views/functions, or clearly readable server-side query modules.

## Performance policy

Do not prematurely optimize. Establish correctness first, then inspect query plans when necessary.

## Data-quality policy

Never silently discard invalid financial records. Rejected rows must be traceable.
