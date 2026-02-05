-- Agrega el campo completed_by a operations_tickets para registrar el usuario que completó la logística
ALTER TABLE operations_tickets
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id);

-- (Opcional) Puedes agregar un comentario para documentación
COMMENT ON COLUMN operations_tickets.completed_by IS 'Usuario que marcó como completado el ticket/logística';
