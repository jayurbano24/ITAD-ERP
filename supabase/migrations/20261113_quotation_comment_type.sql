ALTER TABLE public.sales_quotation_comments
  ADD COLUMN IF NOT EXISTS comment_type TEXT NOT NULL DEFAULT 'seguimiento'
    CHECK (comment_type IN ('seguimiento', 'avance_aprobacion'));

COMMENT ON COLUMN public.sales_quotation_comments.comment_type IS 'seguimiento = nota general; avance_aprobacion = hito en flujo de aprobación';
