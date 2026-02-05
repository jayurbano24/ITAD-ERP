# 🔧 Solución: "Bucket not found" en Uploads de Evidencia

## 🚨 Error
```
Error al subir foto 1: Error al subir archivo: Bucket not found
```

## 🎯 Causa
El bucket "wipe-evidence" no existe en Supabase Storage.

---

## ✅ Solución Rápida (3 pasos)

### Opción 1: Setup Automático (Recomendado)

```bash
# Asegúrate de que las variables de entorno están configuradas:
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY

# Ejecuta el script de setup
node scripts/setup-wipe-evidence-bucket.js
```

**¿Qué hace?**
- ✅ Crea el bucket "wipe-evidence" automáticamente
- ✅ Configura límites de tamaño (50MB)
- ✅ Verifica que todo esté bien
- ✅ Muestra pasos siguientes

---

### Opción 2: Setup Manual en Supabase Dashboard

Si el script no funciona, hazlo manualmente:

#### Paso 1: Abre Supabase Dashboard
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Click en **Storage** (en el menú izquierdo)

#### Paso 2: Crea el Bucket
1. Click en botón **+ New bucket**
2. **Nombre**: `wipe-evidence` (exactamente así)
3. **Public bucket**: ✅ Activa (sí, debe ser público)
4. Click en **Create bucket**

#### Paso 3: Configura RLS Policies
1. En el bucket "wipe-evidence", click en **Policies** (pestaña superior)
2. Click en **+ New Policy**

**Política 1: Lectura Pública**
```
Title: Public Read
Allow: SELECT
Role: Public/Anon
Target: Objects
Expression: (true)
```

**Política 2: Escritura Autenticada**
```
Title: Authenticated Upload
Allow: INSERT
Role: authenticated
Target: Objects
Expression: (true)
```

**Política 3: Lectura Autenticada**
```
Title: Authenticated Read
Allow: SELECT
Role: authenticated
Target: Objects
Expression: (true)
```

#### Paso 4: Verifica
1. El bucket "wipe-evidence" debe aparecer en la lista
2. Debe marcar como "Public"
3. Las 3 políticas deben estar activas (verde ✓)

---

## 🧪 Prueba Rápida

Después de crear el bucket:

```bash
# 1. Inicia el servidor
npm run dev

# 2. Abre
http://localhost:3000/dashboard/borrado

# 3. Haz click en "Certificar"

# 4. Sube una foto

# 5. Deberías ver: "Subiendo foto 1 de 1..."
# 6. Después de ~3 segundos: "Certificación Exitosa ✅"
```

---

## ✔️ Verificación de Que Funciona

### En Supabase Dashboard
1. Storage > wipe-evidence > Objects
2. Deberías ver carpetas: `{assetId}/photo/...`
3. Los archivos deberían estar ahí

### En DevTools del Navegador
1. F12 > Network
2. Filtra por "upload-evidence"
3. Deberías ver:
   ```
   POST /api/wipe/upload-evidence
   Status: 200 OK
   ```

### En la Aplicación
1. Después de subir: "Certificación Exitosa ✅"
2. Ve a `/dashboard/borrado/evidencias`
3. Click en el activo
4. Deberías ver las fotos que subiste

---

## 🐛 Si Aún Hay Error

### Error: "Bucket not found"
- ✓ Verifica que el nombre es exactamente: `wipe-evidence` (sin mayúsculas, sin espacios)
- ✓ Verifica que está marcado como "Public"
- ✓ Reinicia el servidor: `npm run dev`

### Error: "Access Denied"
- ✓ Verifica que hay una Policy de INSERT para "authenticated"
- ✓ Verifica que el usuario está autenticado
- ✓ Recarga la página: F5

### Error: "File too large"
- ✓ La foto es >6MB
- ✓ Usa una foto de <6MB
- ✓ Comprime la imagen antes de subir

### Error: "Invalid MIME type"
- ✓ La foto no es JPG, PNG o WEBP
- ✓ Usa un formato de imagen válido

---

## 📋 Checklist

- [ ] Bucket "wipe-evidence" creado en Supabase
- [ ] Bucket marcado como "Public"
- [ ] 3 RLS Policies configuradas (Read/Insert/Select)
- [ ] Reinicié el servidor (`npm run dev`)
- [ ] Probé subir una foto
- [ ] Vi "Certificación Exitosa ✅"
- [ ] La foto aparece en `/dashboard/borrado/evidencias`

---

## 🔗 Enlaces Útiles

- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- Storage Management: https://app.supabase.com/project/_/storage

---

## 💾 Variables de Entorno

Asegúrate de que tienes estas en tu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

Para obtenerlas:
1. Supabase Dashboard > Settings > API
2. Copia los valores
3. Pégalos en `.env.local`

---

## 🎓 ¿Por Qué Pasa Esto?

- Supabase Storage requiere que los buckets existan antes de subir archivos
- El bucket "wipe-evidence" no se crea automáticamente
- Necesita configuración de RLS para seguridad

---

## ✨ Después de Configurar

El sistema completo funciona así:

```
Usuario sube foto
    ↓
CertificationModal crea FormData
    ↓
fetch POST a /api/wipe/upload-evidence
    ↓
Endpoint valida la foto
    ↓
Sube a Supabase Storage (bucket: wipe-evidence)
    ↓
Guarda metadatos en asset_wipe_evidence tabla
    ↓
Retorna URL pública
    ↓
Usuario ve "Certificación Exitosa ✅"
    ↓
Fotos aparecen en /dashboard/borrado/evidencias
```

---

## 🆘 ¿Aún Necesitas Ayuda?

1. Verifica que Supabase está bien configurado
2. Verifica que tienes acceso al proyecto en Supabase
3. Verifica que las variables de entorno son correctas
4. Prueba con una foto pequeña (< 1MB)
5. Revisa los logs del servidor (npm run dev)

**Comando de debug en servidor:**
```bash
# Los logs mostrarán exactamente qué error retorna Supabase
npm run dev
# Observa la consola cuando intentes subir
```

---

**Última actualización**: 2025-01-23
**Versión**: 1.0
