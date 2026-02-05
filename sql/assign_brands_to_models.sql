-- =====================================================
-- ASIGNAR MARCAS A MODELOS EXISTENTES
-- =====================================================
-- Script para asignar brand_id a modelos que no tienen marca configurada

-- Paso 1: Ver modelos sin marca asignada
SELECT id, name, brand_id 
FROM catalog_models 
WHERE brand_id IS NULL 
ORDER BY name;

-- Paso 2: Intentar asignar marcas automáticamente basándose en el nombre del modelo
-- Este script intenta detectar la marca en el nombre del modelo

-- DELL
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Dell' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Dell%' 
    OR name ILIKE '%Latitude%' 
    OR name ILIKE '%Optiplex%'
    OR name ILIKE '%Precision%'
    OR name ILIKE '%Inspiron%'
    OR name ILIKE '%XPS%'
    OR name ILIKE '%Vostro%');

-- HP
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'HP' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'HP%' 
    OR name ILIKE '%ProBook%'
    OR name ILIKE '%EliteBook%'
    OR name ILIKE '%ZBook%'
    OR name ILIKE '%ProDesk%'
    OR name ILIKE '%EliteDesk%'
    OR name ILIKE '%Pavilion%'
    OR name ILIKE '%Envy%'
    OR name ILIKE '%Omen%');

-- LENOVO
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Lenovo' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Lenovo%'
    OR name ILIKE '%ThinkPad%'
    OR name ILIKE '%ThinkCentre%'
    OR name ILIKE '%IdeaPad%'
    OR name ILIKE '%Legion%'
    OR name ILIKE '%Yoga%');

-- APPLE
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Apple' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Apple%'
    OR name ILIKE '%MacBook%'
    OR name ILIKE '%iMac%'
    OR name ILIKE '%Mac Mini%'
    OR name ILIKE '%Mac Pro%');

-- ASUS
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Asus' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Asus%'
    OR name ILIKE '%ZenBook%'
    OR name ILIKE '%VivoBook%'
    OR name ILIKE '%ROG%'
    OR name ILIKE '%TUF%');

-- ACER
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Acer' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Acer%'
    OR name ILIKE '%Aspire%'
    OR name ILIKE '%Swift%'
    OR name ILIKE '%Predator%'
    OR name ILIKE '%Nitro%');

-- MSI
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'MSI' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'MSI%'
    OR name ILIKE '%GS%'
    OR name ILIKE '%GE%'
    OR name ILIKE '%GL%'
    OR name ILIKE '%Creator%');

-- SAMSUNG
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Samsung' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Samsung%'
    OR name ILIKE '%Galaxy Book%');

-- MICROSOFT
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Microsoft' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Microsoft%'
    OR name ILIKE '%Surface%');

-- TOSHIBA
UPDATE catalog_models 
SET brand_id = (SELECT id FROM catalog_brands WHERE name ILIKE 'Toshiba' LIMIT 1)
WHERE brand_id IS NULL 
  AND (name ILIKE 'Toshiba%'
    OR name ILIKE '%Satellite%'
    OR name ILIKE '%Tecra%'
    OR name ILIKE '%Portege%');

-- Paso 3: Verificar cuántos modelos se asignaron y cuántos quedan sin marca
SELECT 
  COUNT(*) FILTER (WHERE brand_id IS NOT NULL) as modelos_con_marca,
  COUNT(*) FILTER (WHERE brand_id IS NULL) as modelos_sin_marca,
  COUNT(*) as total_modelos
FROM catalog_models;

-- Paso 4: Listar modelos que aún no tienen marca asignada
SELECT id, name, brand_id 
FROM catalog_models 
WHERE brand_id IS NULL 
ORDER BY name;

-- Paso 5: Para modelos sin marca, asignarlos a una marca "Genérica" o "Sin Marca"
-- Primero crear la marca si no existe
INSERT INTO catalog_brands (name, is_active) 
VALUES ('Sin Marca', true)
ON CONFLICT (name) DO NOTHING;

-- Luego asignar todos los modelos sin marca a "Sin Marca"
-- COMENTADO: Descomenta esta línea solo si quieres asignar automáticamente
-- UPDATE catalog_models 
-- SET brand_id = (SELECT id FROM catalog_brands WHERE name = 'Sin Marca' LIMIT 1)
-- WHERE brand_id IS NULL;

-- Paso 6: Crear índice para mejorar búsquedas por marca
CREATE INDEX IF NOT EXISTS idx_catalog_models_brand_id ON catalog_models(brand_id);

-- Paso 7: Agregar constraint NOT NULL después de asignar todas las marcas (OPCIONAL)
-- COMENTADO: Descomenta estas líneas solo después de que TODOS los modelos tengan marca
-- ALTER TABLE catalog_models 
-- ALTER COLUMN brand_id SET NOT NULL;

-- COMENTARIOS FINALES:
-- Este script intenta asignar marcas automáticamente basándose en palabras clave
-- Los modelos que no coincidan con ninguna marca quedarán con brand_id NULL
-- Debes revisar la consulta final y asignar manualmente las marcas faltantes
-- desde la interfaz de Configuración → Usuarios → Catálogos → Modelos
