-- Agregar columnas para archivos adjuntos en tickets
ALTER TABLE operations_tickets 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Agregar columna ticket_type si no existe
ALTER TABLE operations_tickets 
ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT 'recoleccion';

-- Crear bucket para archivos adjuntos (ejecutar en Storage de Supabase)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('attachments', 'attachments', true)
-- ON CONFLICT (id) DO NOTHING;

-- Política para permitir subida de archivos autenticados
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
-- FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'attachments');

-- Política para permitir lectura pública
-- CREATE POLICY "Allow public read" ON storage.objects
-- FOR SELECT TO public
-- USING (bucket_id = 'attachments');

COMMENT ON COLUMN operations_tickets.attachment_url IS 'URL del archivo Excel adjunto en Storage';
COMMENT ON COLUMN operations_tickets.attachment_name IS 'Nombre original del archivo adjunto';

