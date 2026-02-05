-- MIGRATION: Ensure data_wipe appears in the workshop status enum
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'data_wipe';
