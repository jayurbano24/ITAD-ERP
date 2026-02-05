-- =========================================================================
-- Migración: Agregar Bodega de Recepción
-- =========================================================================

INSERT INTO warehouses (code, name, description)
VALUES ('BOD-REC', 'Bodega de Recepción', 'Área dedicada a recibir equipos recién recolectados')
ON CONFLICT (code) DO NOTHING;
