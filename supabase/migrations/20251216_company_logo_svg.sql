-- Añade la posibilidad de guardar código SVG como logo
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS logo_svg TEXT;

-- Mantener los registros existentes sin valor
UPDATE company_settings
SET logo_svg = NULL
WHERE logo_svg IS NULL;
