# Data Pipeline Engineer Skill

Design ingestion as:

source → raw → staging → validation → dedupe → core → analytics

Every pipeline must define:
- input contract
- output contract
- idempotency
- failure behavior
- retries
- rejected-row handling
- observability
- backfill strategy
