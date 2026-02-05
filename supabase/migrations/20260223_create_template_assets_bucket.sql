-- Create storage bucket for template assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('template_assets', 'template_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload images
DO $$ BEGIN
    CREATE POLICY "Allow authenticated uploads to template_assets"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'template_assets');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Policy to allow public to view images
DO $$ BEGIN
    CREATE POLICY "Allow public view of template_assets"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'template_assets');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
