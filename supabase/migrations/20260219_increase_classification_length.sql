
-- Aumentar el tamaño de las columnas de clasificación en work_orders
-- para soportar valores como 'F1', 'C2', etc.

ALTER TABLE work_orders ALTER COLUMN rec_classification TYPE text;
ALTER TABLE work_orders ALTER COLUMN f_classification TYPE text;
ALTER TABLE work_orders ALTER COLUMN c_classification TYPE text;

-- También verificar ticket_items por si acaso, aunque el error actual es en work_orders
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_items' AND column_name = 'classification_f') THEN
    ALTER TABLE ticket_items ALTER COLUMN classification_f TYPE text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_items' AND column_name = 'classification_c') THEN
    ALTER TABLE ticket_items ALTER COLUMN classification_c TYPE text;
  END IF;
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_items' AND column_name = 'classification_rec') THEN
    ALTER TABLE ticket_items ALTER COLUMN classification_rec TYPE text;
  END IF;
END $$;
