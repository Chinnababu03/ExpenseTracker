-- ============================================================================
-- ExpenseFlow — Phase 1 pgTAP Comprehensive Database Test Suite
-- File: supabase/tests/database_test.sql
-- ============================================================================

BEGIN;
SELECT plan(45);

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & FUNCTIONS
-- ----------------------------------------------------------------------------
SELECT has_extension('uuid-ossp', 'Extension uuid-ossp should be active');
SELECT has_extension('pgcrypto', 'Extension pgcrypto should be active');
SELECT has_function('public', 'update_updated_at_column', 'Function update_updated_at_column exists');
SELECT has_function('public', 'handle_new_user', 'Function handle_new_user exists');
SELECT has_function('public', 'log_financial_mutation', 'Function log_financial_mutation exists');

-- ----------------------------------------------------------------------------
-- 2. TABLE EXISTENCE
-- ----------------------------------------------------------------------------
SELECT has_table('public', 'profiles', 'Table profiles exists');
SELECT has_table('public', 'accounts', 'Table accounts exists');
SELECT has_table('public', 'categories', 'Table categories exists');
SELECT has_table('public', 'bills', 'Table bills exists');
SELECT has_table('public', 'bill_occurrences', 'Table bill_occurrences exists');
SELECT has_table('public', 'payments', 'Table payments exists');
SELECT has_table('public', 'transactions', 'Table transactions exists');
SELECT has_table('public', 'credit_cards', 'Table credit_cards exists');
SELECT has_table('public', 'credit_card_statements', 'Table credit_card_statements exists');
SELECT has_table('public', 'credit_card_transactions', 'Table credit_card_transactions exists');
SELECT has_table('public', 'imports', 'Table imports exists');
SELECT has_table('public', 'import_rows', 'Table import_rows exists');
SELECT has_table('public', 'audit_logs', 'Table audit_logs exists');

-- ----------------------------------------------------------------------------
-- 3. RLS ENABLED CHECKS
-- ----------------------------------------------------------------------------
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass), 'RLS enabled on profiles');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.accounts'::regclass), 'RLS enabled on accounts');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.categories'::regclass), 'RLS enabled on categories');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bills'::regclass), 'RLS enabled on bills');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bill_occurrences'::regclass), 'RLS enabled on bill_occurrences');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payments'::regclass), 'RLS enabled on payments');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.transactions'::regclass), 'RLS enabled on transactions');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.credit_cards'::regclass), 'RLS enabled on credit_cards');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.credit_card_statements'::regclass), 'RLS enabled on credit_card_statements');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.credit_card_transactions'::regclass), 'RLS enabled on credit_card_transactions');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.imports'::regclass), 'RLS enabled on imports');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.import_rows'::regclass), 'RLS enabled on import_rows');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_logs'::regclass), 'RLS enabled on audit_logs');

-- ----------------------------------------------------------------------------
-- 4. CONSTRAINT TESTS (Integrity Boundary)
-- ----------------------------------------------------------------------------

-- Negative amount rejected on bills
SELECT throws_ok(
    $$ INSERT INTO public.bills (user_id, name, category_id, amount, default_due_day) 
       VALUES ('a0000000-0000-0000-0000-000000000001', 'Invalid Bill', (SELECT id FROM public.categories WHERE user_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1), -500.00, 5) $$,
    '23514',
    NULL,
    'Negative bill amount must violate check constraint'
);

-- Invalid status rejected on bill_occurrences
SELECT throws_ok(
    $$ INSERT INTO public.bill_occurrences (bill_id, user_id, period_month, due_date, amount, status)
       VALUES (
           'a2222222-0000-0000-0000-000000000001', 
           'a0000000-0000-0000-0000-000000000001', 
           '2026-10-01', 
           '2026-10-05', 
           25000.00, 
           'INVALID_STATUS'
       ) $$,
    '23514',
    NULL,
    'Invalid bill occurrence status must violate check constraint'
);

-- Unnormalized period_month rejected on bill_occurrences
SELECT throws_ok(
    $$ INSERT INTO public.bill_occurrences (bill_id, user_id, period_month, due_date, amount, status)
       VALUES (
           'a2222222-0000-0000-0000-000000000001', 
           'a0000000-0000-0000-0000-000000000001', 
           '2026-10-15', 
           '2026-10-05', 
           25000.00, 
           'PENDING'
       ) $$,
    '23514',
    NULL,
    'Unnormalized period_month (not 1st of month) must violate check constraint'
);

-- Inverted statement due_date < statement_date rejected
SELECT throws_ok(
    $$ INSERT INTO public.credit_card_statements (
           card_id, 
           user_id, 
           statement_month, 
           statement_date, 
           due_date, 
           total_outstanding
       ) VALUES (
           'a4444444-0000-0000-0000-000000000001', 
           'a0000000-0000-0000-0000-000000000001', 
           '2026-10-01', 
           '2026-10-20', 
           '2026-10-05', 
           5000.00
       ) $$,
    '23514',
    NULL,
    'Credit card statement due_date before statement_date must violate check constraint'
);

