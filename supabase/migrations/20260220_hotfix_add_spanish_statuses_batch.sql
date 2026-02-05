-- Hotfix: Agregar TODOS los estados posibles en español al enum work_order_status
-- para detener el ciclo de errores "invalid input value"

-- Estados de Taller y Diagnóstico
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Abierta';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Por Diagnosticar';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'En diagnostico';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Diagnóstico';

-- Estados de Reparación y Proceso
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'En reparación';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'En proceso';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Pendiente';

-- Estados de Cotización
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Cotizando';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Esperando cotización';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Cotización aprobada';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Cotización rechazada';

-- Estados de Piezas
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Esperando piezas';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Esperando repuestos';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Esperando semilla';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Seedstock';

-- Estados de Calidad (QC)
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'QC pendiente';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'QC aprobado';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'QC fallido';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'En control de calidad';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'En qc';

-- Estados Finales y Logística
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Listo para envío';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Completada';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Completado';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Finalizado';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Cerrado';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Cancelada';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Cancelado';

-- Estados Generales (Tickets)
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Borrador';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Asignado';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'Confirmado';
