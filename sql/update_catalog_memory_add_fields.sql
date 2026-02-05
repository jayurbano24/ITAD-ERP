-- =====================================================
-- AGREGAR CAMPOS A CATÁLOGO DE MEMORIA RAM
-- =====================================================
-- Migración para agregar campos ram_capacity y ram_type
-- a la tabla catalog_memory existente

-- Agregar columnas si no existen
ALTER TABLE catalog_memory 
  ADD COLUMN IF NOT EXISTS ram_capacity TEXT,
  ADD COLUMN IF NOT EXISTS ram_type TEXT;

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_catalog_memory_capacity ON catalog_memory(ram_capacity);
CREATE INDEX IF NOT EXISTS idx_catalog_memory_type ON catalog_memory(ram_type);

-- Comentarios
COMMENT ON COLUMN catalog_memory.ram_capacity IS 'Capacidad de la memoria RAM (4GB, 8GB, 16GB, 32GB, etc.)';
COMMENT ON COLUMN catalog_memory.ram_type IS 'Tipo de memoria RAM (DDR3, DDR4, DDR5, LPDDR4X, etc.)';

-- Limpiar datos de disco duro que puedan estar en la tabla (si existen)
-- Solo eliminar si detectamos nombres que claramente son de disco duro
DELETE FROM catalog_memory 
WHERE name ILIKE '%SSD%' 
   OR name ILIKE '%HDD%' 
   OR name ILIKE '%NVMe%'
   OR name ILIKE '%M.2%'
   OR name ILIKE '%TB%';

-- Insertar datos de ejemplo de memoria RAM
INSERT INTO catalog_memory (name, ram_capacity, ram_type, is_active) VALUES
  ('4GB DDR3', '4GB', 'DDR3', true),
  ('8GB DDR3', '8GB', 'DDR3', true),
  ('4GB DDR4', '4GB', 'DDR4', true),
  ('8GB DDR4', '8GB', 'DDR4', true),
  ('16GB DDR4', '16GB', 'DDR4', true),
  ('32GB DDR4', '32GB', 'DDR4', true),
  ('8GB DDR5', '8GB', 'DDR5', true),
  ('16GB DDR5', '16GB', 'DDR5', true),
  ('32GB DDR5', '32GB', 'DDR5', true),
  ('64GB DDR5', '64GB', 'DDR5', true),
  ('4GB LPDDR3', '4GB', 'LPDDR3', true),
  ('8GB LPDDR4', '8GB', 'LPDDR4', true),
  ('8GB LPDDR4X', '8GB', 'LPDDR4X', true),
  ('16GB LPDDR4X', '16GB', 'LPDDR4X', true),
  ('16GB LPDDR5', '16GB', 'LPDDR5', true),
  ('32GB LPDDR5', '32GB', 'LPDDR5', true)
ON CONFLICT (id) DO NOTHING;

-- Actualizar registros existentes sin capacidad/tipo (opcional)
-- Si hay registros legacy sin estos campos, podemos intentar parsearlos
UPDATE catalog_memory
SET 
  ram_capacity = CASE
    WHEN name ILIKE '%4GB%' OR name ILIKE '%4 GB%' THEN '4GB'
    WHEN name ILIKE '%8GB%' OR name ILIKE '%8 GB%' THEN '8GB'
    WHEN name ILIKE '%16GB%' OR name ILIKE '%16 GB%' THEN '16GB'
    WHEN name ILIKE '%32GB%' OR name ILIKE '%32 GB%' THEN '32GB'
    WHEN name ILIKE '%64GB%' OR name ILIKE '%64 GB%' THEN '64GB'
    ELSE ram_capacity
  END,
  ram_type = CASE
    WHEN name ILIKE '%DDR5%' THEN 'DDR5'
    WHEN name ILIKE '%DDR4%' THEN 'DDR4'
    WHEN name ILIKE '%DDR3%' THEN 'DDR3'
    WHEN name ILIKE '%DDR2%' THEN 'DDR2'
    WHEN name ILIKE '%LPDDR5%' THEN 'LPDDR5'
    WHEN name ILIKE '%LPDDR4X%' THEN 'LPDDR4X'
    WHEN name ILIKE '%LPDDR4%' THEN 'LPDDR4'
    WHEN name ILIKE '%LPDDR3%' THEN 'LPDDR3'
    ELSE ram_type
  END
WHERE ram_capacity IS NULL OR ram_type IS NULL;
