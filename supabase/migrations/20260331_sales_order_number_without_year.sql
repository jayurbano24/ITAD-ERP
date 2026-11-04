-- Formato de orden: SO-49265 (sin año)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  IF NEW.order_number IS NOT NULL AND btrim(NEW.order_number) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(
    CAST(
      CASE
        WHEN order_number ~ '^SO-[0-9]+$'
          THEN substring(order_number from '^SO-([0-9]+)$')
        WHEN order_number ~ '^SO-[0-9]{4}-[0-9]+$'
          THEN substring(order_number from '^SO-[0-9]{4}-([0-9]+)$')
        ELSE NULL
      END AS INTEGER
    )
  ), 0) + 1
  INTO seq_num
  FROM public.sales_orders
  WHERE order_number ~ '^SO-([0-9]{4}-)?[0-9]+$';

  NEW.order_number := 'SO-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
