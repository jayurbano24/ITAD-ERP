-- Columnas usadas por certifyAsset en módulo Borrado
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS wipe_notes TEXT,
  ADD COLUMN IF NOT EXISTS wipe_result TEXT;

COMMENT ON COLUMN public.assets.wipe_notes IS 'Observaciones del proceso de borrado';
COMMENT ON COLUMN public.assets.wipe_result IS 'Resultado del borrado: success | failed | partial';

NOTIFY pgrst, 'reload schema';
