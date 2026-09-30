# ExpenseFlow — Architecture

## Initial architecture

Browser
→ Next.js App Router
→ Server Components / Server Actions
→ Supabase server client
→ PostgreSQL

Supabase additionally provides:
- Auth
- Storage
- managed PostgreSQL
- database APIs

## Why no separate backend initially?

A separate FastAPI/Node backend would add:
- another deployment
- API contracts
- CORS concerns
- duplicated authentication integration
- more operational overhead

For the initial single application, Next.js server-side execution is sufficient.

A Python service is introduced later when data ingestion becomes a distinct workload.

## Backend boundaries

### Next.js
- authentication flow
- validation
- application workflows
- external integrations
- UI/server rendering

### PostgreSQL
- persistence
- constraints
- relationships
- RLS
- transactional integrity
- analytical SQL

### Python
Later:
- bank-file parsing
- PDF extraction
- batch ingestion
- normalization
- validation

### dbt
Later:
- analytical transformations
- marts
- tests
- lineage/documentation

## Architecture evolution

### Level 1
Next.js → PostgreSQL

### Level 2
Next.js → Supabase PostgreSQL + Auth

### Level 3
PostgreSQL → analytical SQL/views

### Level 4
Files → Python → staging → PostgreSQL

### Level 5
Raw → staging → dbt → marts

### Level 6
OLTP → ELT → warehouse → analytics

Do not introduce later-level components until there is a concrete requirement.
