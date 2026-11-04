-- =====================================================
-- Bucket Storage: wipe-evidence
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wipe-evidence',
  'wipe-evidence',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/xml',
    'text/xml'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "wipe_evidence_public_select"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'wipe-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "wipe_evidence_authenticated_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'wipe-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "wipe_evidence_authenticated_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'wipe-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "wipe_evidence_authenticated_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'wipe-evidence')
    WITH CHECK (bucket_id = 'wipe-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "wipe_evidence_authenticated_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'wipe-evidence');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
