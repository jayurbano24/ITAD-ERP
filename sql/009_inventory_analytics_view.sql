-- =====================================================
-- ITAD ERP Guatemala - Vista de Análisis de Inventario
-- Versión: 009 (Corregida)
-- Fecha: 2025-12-03
-- =====================================================

-- =====================================================
-- PARTE 1: ELIMINAR VISTAS EXISTENTES
-- =====================================================

DROP VIEW IF EXISTS inventory_analytics_view CASCADE;
DROP VIEW IF EXISTS inventory_abc_summary CASCADE;

-- =====================================================
-- PARTE 2: VISTA PRINCIPAL - inventory_analytics_view
-- Estados válidos: received, wiped, wiping, diagnosing, ready_for_sale
-- =====================================================

CREATE VIEW inventory_analytics_view AS
WITH 
model_aggregation AS (
    SELECT 
        COALESCE(manufacturer, 'Sin Marca') AS brand,
        COALESCE(model, 'Sin Modelo') AS model,
        COALESCE(asset_type, 'Sin Tipo') AS type,
        
        -- Disponibles (listos para venta)
        COUNT(*) FILTER (
            WHERE status IN ('received', 'wiped', 'ready_for_sale')
        ) AS available_count,
        
        -- En proceso (diagnóstico, borrado)
        COUNT(*) FILTER (
            WHERE status IN ('diagnosing', 'wiping')
        ) AS in_process_count,
        
        -- Total en stock (no vendidos ni desechados)
        COUNT(*) FILTER (
            WHERE status IN ('received', 'wiped', 'wiping', 'diagnosing', 'ready_for_sale')
        ) AS total_quantity,
        
        -- Valor total del inventario disponible
        COALESCE(SUM(cost_amount) FILTER (
            WHERE status IN ('received', 'wiped', 'ready_for_sale')
        ), 0)::NUMERIC(12,2) AS total_cost_value,
        
        -- Días promedio en stock
        ROUND(
            AVG(
                EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400
            ) FILTER (
                WHERE status IN ('received', 'wiped', 'ready_for_sale')
            )
        )::INTEGER AS rotation_days,
        
        -- Fecha del artículo más antiguo
        MIN(created_at) FILTER (
            WHERE status IN ('received', 'wiped', 'ready_for_sale')
        ) AS oldest_entry_date
        
    FROM assets
    GROUP BY 
        COALESCE(manufacturer, 'Sin Marca'),
        COALESCE(model, 'Sin Modelo'),
        COALESCE(asset_type, 'Sin Tipo')
    HAVING COUNT(*) FILTER (WHERE status IN ('received', 'wiped', 'wiping', 'diagnosing', 'ready_for_sale')) > 0
),

abc_classification AS (
    SELECT 
        *,
        ROUND(
            SUM(total_cost_value) OVER (ORDER BY total_cost_value DESC) / 
            NULLIF(SUM(total_cost_value) OVER (), 0) * 100, 2
        ) AS cumulative_pct
    FROM model_aggregation
)

SELECT 
    brand,
    model,
    type,
    available_count,
    in_process_count,
    total_quantity,
    total_cost_value,
    rotation_days,
    oldest_entry_date,
    
    -- Clasificación ABC
    CASE 
        WHEN cumulative_pct <= 80 THEN 'A'
        WHEN cumulative_pct <= 95 THEN 'B'
        ELSE 'C'
    END AS abc_class

FROM abc_classification
ORDER BY total_cost_value DESC;

-- =====================================================
-- PARTE 3: VISTA RESUMEN ABC
-- =====================================================

CREATE VIEW inventory_abc_summary AS
SELECT 
    abc_class,
    COUNT(*) AS model_count,
    SUM(total_quantity) AS total_units,
    SUM(total_cost_value)::NUMERIC(14,2) AS total_value,
    ROUND(AVG(rotation_days))::INTEGER AS avg_rotation_days
FROM inventory_analytics_view
GROUP BY abc_class
ORDER BY abc_class;

-- =====================================================
-- PARTE 4: ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_assets_manufacturer_model 
ON assets(manufacturer, model, asset_type);

CREATE INDEX IF NOT EXISTS idx_assets_status_cost 
ON assets(status, cost_amount);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 'Vista creada correctamente' AS status;

SELECT * FROM inventory_analytics_view LIMIT 5;

-- =====================================================
-- COLUMNAS DISPONIBLES:
-- brand, model, type
-- available_count (listos para venta)
-- in_process_count (en diagnóstico/borrado)
-- total_quantity (total en stock)
-- total_cost_value (valor del inventario)
-- rotation_days (días promedio)
-- oldest_entry_date (fecha más antigua)
-- abc_class ('A', 'B', 'C')
-- =====================================================
