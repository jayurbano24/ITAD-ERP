ALTER TABLE public.asset_wipe_evidence
  ADD COLUMN IF NOT EXISTS parsed_json JSONB;

CREATE INDEX IF NOT EXISTS idx_asset_wipe_evidence_parsed
  ON public.asset_wipe_evidence USING gin (parsed_json);

DO $$ BEGIN
  CREATE POLICY "Authenticated update wipe evidence parsed"
    ON public.asset_wipe_evidence
    FOR UPDATE TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
