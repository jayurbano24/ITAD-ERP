-- Permitir múltiples clientes con NIT CF (consumidor final)
ALTER TABLE public.crm_entities DROP CONSTRAINT IF EXISTS crm_entities_tax_id_nit_key;
DROP INDEX IF EXISTS public.crm_entities_tax_id_nit_key;

-- Unicidad solo para NIT reales (no CF / consumidor final)
CREATE UNIQUE INDEX IF NOT EXISTS crm_entities_tax_id_nit_unique_real
  ON public.crm_entities (tax_id_nit)
  WHERE tax_id_nit IS NOT NULL
    AND btrim(tax_id_nit) <> ''
    AND upper(btrim(tax_id_nit)) NOT IN ('CF', 'C/F', 'CONSUMIDOR FINAL');
