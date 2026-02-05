-- Step 1: Add 'logistica' to the document_category enum type
-- Execute this FIRST and wait for it to complete

ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'logistica';

-- This query should complete successfully and show no errors
-- Once done, execute the second SQL file: add_guias_manifiestos_template_part2.sql
