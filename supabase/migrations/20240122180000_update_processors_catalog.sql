
-- Agregar columnas detalladas a catalog_processors
ALTER TABLE public.catalog_processors 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS generation TEXT,
ADD COLUMN IF NOT EXISTS architecture TEXT,
ADD COLUMN IF NOT EXISTS frequency TEXT;

-- Opcional: Recrear la tabla si prefieres empezar de cero (solo si no tiene datos valiosos)
-- DROP TABLE IF EXISTS public.catalog_processors;
-- Y correr el CREATE TABLE con las columnas nuevas.
