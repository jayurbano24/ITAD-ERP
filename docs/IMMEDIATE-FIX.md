# 🎯 SOLUCIÓN: Error "Bucket not found"

## Problema
```
Error al subir foto 1: Error al subir archivo: Bucket not found
```

## Razón
El bucket "wipe-evidence" en Supabase Storage no existe.

---

## ✅ Solución Inmediata

Elige una opción:

### OPCIÓN 1️⃣: Script Automático (Mejor)

```bash
node scripts/setup-wipe-evidence-bucket.js
```

✅ Lo hace todo automáticamente
✅ Crea el bucket
✅ Configura límites
✅ Verifica que funciona

### OPCIÓN 2️⃣: Manual (Si script falla)

**En 4 clicks**:

1. https://app.supabase.com → Selecciona proyecto → **Storage**
2. **+ New bucket** → Nombre: `wipe-evidence` → Check "Public" → **Create**
3. Click en bucket → **Policies** → **+ Create policy**
   - INSERT para "authenticated"
   - SELECT para "authenticated"
4. **Reinicia servidor**: Ctrl+C, luego `npm run dev`

---

## 🧪 Prueba Inmediata

```bash
# Si ejecutaste script o configuraste manualmente:
npm run dev

# Abre en navegador:
http://localhost:3000/dashboard/borrado

# Haz esto:
1. Click "Certificar" en un activo
2. Selecciona 1 foto pequeña (<6MB)
3. Click "Certificar" botón
4. Espera 3-5 segundos

# Resultado esperado:
✅ "Certificación Exitosa"

# Para verificar:
5. Ve a /dashboard/borrado/evidencias
6. Click en el activo
7. La foto debe aparecer en galería
```

---

## 🎯 Checklist

- [ ] Ejecuté `node scripts/setup-wipe-evidence-bucket.js` O configuré manualmente
- [ ] El bucket "wipe-evidence" existe en Supabase Dashboard
- [ ] El bucket está marcado como "Public" (🌐)
- [ ] Hay 2 RLS policies (INSERT y SELECT para authenticated)
- [ ] Reinicié servidor (`npm run dev`)
- [ ] Probé subir foto y vi "Certificación Exitosa"
- [ ] Foto aparece en /dashboard/borrado/evidencias

---

## 📚 Documentación Completa

Para entender mejor:
- [SETUP-STORAGE-BUCKET.md](SETUP-STORAGE-BUCKET.md) - Guía detallada
- [BUCKET-NOT-FOUND-FIX.md](BUCKET-NOT-FOUND-FIX.md) - Troubleshooting
- [SETUP-BEFORE-START.md](SETUP-BEFORE-START.md) - Checklist completo

---

## 🚀 Listo!

Una vez que esto funcione, puedes:
- ✅ Subir múltiples fotos (máx 5)
- ✅ Subir documentos PDF/XML (opcionales)
- ✅ Ver todas las fotos en galería
- ✅ Tener auditoría completa de certifications

---

**¡Es lo único que falta! Hazlo ahora.** ⏱️
