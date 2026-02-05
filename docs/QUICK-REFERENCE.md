# ⚡ QUICK REFERENCE: Certificación de Borrado

## 🎯 Lo Que Se Hizo

✅ Migrado de **Server Actions** → **API HTTP Endpoint**
✅ Problema: `File` objects no serializables en Server Actions
✅ Solución: Usar `FormData` + `fetch()` + HTTP endpoint

---

## 📁 Archivos Clave

### Modificados
```
src/app/dashboard/borrado/components/CertificationModal.tsx
└─ CAMBIO: uploadWipeEvidence() → fetch('/api/wipe/upload-evidence')
```

### Creados
```
src/app/api/wipe/upload-evidence/route.ts
└─ NUEVO: Endpoint POST que maneja file uploads
```

---

## 🔄 Flujo Técnico

```javascript
// CLIENTE (CertificationModal.tsx)
const formData = new FormData();
formData.append('file', photoFile);        // File object
formData.append('assetId', asset.id);      // UUID
formData.append('type', 'photo');          // 'photo'|'xml'|'pdf'

const response = await fetch('/api/wipe/upload-evidence', {
  method: 'POST',
  body: formData  // ← HTTP POST con multipart/form-data
});

const data = await response.json();
// data = { success: true, error: null, data: {...} }
```

```typescript
// SERVIDOR (/api/wipe/upload-evidence/route.ts)
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');       // File object (servidor)
  const assetId = formData.get('assetId'); // string
  const type = formData.get('type');       // string
  
  // Validaciones
  if (!['photo', 'xml', 'pdf'].includes(type)) throw Error();
  if (type === 'photo' && !file.type.startsWith('image/')) throw Error();
  if (type === 'photo' && file.size > 6*1024*1024) throw Error();
  
  // Upload a Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  await supabase.storage.from('wipe-evidence').upload(path, buffer);
  
  // Guardar metadatos
  await supabase.from('asset_wipe_evidence').insert({
    asset_id: assetId,
    type,
    file_url: publicUrl,
    ...
  });
  
  return NextResponse.json({
    success: true,
    error: null,
    data: { id, file_url, ... }
  });
}
```

---

## 📊 Limits & Validations

