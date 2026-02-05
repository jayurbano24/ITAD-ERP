-- Script para simplificar SKU y Precinto de todas las cajas existentes
-- Convierte de: 10002-SK-TK-2026-TK-2026-00002-10002-4750 a 10002-4750
-- Convierte de: 10003-PRE-TK-2026-TK-2026-00002-10003-926 a 10003-926

-- Actualizar SKU: Extraer número de caja y últimos dígitos después del último guión
UPDATE ticket_items
SET box_sku = CONCAT(
  CAST(box_number AS TEXT),
  '-',
  SUBSTRING(box_sku, LENGTH(box_sku) - POSITION('-' IN REVERSE(box_sku)) + 2)
)
WHERE box_sku IS NOT NULL 
  AND (box_sku LIKE '%SK-TK-%' OR box_sku LIKE '%-SK-TK-%')
  AND box_number IS NOT NULL;

-- Actualizar Precinto: Extraer número de caja y últimos dígitos después del último guión
UPDATE ticket_items
SET box_seal = CONCAT(
  CAST(box_number AS TEXT),
  '-',
  SUBSTRING(box_seal, LENGTH(box_seal) - POSITION('-' IN REVERSE(box_seal)) + 2)
)
WHERE box_seal IS NOT NULL 
  AND (box_seal LIKE '%PRE-TK-%' OR box_seal LIKE '%-PRE-TK-%' OR box_seal LIKE 'PC-TK-%')
  AND box_number IS NOT NULL;

-- Verificar resultados
SELECT DISTINCT 
  box_number,
  box_sku,
  box_seal,
  COUNT(*) as cantidad
FROM ticket_items
WHERE box_number IS NOT NULL
GROUP BY box_number, box_sku, box_seal
ORDER BY box_number;
