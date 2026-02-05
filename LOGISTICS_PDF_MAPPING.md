# 📋 Sistema de Mapeo de Variables para Plantillas PDF de Logística

## Estructura de Datos Implementada

### 1. Variables Disponibles en el Editor de Plantillas

Se han agregado nuevas variables en la sección **"Logística / Manifiesto"** del modal:

```typescript
{
    category: 'Logística / Manifiesto',
    variables: [
        { code: '{Ticket_ID}', label: 'ID del Ticket' },
        { code: '{Manifest_Number}', label: 'Número de Manifiesto' },
        { code: '{Order_Date}', label: 'Fecha de la Orden' },
        { code: '{Client_Name}', label: 'Nombre del Cliente' },
        { code: '{Collector_User}', label: 'Usuario Recolector' },
        { code: '{Box_ID}', label: 'ID de Caja' },
        { code: '{Asset_Series}', label: 'Series de Activos' },
        { code: '{Total_Items}', label: 'Total de Artículos' }
    ]
}
```

### 2. Estructura de Datos de Logística

Cuando se abre el modal "Generar Guías y Manifiesto", se pasan los siguientes datos:

```typescript
logisticsData: {
    ticketId: string;              // TK-2026-00006
    clientName: string;             // Techcomm Wireless Guatemala S.A.
    collectorName: string;          // GURBANO
    manifestNumber: string;         // 10006-340468
    boxCount: number;               // 1
    equipmentDetails: Array<{
        brand: string;              // Apple, Samsung, etc.
        model: string;              // iPhone 14, Galaxy S23, etc.
        serial: string;             // 651651616516
    }>;
}
```

### 3. Inyección de Variables

Cuando se presiona "Generar PDF", la función `injectLogisticsVariables()` reemplaza automáticamente:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `{Ticket_ID}` | ticket.id | TK-2026-00006 |
| `{Manifest_Number}` | manifestNumber | 10006-340468 |
| `{Order_Date}` | Fecha actual formateada | 3/2/2026 |
| `{Client_Name}` | ticket.client | Techcomm Wireless Guatemala S.A. |
| `{Collector_User}` | collectorName | GURBANO |
| `{Box_ID}` | BOX-{boxCount} | BOX-1 |
| `{Asset_Series}` | Seriales separados por coma | 651651616516, 987987987987 |
| `{Total_Items}` | equipmentDetails.length | 2 |

### 4. Estructura de Flujo

```
Módulo de Logística (Detalle del Ticket)
         ↓
Usuario presiona "Generar Guías y Manifiesto"
         ↓
Se abre PDFTemplateModal con:
  - variables disponibles para editar
  - datos de logística precargados
  - previsualizador (si aplica)
         ↓
Usuario puede:
  a) Usar plantilla de BD sin cambios
  b) Editar plantilla agregando variables
  c) Ver disponibles en sidebar derecho
         ↓
Presiona "Generar PDF"
         ↓
injectLogisticsVariables() reemplaza todas las variables
         ↓
Se genera y descarga el PDF con datos dinámicos
```

### 5. Ejemplo de Plantilla Personalizada

```html
<!DOCTYPE html>
<html>
<head>
    <title>Manifiesto de Logística</title>
</head>
<body>
    <h1>MANIFIESTO DE LOGÍSTICA</h1>
    
    <div class="info-section">
        <h2>Información del Documento</h2>
        <p><strong>Número de Manifiesto:</strong> {Manifest_Number}</p>
        <p><strong>Ticket:</strong> {Ticket_ID}</p>
        <p><strong>Fecha:</strong> {Order_Date}</p>
    </div>
    
    <div class="client-section">
        <h2>Cliente</h2>
        <p><strong>Nombre:</strong> {Client_Name}</p>
    </div>
    
    <div class="logistics-section">
        <h2>Logística</h2>
        <p><strong>Recolector:</strong> {Collector_User}</p>
        <p><strong>Cajas:</strong> {Box_ID}</p>
        <p><strong>Total de Artículos:</strong> {Total_Items}</p>
        <p><strong>Series de Equipos:</strong> {Asset_Series}</p>
    </div>
</body>
</html>
```

### 6. Integración con Configuración

El flujo completo es:

1. **Ir a Configuración > Plantillas PDF** (botón con engranaje en el modal)
2. **Crear/Editar plantilla** de tipo "Logística"
3. **Usar variables** del selector lateral
4. **Guardar en BD** para que sea reutilizable

Cuando se genera el PDF desde Logística:
- Se carga la plantilla de BD (o localStorage si fue personalizada)
- Se inyectan automáticamente los datos del ticket actual
- Se descarga el PDF finalizado

### 7. Archivos Modificados

- `PDFTemplateModal.tsx` - Agregadas nuevas variables y función de inyección
- `LogisticaModule.tsx` - Paso de datos al modal
- `LOGISTICS_PDF_MAPPING.md` - Este archivo de documentación

### 8. Próximos Pasos (Opcionales)

- [ ] Agregar vista previa del PDF con variables inyectadas
- [ ] Permitir mapeo personalizado de variables
- [ ] Histórico de plantillas utilizadas por ticket
- [ ] Exportación múltiple de PDFs (uno por caja)
- [ ] Firmado electrónico del manifiesto
