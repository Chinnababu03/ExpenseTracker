-- ============================================================================
-- ExpenseFlow — Phase 3B: Payments & Partial Disbursements Synchronization
-- Migration: 20261001000001_phase3b_payment_triggers.sql
-- ============================================================================

-- Function to maintain authoritative payment status on bill occurrences
CREATE OR REPLACE FUNCTION public.sync_occurrence_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_occ_id UUID;
    total_paid NUMERIC(14, 2);
    occ_amount NUMERIC(14, 2);
    occ_due_date DATE;
    occ_status TEXT;
BEGIN
    -- 1. Identify target occurrence for the triggering row
    IF (TG_OP = 'DELETE') THEN
        target_occ_id := OLD.bill_occurrence_id;
    ELSE
        target_occ_id := NEW.bill_occurrence_id;
    END IF;

    -- Calculate total paid for this occurrence
    SELECT COALESCE(SUM(amount), 0.00) INTO total_paid
    FROM public.payments
    WHERE bill_occurrence_id = target_occ_id;

    -- Retrieve occurrence metadata
    SELECT amount, due_date, status INTO occ_amount, occ_due_date, occ_status
    FROM public.bill_occurrences
    WHERE id = target_occ_id;

    IF FOUND THEN
        IF total_paid >= occ_amount THEN
            UPDATE public.bill_occurrences
            SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
            WHERE id = target_occ_id AND status IS DISTINCT FROM 'PAID';
        ELSIF total_paid > 0.00 THEN
            UPDATE public.bill_occurrences
            SET status = 'PARTIAL', updated_at = CURRENT_TIMESTAMP
            WHERE id = target_occ_id AND status IS DISTINCT FROM 'PARTIAL';
        ELSE
            -- 0 paid: restore to PENDING or OVERDUE unless manually CANCELLED or SKIPPED
            IF occ_status NOT IN ('CANCELLED', 'SKIPPED') THEN
                IF occ_due_date < CURRENT_DATE THEN
                    UPDATE public.bill_occurrences
                    SET status = 'OVERDUE', updated_at = CURRENT_TIMESTAMP
                    WHERE id = target_occ_id AND status IS DISTINCT FROM 'OVERDUE';
                ELSE
                    UPDATE public.bill_occurrences
                    SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP
                    WHERE id = target_occ_id AND status IS DISTINCT FROM 'PENDING';
                END IF;
            END IF;
        END IF;
    END IF;

    -- 2. If an UPDATE shifted payment between occurrences, sync the old occurrence too
    IF (TG_OP = 'UPDATE' AND OLD.bill_occurrence_id IS DISTINCT FROM NEW.bill_occurrence_id) THEN
        SELECT COALESCE(SUM(amount), 0.00) INTO total_paid
        FROM public.payments
        WHERE bill_occurrence_id = OLD.bill_occurrence_id;

        SELECT amount, due_date, status INTO occ_amount, occ_due_date, occ_status
        FROM public.bill_occurrences
        WHERE id = OLD.bill_occurrence_id;

        IF FOUND THEN
            IF total_paid >= occ_amount THEN
                UPDATE public.bill_occurrences
                SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
                WHERE id = OLD.bill_occurrence_id AND status IS DISTINCT FROM 'PAID';
            ELSIF total_paid > 0.00 THEN
                UPDATE public.bill_occurrences
                SET status = 'PARTIAL', updated_at = CURRENT_TIMESTAMP
                WHERE id = OLD.bill_occurrence_id AND status IS DISTINCT FROM 'PARTIAL';
            ELSE
                IF occ_status NOT IN ('CANCELLED', 'SKIPPED') THEN
                    IF occ_due_date < CURRENT_DATE THEN
                        UPDATE public.bill_occurrences
                        SET status = 'OVERDUE', updated_at = CURRENT_TIMESTAMP
                        WHERE id = OLD.bill_occurrence_id AND status IS DISTINCT FROM 'OVERDUE';
                    ELSE
                        UPDATE public.bill_occurrences
                        SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP
                        WHERE id = OLD.bill_occurrence_id AND status IS DISTINCT FROM 'PENDING';
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

-- Trigger on payments table
DROP TRIGGER IF EXISTS trg_sync_payment_status ON public.payments;
CREATE TRIGGER trg_sync_payment_status
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_occurrence_payment_status();

-- Analytical view: Bill Payment Status & Outstanding balances
CREATE OR REPLACE VIEW public.v_bill_payment_status
WITH (security_invoker = true) AS
SELECT 
    bo.id AS occurrence_id,
    bo.bill_id,
    bo.user_id,
    b.name AS bill_name,
    b.category_id,
    bo.period_month,
    bo.due_date,
    bo.amount AS expected_amount,
    COALESCE(p.total_paid, 0.00) AS total_paid,
    GREATEST(bo.amount - COALESCE(p.total_paid, 0.00), 0.00) AS remaining_amount,
    bo.status
FROM public.bill_occurrences bo
JOIN public.bills b ON b.id = bo.bill_id AND b.user_id = bo.user_id
LEFT JOIN (
    SELECT bill_occurrence_id, SUM(amount) AS total_paid
    FROM public.payments
    GROUP BY bill_occurrence_id
) p ON p.bill_occurrence_id = bo.id;