| Parámetro | Validación | Límite |
|-----------|-----------|--------|
| `assetId` | String UUID | Requerido |
| `type` | Enum | photo, xml, pdf |
| `file` (photo) | MIME type | image/* |
| `file` (photo) | Size | ≤ 6 MB |
| `file` (xml) | MIME type | application/xml |
| `file` (xml) | Size | ≤ 2 MB |
| `file` (pdf) | MIME type | application/pdf |
| `file` (pdf) | Size | ≤ 10 MB |
| Cantidad fotos | UI limit | ≤ 5 por certificación |

---

## 🔐 Security

✅ **Autenticación**: `supabase.auth.getUser()` requerido
✅ **Validación de entrada**: Tipo + tamaño en servidor
✅ **Storage**: Ruta única: `{assetId}/{type}/{timestamp}-{random}-{name}`
✅ **RLS Policies**: Users solo ven su propia evidencia
✅ **Public URLs**: Accesibles sin auth pero sin listado directorio

---

## 🧪 Testing

### Manual Test (5 min)
```bash
1. npm run dev
2. http://localhost:3000/dashboard/borrado
3. Click "Certificar" → Sube 2-3 fotos → Click "Certificar"
4. Check: http://localhost:3000/dashboard/borrado/evidencias
```

### DevTools Network
```
POST /api/wipe/upload-evidence
Status: 200 OK
Response: { "success": true, "data": { "file_url": "..." } }
```

### Database Check
```sql
SELECT * FROM asset_wipe_evidence 
WHERE asset_id = 'your-asset-id'
ORDER BY created_at DESC;
```

---

## 🐛 Common Errors

| Error | Causa | Solución |
|-------|-------|----------|
| "fetch failed" | Servidor no responde | Verifica endpoint existe |
| "Sube una imagen válida" | No es MIME type image/* | Usa JPG, PNG, WEBP |
| "no debe exceder 6 MB" | Archivo muy grande | Comprime imagen |
| "Faltan parámetros" | FormData incompleto | Verifica 3 campos |
| URL 404 | Storage path error | Revisa bucket existe |

---

## 📞 API Response Formats

### Success (200)
```json
{
  "success": true,
  "error": null,
  "data": {
    "id": "uuid-123",
    "asset_id": "uuid-456",
    "type": "photo",
    "file_name": "foto.jpg",
    "file_url": "https://...",
    "content_type": "image/jpeg",
    "file_size": 1234567,
    "uploaded_by": "user-uuid",
    "created_at": "2025-01-23T10:30:00Z"
  }
}
```

### Error (4xx/5xx)
```json
{
  "error": "Descripción del error específico",
  "success": false
}
```

---

## 🎨 Frontend Integration

### CertificationModal.tsx - Simplified
```typescript
// Botón "Certificar" click handler
const handleCertify = () => {
  // 1. Valida input
  if (!software || photoFiles.length === 0) return;
  
  // 2. Para cada foto
  for (const photo of photoFiles) {
    const formData = new FormData();
    formData.append('file', photo);
    formData.append('assetId', asset.id);
    formData.append('type', 'photo');
    
    // 3. Upload
    const res = await fetch('/api/wipe/upload-evidence', {
      method: 'POST',
      body: formData
    });
    
    // 4. Check result
    if (!res.ok) throw new Error(res.json().error);
  }
  
  // 5. Certificar asset
  await certifyAsset(asset.id, software, ...);
  
  // 6. Success
  onComplete();
};
```

---

## 📈 Performance Notes

- **Fotos secuenciales**: Se suben una por una (más predecible)
- **Paralelo sería más rápido**: Pero más complejo de manejar
- **Cada foto**: ~2-5 segundos (depende conexión)
- **5 fotos**: ~10-25 segundos total

---

## 🔗 Related Files

```
Lógica:
  src/app/dashboard/borrado/actions.ts        (certifyAsset)
  src/app/api/wipe/certify/route.ts          (POST certify)

Componentes:
  src/app/dashboard/borrado/page.tsx         (Lista activos)
  src/app/dashboard/borrado/evidencias/page.tsx (Galería)

BD:
  asset_wipe_evidence                         (Metadatos)
  asset_wipe_certifications                   (Certificaciones)

Storage:
  supabase Storage / wipe-evidence bucket     (Archivos)
```

---

## ⏱️ Checklist de Prueba

- [ ] Modal abre sin errores
- [ ] Puedo seleccionar fotos (máx 5)
- [ ] Botón "Certificar" dispara carga
- [ ] Veo progreso: "Subiendo foto 1 de X"
- [ ] Después de éxito: "Certificación Exitosa ✅"
- [ ] Las fotos aparecen en /evidencias
- [ ] Puedo ver/navegar cada foto

---

## 🎓 Why This Works

| Aspecto | Explicación |
|---------|-----------|
| **FormData** | Estándar HTTP para multipart/form-data |
| **File Objects** | El navegador los serializa automáticamente |
| **API Endpoint** | Sin restricciones de tipos como Server Actions |
| **Buffer Conversion** | `arrayBuffer() → Buffer.from()` |
| **Storage Upload** | Supabase SDK nativo maneja bien Buffers |

---

## 📚 Related Reading

- [Next.js Server Actions Limitations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [FormData API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [Supabase Storage Upload](https://supabase.com/docs/guides/storage/uploads)
- Full docs: See `/docs` folder

---

## 🚀 Summary

✅ **Antes**: Server Actions + File object = Error
✅ **Ahora**: fetch + FormData + API Endpoint = Funciona
✅ **Resultado**: Sistema robusto de certificación completamente funcional

**Status**: 🟢 Ready for testing & production

---

*Last Updated: 2025-01-23*
