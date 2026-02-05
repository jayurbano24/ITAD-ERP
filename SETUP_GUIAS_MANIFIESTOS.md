# 🚀 Instrucciones: Agregar Plantilla de Guías y Manifiestos

## Resumen de Cambios

Se ha implementado un nuevo flujo para gestionar la plantilla de **"Generar Guías y Manifiestos"** desde la sección de **Configuración > Plantillas PDF**.

### ✅ Cambios Realizados:

1. **Nueva Categoría de Plantillas**: `logistica` (Logística y Manifiestos)
2. **API Endpoint**: `/api/logistica/pdf-template` - Obtiene la plantilla de la BD
3. **Hook Personalizado**: `usePDFTemplate` - Carga la plantilla de BD o localStorage
4. **Modal Mejorado**: `PDFTemplateModal` - Integrado con el sistema de plantillas

---

## 📋 Pasos para Implementar:

### Paso 1: Ejecutar el SQL en Supabase

1. Abre tu **Consola de Supabase** (SQL Editor)
2. Copia el contenido del archivo: `add_guias_manifiestos_template.sql`
3. Pégalo en el editor SQL
4. Ejecuta la consulta (botón "Run")
5. Deberías ver como resultado:
   ```
   id | slug | name | category | is_active
   ```

### Paso 2: Verificar en la Aplicación

1. Ve a **Configuración > Plantillas PDF**
2. Debería aparecer una nueva categoría: **"Logística y Manifiestos"**
3. Debería haber una plantilla: **"Guías y Manifiestos"**
4. Podrás editar esta plantilla directamente desde la interfaz

### Paso 3: Usar en Logística

1. En **Logística**, presiona **"Generar Guías y Manifiesto"**
2. Se abrirá el modal `PDFTemplateModal` con:
   - **Pestaña "Información"**: Para número de manifiesto y notas
   - **Pestaña "Plantilla PDF"**: Editor con la plantilla de la BD
3. Si editas la plantilla desde Logística, se guarda en `localStorage`
4. Si editas desde Configuración > Plantillas PDF, se actualiza en la BD

---

## 📌 Variables Disponibles en la Plantilla:

```
{Company Name}       - Nombre de la empresa
{Company NIT}        - NIT de la empresa
{Company Address}    - Dirección de la empresa
{Company Phone}      - Teléfono de la empresa

{Manifest Number}    - Número de manifiesto
{Date}               - Fecha actual
{Box Count}          - Cantidad de cajas

{Ticket Number}      - Número de ticket
{Collector Name}     - Nombre del recolector
{Collection Date}    - Fecha de recolección

{Client Name}        - Nombre del cliente
{Client NIT}         - NIT del cliente
{Client Address}     - Dirección del cliente
{Client Phone}       - Teléfono del cliente

{Equipment Type}     - Tipo de equipo
{Equipment Brand}    - Marca del equipo
{Equipment Model}    - Modelo del equipo
{Equipment Serial}   - Serial del equipo
{Equipment Count}    - Cantidad de equipos

{Notes}              - Notas/Observaciones
```

---

## 🔄 Flujo de Datos:

```
Logística (Generar Guías y Manifiesto)
         ↓
    PDFTemplateModal abre
         ↓
    usePDFTemplate carga:
    1. localStorage (plantilla personalizada si existe)
    2. /api/logistica/pdf-template (plantilla de BD)
    3. DEFAULT_TEMPLATE (fallback)
         ↓
    Usuario edita y presiona "Generar PDF"
         ↓
    Se guarda en localStorage
    (si se edita desde Logística)
         ↓
    Se genera PDF con variables reemplazadas
```

---

## 🎨 Personalización:

### Desde Logística:
- Edita la plantilla en el modal
- Tus cambios se guardan en `localStorage`
- Solo afecta a ese navegador/dispositivo

### Desde Configuración:
- Edita la plantilla en "Plantillas PDF"
- Los cambios se guardan en la BD
- Todos los usuarios ven la plantilla actualizada

---

## ⚠️ Notas Importantes:

1. **Primeros usos**: Ejecuta el SQL para crear la plantilla en la BD
2. **Compatibilidad**: Si hay personalizaciones en localStorage, se usan primero
3. **Actualización**: Si actualizas la plantilla en Configuración, se refleja en todos lados
4. **Restaurar**: Hay un botón "Restaurar" en el editor para volver a la versión por defecto

---

## 📊 Estructura de la Tabla:

```sql
-- En Supabase, la tabla document_templates tiene:
- id (UUID) - Identificador único
- slug (TEXT) - Identificador único (ej: 'guias-y-manifiestos')
- name (TEXT) - Nombre visible (ej: 'Guías y Manifiestos')
- description (TEXT) - Descripción
- category (TEXT) - Categoría (ej: 'logistica')
- content_html (TEXT) - Contenido HTML de la plantilla
- variables (TEXT[]) - Array de variables usadas
- is_active (BOOLEAN) - Si está activa
- updated_at (TIMESTAMP) - Última actualización
```

---

## 🚨 Troubleshooting:

| Problema | Solución |
|----------|----------|
| No veo la plantilla en Configuración | Ejecuta el SQL en Supabase |
| Modal no carga la plantilla | Verifica que la API `/api/logistica/pdf-template` responda |
| Cambios no se guardan | Revisa localStorage en DevTools (F12) |
| Variables no se reemplazan | Verifica el formato: {Variable Name} |

