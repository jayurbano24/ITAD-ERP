-- RPC insert_wipe_evidence (usada por /api/wipe/upload-evidence)

ALTER TABLE public.asset_wipe_evidence
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.asset_wipe_evidence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert wipe evidence" ON public.asset_wipe_evidence
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated select wipe evidence" ON public.asset_wipe_evidence
    FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.insert_wipe_evidence(
  p_asset_id UUID,
  p_type TEXT,
  p_file_name TEXT,
  p_file_url TEXT,
  p_content_type TEXT,
  p_file_size BIGINT,
  p_uploaded_by UUID
) RETURNS TABLE (
  id UUID,
  asset_id UUID,
  type TEXT,
  file_name TEXT,
  file_url TEXT,
  content_type TEXT,
  file_size BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_type IS NULL OR p_type NOT IN ('photo', 'xml', 'pdf') THEN
    RAISE EXCEPTION 'type inválido: %', p_type;
  END IF;

  RETURN QUERY
  INSERT INTO public.asset_wipe_evidence (
    asset_id,
    type,
    file_name,
    file_url,
    content_type,
    file_size,
    uploaded_by
  )
  VALUES (
    p_asset_id,
    p_type,
    p_file_name,
    p_file_url,
    p_content_type,
    p_file_size,
    p_uploaded_by
  )
  RETURNING
    asset_wipe_evidence.id,
    asset_wipe_evidence.asset_id,
    asset_wipe_evidence.type,
    asset_wipe_evidence.file_name,
    asset_wipe_evidence.file_url,
    asset_wipe_evidence.content_type,
    asset_wipe_evidence.file_size,
    asset_wipe_evidence.uploaded_by,
    asset_wipe_evidence.created_at,
    asset_wipe_evidence.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_wipe_evidence(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_wipe_evidence(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
