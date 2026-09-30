# PostgreSQL Schema Plan

## profiles

- id UUID PK, references auth.users
- email
- display_name
- currency
- timezone
- created_at
- updated_at

## accounts

- id UUID PK
- user_id UUID FK
- name
- account_type
- institution
- currency
- is_active
- created_at
- updated_at

## categories

- id UUID PK
- user_id UUID FK
- name
- parent_id nullable FK categories.id
- category_type
- is_active
- created_at

## bills

- id UUID PK
- user_id UUID FK
- name
- category_id FK
- amount NUMERIC
- frequency
- bill_type
- default_due_day
- start_date
- end_date nullable
- is_active
- created_at
- updated_at

## bill_occurrences

- id UUID PK
- bill_id UUID FK
- user_id UUID FK
- period_month DATE
- due_date DATE
- amount NUMERIC
- status
- created_at
- updated_at

Unique candidate:
(user_id, bill_id, period_month)

## payments

- id UUID PK
- user_id UUID FK
- bill_occurrence_id UUID FK
- account_id UUID FK
- amount NUMERIC
- payment_date DATE
- payment_reference
- notes
- created_at

## transactions

- id UUID PK
- user_id UUID FK
- account_id UUID FK
- transaction_date DATE
- description
- amount NUMERIC
- transaction_type
- category_id FK
- merchant
- external_id nullable
- source
- created_at
- updated_at

Potential unique key:
(user_id, account_id, external_id)

## credit_cards

- id UUID PK
- user_id UUID FK
- account_id UUID FK
- card_name
- network
- last_four
- statement_day
- payment_due_day
- credit_limit
- is_active

## credit_card_statements

- id UUID PK
- card_id UUID FK
- statement_month DATE
- statement_date
- due_date
- total_outstanding NUMERIC
- minimum_due NUMERIC
- amount_paid NUMERIC
- status

Unique:
(card_id, statement_month)

## imports

- id UUID PK
- user_id UUID FK
- source
- file_name
- file_type
- status
- started_at
- completed_at
- row_count
- success_count
- error_count

## import_rows

- id UUID PK
- import_id UUID FK
- raw_data JSONB
- normalized_data JSONB nullable
- status
- error_message
- row_number

## audit_logs

- id UUID PK
- user_id UUID FK
- entity_type
- entity_id
- action
- old_data JSONB
- new_data JSONB
- created_at
