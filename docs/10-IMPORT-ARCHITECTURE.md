# Import / ETL Architecture

## Objective

Import financial files without corrupting or duplicating operational data.

## Pipeline

File
→ object storage
→ import record
→ raw rows
→ staging
→ validation
→ normalization
→ deduplication
→ core transactions
→ import completion

## Layers

### Raw
Preserve source representation as received.

### Staging
Parse and standardize source fields.

### Core
Validated application entities.

### Analytics
Derived reporting models.

## Import state machine

PENDING
→ PROCESSING
→ VALIDATED
→ LOADED

Failure:
PROCESSING
→ FAILED

Rejected rows remain inspectable.

## Idempotency

Repeated processing of the same source must not create duplicate transactions.

Potential keys:
- bank-provided transaction ID
- source fingerprint
- account + date + amount + description hash

Use unique constraints where possible.

## Batch strategy

Start with batch file processing.

Streaming is unnecessary for initial personal-finance workloads.

## Retry

Retries must be safe.

Never retry a non-idempotent write blindly.

## Backfill

Pipelines should support reprocessing historical files after parser or business-rule changes.
