ALTER TABLE public.sales_quotation_comments
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

COMMENT ON COLUMN public.sales_quotation_comments.attachment_url IS 'Foto o archivo en avance de aprobación (storage sales-quotation-attachments)';
COMMENT ON COLUMN public.sales_quotation_comments.attachment_name IS 'Nombre original del adjunto';
