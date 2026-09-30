# Data Quality Specification

## Dimensions

### Completeness
Required fields are present.

### Validity
Values conform to expected types/ranges.

### Uniqueness
No unintended duplicates.

### Referential integrity
Foreign keys resolve.

### Consistency
Related financial values agree.

### Timeliness
Imported records arrive within expected windows.

## Example rules

- transaction amount is valid
- transaction date is valid
- category exists
- account belongs to current user
- statement month is unique per card
- bill occurrence is unique per bill/month
- amount is non-negative where business semantics require it
- payment does not exceed permitted amount unless overpayment is supported
- external transaction identifiers are unique per source/account

## Pipeline outcomes

Every row should become:
- accepted
- rejected
- duplicate
- skipped by explicit rule

Never silently discard.

## Data-quality metrics

- rows_processed
- rows_accepted
- rows_rejected
- duplicates
- null_rate
- validation_failure_rate
- import_duration

## Future anomaly checks

- unusual transaction amounts
- unexpected category spikes
- duplicate statement imports
- abnormal month-over-month changes
