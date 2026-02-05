-- =====================================================
-- CATÁLOGOS MAESTROS PARA ITAD ERP
-- =====================================================

-- Tabla de Marcas (si no existe)
CREATE TABLE IF NOT EXISTS catalog_brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Modelos
CREATE TABLE IF NOT EXISTS catalog_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand_id UUID REFERENCES catalog_brands(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Tipos de Producto
CREATE TABLE IF NOT EXISTS catalog_product_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Colores
CREATE TABLE IF NOT EXISTS catalog_colors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    hex_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Diagnósticos
CREATE TABLE IF NOT EXISTS catalog_diagnostics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Reparaciones
CREATE TABLE IF NOT EXISTS catalog_repairs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    estimated_time_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Tipos de Servicio
CREATE TABLE IF NOT EXISTS catalog_service_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Códigos de Falla (si no existe)
CREATE TABLE IF NOT EXISTS catalog_failure_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Marcas comunes
INSERT INTO catalog_brands (name) VALUES 
    ('HP'), ('Dell'), ('Lenovo'), ('Apple'), ('Samsung'), 
    ('Asus'), ('Acer'), ('Microsoft'), ('LG'), ('Toshiba')
ON CONFLICT (name) DO NOTHING;

-- Tipos de Producto
INSERT INTO catalog_product_types (name, description) VALUES 
    ('Laptop', 'Computadora portátil'),
    ('Desktop', 'Computadora de escritorio'),
    ('Monitor', 'Pantalla/Monitor'),
    ('Impresora', 'Impresora o multifuncional'),
    ('Servidor', 'Servidor físico'),
    ('Tablet', 'Tableta electrónica'),
    ('Teléfono', 'Teléfono móvil'),
    ('Accesorio', 'Accesorios varios'),
    ('Red', 'Equipo de red (switch, router, etc.)')
ON CONFLICT (name) DO NOTHING;

-- Colores comunes
INSERT INTO catalog_colors (name, hex_code) VALUES 
    ('Negro', '#000000'),
    ('Blanco', '#FFFFFF'),
    ('Gris', '#808080'),
    ('Plata', '#C0C0C0'),
    ('Azul', '#0066CC'),
    ('Rojo', '#CC0000'),
    ('Verde', '#00CC00'),
    ('Dorado', '#FFD700')
ON CONFLICT (name) DO NOTHING;

-- Diagnósticos comunes
INSERT INTO catalog_diagnostics (name, description) VALUES 
    ('No enciende', 'El equipo no muestra señales de encendido'),
    ('Pantalla dañada', 'Pantalla rota o con fallas visuales'),
    ('Batería agotada', 'La batería no retiene carga'),
    ('Disco duro fallando', 'Problemas con el almacenamiento'),
    ('Lento / Performance', 'Rendimiento bajo del sistema'),
    ('Blue Screen (BSOD)', 'Pantalla azul de error'),
    ('No carga', 'No acepta carga de batería'),
    ('Teclado dañado', 'Teclas no funcionan'),
    ('Sin conexión WiFi', 'No detecta redes inalámbricas'),
    ('Sobrecalentamiento', 'El equipo se calienta excesivamente')
ON CONFLICT (name) DO NOTHING;

-- Reparaciones comunes
INSERT INTO catalog_repairs (name, description, estimated_time_minutes) VALUES 
    ('Cambio de pantalla', 'Reemplazo de display/LCD', 60),
    ('Cambio de batería', 'Reemplazo de batería', 30),
    ('Cambio de disco duro', 'Reemplazo de HDD/SSD', 45),
    ('Cambio de teclado', 'Reemplazo de teclado', 45),
    ('Limpieza interna', 'Limpieza de polvo y pasta térmica', 60),
    ('Reinstalación de SO', 'Formateo e instalación de sistema operativo', 120),
    ('Cambio de RAM', 'Reemplazo o ampliación de memoria', 20),
    ('Reparación de placa', 'Reparación de componentes en motherboard', 180),
    ('Cambio de cargador', 'Reemplazo de adaptador de corriente', 10),
    ('Actualización de BIOS', 'Actualización de firmware', 30)
ON CONFLICT (name) DO NOTHING;

-- Tipos de Servicio
INSERT INTO catalog_service_types (name, description) VALUES 
    ('Recolección', 'Recogida de equipos en sitio del cliente'),
    ('Garantía', 'Servicio cubierto por garantía'),
    ('Auditoría', 'Auditoría e inventario de activos'),
    ('Destrucción', 'Destrucción certificada de datos/equipos'),
    ('Reciclaje', 'Reciclaje responsable de equipos'),
    ('Mantenimiento', 'Mantenimiento preventivo'),
    ('Reparación', 'Servicio de reparación'),
    ('Instalación', 'Instalación de equipos o software')
ON CONFLICT (name) DO NOTHING;

-- Códigos de falla
INSERT INTO catalog_failure_codes (name) VALUES 
    ('Batería defectuosa'),
    ('Blue Screen (BSOD)'),
    ('Cámara no funciona'),
    ('Disco duro fallando'),
    ('Lento / Performance'),
    ('No enciende'),
    ('Pantalla dañada'),
    ('Sin audio'),
    ('Teclado dañado'),
    ('Virus/Malware')
ON CONFLICT (name) DO NOTHING;

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_catalog_models_brand ON catalog_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalog_brands_active ON catalog_brands(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_product_types_active ON catalog_product_types(is_active);

