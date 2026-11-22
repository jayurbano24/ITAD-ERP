-- Reemplazo masivo del catálogo (una sola transacción; evita timeouts en UI)

CREATE OR REPLACE FUNCTION public.replace_sat_withholding_agents(
  p_import_id UUID,
  p_agents JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Requiere rol super_admin';
  END IF;

  DELETE FROM public.sat_withholding_agents;

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

  SELECT COUNT(*)::INTEGER INTO inserted_count FROM public.sat_withholding_agents;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_sat_withholding_agents(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_sat_withholding_agents(UUID, JSONB) TO authenticated;