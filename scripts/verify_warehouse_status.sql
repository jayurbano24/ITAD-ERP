-- Script de verificación: Verificar que el campo status fue agregado a warehouses

-- 1. Verificar que la columna status existe
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'warehouses'
  AND column_name = 'status';

-- 2. Ver todas las bodegas con su estatus
SELECT 
    id,
    code,
    name,
    status,
    is_active,
    description
FROM public.warehouses
ORDER BY code;

-- 3. Verificar el constraint de estatus
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.warehouses'::regclass
  AND conname = 'warehouses_status_check';

-- 4. Verificar el índice
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'warehouses'
  AND indexname = 'idx_warehouses_status';
