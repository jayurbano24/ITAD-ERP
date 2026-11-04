-- Bodega de Remplazo (reclamaciones post-venta) + metadatos de cambio de serie

INSERT INTO public.warehouses (code, name, description)
VALUES (
  'BOD-RPL',
  'Bodega de Remplazo',
  'Equipos devueltos por reclamación de cliente (garantía); serie original vendida'
)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

ALTER TABLE public.sale_exchanges
  ADD COLUMN IF NOT EXISTS claim_type TEXT NOT NULL DEFAULT 'reclamacion_cliente';

ALTER TABLE public.sale_exchanges
  ADD COLUMN IF NOT EXISTS return_warehouse_code TEXT NOT NULL DEFAULT 'BOD-RPL';

COMMENT ON COLUMN public.sale_exchanges.claim_type IS 'Motivo de negocio del ingreso (ej. reclamacion_cliente)';
COMMENT ON COLUMN public.sale_exchanges.return_warehouse_code IS 'Bodega donde ingresa la serie devuelta';
