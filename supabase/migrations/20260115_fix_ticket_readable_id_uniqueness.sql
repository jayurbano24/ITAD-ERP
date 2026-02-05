-- Ensure a monotonic sequence for ticket readable IDs
CREATE SEQUENCE IF NOT EXISTS public.operations_ticket_readable_id_seq;

-- Align the sequence with the current highest numeric part in existing readable_ids
DO $$
DECLARE
  max_val BIGINT;
BEGIN
  SELECT MAX((regexp_match(readable_id, 'TK-\d{4}-(\d{5})'))[1]::BIGINT)
  INTO max_val
  FROM public.operations_tickets
  WHERE readable_id ~ '^TK-\d{4}-\d{5}$';

  IF max_val IS NULL THEN
    max_val := 0;
  END IF;

  PERFORM setval('public.operations_ticket_readable_id_seq', max_val, TRUE);
END;
$$;

-- Reassign readable_id for duplicates, nulls, or malformed values
WITH ranked AS (
  SELECT
    id,
    created_at,
    readable_id,
    ROW_NUMBER() OVER (PARTITION BY readable_id ORDER BY created_at NULLS FIRST, id) AS rn
  FROM public.operations_tickets
)
UPDATE public.operations_tickets t
SET readable_id = FORMAT(
  'TK-%s-%s',
  to_char(timezone('America/Guatemala', COALESCE(t.created_at, now())), 'YYYY'),
  LPAD(nextval('public.operations_ticket_readable_id_seq')::text, 5, '0')
)
FROM ranked r
WHERE t.id = r.id
  AND (
    t.readable_id IS NULL
    OR r.rn > 1
    OR t.readable_id !~ '^TK-\d{4}-\d{5}$'
  );

-- Enforce uniqueness on readable_id
CREATE UNIQUE INDEX IF NOT EXISTS operations_tickets_readable_id_uidx
  ON public.operations_tickets(readable_id);

-- Generator function with retry on rare collisions
CREATE OR REPLACE FUNCTION public.generate_operations_ticket_readable_id()
RETURNS TRIGGER AS $$
DECLARE
  padded TEXT;
BEGIN
  IF NEW.readable_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    padded := LPAD(nextval('public.operations_ticket_readable_id_seq')::text, 5, '0');
    BEGIN
      NEW.readable_id := FORMAT(
        'TK-%s-%s',
        to_char(timezone('America/Guatemala', COALESCE(NEW.created_at, now())), 'YYYY'),
        padded
      );
      RETURN NEW;
    EXCEPTION
      WHEN unique_violation THEN
        -- Retry with next sequence value
        CONTINUE;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Replace trigger to always use the generator
DROP TRIGGER IF EXISTS trg_operations_tickets_readable_id ON public.operations_tickets;

CREATE TRIGGER trg_operations_tickets_readable_id
BEFORE INSERT ON public.operations_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_operations_ticket_readable_id();
