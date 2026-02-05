# 🔧 BEFORE YOU START: Setup Checklist

Antes de poder probar la certificación de borrado, necesitas completar estos pasos:

---

## ✅ Checklist Pre-Requisitos

- [ ] Proyecto clonado localmente
- [ ] Variables de entorno configuradas (`.env.local`)
- [ ] Base de datos Supabase conectada
- [ ] **Bucket "wipe-evidence" creado en Supabase Storage** ⬅️ REQUERIDO
- [ ] RLS Policies configuradas
- [ ] Servidor ejecutándose (`npm run dev`)

---

## 🪣 Paso Crítico: Configurar Storage Bucket

Si ves este error:
```
Error al subir foto 1: Error al subir archivo: Bucket not found
```

**Solución rápida (2 minutos)**:

### Automático
```bash
node scripts/setup-wipe-evidence-bucket.js
```

### Manual
1. Abre https://app.supabase.com
2. Storage > New bucket > Nombre: `wipe-evidence`
3. Marca como "Public" ✅
4. Agrega 2 RLS policies para "authenticated" (INSERT + SELECT)
5. Reinicia servidor

**Ver**: [BUCKET-NOT-FOUND-FIX.md](BUCKET-NOT-FOUND-FIX.md) para más detalles

---

## 🚀 Después de Setup: Primero Pasos

```bash
# 1. Inicia servidor
npm run dev

# 2. Abre navegador
http://localhost:3000/dashboard/borrado

# 3. Haz click en "Certificar" en un activo

# 4. Sube 2-3 fotos (máx 5, máx 6MB c/u)

# 5. Click en "Certificar"

# 6. Espera "Certificación Exitosa ✅"

# 7. Ve a /dashboard/borrado/evidencias
#    Deberías ver tus fotos en una galería
```

---

## 📚 Documentación

Después de que todo funcione, lee:

1. **[README-CERTIFICATION.md](README-CERTIFICATION.md)** - Resumen (5 min)
2. **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - Referencia técnica (10 min)
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Sistema completo (20 min)

---

## 🐛 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Bucket not found" | Ver BUCKET-NOT-FOUND-FIX.md |
| "Access Denied" | Verifica RLS policies |
| "File too large" | Usa foto <6MB |
| "Invalid MIME type" | Usa JPG/PNG |
| Foto no aparece en galería | Verifica asset_id en DB |

---

## 📞 Necesitas Ayuda?

1. Lee [SETUP-STORAGE-BUCKET.md](SETUP-STORAGE-BUCKET.md)
2. Ejecuta script: `node scripts/setup-wipe-evidence-bucket.js`
3. Sigue pasos manuales si el script falla

---

**¡Listo para empezar!** 🚀
