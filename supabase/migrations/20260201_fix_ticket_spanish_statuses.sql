-- Agregar estados en español al enum ticket_status para evitar errores de input
-- cuando se sincronizan con work_orders o se envían desde frontend en español

ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Cancelado';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Completado';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Pendiente';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'En proceso';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Abierto';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Cerrado';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Borrador';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Asignado';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Confirmado';
