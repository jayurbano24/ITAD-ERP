-- Tabla de configuración de la empresa
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'ITAD Guatemala',
    nit TEXT DEFAULT '12345678-9',
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#22c55e',
    secondary_color TEXT DEFAULT '#16a34a',
    ticket_prefix TEXT DEFAULT 'TK',
    batch_prefix TEXT DEFAULT 'LOT',
    warranty_days INTEGER DEFAULT 30,
    currency TEXT DEFAULT 'GTQ',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto si no existe
INSERT INTO company_settings (name, nit, address, phone, email, website, primary_color, secondary_color)
SELECT 'ITAD Guatemala', '12345678-9', '6ta Avenida 10-25, Zona 1, Ciudad de Guatemala', '+502 2222-3333', 'info@itadguatemala.com', 'https://www.itadguatemala.com', '#22c55e', '#16a34a'
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS company_settings_updated_at ON company_settings;
CREATE TRIGGER company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_company_settings_updated_at();

