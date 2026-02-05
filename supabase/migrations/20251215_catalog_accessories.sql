-- Crear catálogo de accesorios por tipo de producto
CREATE TABLE IF NOT EXISTS catalog_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    product_type_id UUID REFERENCES catalog_product_types(id) ON DELETE SET NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, product_type_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_accessories_product_type ON catalog_accessories(product_type_id);
