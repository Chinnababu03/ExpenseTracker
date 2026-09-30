-- ============================================================================
-- ExpenseFlow — Phase 1 Seed Data
-- File: supabase/seed.sql
-- ============================================================================

-- 1. Create Test Users in auth.users
-- Password is 'password123' hashed with bcrypt
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"full_name": "Alice Sharma"}',
    now(),
    now()
),
(
    'b0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"full_name": "Bob Verma"}',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Operational Accounts
INSERT INTO public.accounts (id, user_id, name, account_type, institution, currency, is_active) VALUES
    ('a1111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'HDFC Salary Account', 'BANK', 'HDFC Bank', 'INR', true),
    ('a1111111-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Cash Wallet', 'CASH', 'Physical Wallet', 'INR', true),
    ('a1111111-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ICICI Amazon Pay Card', 'CREDIT_CARD', 'ICICI Bank', 'INR', true),
    ('b1111111-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'SBI Savings', 'BANK', 'State Bank of India', 'INR', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Query seeded category IDs for bills & transactions
DO $$
DECLARE
    v_alice_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_bob_id UUID := 'b0000000-0000-0000-0000-000000000002';
    v_housing_cat_id UUID;
    v_groceries_cat_id UUID;
    v_utilities_cat_id UUID;
    v_salary_cat_id UUID;
    
    v_bill_rent_id UUID := 'a2222222-0000-0000-0000-000000000001';
    v_bill_wifi_id UUID := 'a2222222-0000-0000-0000-000000000002';
    v_occ_rent_id UUID := 'a3333333-0000-0000-0000-000000000001';
    v_occ_wifi_id UUID := 'a3333333-0000-0000-0000-000000000002';
    v_card_id UUID := 'a4444444-0000-0000-0000-000000000001';
    v_stmt_id UUID := 'a5555555-0000-0000-0000-000000000001';
BEGIN
    SELECT id INTO v_housing_cat_id FROM public.categories WHERE user_id = v_alice_id AND name = 'Housing';
    SELECT id INTO v_groceries_cat_id FROM public.categories WHERE user_id = v_alice_id AND name = 'Groceries';
    SELECT id INTO v_utilities_cat_id FROM public.categories WHERE user_id = v_alice_id AND name = 'Utilities';
    SELECT id INTO v_salary_cat_id FROM public.categories WHERE user_id = v_alice_id AND name = 'Salary';

    -- Seed Bills for Alice
    INSERT INTO public.bills (id, user_id, name, category_id, amount, frequency, bill_type, default_due_day, start_date)
    VALUES 
        (v_bill_rent_id, v_alice_id, 'Apartment Rent', v_housing_cat_id, 25000.00, 'MONTHLY', 'FIXED', 5, '2026-01-01'),
        (v_bill_wifi_id, v_alice_id, 'Fiber Broadband', v_utilities_cat_id, 1199.00, 'MONTHLY', 'FIXED', 15, '2026-01-01')
    ON CONFLICT (id) DO NOTHING;

    -- Seed Bill Occurrences (September 2026)
    INSERT INTO public.bill_occurrences (id, bill_id, user_id, period_month, due_date, amount, status)
    VALUES 
        (v_occ_rent_id, v_bill_rent_id, v_alice_id, '2026-09-01', '2026-09-05', 25000.00, 'PAID'),
        (v_occ_wifi_id, v_bill_wifi_id, v_alice_id, '2026-09-01', '2026-09-15', 1199.00, 'PENDING')
    ON CONFLICT (id) DO NOTHING;

    -- Seed Payment for Rent
    INSERT INTO public.payments (user_id, bill_occurrence_id, account_id, amount, payment_date, payment_reference, notes)
    VALUES (
        v_alice_id,
        v_occ_rent_id,
        'a1111111-0000-0000-0000-000000000001',
        25000.00,
        '2026-09-04',
        'UPI-RENT-9921',
        'Sept Rent to Landlord'
    );

    -- Seed Transactions
    INSERT INTO public.transactions (user_id, account_id, category_id, transaction_date, description, amount, transaction_type, merchant, source)
    VALUES 
        (v_alice_id, 'a1111111-0000-0000-0000-000000000001', v_salary_cat_id, '2026-09-01', 'Monthly Salary Credit', 125000.00, 'INCOME', 'Acme Corp', 'BANK_SYNC'),
        (v_alice_id, 'a1111111-0000-0000-0000-000000000001', v_housing_cat_id, '2026-09-04', 'Apartment Rent Transfer', 25000.00, 'EXPENSE', 'Landlord', 'MANUAL'),
        (v_alice_id, 'a1111111-0000-0000-0000-000000000002', v_groceries_cat_id, '2026-09-10', 'Weekly Vegetables & Fruits', 1450.00, 'EXPENSE', 'Local Market', 'MANUAL')
    ON CONFLICT DO NOTHING;

    -- Seed Credit Card Metadata
    INSERT INTO public.credit_cards (id, user_id, account_id, card_name, network, last_four, statement_day, payment_due_day, credit_limit)
    VALUES (
        v_card_id,
        v_alice_id,
        'a1111111-0000-0000-0000-000000000003',
        'Amazon Pay ICICI Card',
        'VISA',
        '4123',
        20,
        10,
        200000.00
    )
    ON CONFLICT (id) DO NOTHING;

    -- Seed Credit Card Statement
    INSERT INTO public.credit_card_statements (id, user_id, card_id, statement_month, statement_date, due_date, total_outstanding, minimum_due, amount_paid, status)
    VALUES (
        v_stmt_id,
        v_alice_id,
        v_card_id,
        '2026-08-01',
        '2026-08-20',
        '2026-09-10',
        18500.00,
        1000.00,
        18500.00,
        'PAID'
    )
    ON CONFLICT (id) DO NOTHING;

END $$;
