# Fix: Catálogo de Memoria RAM - Agregar Campos Capacidad y Tecnología

## Problema Detectado
El catálogo de Memoria RAM mostraba datos de disco duro (1TB HDD, 128 GB SSD, etc.) en lugar de memoria RAM (4GB DDR4, 8GB DDR5, etc.), y los campos de `ram_capacity` y `ram_type` no existían en la tabla.

## Causa
La tabla `catalog_memory` fue creada inicialmente sin los campos `ram_capacity` y `ram_type`, por lo que:
1. No podía almacenar información de capacidad y tipo de RAM
2. Los datos de disco duro se insertaron erróneamente en esta tabla

## Solución Aplicada

### 1. Script de Migración SQL
Creado: [sql/update_catalog_memory_add_fields.sql](../sql/update_catalog_memory_add_fields.sql)

Este script realiza:
- ✅ Agrega columnas `ram_capacity` y `ram_type` a `catalog_memory`
- ✅ Crea índices para búsquedas rápidas
- ✅ Elimina datos de disco duro que estaban en la tabla incorrecta
- ✅ Inserta 16 registros de ejemplo de RAM (DDR3, DDR4, DDR5, LPDDR)
- ✅ Actualiza registros legacy intentando parsear capacidad y tipo del nombre

### 2. Datos de Ejemplo Incluidos
- **DDR3**: 4GB, 8GB
- **DDR4**: 4GB, 8GB, 16GB, 32GB
- **DDR5**: 8GB, 16GB, 32GB, 64GB
- **LPDDR3**: 4GB
- **LPDDR4**: 8GB
- **LPDDR4X**: 8GB, 16GB
- **LPDDR5**: 16GB, 32GB

## Instalación

### Paso 1: Ejecutar la migración
```bash
# Desde Supabase SQL Editor o tu cliente PostgreSQL
psql -h [HOST] -U [USER] -d [DATABASE] -f sql/update_catalog_memory_add_fields.sql
```

O copia y pega el contenido del archivo en Supabase → SQL Editor → Run.

### Paso 2: Verificar
```sql
-- Ver todos los registros de RAM
SELECT * FROM catalog_memory ORDER BY name;

-- Ver solo los que tienen capacidad y tipo
SELECT name, ram_capacity, ram_type FROM catalog_memory 
WHERE ram_capacity IS NOT NULL AND ram_type IS NOT NULL;
```

### Paso 3: Refrescar la aplicación
1. Recarga la página de Configuración → Usuarios → Catálogos
2. Abre el catálogo "Memoria RAM"
3. Deberías ver los registros con badges de:
   - **Capacidad** (amarillo): 4GB, 8GB, 16GB, etc.
   - **Tipo** (azul): DDR3, DDR4, DDR5, LPDDR4X, etc.

## Uso del Catálogo Actualizado

### Agregar nueva RAM
1. Click en "Agregar" en la tarjeta de Memoria RAM
2. Completa los campos:
   - **Capacidad (GB)**: Ej: 8, 16, 32
   - **Tipo de RAM**: Ej: DDR4, DDR5, LPDDR4X
3. Click en "AGREGAR"

El sistema generará automáticamente un nombre si no se especifica, o puedes usar el patrón: "[Capacidad] [Tipo]" (Ej: "8GB DDR4")

### Ver y Editar
- Los badges de color amarillo muestran la **capacidad**
- Los badges de color azul muestran el **tipo de RAM**
- Usa el ícono de editar (lápiz) para modificar
- Usa el ícono de eliminar (papelera) para desactivar

## Diferencia con Disco Duro

| Catálogo | Campos | Colores Badges | Ejemplos |
|----------|---------|----------------|----------|
| **Memoria RAM** | `ram_capacity`, `ram_type` | Amarillo (capacidad), Azul (tipo) | 8GB DDR4, 16GB DDR5 |
| **Disco Duro** | `storage_capacity`, `storage_type` | Teal (capacidad), Púrpura (tecnología) | 512GB SSD, 1TB HDD |

## Notas Importantes

### Limpieza de Datos
El script elimina automáticamente registros que contengan:
- `SSD`, `HDD`, `NVMe`, `M.2`, `TB` en el nombre
- Estos datos probablemente fueron ingresados por error

Si tienes datos de RAM que coincidan con estos patrones, modifica la sección `DELETE FROM catalog_memory` del script antes de ejecutarlo.

### Actualización de Registros Legacy
Si tenías registros de RAM sin los campos nuevos, el script intenta parsear el nombre para extraer:
- Capacidad: Busca patrones como "4GB", "8 GB", "16GB"
- Tipo: Busca patrones como "DDR3", "DDR4", "DDR5", "LPDDR4X"

## Prevención Futura

Para evitar confusión entre catálogos:
1. **Memoria RAM** → Solo datos de RAM (DDR, LPDDR)
2. **Disco Duro** → Solo datos de almacenamiento (SSD, HDD, NVMe, M.2)

Ambos catálogos ahora tienen campos específicos y badges de colores diferentes para facilitar la identificación.

## Archivos Relacionados
1. `sql/update_catalog_memory_add_fields.sql` - Script de migración
2. `sql/create_catalog_storage.sql` - Script de catálogo de Disco Duro
3. `src/app/dashboard/configuracion/usuarios/components/CatalogsTab.tsx` - UI de catálogos
4. `src/app/dashboard/configuracion/usuarios/actions.ts` - Backend de catálogos

## Soporte
Si después de ejecutar la migración sigues viendo datos incorrectos, verifica:
1. Que el script se ejecutó sin errores
2. Que refrescaste completamente la página (Ctrl + Shift + R)
3. Que los datos en la base de datos son correctos: `SELECT * FROM catalog_memory`
