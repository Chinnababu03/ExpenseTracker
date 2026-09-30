# Architecture Decision Records

## ADR-001 PostgreSQL over NoSQL

### Decision
Use PostgreSQL.

### Why
Financial data has strong relationships, transactional requirements, constraints, and analytical SQL requirements.

### Alternatives
MongoDB, Firebase/Firestore, DynamoDB.

### PostgreSQL advantages
- relational integrity
- joins
- transactions
- constraints
- window functions
- mature indexing
- RLS
- analytical SQL

### Disadvantages
- requires deliberate schema design
- migrations must be managed
- less schema flexibility than document databases

### DE lesson
The data model should follow workload and consistency requirements rather than technology fashion.

---

## ADR-002 Supabase

### Decision
Use Supabase for initial managed PostgreSQL, authentication, and storage.

### Why
It reduces infrastructure work while preserving access to PostgreSQL.

### Alternatives
Neon + Auth.js, managed PostgreSQL + custom auth, Firebase.

### Trade-offs
Supabase simplifies integration but creates some platform coupling. The underlying PostgreSQL model reduces that coupling compared with a proprietary database model.

---

## ADR-003 Next.js instead of separate backend

### Decision
Use Next.js server-side functionality initially.

### Why
The application is small enough that a separate backend would add unnecessary operational complexity.

### Alternative
Next.js + FastAPI.

### Future
Introduce Python/FastAPI when ingestion becomes an independently scaled workload.

---

## ADR-004 Server Actions over CRUD REST endpoints

### Decision
Use Server Actions for application mutations where appropriate.

### Why
They reduce boilerplate for a same-application frontend/backend workflow.

### Alternative
REST API.

### REST remains appropriate for
- external consumers
- public APIs
- independent services
- integrations
- separately deployed clients

---

## ADR-005 Raw SQL / Supabase client over ORM-first architecture

### Decision
Keep SQL visible and avoid ORM-first design.

### Why
SQL and database engineering are explicit learning objectives.

### Alternatives
Prisma, Drizzle.

### Trade-offs
More SQL knowledge is required, but database behavior is more visible and analytical queries remain natural.

---

## ADR-006 NUMERIC for money

### Decision
Use PostgreSQL NUMERIC for authoritative monetary values.

### Why
Avoid floating-point representation problems.

### Alternative
Integer minor units such as paise.

### When integer minor units can be useful
High-throughput systems with fixed currency precision and strict integer arithmetic.

For this project NUMERIC provides clear financial semantics.

---

## ADR-007 UUID identifiers

### Decision
Use UUID primary keys for user-facing domain entities.

### Why
They avoid predictable sequential identifiers and work well in distributed contexts.

### Alternative
BIGINT.

### Trade-offs
UUIDs are larger and can have indexing/storage implications. BIGINT is more compact and efficient for some workloads.

---

## ADR-008 Normalized operational model

### Decision
Normalize core OLTP entities.

### Why
Bills, occurrences, payments, transactions, and statements represent different business concepts.

### Alternative
A single monthly-expense table.

### Rejected because
It causes duplication, ambiguous relationships, and weak analytical semantics.

---

## ADR-009 Views before materialized views

### Decision
Start with ordinary views.

### Why
They provide fresh results without refresh management.

### Materialized views
Introduce only when query cost justifies stale-but-fast results.

---

## ADR-010 Database constraints over application-only validation

### Decision
Use both application validation and database constraints.

### Why
Application validation improves UX; database constraints enforce correctness against every write path.

---

## ADR-011 Batch before streaming

### Decision
Use batch ingestion initially.

### Why
Personal finance statements arrive as files and do not require event-level streaming.

### Alternative
Kafka/event streaming.

### Rejected initially because
Operational complexity is not justified by the workload.

---

## ADR-012 Python for ingestion

### Decision
Use Python when ingestion becomes substantial.

### Why
Strong ecosystem for data processing and document parsing.

### Alternative
TypeScript.

### Trade-off
Two languages increase operational complexity, but Python provides stronger alignment with the DE learning objective.

---

## ADR-013 dbt later

### Decision
Start with SQL views and scripts, then introduce dbt.

### Why
First understand SQL transformations directly; then learn how dbt standardizes transformation, testing, documentation, and lineage.

---

## ADR-014 Cron before Airflow

### Decision
Use managed scheduled jobs initially.

### Why
The pipeline count and dependency graph are small.

### Introduce Airflow or another orchestrator only when scheduling/dependency complexity warrants it.
