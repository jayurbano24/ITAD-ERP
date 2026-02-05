-- =====================================================
-- ITAD ERP Guatemala - Módulo Financiero (PARTE 2)
-- EJECUTAR DESPUÉS de 011a_financial_tables.sql
-- =====================================================

-- 1. Función RPC para calcular P&L de un lote
CREATE OR REPLACE FUNCTION calculate_batch_pnl(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch RECORD;
    v_total_units INTEGER := 0;
    v_units_sold INTEGER := 0;
    v_units_scrapped INTEGER := 0;
    v_gross_revenue NUMERIC(14,2) := 0;
    v_acquisition_cost NUMERIC(14,2) := 0;
    v_logistics_cost NUMERIC(12,2) := 0;
    v_parts_cost NUMERIC(12,2) := 0;
    v_labor_cost NUMERIC(12,2) := 0;
    v_data_wipe_cost NUMERIC(12,2) := 0;
    v_other_costs NUMERIC(12,2) := 0;
    v_total_expenses NUMERIC(14,2) := 0;
    v_gross_profit NUMERIC(14,2) := 0;
    v_operating_profit NUMERIC(14,2) := 0;
BEGIN
    -- Obtener info del lote
    SELECT * INTO v_batch FROM batches WHERE id = p_batch_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lote no encontrado');
    END IF;
    
    -- Contar unidades desde assets
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'sold'),
        COUNT(*) FILTER (WHERE status = 'scrapped'),
        COALESCE(SUM(cost_amount), 0)
    INTO v_total_units, v_units_sold, v_units_scrapped, v_acquisition_cost
    FROM assets 
    WHERE batch_id = p_batch_id;
    
    -- Calcular ingresos por ventas
    SELECT COALESCE(SUM(soi.unit_price), 0)
    INTO v_gross_revenue
    FROM sales_order_items soi
    JOIN assets a ON soi.asset_id = a.id
    WHERE a.batch_id = p_batch_id;
    
    -- Calcular gastos desde expense_ledger
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE expense_type = 'logistics'), 0),
        COALESCE(SUM(amount) FILTER (WHERE expense_type = 'parts'), 0),
        COALESCE(SUM(amount) FILTER (WHERE expense_type = 'labor'), 0),
        COALESCE(SUM(amount) FILTER (WHERE expense_type = 'data_wipe'), 0),
        COALESCE(SUM(amount) FILTER (WHERE expense_type IN ('storage', 'other')), 0)
    INTO v_logistics_cost, v_parts_cost, v_labor_cost, v_data_wipe_cost, v_other_costs
    FROM expense_ledger
    WHERE batch_id = p_batch_id;
    
    -- Estimar mano de obra si no hay registros (Q80 por equipo en taller)
    IF v_labor_cost = 0 THEN
        SELECT COUNT(*) * 80
        INTO v_labor_cost
        FROM work_orders wo
        JOIN assets a ON wo.asset_id = a.id
        WHERE a.batch_id = p_batch_id
        AND wo.status IN ('completed', 'qc_passed');
    END IF;
    
    -- Estimar borrado si no hay registros (Q40 por equipo borrado)
    IF v_data_wipe_cost = 0 THEN
        SELECT COUNT(*) * 40
        INTO v_data_wipe_cost
        FROM assets
        WHERE batch_id = p_batch_id
        AND data_wipe_status = 'completed';
    END IF;
    
    -- Calcular totales
    v_total_expenses := v_logistics_cost + v_parts_cost + v_labor_cost + v_data_wipe_cost + v_other_costs;
    v_gross_profit := v_gross_revenue - v_acquisition_cost;
    v_operating_profit := v_gross_profit - v_total_expenses;
    
    -- Retornar resultado
    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'batch_number', v_batch.internal_batch_id,
        
        'total_units', v_total_units,
        'units_sold', v_units_sold,
        'units_scrapped', v_units_scrapped,
        'units_pending', v_total_units - v_units_sold - v_units_scrapped,
        'sell_through_pct', CASE WHEN v_total_units > 0 
            THEN ROUND((v_units_sold::NUMERIC / v_total_units) * 100, 1) 
            ELSE 0 END,
        
        'gross_revenue', v_gross_revenue,
        'scrap_revenue', 0,
        'total_revenue', v_gross_revenue,
        
        'acquisition_cost', v_acquisition_cost,
        'logistics_cost', v_logistics_cost,
        'parts_cost', v_parts_cost,
        'labor_cost', v_labor_cost,
        'data_wipe_cost', v_data_wipe_cost,
        'other_costs', v_other_costs,
        'total_expenses', v_total_expenses,
        
        'gross_profit', v_gross_profit,
        'operating_profit', v_operating_profit,
        'profit_margin_pct', CASE WHEN v_gross_revenue > 0 
            THEN ROUND((v_operating_profit / v_gross_revenue) * 100, 1)
            ELSE 0 END,
        
        'avg_sale_price', CASE WHEN v_units_sold > 0 
            THEN ROUND(v_gross_revenue / v_units_sold, 2) 
            ELSE 0 END,
        'avg_cost_per_unit', CASE WHEN v_total_units > 0 
            THEN ROUND(v_acquisition_cost / v_total_units, 2) 
            ELSE 0 END
    );
END;
$$;

-- 2. Vista de lotes para liquidar
CREATE OR REPLACE VIEW batches_for_settlement AS
SELECT 
    b.id,
    b.internal_batch_id,
    b.client_reference,
    b.status AS batch_status,
    b.received_units,
    b.created_at,
    
    COUNT(a.id) AS total_assets,
    COUNT(a.id) FILTER (WHERE a.status = 'sold') AS sold_count,
    COUNT(a.id) FILTER (WHERE a.status = 'scrapped') AS scrapped_count,
    COUNT(a.id) FILTER (WHERE a.status NOT IN ('sold', 'scrapped')) AS pending_count,
    
    CASE WHEN COUNT(a.id) > 0 
        THEN ROUND((COUNT(a.id) FILTER (WHERE a.status IN ('sold', 'scrapped'))::NUMERIC / COUNT(a.id)) * 100, 1)
        ELSE 0 
    END AS completion_pct,
    
    COALESCE(SUM(a.cost_amount), 0)::NUMERIC(12,2) AS total_cost,
    COALESCE(SUM(CASE WHEN a.status = 'sold' THEN a.sales_price ELSE 0 END), 0)::NUMERIC(12,2) AS total_sales,
    
    EXISTS(SELECT 1 FROM settlements s WHERE s.batch_id = b.id) AS has_settlement,
    (SELECT s.status FROM settlements s WHERE s.batch_id = b.id ORDER BY s.created_at DESC LIMIT 1) AS settlement_status
    
FROM batches b
LEFT JOIN assets a ON a.batch_id = b.id
WHERE b.status IN ('received', 'processing', 'completed')
GROUP BY b.id, b.internal_batch_id, b.client_reference, b.status, b.received_units, b.created_at
HAVING COUNT(a.id) > 0
ORDER BY b.created_at DESC;

SELECT 'PARTE 2 COMPLETADA: Funciones y vistas creadas' AS status;

