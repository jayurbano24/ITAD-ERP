# Guía de Prueba: Certificación de Borrado de Datos

## Resumen de Cambios
Se ha migrado el flujo de carga de archivos de Server Actions a un endpoint API para resolver la limitación de Next.js con objetos `File`.

### Cambios Realizados
1. **Removido**: Import de `uploadWipeEvidence` en `CertificationModal.tsx`
2. **Reemplazado**: Llamadas a `uploadWipeEvidence()` con `fetch()` al endpoint `/api/wipe/upload-evidence`
3. **Creado**: Nuevo endpoint API en `src/app/api/wipe/upload-evidence/route.ts`

## Cómo Probar la Certificación Completa

### Prerrequisitos
- Aplicación ejecutándose en modo desarrollo o producción
- Usuario autenticado
- Al menos un activo en estado "pending_wipe" o similar

### Pasos de Prueba

#### 1. Navegar al Dashboard de Borrado
1. Ingresa a `localhost:3000/dashboard/borrado` (o tu URL base)
2. Deberías ver una lista de activos disponibles para certificación

#### 2. Iniciar Modal de Certificación
1. Haz clic en el botón "Certificar" o similar en un activo
2. Se debería abrir un modal con:
   - Selección de software de borrado (Blancco, KillDisk, etc.)
   - Campo de ID de Reporte Externo
   - Selector de resultado (Exitoso, Falló, Parcial)
   - Campos para subir fotos (máximo 5)
   - Campos opcionales para XML y PDF
   - Notas (opcional)

#### 3. Llenar el Formulario
1. Selecciona un software: **Blancco Drive Eraser**
2. Ingresa ID Externo: **TEST-2025-001** (o tu identificador)
3. Selecciona Resultado: **Exitoso**

#### 4. Subir Fotos
1. Haz clic en "Seleccionar Fotos" o en la zona de carga
2. Selecciona 2-3 imágenes JPG/PNG (máx 6MB cada una)
3. Verifica que aparezcan en la lista con números (📷 1, 📷 2, etc.)
4. Deberías ver un aviso si intentas subir más de 5 fotos

#### 5. Hacer Clic en "Certificar"
1. El modal debería mostrar progreso:
   - "Subiendo foto 1 de 2..."
   - "Subiendo foto 2 de 2..."
   - "Finalizando certificación..."
2. Los archivos se suben al endpoint `/api/wipe/upload-evidence`
3. Después de la carga exitosa, aparece una pantalla de éxito

#### 6. Verificar en la Galería de Evidencias
1. Navega a `/dashboard/borrado/evidencias`
2. Busca el activo por serial o etiqueta
3. Haz clic para ver las fotos subidas
4. Deberías ver:
   - Grid de miniaturas de fotos
   - Botones para navegar y ver fotos en detalle
   - Información del archivo (nombre, tamaño, fecha)

## Monitoreo de Errores

### Console del Navegador (F12)
Busca logs como:
```
✅ Foto 1 de 2 cargada correctamente
✅ Foto 2 de 2 cargada correctamente
✅ Certificación completada
```

### Network Tab
1. Abre DevTools → Network
2. Filtra por `upload-evidence`
3. Verifica:
   - Method: POST
   - Status: 200 (exitoso)
   - Response:
   ```json
   {
     "success": true,
     "error": null,
     "data": { "id": "...", "asset_id": "...", "file_url": "..." }
   }
   ```

### Errores Comunes

#### "Error al subir foto 1: error desconocido"
- Verifica que el endpoint `/api/wipe/upload-evidence` esté funcionando
- Revisa los logs del servidor para más detalles

#### "Faltan parámetros"
- El FormData debe incluir: `file`, `assetId`, `type`
- El cliente está enviando los parámetros correctamente

#### "Sube una imagen válida"
- Solo se aceptan tipos MIME que comienzan con `image/`
- Verifica la extensión del archivo (debe ser .jpg, .png, etc.)

#### "Cada foto no debe exceder 6 MB"
- Reduce el tamaño de las imágenes antes de subir
- Usa un compresor de imágenes si es necesario

#### "El PDF no debe exceder 10 MB"
- Reduce el tamaño del PDF
- Intenta comprimir el documento antes de subir

## Flujo Técnico Completo

```
Usuario selecciona fotos
    ↓
CertificationModal valida (máx 5 fotos)
    ↓
Usuario hace clic en "Certificar"
    ↓
Para cada foto:
  - Crear FormData con File
  - POST a /api/wipe/upload-evidence
  - Endpoint valida tipo y tamaño
  - Convierte File a Buffer
  - Sube a Supabase Storage (bucket: wipe-evidence)
  - Inserta metadatos en asset_wipe_evidence
  - Retorna URL pública del archivo
    ↓
Después de todas las fotos:
  - POST a certifyAsset action
  - Actualiza status del activo a "wiped"
  - Modal muestra pantalla de éxito
    ↓
Usuario ve fotos en /dashboard/borrado/evidencias
```

## Detalles Técnicos del Endpoint

**Ruta**: `/api/wipe/upload-evidence`
**Método**: POST
**Content-Type**: multipart/form-data (automático con FormData)

### Parámetros
```
- file: File (objeto File del navegador)
- assetId: string (UUID del activo)
- type: 'photo' | 'xml' | 'pdf'
```

### Validaciones
- File debe estar presente
- assetId debe ser un UUID válido
- type debe ser uno de los permitidos
- Para photos: type.startsWith('image/')
- Límites de tamaño:
  - photos: 6 MB
  - xml: 2 MB
  - pdf: 10 MB

### Response Exitoso (200)
```json
{
  "success": true,
  "error": null,
  "data": {
    "id": "uuid",
    "asset_id": "uuid",
    "type": "photo",
    "file_name": "foto1.jpg",
    "file_url": "https://...",
    "content_type": "image/jpeg",
    "file_size": 1234567,
    "uploaded_by": "user-uuid",
    "created_at": "2025-01-23T10:30:00Z"
  }
}
```

### Response Error (400/500)
```json
{
  "error": "Descripción del error específico",
  "success": false
}
```

## Checklist de Validación

- [ ] Modal se abre correctamente
- [ ] Pueden seleccionarse fotos (máx 5)
- [ ] Aviso cuando intentas subir más de 5
- [ ] Botón "Certificar" dispara carga
- [ ] Progreso se muestra en tiempo real
- [ ] Fotos se guardan en Supabase Storage
- [ ] Metadatos se insertan en base de datos
- [ ] URLs públicas funcionan
- [ ] Fotos aparecen en galería de evidencias
- [ ] Se puede navegar entre fotos
- [ ] Información del archivo se muestra correctamente

## Siguiente: Refinamientos Opcionales

1. **Barra de progreso visual**: Mostrar % completado de carga
2. **Retry automático**: Reintentar si falla una carga
3. **Compresión de fotos**: Comprimir en cliente antes de subir
4. **Validación mejorada**: Detectar imágenes borrosas o de mala calidad
5. **Integración con auditoría**: Registrar cargas en audit_logs
