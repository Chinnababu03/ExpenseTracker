-- ============================================================================
-- ExpenseFlow — Phase 1: PostgreSQL Schema, Migrations & Row-Level Security
-- File: 20261001000000_phase1_initial_schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & UTILITIES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Generic function for automatic updated_at maintenance
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_profiles_currency CHECK (char_length(trim(currency)) = 3),
    CONSTRAINT chk_profiles_timezone CHECK (char_length(trim(timezone)) > 0),
    CONSTRAINT chk_profiles_email CHECK (char_length(trim(email)) > 0)
);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. ACCOUNTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    institution TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_accounts_id_user UNIQUE (id, user_id),
    CONSTRAINT uq_accounts_user_name UNIQUE (user_id, name),
    CONSTRAINT chk_accounts_name CHECK (char_length(trim(name)) > 0),
    CONSTRAINT chk_accounts_type CHECK (account_type IN ('BANK', 'CASH', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'OTHER')),
    CONSTRAINT chk_accounts_currency CHECK (char_length(trim(currency)) = 3)
);

CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. CATEGORIES (Self-referential hierarchy with composite isolation)
-- ----------------------------------------------------------------------------
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID,
    category_type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_categories_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_categories_parent_user FOREIGN KEY (parent_id, user_id) 
        REFERENCES public.categories(id, user_id) ON DELETE SET NULL,
    CONSTRAINT uq_categories_user_name_type UNIQUE (user_id, name, category_type),
    CONSTRAINT chk_categories_name CHECK (char_length(trim(name)) > 0),
    CONSTRAINT chk_categories_type CHECK (category_type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    CONSTRAINT chk_categories_no_self_parent CHECK (parent_id IS NULL OR parent_id != id)
);

-- ----------------------------------------------------------------------------
-- 5. BILLS (Recurring obligation definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_id UUID NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'MONTHLY',
    bill_type TEXT NOT NULL DEFAULT 'FIXED',
    default_due_day SMALLINT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_bills_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_bills_category_user FOREIGN KEY (category_id, user_id) 
        REFERENCES public.categories(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT uq_bills_user_name UNIQUE (user_id, name),
    CONSTRAINT chk_bills_name CHECK (char_length(trim(name)) > 0),
    CONSTRAINT chk_bills_amount CHECK (amount > 0),
    CONSTRAINT chk_bills_frequency CHECK (frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    CONSTRAINT chk_bills_type CHECK (bill_type IN ('FIXED', 'VARIABLE')),
    CONSTRAINT chk_bills_due_day CHECK (default_due_day BETWEEN 1 AND 31),
    CONSTRAINT chk_bills_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TRIGGER trg_bills_updated_at
BEFORE UPDATE ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. BILL OCCURRENCES (Period instances supporting all frequencies)
-- ----------------------------------------------------------------------------
CREATE TABLE public.bill_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_month DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_bill_occurrences_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_bill_occurrences_bill_user FOREIGN KEY (bill_id, user_id) 
        REFERENCES public.bills(id, user_id) ON DELETE CASCADE,
    -- Unique per due_date allows weekly/bi-weekly bills with multiple occurrences in the same month
    CONSTRAINT uq_bill_occurrences_due UNIQUE (user_id, bill_id, due_date),
    CONSTRAINT chk_bill_occurrences_amount CHECK (amount >= 0),
    CONSTRAINT chk_bill_occurrences_period_normalized CHECK (period_month = date_trunc('month', period_month)::date),
    CONSTRAINT chk_bill_occurrences_status CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'SKIPPED'))
);

CREATE TRIGGER trg_bill_occurrences_updated_at
BEFORE UPDATE ON public.bill_occurrences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_occurrence_id UUID NOT NULL,
    account_id UUID NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payments_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_payments_occurrence_user FOREIGN KEY (bill_occurrence_id, user_id) 
        REFERENCES public.bill_occurrences(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_account_user FOREIGN KEY (account_id, user_id) 
        REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_payments_amount CHECK (amount > 0)
);

