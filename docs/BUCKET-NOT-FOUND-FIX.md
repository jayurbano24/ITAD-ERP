# 🚀 SOLUCIÓN RÁPIDA: "Bucket not found"

## El Problema
```
Error al subir foto 1: Error al subir archivo: Bucket not found
```

## La Solución (2 minutos)

### Opción A: Script Automático (Recomendado)

```bash
node scripts/setup-wipe-evidence-bucket.js
```

Listo. El script crea todo automáticamente.

---

### Opción B: Manual en Supabase Dashboard (3 minutos)

1. **Abre**: https://app.supabase.com
2. **Selecciona**: Tu proyecto
3. **Menú**: Storage
4. **Botón**: "+ New bucket"
5. **Nombre**: `wipe-evidence` (exactamente así)
6. **Checkbox**: "Public bucket" ✅
7. **Click**: Create
8. **Click**: En el bucket nuevo > Policies
9. **Agrega 2 policies**:
   ```
   Policy 1:
     Name: Authenticated Upload
     Action: INSERT
     Role: authenticated
     Expression: (true)
   
   Policy 2:
     Name: Authenticated Read
     Action: SELECT
     Role: authenticated
     Expression: (true)
   ```

---

## ✅ Prueba

```bash
npm run dev
# Abre http://localhost:3000/dashboard/borrado
# Click en "Certificar" > Sube foto > Click "Certificar"
# Deberías ver: "Certificación Exitosa ✅"
```

---

## 📞 Si Aún No Funciona

- ✓ Verifica que el nombre es exactamente: `wipe-evidence`
- ✓ Verifica que está marcado como "Public" (🌐)
- ✓ Reinicia: `npm run dev`

---

**Documentación completa**: Ver [SETUP-STORAGE-BUCKET.md](SETUP-STORAGE-BUCKET.md)
