# CAMBIOS: Migración de Server Actions a API Endpoint

## Problema Resuelto
**Error**: "Only plain objects, and a few built-ins, can be passed to Server Actions"
- Los objetos `File` del navegador no pueden ser serializados por Server Actions
- Next.js limita Server Actions a objetos planos (plain objects)
- La solución estándar es usar endpoints API (HTTP) para manejo de archivos

## Archivos Modificados

### 1. `src/app/dashboard/borrado/components/CertificationModal.tsx`

#### Cambios:
- **Removido**: Import de `uploadWipeEvidence` desde `../actions`
- **Removido**: 2 llamadas a `uploadWipeEvidence()` (una para fotos, otra para reportes)
- **Agregado**: Lógica de `fetch()` con FormData al endpoint `/api/wipe/upload-evidence`

#### Antes:
```typescript
import { uploadWipeEvidence } from '../actions'

// En handleCertify:
const { success, error: uploadError } = await uploadWipeEvidence({
  assetId: asset.id,
  type: 'photo',
  file: photo  // ← File object - causa error en Server Actions
})
```

#### Después:
```typescript
// En handleCertify:
const formData = new FormData()
formData.append('file', photo)
formData.append('assetId', asset.id)
formData.append('type', 'photo')

const response = await fetch('/api/wipe/upload-evidence', {
  method: 'POST',
  body: formData  // ← FormData puede ser enviado como HTTP
})

const responseData = await response.json()
if (!response.ok || !responseData.success) {
  throw new Error(`Error: ${responseData.error}`)
}
```

## Archivo Creado

### `src/app/api/wipe/upload-evidence/route.ts` (129 líneas)

Una nueva ruta API POST que maneja uploads de archivos.

#### Funcionalidad:
1. **Recibe**: FormData con file, assetId, type
2. **Valida**:
   - Parámetros presentes
   - Tipo de evidencia permitido (photo, xml, pdf)
   - Tipo MIME correcto
   - Tamaño dentro de límites
3. **Procesa**:
   - Convierte File a Buffer
   - Sube a Supabase Storage bucket "wipe-evidence"
   - Genera ruta: `{assetId}/{type}/{timestamp}-{random}-{filename}`
4. **Almacena**:
   - Metadatos en tabla `asset_wipe_evidence`
   - Incluye: file_name, file_url, file_size, content_type, uploaded_by
5. **Retorna**: JSON con { success, error, data }

#### Límites de Tamaño:
- Fotos (image/*): 6 MB
- XML: 2 MB
- PDF: 10 MB

## Flujo de Ejecución Actualizado

**Antes** (causaba error):
```
CertificationModal.handleCertify()
  → uploadWipeEvidence(Server Action) ← Error: File no serializable
```

**Después** (funcional):
```
CertificationModal.handleCertify()
  → FormData.append(file, assetId, type)
    → fetch('/api/wipe/upload-evidence', POST)
      → Endpoint recibe FormData
      → Valida y sube a Storage
      → Retorna JSON { success, data, error }
    → Siguiente archivo o certifyAsset()
```

## Por Qué Funciona Ahora

1. **FormData es serializable por HTTP**: Un objeto FormData es el estándar HTTP para multipart/form-data
2. **File objects en FormData**: El navegador maneja automáticamente la conversión de File objects en FormData
3. **Servidor recibe como multipart**: Next.js lo procesa como `formData.get('file')` devolviendo un File object del servidor
4. **Sin limitaciones de Server Actions**: La API route no tiene restricciones de tipos, maneja File objects nativamente

## Compatibilidad

- ✅ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ Next.js 13+ (rutas API estándar)
- ✅ Supabase Storage (soporta upload vía SDK)
- ✅ RLS Policies: Tabla asset_wipe_evidence permite insert/select para usuarios autenticados

## Testing Rápido

1. Abre `/dashboard/borrado`
2. Haz clic en "Certificar" en cualquier activo
3. Selecciona 2-3 fotos
4. Haz clic en "Certificar"
5. Deberías ver progreso: "Subiendo foto 1 de 3..."
6. Después de éxito, ve a `/dashboard/borrado/evidencias` y verifica las fotos

## Logs de Debug

En la consola del navegador (DevTools → Console):
```
✅ Foto 1 de 3 cargada correctamente
✅ Foto 2 de 3 cargada correctamente
✅ Foto 3 de 3 cargada correctamente
✅ Certificación completada
```

En Network tab (DevTools → Network):
```
POST /api/wipe/upload-evidence
Status: 200 OK
Response:
{
  "success": true,
  "data": {
    "id": "...",
    "file_url": "https://..."
  }
}
```

## Cambios Futuros (Opcionales)

1. **Compresión de imágenes**: Usar `canvas` API para comprimir fotos en el cliente
2. **Progreso detallado**: Mostrar % completado por archivo
3. **Retry automático**: Reintentar carga fallida hasta 3 veces
4. **Validación de calidad**: Detectar imágenes borrosas con OpenCV.js
5. **Auditoría**: Registrar uploads en `audit_logs` table

## Referencias
- Next.js Server Actions limitaciones: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- FormData API: https://developer.mozilla.org/en-US/docs/Web/API/FormData
- Supabase Storage Upload: https://supabase.com/docs/guides/storage/uploads
