-- Actualizar vista batches_for_settlement para incluir registros del ledger
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
    
    -- Costo total: suma de assets.cost_amount + registros de expense_ledger (acquisition)
    (
        COALESCE(SUM(a.cost_amount), 0) + 
        COALESCE(
            (SELECT SUM(el.amount) 
             FROM expense_ledger el 
             WHERE el.batch_id = b.id 
             AND el.expense_type = 'acquisition' 
             AND el.reference_number = 'summary'
             AND el.status = 'approved'), 
            0
        )
    )::NUMERIC(12,2) AS total_cost,
    
    -- Ventas totales: suma de assets.sales_price + registros de revenue_ledger (amount)
    (
        COALESCE(SUM(CASE WHEN a.status = 'sold' THEN a.sales_price ELSE 0 END), 0) + 
        COALESCE(
            (SELECT SUM(rl.amount) 
             FROM revenue_ledger rl 
             WHERE rl.batch_id = b.id 
             AND rl.reference_number = 'summary'), 
            0
        )
    )::NUMERIC(12,2) AS total_sales,
    
    EXISTS(SELECT 1 FROM settlements s WHERE s.batch_id = b.id) AS has_settlement,
    (SELECT s.status FROM settlements s WHERE s.batch_id = b.id ORDER BY s.created_at DESC LIMIT 1) AS settlement_status
    
FROM batches b
LEFT JOIN assets a ON a.batch_id = b.id
WHERE b.status IN ('received', 'processing', 'completed')
GROUP BY b.id, b.internal_batch_id, b.client_reference, b.status, b.received_units, b.created_at
HAVING COUNT(a.id) > 0
ORDER BY b.created_at DESC;

SELECT 'Vista batches_for_settlement actualizada con registros del ledger' AS status;
