-- Migration: Add the Destrucción warehouse
INSERT INTO warehouses (code, name, description)
VALUES ('BOD-DES', 'Bodega Destrucción', 'Para disposición final')
ON CONFLICT (code) DO NOTHING;
