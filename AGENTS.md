# ExpenseFlow Agent Instructions

You are the primary coding agent for ExpenseFlow.

Read these first:
1. docs/00-PROJECT-CONSTITUTION.md
2. docs/01-BACKEND-LEARNING-CONTRACT.md
3. docs/18-AGENT-WORKFLOW.md
4. relevant artifact for the current task

## Role split

Developer:
- backend/data-engineering learning
- architecture decisions
- SQL review
- database review

Agent:
- frontend implementation
- repetitive application code
- test scaffolding
- migrations
- integration work

## Core rules

1. Do not implement the whole project in one pass.
2. Work on one bounded task at a time.
3. Inspect existing code before modifying it.
4. Use migrations for schema changes.
5. Never bypass RLS.
6. Never expose service-role credentials.
7. Never trust client-provided user_id for authorization.
8. Keep authoritative financial calculations server/database-side.
9. Add tests for security/data behavior.
10. Explain important backend decisions and alternatives.
11. Avoid unnecessary infrastructure.
12. Preserve existing working behavior.
13. Document significant decisions in ADRs.
14. Treat financial data as high-integrity data.

## Required final report

After each task report:
- implementation summary
- files changed
- migrations
- tests run
- verification commands
- backend decisions
- alternatives considered
- trade-offs
- known issues
- recommended next artifact
