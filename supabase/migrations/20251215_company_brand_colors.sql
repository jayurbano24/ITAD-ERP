-- Agrega los colores de marca a la configuración de la empresa
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#22c55e';

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#16a34a';

-- Asegura que los registros existentes tengan valores válidos
UPDATE company_settings
SET
  primary_color = COALESCE(primary_color, '#22c55e'),
  secondary_color = COALESCE(secondary_color, '#16a34a');
