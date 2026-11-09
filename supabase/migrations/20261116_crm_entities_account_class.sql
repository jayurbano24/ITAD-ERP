ALTER TABLE public.crm_entities
  ADD COLUMN IF NOT EXISTS account_class TEXT NOT NULL DEFAULT 'empresa'
    CHECK (account_class IN ('empresa', 'cliente_final'));

COMMENT ON COLUMN public.crm_entities.account_class IS 'Empresa = cuenta corporativa; cliente_final = persona / consumidor final';

UPDATE public.crm_entities
SET account_class = 'cliente_final'
WHERE UPPER(TRIM(tax_id_nit)) = 'CF'
   OR (legal_name IS NULL AND contact_person IS NOT NULL AND LENGTH(TRIM(contact_person)) > 0);
