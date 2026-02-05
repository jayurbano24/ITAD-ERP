-- Migration: Add Harvesting warehouse
-- Bodega para equipos a despiezar

INSERT INTO warehouses (code, name, description)
VALUES ('BOD-HARV', 'Bodega Hardvesting', 'Equipos a despiezar')
ON CONFLICT (code) DO NOTHING;
