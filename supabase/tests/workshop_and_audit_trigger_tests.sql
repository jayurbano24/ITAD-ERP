BEGIN;

-- Create pgtap extension if not exists
CREATE EXTENSION IF NOT EXISTS "pgtap";

-- Plan the tests to be run
SELECT plan(5);

-- 1. Setup: Create schema elements required for the test in isolation.
-- This ensures the test is self-contained and doesn't depend on project state.

-- Simplified dependent tables to satisfy Foreign Key constraints
CREATE TABLE public.profiles (id UUID PRIMARY KEY, full_name TEXT, email TEXT, role TEXT);
CREATE TABLE public.operations_tickets (id UUID PRIMARY KEY, readable_id TEXT, title TEXT, created_by UUID);
CREATE TABLE public.assets (id UUID PRIMARY KEY, serial_number TEXT, batch_id UUID);

-- Simplified ENUM types based on the main audit log schema
CREATE TYPE public.audit_action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'COMMENT');
CREATE TYPE public.audit_module_type AS ENUM ('TICKETS', 'LOGISTICS', 'WORKSHOP');
CREATE TYPE public.audit_entity_type AS ENUM ('TICKET', 'BATCH', 'ASSET', 'WORK_ORDER');

-- audit_logs table structure based on the corrected schema from migration 20260209
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action public.audit_action_type NOT NULL,
    module public.audit_module_type NOT NULL,
    description TEXT NOT NULL,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_role TEXT,
    entity_type public.audit_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    entity_reference TEXT,
    ticket_id UUID,
    batch_id UUID,
    asset_id UUID,
    data_before JSONB,
    data_after JSONB,
    changes_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- work_orders table structure from migration 008
CREATE TABLE public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number TEXT NOT NULL UNIQUE,
    asset_id UUID REFERENCES public.assets(id),
    ticket_id UUID REFERENCES public.operations_tickets(id),
    technician_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The trigger function to be tested (corrected version)
CREATE OR REPLACE FUNCTION public.trigger_audit_work_order_update()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::JSONB;
    v_description TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        v_description := format('Orden de Trabajo %s: Estado: %s → %s', COALESCE(NEW.work_order_number, 'SIN-NUMERO'), OLD.status, NEW.status);

        INSERT INTO public.audit_logs (
            action, module, entity_type, entity_id, entity_reference,
            description, user_name, user_email, user_role,
            ticket_id, asset_id,
            data_before, data_after, changes_summary,
            created_at
        ) VALUES (
            'UPDATE', 'WORKSHOP', 'WORK_ORDER', NEW.id, COALESCE(NEW.work_order_number, NEW.id::TEXT),
            v_description, 'sistema', 'sistema@itad.gt', 'system',
            NEW.ticket_id, NEW.asset_id,
            to_jsonb(OLD), to_jsonb(NEW), v_changes,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the table
CREATE TRIGGER trigger_audit_work_order_update
AFTER UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_audit_work_order_update();

-- 2. Test Execution

-- Test 1: Verify that the work_orders table was created in our test schema
SELECT has_table('public', 'work_orders', 'Table work_orders should exist.');

-- Setup dummy data for foreign key relations
INSERT INTO public.profiles (id, full_name, email, role) VALUES ('a0000000-0000-0000-0000-000000000001', 'Test User', 'test@test.com', 'workshop_technician');
INSERT INTO public.operations_tickets (id, readable_id, title) VALUES ('b0000000-0000-0000-0000-000000000001', 'TK-TEST-001', 'Test Ticket');
INSERT INTO public.assets (id, serial_number) VALUES ('c0000000-0000-0000-0000-000000000001', 'SERIAL-TEST-001');

-- Test 2: Verify that a row can be inserted into work_orders
SELECT lives_ok(
  $$
    INSERT INTO public.work_orders (id, work_order_number, asset_id, ticket_id, technician_id, status)
    VALUES ('d0000000-0000-0000-0000-000000000001', 'WO-TEST-001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'open');
  $$,
  'Should be able to insert a new work_order.'
);

-- Test 3: Verify that the audit trigger creates a log entry on status update
-- Update the work_order to fire the trigger
UPDATE public.work_orders SET status = 'in_progress' WHERE id = 'd0000000-0000-0000-0000-000000000001';

SELECT is(
    (SELECT COUNT(*)::INT FROM public.audit_logs WHERE entity_id = 'd0000000-0000-0000-0000-000000000001'),
    1,
    'Audit trigger should create exactly one log entry for the update.'
);

-- Test 4: Verify the content of the created audit log entry
SELECT is(
    (SELECT action FROM public.audit_logs WHERE entity_id = 'd0000000-0000-0000-0000-000000000001'),
    'UPDATE'::public.audit_action_type,
    'Audit log "action" should be UPDATE.'
);

-- Test 5: Verify the changes_summary JSONB content in the audit log
SELECT is(
    (SELECT changes_summary FROM public.audit_logs WHERE entity_id = 'd0000000-0000-0000-0000-000000000001'),
    '{"status": {"old": "open", "new": "in_progress"}}'::jsonb,
    'Audit log "changes_summary" should contain the correct status change.'
);

-- 3. Teardown
-- Finish the tests and roll back the transaction
SELECT * FROM finish();

ROLLBACK;
