-- =====================================================
-- CATÁLOGO DE DISCO DURO (STORAGE)
-- =====================================================
-- Tabla para almacenar información de discos duros
-- con campos de capacidad y tecnología

CREATE TABLE IF NOT EXISTS catalog_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_capacity TEXT,  -- Ej: "256GB", "512GB", "1TB", "2TB"
  storage_type TEXT,      -- Ej: "SSD", "HDD", "NVMe", "M.2"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_catalog_storage_name ON catalog_storage(name);
CREATE INDEX IF NOT EXISTS idx_catalog_storage_active ON catalog_storage(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_storage_capacity ON catalog_storage(storage_capacity);
CREATE INDEX IF NOT EXISTS idx_catalog_storage_type ON catalog_storage(storage_type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_catalog_storage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_catalog_storage_timestamp
  BEFORE UPDATE ON catalog_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_storage_timestamp();

-- Datos iniciales de ejemplo
INSERT INTO catalog_storage (name, storage_capacity, storage_type, is_active) VALUES
  ('SSD 128GB', '128GB', 'SSD', true),
  ('SSD 256GB', '256GB', 'SSD', true),
  ('SSD 512GB', '512GB', 'SSD', true),
  ('SSD 1TB', '1TB', 'SSD', true),
  ('HDD 500GB', '500GB', 'HDD', true),
  ('HDD 1TB', '1TB', 'HDD', true),
  ('HDD 2TB', '2TB', 'HDD', true),
  ('NVMe 256GB', '256GB', 'NVMe', true),
  ('NVMe 512GB', '512GB', 'NVMe', true),
  ('NVMe 1TB', '1TB', 'NVMe', true),
  ('M.2 SSD 256GB', '256GB', 'M.2 SSD', true),
  ('M.2 SSD 512GB', '512GB', 'M.2 SSD', true),
  ('M.2 SSD 1TB', '1TB', 'M.2 SSD', true)
ON CONFLICT DO NOTHING;

-- Comentarios
COMMENT ON TABLE catalog_storage IS 'Catálogo de discos duros con capacidad y tecnología';
COMMENT ON COLUMN catalog_storage.storage_capacity IS 'Capacidad del disco (128GB, 256GB, 512GB, 1TB, etc.)';
COMMENT ON COLUMN catalog_storage.storage_type IS 'Tecnología del disco (SSD, HDD, NVMe, M.2)';
