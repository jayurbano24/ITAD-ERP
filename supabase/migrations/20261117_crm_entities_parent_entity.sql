ALTER TABLE public.crm_entities
  ADD COLUMN IF NOT EXISTS parent_entity_id UUID REFERENCES public.crm_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_entities_parent_entity_id_idx
  ON public.crm_entities (parent_entity_id)
  WHERE parent_entity_id IS NOT NULL;

COMMENT ON COLUMN public.crm_entities.parent_entity_id IS 'Empresa corporativa asociada (p. ej. cliente final bajo una empresa)';
