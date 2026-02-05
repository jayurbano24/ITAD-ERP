-- =====================================================
-- MIGRACIÓN: Guardar progreso del wizard de recepción de lotes
-- =====================================================

CREATE TABLE IF NOT EXISTS receiving_wizard_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES operations_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    step INTEGER NOT NULL,
    payload JSONB NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_receiving_progress_ticket_user ON receiving_wizard_progress(ticket_id, user_id);
