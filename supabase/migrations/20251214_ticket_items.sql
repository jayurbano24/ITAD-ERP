-- Supabase migration: Tabla para items de manifiesto asociados a operaciones_tickets
-- Permite almacenar el manifiesto declarado por el cliente y capturar los items recolectados

DO $$ BEGIN
    CREATE TYPE ticket_validation_status AS ENUM (
      'PENDIENTE_VALIDACION',
      'VALIDADO',
      'EXTRA',
      'FALTANTE',
      'ILEGIBLE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS ticket_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES operations_tickets(id) ON DELETE CASCADE,
  brand TEXT,
  model TEXT,
  color TEXT,
  product_type TEXT,
  expected_serial TEXT,
  collected_serial TEXT,
  validation_status ticket_validation_status NOT NULL DEFAULT 'PENDIENTE_VALIDACION',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ticket_items IS 'Detalle de items declarados en el manifiesto y su conciliacion';
COMMENT ON COLUMN ticket_items.validation_status IS 'Etapa de validacion: pendiente, validado, extra, faltante o ilegible';
