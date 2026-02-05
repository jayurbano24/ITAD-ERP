-- =========================================================================
-- Migración: Agregar bodegas de Remarketing y Valorización
-- =========================================================================

INSERT INTO warehouses (code, name, description)
VALUES
  ('BOD-REM', 'Bodega Remarketing', 'Equipos aprobados en Control de Calidad para reventa o redistribución'),
  ('BOD-VAL', 'Bodega de Valorización', 'Equipos que han cursado el proceso de Borrado de Datos y esperan valoración final')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;
