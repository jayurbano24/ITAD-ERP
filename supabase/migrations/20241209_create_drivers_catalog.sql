-- Tabla de catálogo de choferes/transportistas
CREATE TABLE IF NOT EXISTS catalog_drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    dpi TEXT,
    phone TEXT,
    vehicle_plate TEXT,
    company TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_catalog_drivers_name ON catalog_drivers(name);
CREATE INDEX IF NOT EXISTS idx_catalog_drivers_active ON catalog_drivers(is_active);

-- Datos iniciales de ejemplo
INSERT INTO catalog_drivers (name, dpi, phone, vehicle_plate, company) VALUES
('Juan Pérez', '1234567890101', '5555-1234', 'P-123ABC', 'Transportes GT'),
('Carlos López', '9876543210101', '5555-5678', 'P-456XYZ', 'Logística Express')
ON CONFLICT DO NOTHING;

