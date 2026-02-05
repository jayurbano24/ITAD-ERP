-- Actualizar tabla de modelos para incluir relaciones
ALTER TABLE catalog_models 
ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES catalog_product_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_catalog_models_brand ON catalog_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalog_models_product_type ON catalog_models(product_type_id);

