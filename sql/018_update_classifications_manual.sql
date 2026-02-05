-- ============================================================================
-- Script Interactivo para Actualizar Clasificaciones REC, F y C Manuales
-- Bodega Remarketing - Control de Calidad
-- ============================================================================

-- ============================================================================
-- ACTUALIZAR LAS 4 ÓRDENES CON DATOS ENCONTRADOS
-- ============================================================================

-- Orden 1: 8a9e8558-dba4-42f1-a358-7d4c3ab5e811
UPDATE work_orders
SET 
    rec_classification = 'R',      -- Cambiar a: R, E, C, o NULL
    f_classification = 'F',        -- Cambiar a: F o NULL
    c_classification = 'C'         -- Cambiar a: C o NULL
WHERE id = '8a9e8558-dba4-42f1-a358-7d4c3ab5e811';

-- Orden 2: a0a055ed-68ec-4972-b962-20d0aaa22016
UPDATE work_orders
SET 
    rec_classification = 'E',
    f_classification = 'F',
    c_classification = 'C'
WHERE id = 'a0a055ed-68ec-4972-b962-20d0aaa22016';

-- Orden 3: 9c5d6bab-ce06-4fe4-9427-786918902b26
UPDATE work_orders
SET 
    rec_classification = 'C',
    f_classification = NULL,
    c_classification = NULL
WHERE id = '9c5d6bab-ce06-4fe4-9427-786918902b26';

-- Orden 4: 2df3e67f-42ad-4644-bef0-62aa09537832
UPDATE work_orders
SET 
    rec_classification = 'R',
    f_classification = 'F',
    c_classification = NULL
WHERE id = '2df3e67f-42ad-4644-bef0-62aa09537832';

-- ============================================================================
-- VERIFICAR QUE LOS DATOS SE GUARDARON
-- ============================================================================
SELECT 
    id,
    asset_id,
    rec_classification,
    f_classification,
    c_classification
FROM work_orders
WHERE id IN (
    '8a9e8558-dba4-42f1-a358-7d4c3ab5e811',
    'a0a055ed-68ec-4972-b962-20d0aaa22016',
    '9c5d6bab-ce06-4fe4-9427-786918902b26',
    '2df3e67f-42ad-4644-bef0-62aa09537832'
)
ORDER BY created_at DESC;