-- ----------------------------------------------------------------------------
-- 8. TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    category_id UUID,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    transaction_type TEXT NOT NULL,
    merchant TEXT,
    external_id TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_transactions_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_transactions_account_user FOREIGN KEY (account_id, user_id) 
        REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_category_user FOREIGN KEY (category_id, user_id) 
        REFERENCES public.categories(id, user_id) ON DELETE SET NULL,
    CONSTRAINT chk_transactions_description CHECK (char_length(trim(description)) > 0),
    CONSTRAINT chk_transactions_amount CHECK (amount > 0),
    CONSTRAINT chk_transactions_type CHECK (transaction_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    CONSTRAINT chk_transactions_source CHECK (source IN ('MANUAL', 'CSV_IMPORT', 'PDF_IMPORT', 'BANK_SYNC'))
);

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Idempotency constraint: external_id must be unique per user + account when present
CREATE UNIQUE INDEX idx_uq_transactions_external_id 
ON public.transactions(user_id, account_id, external_id) 
WHERE external_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 9. CREDIT CARDS (1->1/N support for add-on/virtual cards)
-- ----------------------------------------------------------------------------
CREATE TABLE public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    card_name TEXT NOT NULL,
    network TEXT,
    last_four VARCHAR(4),
    statement_day SMALLINT NOT NULL,
    payment_due_day SMALLINT NOT NULL,
    credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_credit_cards_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_credit_cards_account_user FOREIGN KEY (account_id, user_id) 
        REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT uq_credit_cards_account_name UNIQUE (account_id, card_name),
    CONSTRAINT chk_credit_cards_name CHECK (char_length(trim(card_name)) > 0),
    CONSTRAINT chk_credit_cards_statement_day CHECK (statement_day BETWEEN 1 AND 31),
    CONSTRAINT chk_credit_cards_due_day CHECK (payment_due_day BETWEEN 1 AND 31),
    CONSTRAINT chk_credit_cards_limit CHECK (credit_limit >= 0),
    CONSTRAINT chk_credit_cards_last_four CHECK (last_four IS NULL OR last_four ~ '^[0-9]{4}$')
);

CREATE TRIGGER trg_credit_cards_updated_at
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 10. CREDIT CARD STATEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.credit_card_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL,
    statement_month DATE NOT NULL,
    statement_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_outstanding NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    minimum_due NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'ISSUED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_credit_card_statements_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_credit_card_statements_card_user FOREIGN KEY (card_id, user_id) 
        REFERENCES public.credit_cards(id, user_id) ON DELETE CASCADE,
    CONSTRAINT uq_credit_card_statements_month UNIQUE (card_id, statement_month),
    CONSTRAINT chk_cc_statements_chronology CHECK (due_date >= statement_date),
    CONSTRAINT chk_cc_statements_month_normalized CHECK (statement_month = date_trunc('month', statement_month)::date),
    CONSTRAINT chk_cc_statements_outstanding CHECK (total_outstanding >= 0),
    CONSTRAINT chk_cc_statements_minimum CHECK (minimum_due >= 0),
    CONSTRAINT chk_cc_statements_paid CHECK (amount_paid >= 0),
    CONSTRAINT chk_cc_statements_status CHECK (status IN ('ISSUED', 'PARTIAL', 'PAID', 'OVERDUE'))
);

CREATE TRIGGER trg_credit_card_statements_updated_at
BEFORE UPDATE ON public.credit_card_statements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 11. CREDIT CARD TRANSACTIONS (Associative link)
-- ----------------------------------------------------------------------------
CREATE TABLE public.credit_card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    statement_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cc_trans_statement_user FOREIGN KEY (statement_id, user_id) 
        REFERENCES public.credit_card_statements(id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_cc_trans_transaction_user FOREIGN KEY (transaction_id, user_id) 
        REFERENCES public.transactions(id, user_id) ON DELETE CASCADE,
    CONSTRAINT uq_cc_trans_statement_transaction UNIQUE (statement_id, transaction_id)
);

-- ----------------------------------------------------------------------------
-- 12. IMPORTS & IMPORT ROWS (ETL Pipeline Staging)
-- ----------------------------------------------------------------------------
CREATE TABLE public.imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    row_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_imports_id_user UNIQUE (id, user_id),
    CONSTRAINT chk_imports_file_type CHECK (file_type IN ('CSV', 'PDF')),
    CONSTRAINT chk_imports_status CHECK (status IN ('PENDING', 'PROCESSING', 'VALIDATED', 'LOADED', 'FAILED')),
    CONSTRAINT chk_imports_counts CHECK (row_count >= 0 AND success_count >= 0 AND error_count >= 0),
    CONSTRAINT chk_imports_completed CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE public.import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    import_id UUID NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    normalized_data JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_import_rows_import_user FOREIGN KEY (import_id, user_id) 
        REFERENCES public.imports(id, user_id) ON DELETE CASCADE,
    CONSTRAINT uq_import_rows_import_row UNIQUE (import_id, row_number),
    CONSTRAINT chk_import_rows_row_number CHECK (row_number > 0),
    CONSTRAINT chk_import_rows_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'DUPLICATE', 'SKIPPED'))
);

-- ----------------------------------------------------------------------------
-- 13. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_audit_logs_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    CONSTRAINT chk_audit_logs_entity CHECK (char_length(trim(entity_type)) > 0)
);

-- Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.log_financial_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
    target_entity_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.user_id;
        target_entity_id := OLD.id;
        INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_data, new_data)
        VALUES (target_user_id, TG_TABLE_NAME, target_entity_id, 'DELETE', to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        target_user_id := NEW.user_id;
        target_entity_id := NEW.id;
        INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_data, new_data)
        VALUES (target_user_id, TG_TABLE_NAME, target_entity_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        target_user_id := NEW.user_id;
        target_entity_id := NEW.id;
        INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_data, new_data)
        VALUES (target_user_id, TG_TABLE_NAME, target_entity_id, 'INSERT', NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Apply mutation audit triggers to high-integrity tables
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_financial_mutation();

CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_financial_mutation();

-- ----------------------------------------------------------------------------
-- 14. PERFORMANCE & FOREIGN KEY INDEXES
-- ----------------------------------------------------------------------------
-- Accounts: uq_accounts_user_name UNIQUE (user_id, name) already indexes user_id leading column

-- Categories
CREATE INDEX idx_categories_user_parent ON public.categories(user_id, parent_id);

-- Bills
CREATE INDEX idx_bills_user_category ON public.bills(user_id, category_id);

-- Bill Occurrences
CREATE INDEX idx_bill_occurrences_user_period ON public.bill_occurrences(user_id, period_month);
CREATE INDEX idx_bill_occurrences_bill_id ON public.bill_occurrences(bill_id);
CREATE INDEX idx_bill_occurrences_dashboard ON public.bill_occurrences(user_id, due_date) 
    WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE');

-- Payments
CREATE INDEX idx_payments_user_date ON public.payments(user_id, payment_date DESC);
CREATE INDEX idx_payments_occurrence ON public.payments(bill_occurrence_id);
CREATE INDEX idx_payments_account ON public.payments(account_id);

-- Transactions (User composite index for category lookups under RLS)
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account_date ON public.transactions(account_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_category ON public.transactions(user_id, category_id);

-- Credit Cards
CREATE INDEX idx_credit_cards_account ON public.credit_cards(account_id);
CREATE INDEX idx_credit_cards_user_account ON public.credit_cards(user_id, account_id);

-- Credit Card Statements
CREATE INDEX idx_cc_statements_user_month ON public.credit_card_statements(user_id, statement_month DESC);
CREATE INDEX idx_cc_statements_card_month ON public.credit_card_statements(card_id, statement_month DESC);

-- Credit Card Transactions
CREATE INDEX idx_cc_trans_statement ON public.credit_card_transactions(statement_id);
CREATE INDEX idx_cc_trans_transaction ON public.credit_card_transactions(transaction_id);

-- Imports & Import Rows
CREATE INDEX idx_imports_user_started ON public.imports(user_id, started_at DESC);
CREATE INDEX idx_import_rows_import_status ON public.import_rows(import_id, status);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 15. ROW-LEVEL SECURITY POLICIES (Exhaustive & Scalar Subquery Optimized)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bill_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_occurrences FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_statements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 15.1 Profiles Policies
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- 15.2 Accounts Policies
CREATE POLICY "accounts_select_own" ON public.accounts
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "accounts_insert_own" ON public.accounts
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "accounts_update_own" ON public.accounts
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "accounts_delete_own" ON public.accounts
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.3 Categories Policies
CREATE POLICY "categories_select_own" ON public.categories
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_insert_own" ON public.categories
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_update_own" ON public.categories
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_delete_own" ON public.categories
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.4 Bills Policies
CREATE POLICY "bills_select_own" ON public.bills
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "bills_insert_own" ON public.bills
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "bills_update_own" ON public.bills
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "bills_delete_own" ON public.bills
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.5 Bill Occurrences Policies
CREATE POLICY "bill_occurrences_select_own" ON public.bill_occurrences
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "bill_occurrences_insert_own" ON public.bill_occurrences
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "bill_occurrences_update_own" ON public.bill_occurrences
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "bill_occurrences_delete_own" ON public.bill_occurrences
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.6 Payments Policies
CREATE POLICY "payments_select_own" ON public.payments
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "payments_insert_own" ON public.payments
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "payments_update_own" ON public.payments
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "payments_delete_own" ON public.payments
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.7 Transactions Policies
CREATE POLICY "transactions_select_own" ON public.transactions
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_insert_own" ON public.transactions
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_update_own" ON public.transactions
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_delete_own" ON public.transactions
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.8 Credit Cards Policies
CREATE POLICY "credit_cards_select_own" ON public.credit_cards
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_cards_insert_own" ON public.credit_cards
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_cards_update_own" ON public.credit_cards
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_cards_delete_own" ON public.credit_cards
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.9 Credit Card Statements Policies
CREATE POLICY "credit_card_statements_select_own" ON public.credit_card_statements
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_card_statements_insert_own" ON public.credit_card_statements
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_card_statements_update_own" ON public.credit_card_statements
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_card_statements_delete_own" ON public.credit_card_statements
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.10 Credit Card Transactions Policies
CREATE POLICY "credit_card_transactions_select_own" ON public.credit_card_transactions
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_card_transactions_insert_own" ON public.credit_card_transactions
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "credit_card_transactions_delete_own" ON public.credit_card_transactions
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.11 Imports Policies
CREATE POLICY "imports_select_own" ON public.imports
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "imports_insert_own" ON public.imports
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "imports_update_own" ON public.imports
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "imports_delete_own" ON public.imports
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.12 Import Rows Policies
CREATE POLICY "import_rows_select_own" ON public.import_rows
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "import_rows_insert_own" ON public.import_rows
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "import_rows_update_own" ON public.import_rows
    FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "import_rows_delete_own" ON public.import_rows
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 15.13 Audit Logs Policies (Append-only ledger: users read their audit entries, mutations blocked from API)
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 16. AUTHENTICATION HOOK (Automatic Profile & Standard Category Provisioning)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Insert Profile with conflict resolution to prevent signup rollbacks on retries
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1))
    )
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
        updated_at = CURRENT_TIMESTAMP;

    -- 2. Provision Core Categories
    INSERT INTO public.categories (user_id, name, category_type) VALUES
        (NEW.id, 'Housing', 'EXPENSE'),
        (NEW.id, 'Utilities', 'EXPENSE'),
        (NEW.id, 'Groceries', 'EXPENSE'),
        (NEW.id, 'Transportation', 'EXPENSE'),
        (NEW.id, 'Healthcare', 'EXPENSE'),
        (NEW.id, 'Entertainment', 'EXPENSE'),
        (NEW.id, 'Salary', 'INCOME'),
        (NEW.id, 'Investment Returns', 'INCOME'),
        (NEW.id, 'Account Transfer', 'TRANSFER')
    ON CONFLICT (user_id, name, category_type) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 17. ANALYTICAL SQL VIEWS (Secure RLS Invoker Mode & Accurate Aggregations)
