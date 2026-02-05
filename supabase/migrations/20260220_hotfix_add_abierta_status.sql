-- Hotfix: Agregar 'Abierta' como valor válido para el enum work_order_status
-- Esto soluciona el error "invalid input value for enum work_order_status: 'Abierta'"
-- causado por componentes que envían el estado en español.

ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Abierta';
