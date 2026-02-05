-- Agregar columna de clasificación de condición a assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS condition_grade TEXT;

-- Crear tabla de catálogo de condiciones
CREATE TABLE IF NOT EXISTS catalog_condition_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar las condiciones estándar
INSERT INTO catalog_condition_grades (code, name, description, sort_order) VALUES
('C1', 'Dañado', 'Solo para recuperación de materiales', 1),
('C2', 'Mal Uso / Daño Estético Mayor', 'Grietas, partes rotas', 2),
('C3', 'Usado Regular', 'Rasguños notables, abolladuras', 3),
('C4', 'Usado Bueno', 'Uso moderado, arañazos menores', 4),
('C5', 'Usado Muy Bueno', 'Leves signos de uso', 5),
('C6', 'Usado Excelente', 'Signos mínimos o nulos', 6)
ON CONFLICT (code) DO NOTHING;

-- Índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_assets_condition_grade ON assets(condition_grade);

