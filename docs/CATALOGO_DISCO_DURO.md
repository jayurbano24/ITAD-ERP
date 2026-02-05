# Catálogo de Disco Duro (Storage)

## Descripción
Este catálogo permite gestionar la información de discos duros con dos campos adicionales:
- **Capacidad**: 128GB, 256GB, 512GB, 1TB, 2TB, etc.
- **Tecnología**: SSD, HDD, NVMe, M.2, etc.

## Instalación

### 1. Crear la tabla en la base de datos

Ejecuta el script SQL ubicado en:
```
sql/create_catalog_storage.sql
```

Puedes ejecutarlo desde el panel de Supabase → SQL Editor o desde tu cliente PostgreSQL:

```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f sql/create_catalog_storage.sql
```

### 2. Verificar la instalación

Revisa que la tabla se haya creado correctamente:

```sql
SELECT * FROM catalog_storage;
```

Deberías ver los datos iniciales (SSD 128GB, SSD 256GB, HDD 1TB, etc.).

## Uso

### Acceder al catálogo

1. Ve a **Configuración del Sistema** → **Usuarios**
2. Selecciona la pestaña **Catálogos**
3. Busca la tarjeta **"Disco Duro"** con el ícono de disco duro en color teal

### Agregar nuevos discos

1. Click en el botón **"Agregar"** en la tarjeta de Disco Duro
2. Completa los campos:
   - **Nombre**: Nombre descriptivo (Ej: "SSD 512GB NVMe")
   - **Capacidad**: La capacidad del disco (Ej: "512GB", "1TB")
   - **Tecnología**: El tipo de tecnología (Ej: "SSD", "NVMe", "M.2 SSD")
3. Click en **"Agregar"**

### Ver y editar discos existentes

1. Click en **"Ver"** para ver todos los discos del catálogo
2. En la lista, cada disco muestra:
   - Nombre principal
   - Badge de **Capacidad** (color teal)
   - Badge de **Tecnología** (color púrpura)
3. Usa el ícono de **editar** (lápiz) para modificar un disco
4. Usa el ícono de **eliminar** (papelera) para desactivar un disco

### Exportar/Importar

- **Exportar**: Descarga el catálogo completo en formato Excel (.xlsx)
- **Importar**: Carga masivamente discos desde un archivo Excel con el formato:
  ```
  | nombre          | storage_capacity | storage_type |
  |-----------------|------------------|--------------|
  | SSD 256GB      | 256GB            | SSD          |
  | NVMe 1TB       | 1TB              | NVMe         |
  ```

## Estructura de la tabla

```sql
CREATE TABLE catalog_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_capacity TEXT,     -- Capacidad del disco
  storage_type TEXT,          -- Tecnología del disco
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Datos de ejemplo incluidos

El script incluye 13 opciones predefinidas:
- SSD: 128GB, 256GB, 512GB, 1TB
- HDD: 500GB, 1TB, 2TB
- NVMe: 256GB, 512GB, 1TB
- M.2 SSD: 256GB, 512GB, 1TB

## Integración con otros módulos

Este catálogo puede integrarse con:
- **Recepción**: Para registrar el tipo de disco de equipos recibidos
- **Logística**: Para especificar discos en cajas
- **Inventario**: Para búsqueda y filtrado por tipo de almacenamiento
- **Ventas**: Para mostrar opciones de discos disponibles

## Notas técnicas

- Los campos `storage_capacity` y `storage_type` son opcionales pero recomendados
- El campo `name` es obligatorio y debe ser único/descriptivo
- Los registros no se eliminan físicamente, solo se marcan como `is_active = false`
- El trigger `update_catalog_storage_timestamp` actualiza automáticamente `updated_at`

## Archivos modificados

1. `sql/create_catalog_storage.sql` - Script de creación de tabla
2. `src/app/dashboard/configuracion/usuarios/actions.ts` - Actions de backend
3. `src/app/dashboard/configuracion/usuarios/components/CatalogsTab.tsx` - Interfaz del catálogo

## Soporte

Para problemas o preguntas, consulta la documentación técnica o contacta al equipo de desarrollo.
