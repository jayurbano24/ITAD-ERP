CREATE OR REPLACE FUNCTION public.append_sat_withholding_agents_batch(
  p_import_id UUID,
  p_agents JSONB,
  p_clear_first BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch_count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Requiere rol super_admin';
  END IF;

  IF p_clear_first THEN
    DELETE FROM public.sat_withholding_agents;
  END IF;

  INSERT INTO public.sat_withholding_agents (
    nit_normalized,
    display_nit,
    legal_name,
    import_id,
    active
  )
  SELECT
    (elem->>'nit_normalized')::TEXT,
    (elem->>'display_nit')::TEXT,
    NULLIF(TRIM(elem->>'legal_name'), ''),
    p_import_id,
    TRUE
  FROM jsonb_array_elements(p_agents) AS elem
  WHERE COALESCE(elem->>'nit_normalized', '') <> '';

  GET DIAGNOSTICS batch_count = ROW_COUNT;
  RETURN batch_count;
END;
$$;

REVOKE ALL ON FUNCTION public.append_sat_withholding_agents_batch(UUID, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_sat_withholding_agents_batch(UUID, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_sat_withholding_agents_batch(UUID, JSONB, BOOLEAN) TO service_role;