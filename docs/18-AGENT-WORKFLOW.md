# Agentic Development Workflow

The agent must follow:

READ
→ UNDERSTAND
→ PLAN
→ IMPLEMENT
→ TEST
→ REVIEW
→ DOCUMENT
→ REPORT

## Before coding

Read:
- project constitution
- backend learning contract
- relevant ADR
- relevant schema docs
- existing code

Inspect existing implementation before changing it.

## During coding

- prefer small changes
- preserve working code
- use migrations
- avoid unrelated refactors
- add tests with backend changes
- do not bypass RLS

## After coding

Run:
- lint
- typecheck
- tests
- build
- relevant database tests

Then report:
- what changed
- files changed
- migration
- tests run
- architectural decisions
- trade-offs
- known limitations
- next recommended step

## Never

- build everything in one shot
- expose service keys
- trust client user IDs
- silently swallow data-quality failures
- silently discard import rows
- introduce infrastructure without a workload justification