-- ----------------------------------------------------------------------------

-- 17.1 Monthly Bill Summary View (Joins payments to accurately reflect partial payments)
CREATE OR REPLACE VIEW public.v_monthly_bill_summary
WITH (security_invoker = true) AS
SELECT
    bo.user_id,
    bo.period_month,
    COUNT(bo.id) AS total_bills_count,
    COALESCE(SUM(bo.amount), 0.00) AS total_expected,
    COALESCE(SUM(p.paid_amount), 0.00) AS total_paid,
    GREATEST(0.00, COALESCE(SUM(bo.amount), 0.00) - COALESCE(SUM(p.paid_amount), 0.00)) AS total_remaining,
    COALESCE(SUM(bo.amount) FILTER (WHERE bo.status = 'OVERDUE'), 0.00) AS total_overdue
FROM public.bill_occurrences bo
LEFT JOIN (
    SELECT bill_occurrence_id, SUM(amount) AS paid_amount
    FROM public.payments
    GROUP BY bill_occurrence_id
) p ON p.bill_occurrence_id = bo.id
GROUP BY bo.user_id, bo.period_month;

-- 17.2 Category Monthly Spending View
CREATE OR REPLACE VIEW public.v_category_monthly_spending
WITH (security_invoker = true) AS
SELECT
    t.user_id,
    date_trunc('month', t.transaction_date)::date AS expense_month,
    c.id AS category_id,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    COUNT(t.id) AS transaction_count,
    COALESCE(SUM(t.amount), 0.00) AS total_spent
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
WHERE t.transaction_type = 'EXPENSE'
GROUP BY t.user_id, date_trunc('month', t.transaction_date)::date, c.id, c.name;

-- 17.3 Credit Card Utilization & Balance Summary View (DISTINCT ON card_id prevents statement duplication)
CREATE OR REPLACE VIEW public.v_credit_card_summary
WITH (security_invoker = true) AS
SELECT DISTINCT ON (cc.id)
    cc.id AS card_id,
    cc.user_id,
    cc.card_name,
    cc.credit_limit,
    s.statement_month,
    COALESCE(s.total_outstanding, 0.00) AS total_outstanding,
    COALESCE(s.amount_paid, 0.00) AS amount_paid,
    s.due_date,
    s.status AS statement_status,
    CASE 
        WHEN cc.credit_limit > 0 THEN 
            ROUND((COALESCE(s.total_outstanding, 0.00) / cc.credit_limit) * 100, 2)
        ELSE 0.00 
    END AS utilization_pct
FROM public.credit_cards cc
LEFT JOIN public.credit_card_statements s ON cc.id = s.card_id
WHERE cc.is_active = true
ORDER BY cc.id, s.statement_month DESC NULLS LAST;
