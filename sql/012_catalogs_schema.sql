-- =====================================================
-- ITAD ERP Guatemala - Tablas de Catálogos
-- Versión: 012
-- Fecha: 2025-12-03
-- Descripción: Catálogos maestros (marcas, fallas, etc.)
-- =====================================================

-- 1. Catálogo de Marcas
CREATE TABLE IF NOT EXISTS catalog_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar algunas marcas comunes
INSERT INTO catalog_brands (name) VALUES 
    ('Dell'),
    ('HP'),
    ('Lenovo'),
    ('Apple'),
    ('Acer'),
    ('Asus'),
    ('Microsoft'),
    ('Samsung'),
    ('LG'),
    ('Toshiba')
ON CONFLICT (name) DO NOTHING;

-- 2. Catálogo de Códigos de Falla
CREATE TABLE IF NOT EXISTS catalog_failure_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar fallas comunes
INSERT INTO catalog_failure_codes (name, category) VALUES 
    ('Pantalla rota', 'Hardware'),
    ('No enciende', 'Hardware'),
    ('Batería defectuosa', 'Hardware'),
    ('Teclado dañado', 'Hardware'),
    ('Disco duro fallando', 'Storage'),
    ('RAM defectuosa', 'Hardware'),
    ('Problemas de WiFi', 'Conectividad'),
    ('Puerto USB dañado', 'Puertos'),
    ('Cámara no funciona', 'Periféricos'),
    ('Parlantes sin sonido', 'Audio'),
    ('Ventilador ruidoso', 'Enfriamiento'),
    ('Sobrecalentamiento', 'Enfriamiento'),
    ('Blue Screen (BSOD)', 'Software'),
    ('Lento / Performance', 'Software'),
    ('Virus / Malware', 'Software')
ON CONFLICT (name) DO NOTHING;

-- 3. Catálogo de Modelos (opcional, vinculado a marcas)
CREATE TABLE IF NOT EXISTS catalog_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES catalog_brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT DEFAULT 'laptop',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, name)
);

-- 4. Catálogo de Memoria RAM
CREATE TABLE IF NOT EXISTS catalog_ram (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ram_capacity TEXT NOT NULL,
    ram_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de seguridad y lectura/escritura
ALTER TABLE catalog_ram ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "catalog_ram_read" ON catalog_ram 
--     FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "catalog_ram_write" ON catalog_ram 
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_catalog_ram_name ON catalog_ram(name);

-- 5. Catálogo de Procesadores
CREATE TABLE IF NOT EXISTS catalog_processors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name)
);

-- Insertar procesadores comunes
INSERT INTO catalog_processors (name) VALUES
    ('Intel Core i3'),
    ('Intel Core i5'),
    ('Intel Core i7'),
    ('Intel Core i9'),
    ('AMD Ryzen 3'),
    ('AMD Ryzen 5'),
    ('AMD Ryzen 7'),
    ('AMD Ryzen 9'),
    ('Intel Pentium'),
    ('Intel Celeron'),
    ('Apple M1'),
    ('Apple M2'),
    ('Qualcomm Snapdragon'),
    ('MediaTek Helio'),
    ('Samsung Exynos')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE catalog_processors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_processors_read" ON catalog_processors 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_processors_write" ON catalog_processors 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. RLS
ALTER TABLE catalog_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_failure_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_ram ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_processors ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para todos

-- CREATE POLICY "catalog_brands_read" ON catalog_brands 
--     FOR SELECT TO authenticated USING (true);

-- CREATE POLICY "catalog_failure_codes_read" ON catalog_failure_codes 
--     FOR SELECT TO authenticated USING (true);

-- CREATE POLICY "catalog_models_read" ON catalog_models 
--     FOR SELECT TO authenticated USING (true);

-- Políticas de escritura solo para admins (se verifica en server action)

-- CREATE POLICY "catalog_brands_write" ON catalog_brands 
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CREATE POLICY "catalog_failure_codes_write" ON catalog_failure_codes 
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CREATE POLICY "catalog_models_write" ON catalog_models 
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_catalog_brands_name ON catalog_brands(name);
CREATE INDEX IF NOT EXISTS idx_catalog_failure_codes_name ON catalog_failure_codes(name);
CREATE INDEX IF NOT EXISTS idx_catalog_models_brand ON catalog_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalog_ram_name ON catalog_ram(name);

SELECT 'Catálogos creados correctamente' AS status;

