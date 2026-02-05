-- Registra los eventos históricos relevantes de cada ticket de operaciones
CREATE TABLE IF NOT EXISTS operations_ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES operations_tickets(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT,
    details JSONB,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operations_ticket_history_ticket ON operations_ticket_history(ticket_id, created_at DESC);