-- ----------------------------------------------------------------------------
-- 5. COMPOSITE FOREIGN KEY TENANT ISOLATION
-- ----------------------------------------------------------------------------
-- Attempting to insert a transaction with Alice's user_id but Bob's account_id
-- Bob's account is 'b1111111-0000-0000-0000-000000000001'
SELECT throws_ok(
    $$ INSERT INTO public.transactions (
           user_id, 
           account_id, 
           transaction_date, 
           description, 
           amount, 
           transaction_type
       ) VALUES (
           'a0000000-0000-0000-0000-000000000001', 
           'b1111111-0000-0000-0000-000000000001', 
           '2026-09-15', 
           'Cross-tenant tampering attempt', 
           500.00, 
           'EXPENSE'
       ) $$,
    '23503',
    NULL,
    'Inserting transaction with another user account must fail composite FK constraint'
);

-- ----------------------------------------------------------------------------
-- 6. AUDIT TRIGGER TEST
-- ----------------------------------------------------------------------------
-- Inserting a transaction must populate audit_logs via log_financial_mutation trigger
INSERT INTO public.transactions (
    id,
    user_id,
    account_id,
    transaction_date,
    description,
    amount,
    transaction_type
) VALUES (
    'a9999999-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'a1111111-0000-0000-0000-000000000001',
    '2026-09-20',
    'Audit Test Transaction',
    99.00,
    'EXPENSE'
);

SELECT is(
    (SELECT count(*)::integer FROM public.audit_logs WHERE entity_id = 'a9999999-0000-0000-0000-000000000001' AND action = 'INSERT'),
    1,
    'Audit trigger automatically logged transaction creation'
);

-- ----------------------------------------------------------------------------
-- 7. ANALYTICAL VIEWS VERIFICATION
-- ----------------------------------------------------------------------------
-- v_monthly_bill_summary for Alice Sept 2026 (Rent 25000 + Wifi 1199 = 26199 expected, 25000 paid, 1199 remaining)
SELECT is(
    (SELECT total_expected FROM public.v_monthly_bill_summary WHERE user_id = 'a0000000-0000-0000-0000-000000000001' AND period_month = '2026-09-01'),
    26199.00::numeric,
    'v_monthly_bill_summary calculates correct total expected obligations'
);

SELECT is(
    (SELECT total_paid FROM public.v_monthly_bill_summary WHERE user_id = 'a0000000-0000-0000-0000-000000000001' AND period_month = '2026-09-01'),
    25000.00::numeric,
    'v_monthly_bill_summary calculates correct total paid from disbursed payments'
);

-- ----------------------------------------------------------------------------
-- 8. PHASE 3B: PAYMENTS & STATUS SYNCHRONIZATION TESTS
-- ----------------------------------------------------------------------------
SELECT has_function('public', 'sync_occurrence_payment_status', 'Function sync_occurrence_payment_status exists');
SELECT has_view('public', 'v_bill_payment_status', 'View v_bill_payment_status exists');

-- Composite FK check: Alice cannot record payment disbursing from Bob's account
SELECT throws_ok(
    $$ INSERT INTO public.payments (
           user_id,
           bill_occurrence_id,
           account_id,
           amount,
           payment_date
       ) VALUES (
           'a0000000-0000-0000-0000-000000000001',
           'a3333333-0000-0000-0000-000000000002',
           'b1111111-0000-0000-0000-000000000001', -- Bob's account
           500.00,
           CURRENT_DATE
       ) $$,
    '23503',
    NULL,
    'Payment referencing account of another user must fail composite FK constraint'
);

-- Verify status transitions on partial, full payment, and deletion
-- Create a test occurrence for Alice with amount 1000.00
INSERT INTO public.bill_occurrences (
    id, bill_id, user_id, period_month, due_date, amount, status
) VALUES (
    'a3333333-9999-0000-0000-000000000001',
    'a2222222-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '2026-10-01',
    '2026-10-15',
    1000.00,
    'PENDING'
);

-- Partial payment of 400.00
INSERT INTO public.payments (
    id, user_id, bill_occurrence_id, account_id, amount, payment_date
) VALUES (
    'a7777777-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'a3333333-9999-0000-0000-000000000001',
    'a1111111-0000-0000-0000-000000000001',
    400.00,
    CURRENT_DATE
);

SELECT is(
    (SELECT status FROM public.bill_occurrences WHERE id = 'a3333333-9999-0000-0000-000000000001'),
    'PARTIAL',
    'Partial payment automatically updates occurrence status to PARTIAL'
);

-- Additional payment of 600.00 (completes full 1000.00)
INSERT INTO public.payments (
    id, user_id, bill_occurrence_id, account_id, amount, payment_date
) VALUES (
    'a7777777-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'a3333333-9999-0000-0000-000000000001',
    'a1111111-0000-0000-0000-000000000001',
    600.00,
    CURRENT_DATE
);

SELECT is(
    (SELECT status FROM public.bill_occurrences WHERE id = 'a3333333-9999-0000-0000-000000000001'),
    'PAID',
    'Full payment automatically updates occurrence status to PAID'
);

-- Delete the second payment: status must drop back to PARTIAL
DELETE FROM public.payments WHERE id = 'a7777777-0000-0000-0000-000000000002';

SELECT is(
    (SELECT status FROM public.bill_occurrences WHERE id = 'a3333333-9999-0000-0000-000000000001'),
    'PARTIAL',
    'Deleting payment drops status back to PARTIAL'
);

SELECT * FROM finish();
ROLLBACK;
