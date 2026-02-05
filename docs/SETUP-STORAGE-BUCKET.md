# 🪣 Configuración del Bucket de Supabase Storage

## Problema Actual
```
Error al subir foto 1: Error al subir archivo: Bucket not found
```

## Solución

El bucket "wipe-evidence" debe existir en Supabase Storage. Sigue estos pasos:

---

## ⚡ Setup Automático (Recomendado)

### Paso 1: Configura Variables de Entorno

En `.env.local`, asegúrate de tener:

```env
# Estas dos son públicas (necesarias para cliente)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Esta es privada (solo para servidor)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

¿Dónde obtenerlas?
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Settings > API
4. Copia los keys

### Paso 2: Ejecuta el Script de Setup

```bash
node scripts/setup-wipe-evidence-bucket.js
```

**¿Qué hace?**
- Crea automáticamente el bucket "wipe-evidence"
- Configura los límites de tamaño
- Verifica que todo esté bien
- Te muestra qué hacer después

---

## 🖱️ Setup Manual (Si el Script No Funciona)

### Paso 1: Abre Supabase Dashboard

1. Ve a https://app.supabase.com
2. Haz login con tu cuenta
3. Selecciona tu proyecto
4. Click en **Storage** en el menú izquierdo

### Paso 2: Crea el Bucket

1. Click en botón **+ New bucket** (arriba a la derecha)
2. Rellena:
   - **Bucket name**: `wipe-evidence` (exactamente así, minúsculas)
   - **Public bucket**: ✅ Activa (checkbox)
3. Click en **Create bucket**

### Paso 3: Configura las RLS Policies

Las políticas controlan quién puede leer/escribir en el bucket.

1. Click en el bucket "wipe-evidence"
2. Click en la pestaña **Policies**
3. Click en **+ Create policy**

**Crear 3 Políticas:**

#### Política 1: Lectura Pública
```
Name: Public Read
Action: SELECT
Target Roles: Public/Anon (si está disponible)
Expression: (true)
```

#### Política 2: Escritura para Autenticados
```
Name: Authenticated Upload
Action: INSERT
Target Roles: authenticated
Expression: (true)
```

#### Política 3: Lectura para Autenticados
```
Name: Authenticated Read
Action: SELECT
Target Roles: authenticated
Expression: (true)
```

### Paso 4: Verifica la Configuración

En Supabase Dashboard > Storage:
- [ ] "wipe-evidence" aparece en la lista
- [ ] Tiene un icono 🌐 (indica que es público)
- [ ] Las 3 policies están activas (verde ✓)

---

## 🧪 Prueba que Funciona

Después de crear el bucket:

```bash
# 1. Reinicia el servidor
npm run dev

# 2. Abre la aplicación
http://localhost:3000/dashboard/borrado

# 3. Haz click en "Certificar" en un activo

# 4. Selecciona una foto (JPG o PNG, <6MB)

# 5. Click en "Certificar"

# 6. Espera...
#    Deberías ver: "Subiendo foto 1 de 1..."
#    Después: "Certificación Exitosa ✅"

# 7. Ve a http://localhost:3000/dashboard/borrado/evidencias
#    La foto debería aparecer en la galería
```

---

## ✔️ Cómo Verificar que Está Funcionando

### En DevTools del Navegador (F12)

1. **Console**: No debe haber errores (rojo ❌)
2. **Network**: 
   - Filtra por "upload-evidence"
   - Deberías ver: `POST /api/wipe/upload-evidence` con Status `200`
3. **Logs**: Deberías ver algo como:
   ```
   ✅ Foto 1 de 1 cargada correctamente
   ✅ Certificación completada
   ```

### En Supabase Dashboard

1. Storage > wipe-evidence > Objects
2. Deberías ver carpetas como:
   ```
   {assetId}/
     photo/
       1706007000000-abc123-photo.jpg
   ```

### En la Base de Datos

Debería haber un registro en `asset_wipe_evidence`:

```sql
SELECT * FROM asset_wipe_evidence 
WHERE asset_id = 'your-asset-id'
ORDER BY created_at DESC;
```

Resultado esperado:
```
id          | asset_id | type  | file_url            | created_at
------------|----------|-------|---------------------|------------
uuid-123   | asset-1  | photo | https://...jpg      | 2025-01-23...
```

---

## 🐛 Troubleshooting

### "Bucket not found" aún después de crear

**Causa**: El nombre no es exacto o hay caracteres extras
**Solución**:
- Verifica que el nombre es exactamente: `wipe-evidence` (sin espacios, sin mayúsculas)
- Si no es, crea uno nuevo con el nombre exacto

### "Access Denied" o "Unauthorized"

**Causa**: Las RLS policies no permiten al usuario subir archivos
**Solución**:
1. Verifica que hay una policy de `INSERT` para "authenticated"
2. Asegúrate de que estás logueado (esquina superior derecha debe mostrar tu usuario)
3. Reinicia la página: F5

### "File too large"

**Causa**: La foto pesa más de 6MB
**Solución**:
- Usa una foto más pequeña (<6MB)
- Comprime la imagen antes de subir
- Usa un tool online como TinyPNG.com

### "Invalid MIME type"

**Causa**: La foto no es un formato de imagen válido
**Solución**:
- Usa JPG, PNG o WEBP
- Convierte la imagen si es necesario

### El bucket existe pero aún no funciona

**Debug**:
1. Abre DevTools (F12) > Console
2. Busca errores (texto rojo)
3. Los errores te mostrarán exactamente qué falta

---

## 📋 Checklist Completo

- [ ] Tengo acceso a Supabase Dashboard
- [ ] Seleccioné el proyecto correcto
- [ ] Creé el bucket "wipe-evidence" (nombre exacto)
- [ ] El bucket está marcado como "Public" (🌐)
- [ ] Creé las 3 RLS policies
- [ ] Las policies están todas activas (verde ✓)
- [ ] Reinicié el servidor (npm run dev)
- [ ] Probé subir una foto pequeña
- [ ] Vi "Certificación Exitosa ✅"
- [ ] La foto aparece en la galería de evidencias

---

## 🚀 Después de Esto

Una vez que el bucket funciona:

✅ Pueden subir fotos (máx 5 por certificación)
✅ Pueden subir reportes PDF y XML (opcionales)
✅ Todo se guarda en Supabase Storage
✅ Los metadatos se guardan en la BD
✅ Las fotos aparecen en la galería de evidencias
✅ El sistema es auditado automáticamente

---

## 🆘 ¿Aún Necesitas Ayuda?

Si aún no funciona después de seguir estos pasos:

1. **Verifica que Supabase está activo**:
   - Abre https://status.supabase.com
   - Verifica que no hay incidentes

2. **Verifica tus credenciales**:
   - `.env.local` tiene los valores correctos
   - Los valores son de tu proyecto (no de otro)

3. **Prueba manualmente en Supabase**:
   - Storage > wipe-evidence > Upload
   - Sube una foto directamente
   - Si funciona aquí, el problema es en la aplicación

4. **Revisa los logs**:
   - En terminal donde corre `npm run dev`
   - Busca mensajes de error cuando intentas subir

5. **Contacta soporte**:
   - Supabase tiene chat de ayuda en el dashboard
   - O abre un issue si es problema de código

---

**Última actualización**: 2025-01-23
**Versión**: 1.0
**Status**: 🟢 Guía completa
