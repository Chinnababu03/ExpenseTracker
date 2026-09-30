# Testing Strategy

## Unit

Test pure business calculations:
- recurring bill date generation
- period calculations
- categorization rules
- amount calculations

## Database integration

Test:
- constraints
- foreign keys
- unique rules
- transactions
- database functions

## RLS

For each protected table test:
- authenticated owner SELECT
- authenticated owner INSERT
- authenticated owner UPDATE
- authenticated owner DELETE
- non-owner SELECT
- non-owner UPDATE
- non-owner DELETE
- unauthenticated access

## Import pipeline

Test:
- valid file
- malformed row
- duplicate file
- duplicate row
- partial failure
- retry
- reprocessing
- rollback behavior

## E2E

Minimum flow:
login
→ create category
→ create bill
→ generate occurrence
→ record payment
→ dashboard reflects payment

## Performance

Use realistic seeded data before performance conclusions.

Inspect:
EXPLAIN
EXPLAIN ANALYZE

Do not optimize based solely on intuition.
