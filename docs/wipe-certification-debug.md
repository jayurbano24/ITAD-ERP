# Guía de Depuración - Certificación de Borrado

## Cuando presionas "Certificar Borrado" y no pasa nada

### Paso 1: Verifica la consola del navegador
1. Abre F12 en tu navegador
2. Ve a la pestaña "Console"
3. Intenta certificar nuevamente
4. Busca cualquier mensaje de error rojo

### Paso 2: Verifica que la foto se subió
1. Abre las herramientas de desarrollo (F12)
2. Ve a la pestaña "Network"
3. Presiona "Certificar Borrado"
4. Busca requests a `uploadWipeEvidence` o `storage`
5. Verifica que devuelven estado 200

### Paso 3: Test endpoint directo
Abre una nueva pestaña y ejecuta:

```
POST http://localhost:3000/api/wipe/test-certify
Content-Type: application/json

{
  "assetId": "TU_ASSET_ID_AQUI",
  "software": "blancco",
  "externalReportId": "BLC-2025-0001234"
}
```

Este endpoint debería retornar:
```json
{
  "success": true,
  "message": "Certificación exitosa",
  "asset": { ... }
}
```

Si devuelve error, verifica:
- ¿El asset existe?
- ¿El estado es "received" o "wiping"?
- ¿Hay datos corruptos en la base de datos?

### Paso 4: Verifica RLS en Supabase
En el dashboard de Supabase:
1. Ve a Database → asset_wipe_evidence
2. Verifica que hay políticas RLS correctas
3. La tabla debe permitir INSERT para authenticated users

### Paso 5: Revisa los logs en consola
```bash
# En VS Code, abre un terminal y ejecuta:
npm run dev

# Busca líneas que digan:
# - "Procesando..."
# - "Subiendo fotos de evidencia..."
# - "Finalizando certificación..."
```

## Mensajes de error comunes

| Error | Solución |
|-------|----------|
| "El activo no puede ser certificado" | El estado del asset no es "received" o "wiping". Inicia el borrado primero |
| "No se pudo subir la foto" | Verifica que el bucket `wipe-evidence` existe en Supabase Storage |
| "El ID del reporte externo es obligatorio" | Llena el campo "ID de Reporte / Licencia Externo" |
| "Adjunta al menos una foto" | Selecciona y carga al menos una foto |

## Debug rápido

Si todo parece estar bien pero aún así no funciona:

1. **Limpia el navegador:**
   - Borra la cache (Ctrl+Shift+Delete)
   - Recarga la página (Ctrl+F5)

2. **Compila el proyecto:**
   - Detén el servidor (Ctrl+C)
   - Ejecuta: `npm run build`
   - Inicia nuevamente: `npm run dev`

3. **Revisa la base de datos:**
   - Ve a Supabase → assets
   - Busca tu activo
   - ¿El estado es "wiped" después de certificar?
   - ¿El wipe_completed_at tiene fecha?

## Logs esperados cuando funciona

```
Subiendo foto 1 de 1...
Subiendo documentos de reporte...
Finalizando certificación...
✓ ¡Borrado Certificado!
```
