-- Update warehouse name from Harvesting to Hardvesting
UPDATE public.warehouses
SET name = 'Bodega Hardvesting'
WHERE code = 'BOD-HARV' AND name = 'Bodega Harvesting';

-- Verify the update
SELECT id, code, name, description FROM public.warehouses WHERE code = 'BOD-HARV';
