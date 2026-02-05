-- =====================================================
-- MIGRACIÓN: Nueva tabla para evidencias de borrado (fotos/XML)
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_wipe_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('photo', 'xml', 'pdf')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    content_type TEXT,
    file_size BIGINT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_wipe_evidence_asset ON asset_wipe_evidence(asset_id);
