-- ============================================================
-- DIAGNÓSTICO: Verifica si la plantilla se creó correctamente
-- ============================================================

-- 1. Verifica si el enum 'logistica' existe
SELECT enum_range(NULL::document_category) as categorias_disponibles;

-- 2. Verifica si la plantilla fue insertada
SELECT 
    id, 
    slug, 
    name, 
    category, 
    is_active,
    created_at,
    updated_at
FROM document_templates 
WHERE slug = 'guias-y-manifiestos' OR category = 'logistica'
ORDER BY created_at DESC;

-- 3. Muestra TODAS las plantillas por categoría
SELECT 
    category,
    COUNT(*) as total,
    STRING_AGG(name, ', ') as plantillas
FROM document_templates
GROUP BY category
ORDER BY category;

-- 4. Verifica errores de constraint (si alguno ocurrió)
-- Ejecuta esto si los anteriores no muestran lo esperado
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'document_templates';
