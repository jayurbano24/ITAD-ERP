# Configuración: Marcas en Modelos para Filtrado Automático

## Estado Actual

✅ **El sistema YA tiene implementado el filtrado de modelos por marca** en todos los formularios:
- **Recepción**: Filtra modelos por marca seleccionada
- **Logística**: Filtra modelos por marca seleccionada
- **Otros módulos**: También implementan este filtrado

## Problema Identificado

❌ **Los modelos existentes NO tienen marca asignada** (campo `brand_id` es NULL)

## Solución

### Paso 1: Ejecutar Script SQL

Ejecuta el script: [sql/assign_brands_to_models.sql](../sql/assign_brands_to_models.sql)

Este script:
1. ✅ Muestra modelos sin marca
2. ✅ Asigna marcas automáticamente detectando palabras clave en el nombre
3. ✅ Soporta marcas: Dell, HP, Lenovo, Apple, Asus, Acer, MSI, Samsung, Microsoft, Toshiba
4. ✅ Crea índice para búsquedas rápidas
5. ✅ Muestra reporte de asignación

**Cómo ejecutar:**
```bash
# Opción 1: Desde Supabase SQL Editor
# Copia y pega el contenido del archivo

# Opción 2: Desde terminal
psql -h [HOST] -U [USER] -d [DATABASE] -f sql/assign_brands_to_models.sql
```

### Paso 2: Verificar Asignación

Después de ejecutar el script, verifica los resultados:

```sql
-- Ver todos los modelos con su marca
SELECT 
  m.name as modelo,
  b.name as marca,
  m.brand_id
FROM catalog_models m
LEFT JOIN catalog_brands b ON m.brand_id = b.id
ORDER BY b.name, m.name;

-- Ver modelos SIN marca asignada
SELECT id, name 
FROM catalog_models 
WHERE brand_id IS NULL
ORDER BY name;
```

### Paso 3: Asignar Marcas Faltantes Manualmente

Para modelos que no fueron asignados automáticamente:

1. Ve a **Configuración del Sistema → Usuarios → Catálogos**
2. En la tarjeta **"Modelos"**, click en **"Ver"**
3. Para cada modelo sin marca o con marca incorrecta:
   - Click en el ícono de **editar** (lápiz)
   - **Selecciona la Marca** (campo obligatorio)
   - Click en **"Guardar"**

### Paso 4: Crear Nuevos Modelos (Siempre con Marca)

A partir de ahora, al crear un modelo:

1. Click en **"Agregar"** en la tarjeta de Modelos
2. Completa los campos:
   - **Nombre del Modelo** (obligatorio)
   - **Marca** (obligatorio) ⭐
   - **Tipo de Producto** (opcional)
   - **Descripción** (opcional)
3. El botón "Guardar" solo se habilita si hay nombre Y marca

## Cómo Funciona el Filtrado

### En Recepción

1. Usuario selecciona una **Marca** (Ej: Dell)
2. El dropdown de **Modelo** se filtra automáticamente mostrando solo modelos de Dell
3. Si no hay marca seleccionada, el dropdown de modelos está deshabilitado

**Código:**
```tsx
<select 
  value={receptionForm.modeloId}
  disabled={!receptionForm.marcaId}  // Deshabilitado sin marca
>
  {models
    .filter((m) => m.brand_id === receptionForm.marcaId)  // Filtro por marca
    .map((model) => (
      <option key={model.id} value={model.id}>{model.name}</option>
    ))}
</select>
```

### En Logística

Similar a Recepción:
1. Usuario selecciona marca
2. Modelos se filtran automáticamente
3. Solo se muestran modelos de la marca seleccionada

**Código:**
```tsx
const filteredModels = useMemo(() => {
  if (!currentItem.brandId) {
    return models
  }
  return models.filter((model) => {
    const brandMatch = model.brand_id === currentItem.brandId
    const nestedBrandMatch = model.brand?.id === currentItem.brandId
    return brandMatch || nestedBrandMatch
  })
}, [currentItem.brandId, models])
```

## Ventajas del Sistema

✅ **Evita errores**: No se pueden asignar modelos de una marca a otra marca
✅ **Más rápido**: Lista de modelos más corta y relevante
✅ **Mejor UX**: Usuario solo ve opciones válidas
✅ **Datos consistentes**: Garantiza integridad referencial

## Estructura de Base de Datos

```sql
CREATE TABLE catalog_models (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  brand_id UUID REFERENCES catalog_brands(id),  -- Relación con marcas
  product_type_id UUID REFERENCES catalog_product_types(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_catalog_models_brand_id ON catalog_models(brand_id);
```

## Ejemplos de Uso

### Ejemplo 1: Crear Modelo Nuevo
```
Marca: Dell
Modelo: Latitude 7490
Tipo: Laptop
Descripción: Laptop empresarial 14 pulgadas
```

### Ejemplo 2: Filtrado Automático
```
1. Usuario selecciona: Marca = "HP"
2. Sistema filtra modelos:
   ✅ HP ProBook 450 G8
   ✅ HP EliteBook 840 G7
   ✅ HP ZBook Studio G7
   ❌ Dell Latitude 7490 (no se muestra)
   ❌ Lenovo ThinkPad T14 (no se muestra)
```

## Validaciones Implementadas

✅ **Modal de Modelos**: 
- Campo "Marca" es obligatorio (label con asterisco)
- Botón guardar deshabilitado si falta marca

✅ **Formularios del Sistema**:
- Dropdown de modelos se deshabilita hasta seleccionar marca
- Solo muestra modelos de la marca seleccionada

## Script de Asignación Automática

El script detecta marcas basándose en palabras clave:

| Marca | Palabras Clave |
|-------|---------------|
| Dell | Dell, Latitude, Optiplex, Precision, Inspiron, XPS, Vostro |
| HP | HP, ProBook, EliteBook, ZBook, ProDesk, EliteDesk, Pavilion, Envy, Omen |
| Lenovo | Lenovo, ThinkPad, ThinkCentre, IdeaPad, Legion, Yoga |
| Apple | Apple, MacBook, iMac, Mac Mini, Mac Pro |
| Asus | Asus, ZenBook, VivoBook, ROG, TUF |
| Acer | Acer, Aspire, Swift, Predator, Nitro |
| MSI | MSI, GS, GE, GL, Creator |
| Samsung | Samsung, Galaxy Book |
| Microsoft | Microsoft, Surface |
| Toshiba | Toshiba, Satellite, Tecra, Portege |

## Soporte

Si después de ejecutar el script tienes modelos sin marca:
1. Revisa el nombre del modelo
2. Asigna la marca manualmente desde la interfaz
3. O agrega más patrones de detección al script

## Archivos Relacionados

1. `sql/assign_brands_to_models.sql` - Script de asignación automática
2. `src/app/dashboard/configuracion/usuarios/components/CatalogsTab.tsx` - Modal de modelos
3. `src/app/recepcion/components/RecepcionModule.tsx` - Filtrado en Recepción
4. `src/app/dashboard/logistica/components/LogisticaModule.tsx` - Filtrado en Logística
