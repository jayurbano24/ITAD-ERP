-- Catálogo SAT: agentes retenedores del IVA (carga desde PDF publicado por SAT)

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS sat_retenedores_source_url TEXT,
  ADD COLUMN IF NOT EXISTS sat_retenedores_last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS iva_withholding_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.15;

COMMENT ON COLUMN public.company_settings.sat_retenedores_source_url IS
  'URL pública del PDF o archivo oficial SAT de agentes retenedores (sync opcional)';
COMMENT ON COLUMN public.company_settings.iva_withholding_rate IS
  'Tasa de retención de IVA aplicable al vender a agente retenedor (ej. 0.15 = 15% del IVA)';

ALTER TABLE public.crm_entities
  ADD COLUMN IF NOT EXISTS is_iva_withholding_agent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.crm_entities.is_iva_withholding_agent IS
  'Marcado al validar NIT contra catálogo SAT de agentes retenedores';

CREATE TABLE IF NOT EXISTS public.sat_withholding_agent_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf_upload', 'url_sync', 'manual')),
  source_label TEXT,
  nit_count INTEGER NOT NULL DEFAULT 0,
  file_sha256 TEXT,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.sat_withholding_agents (
  nit_normalized TEXT PRIMARY KEY,
  display_nit TEXT NOT NULL,
  legal_name TEXT,
  import_id UUID REFERENCES public.sat_withholding_agent_imports (id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sat_withholding_agents_active_idx
  ON public.sat_withholding_agents (nit_normalized)
  WHERE active = true;

ALTER TABLE public.sat_withholding_agent_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_withholding_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY sat_withholding_agent_imports_select ON public.sat_withholding_agent_imports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY sat_withholding_agents_select ON public.sat_withholding_agents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY sat_withholding_agent_imports_admin ON public.sat_withholding_agent_imports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

CREATE POLICY sat_withholding_agents_admin ON public.sat_withholding_agents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('sat-fiscal-catalogs', 'sat-fiscal-catalogs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY sat_fiscal_catalogs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sat-fiscal-catalogs');

CREATE POLICY sat_fiscal_catalogs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sat-fiscal-catalogs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );