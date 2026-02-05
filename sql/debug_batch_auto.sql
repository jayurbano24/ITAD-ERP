-- Verificar el batch AUTO-1768017753253 y sus registros en expense_ledger
SELECT 
    b.id,
    b.internal_batch_id,
    b.status,
    COUNT(a.id) as asset_count
FROM batches b
LEFT JOIN assets a ON a.batch_id = b.id
WHERE b.internal_batch_id = 'AUTO-1768017753253'
GROUP BY b.id, b.internal_batch_id, b.status;

-- Ver registros de expense_ledger para este batch
SELECT 
    el.id,
    el.batch_id,
    el.expense_type,
    el.reference_number,
    el.amount,
    el.description,
    el.status,
    el.created_at
FROM expense_ledger el
WHERE el.batch_id IN (
    SELECT id FROM batches WHERE internal_batch_id = 'AUTO-1768017753253'
);

-- Ver lo que muestra la vista batches_for_settlement
SELECT 
    internal_batch_id,
    total_cost,
    total_sales,
    total_assets
FROM batches_for_settlement
WHERE internal_batch_id = 'AUTO-1768017753253';
