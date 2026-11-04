-- Unicidad de serie, salida de bodega al vender/destruir, y una sola OS activa por activo

UPDATE public.assets
SET current_warehouse_id = NULL,
    updated_at = COALESCE(updated_at, now())
WHERE status::text IN ('sold', 'destroyed', 'scrapped')
  AND current_warehouse_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assets_serial_number_unique_ci
  ON public.assets (upper(btrim(serial_number)))
  WHERE serial_number IS NOT NULL AND btrim(serial_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS work_orders_one_active_per_asset
  ON public.work_orders (asset_id)
  WHERE asset_id IS NOT NULL
    AND lower(coalesce(status, '')) NOT IN (
      'qc_passed', 'completed', 'cancelled', 'closed', 'cancelada', 'cerrada', 'completada'
    );

CREATE OR REPLACE FUNCTION public.assets_exit_warehouse_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status::text IN ('sold', 'destroyed', 'scrapped') THEN
    NEW.current_warehouse_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assets_exit_warehouse_on_terminal_status ON public.assets;
CREATE TRIGGER trg_assets_exit_warehouse_on_terminal_status
  BEFORE UPDATE OF status ON public.assets
  FOR EACH ROW
  WHEN (NEW.status::text IS DISTINCT FROM OLD.status::text)
  EXECUTE FUNCTION public.assets_exit_warehouse_on_terminal_status();

CREATE OR REPLACE FUNCTION public.work_orders_prevent_second_active()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_id uuid;
  existing_number text;
BEGIN
  IF NEW.asset_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF lower(coalesce(NEW.status, '')) IN ('qc_passed', 'completed', 'cancelled', 'closed', 'cancelada', 'cerrada', 'completada') THEN
    RETURN NEW;
  END IF;

  SELECT id, work_order_number
    INTO existing_id, existing_number
  FROM public.work_orders
  WHERE asset_id = NEW.asset_id
    AND id IS DISTINCT FROM NEW.id
    AND lower(coalesce(status, '')) NOT IN ('qc_passed', 'completed', 'cancelled', 'closed', 'cancelada', 'cerrada', 'completada')
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'El activo ya tiene una orden de servicio activa (%). No se permite una segunda OS.', coalesce(existing_number, existing_id::text)
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_orders_prevent_second_active ON public.work_orders;
CREATE TRIGGER trg_work_orders_prevent_second_active
  BEFORE INSERT OR UPDATE OF asset_id, status ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.work_orders_prevent_second_active();
