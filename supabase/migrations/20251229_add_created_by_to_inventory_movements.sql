-- Migration 20251229: ensure inventory_movements records who created each entry

ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS created_by UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_created_by_fkey'
    ) THEN
        ALTER TABLE inventory_movements
            ADD CONSTRAINT inventory_movements_created_by_fkey
            FOREIGN KEY (created_by)
            REFERENCES profiles(id)
            ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN inventory_movements.created_by IS
    'Usuario que registró el movimiento';
