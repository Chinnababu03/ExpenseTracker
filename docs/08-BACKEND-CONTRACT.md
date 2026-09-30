# Backend Contract

## Application pattern

Use Next.js server-side execution for initial backend operations.

### Reads

Server Component / server-side service
→ Supabase server client
→ PostgreSQL

### Writes

Form
→ Server Action
→ Zod validation
→ authorization context
→ database transaction/write
→ revalidation

## Resource operations

### Bills
GET/list equivalent
Create
Update
Delete

### Bill occurrences
List by month
Mark paid
Record partial payment

### Payments
Create
List
Delete/void according to audit policy

### Transactions
Create
Update
Delete
Filter
Paginate

### Credit cards
Create
Update
List

### Statements
Create
Update
Record payment

### Imports
Upload
Start import
Inspect status
Inspect rejected rows
Retry safe failed stages

## API/service principles

- validate at boundary
- never trust client-provided user_id
- derive user identity from authenticated context
- use database constraints as final integrity boundary
- keep transactions around multi-step mutations
- avoid N+1 queries
- paginate large collections

## Error model

Errors should distinguish:
- validation
- authorization
- not found
- conflict
- database failure
- external dependency failure

Do not leak internal database errors directly to users.
