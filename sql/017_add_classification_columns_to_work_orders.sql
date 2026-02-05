-- Agregar columnas de clasificación REC, F y C a work_orders si no existen
ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS rec_classification CHAR(1),
ADD COLUMN IF NOT EXISTS f_classification CHAR(1),
ADD COLUMN IF NOT EXISTS c_classification CHAR(1);

-- Comentarios para documentar los campos
COMMENT ON COLUMN work_orders.rec_classification IS 'Clasificación REC (R/E/C) asignada en Control de Calidad';
COMMENT ON COLUMN work_orders.f_classification IS 'Clasificación Funcional (F) asignada en Control de Calidad';
COMMENT ON COLUMN work_orders.c_classification IS 'Clasificación Cosmética (C) asignada en Control de Calidad';
