# Arquitectura: Sistema de Certificación de Borrado de Datos

## 🏗️ Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVEGADOR (Cliente)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Página: /dashboard/borrado                          │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Componente: CertificationModal              │   │  │
│  │  │                                               │   │  │
│  │  │  • Software selector (Blancco, KillDisk...)  │   │  │
│  │  │  • ID Reporte Externo (input)                │   │  │
│  │  │  • Resultado (Exitoso, Falló, Parcial)      │   │  │
│  │  │  • Foto upload (máx 5 fotos)                │   │  │
│  │  │  • Documentos (PDF, XML opcional)            │   │  │
│  │  │  • Botón Certificar                          │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  │  • Valida entrada (máx 5 fotos)                     │  │
│  │  • Crea FormData con cada archivo                   │  │
│  │  • Llama fetch a endpoint API                       │  │
│  │  • Muestra progreso en tiempo real                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Página: /dashboard/borrado/evidencias             │  │
│  │                                                       │  │
│  │  • Lista de activos con evidencia                   │  │
│  │  • Visor de fotos (carousel, lightbox)              │  │
│  │  • Información de archivo                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP POST /api/wipe/upload-evidence
                    (FormData: file, assetId, type)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVIDOR (Next.js Backend)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Endpoint: POST /api/wipe/upload-evidence            │  │
│  │                                                       │  │
│  │  1. Recibe FormData (file, assetId, type)           │  │
│  │  2. Valida:                                          │  │
│  │     • assetId, type presentes                        │  │
│  │     • type en ['photo', 'xml', 'pdf']               │  │
│  │     • Foto: type.startsWith('image/')                │  │
│  │     • Tamaño: ≤6MB foto, ≤2MB xml, ≤10MB pdf      │  │
│  │  3. Sube a Storage:                                  │  │
│  │     • Path: {assetId}/{type}/{ts}-{random}-{name}  │  │
│  │     • Bucket: 'wipe-evidence'                        │  │
│  │  4. Genera URL pública                               │  │
│  │  5. Inserta metadatos en BD:                         │  │
│  │     • Tabla: asset_wipe_evidence                    │  │
│  │     • Campos: file_name, file_url, file_size, etc.  │  │
│  │  6. Retorna JSON:                                    │  │
│  │     • {success: true, data: {...}, error: null}    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Endpoint: POST /api/wipe/certify                    │  │
│  │  (Server Action alternativo)                        │  │
│  │                                                       │  │
│  │  • Actualiza asset status → "wiped"                 │  │
│  │  • Registra detalles de certificación               │  │
│  │  • Inserta en asset_wipe_certifications             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────┬──────────────────────────────────┬──────────┘
               │                                  │
               ▼                                  ▼
    ┌──────────────────────┐        ┌───────────────────────┐
    │  Supabase Storage    │        │  PostgreSQL Database  │
    │  (Bucket: wipe-     │        │  (Supabase)           │
    │   evidence)          │        │                       │
    │                      │        │  Tablas:             │
    │  /{assetId}/        │        │  • asset_wipe_       │
    │    photo/           │        │    evidence          │
    │    pdf/             │        │  • asset_wipe_       │
    │    xml/             │        │    certifications    │
    │                      │        │  • assets (status)   │
    └──────────────────────┘        └───────────────────────┘
```

## 📊 Flujo de Datos: Certificación Completa

```
INICIO DE SESIÓN
    ↓
Usuario autenticado en Supabase
    ↓
NAVEGACIÓN
    ↓
/dashboard/borrado
    ├─ GET lista de activos (estado: pending_wipe)
    └─ Renderiza botones "Certificar" por activo
    ↓
CLICK EN "CERTIFICAR"
    ├─ Modal abre
    └─ Usuario completa formulario:
        ├─ Software de borrado
        ├─ ID Reporte Externo
        ├─ Resultado (Exitoso/Falló/Parcial)
        ├─ Selecciona 2-5 fotos (máx)
        └─ (Opcional) PDF y/o XML
    ↓
CLICK EN "CERTIFICAR" (BOTÓN)
    ├─ Validación cliente:
    │   └─ Al menos 1 foto y software seleccionado
    ├─ Confirmación si no hay documentos
    └─ Para cada archivo (fotos primero, reportes después):
        │
        ├─ Crear FormData
        │   ├─ append('file', File object)
        │   ├─ append('assetId', UUID)
        │   └─ append('type', 'photo'|'pdf'|'xml')
        │
        ├─ fetch('/api/wipe/upload-evidence', POST)
        │
        ├─ SERVIDOR RECIBE:
        │   ├─ await formData = request.formData()
        │   ├─ file = formData.get('file')  // File object
        │   ├─ Valida tipo: ['photo','xml','pdf']
        │   ├─ Valida MIME: image/* para fotos
        │   ├─ Valida tamaño: 6MB/2MB/10MB
        │   ├─ Convierte: arrayBuffer → Buffer
        │   ├─ Upload: supabase.storage.from().upload()
        │   ├─ Path: {assetId}/{type}/{ts}-{random}-{name}
        │   ├─ PublicUrl: supabase.storage.getPublicUrl()
        │   ├─ INSERT: asset_wipe_evidence tabla
        │   └─ Return: {success: true, data: {...}}
        │
        └─ CLIENTE RECIBE RESPUESTA
            ├─ success: true
            ├─ data: {id, file_url, file_name, ...}
            └─ Muestra progreso: "Foto 1 de 3..."
    ↓
DESPUÉS DE TODAS LAS FOTOS:
    ├─ Call: certifyAsset() Server Action
    ├─ Servidor:
    │   ├─ UPDATE assets SET status='wiped'
    │   ├─ INSERT asset_wipe_certifications
    │   └─ INSERT audit_logs (si aplica)
    └─ Cliente muestra "Certificación Exitosa ✅"
    ↓
NAVEGACIÓN A EVIDENCIAS:
    ├─ /dashboard/borrado/evidencias
    ├─ GET lista de activos con status='wiped'
    ├─ Click en activo:
    │   ├─ GET /api/wipe/evidence/{assetId}
    │   ├─ Servidor retorna: [{id, type, file_url, ...}, ...]
    │   └─ Cliente renderiza EvidenceViewer
    ├─ EvidenceViewer:
    │   ├─ Grid de miniaturas (fotos)
    │   ├─ Click en foto: abre lightbox
    │   ├─ Navegación: Previous/Next
    │   ├─ Info del archivo: nombre, tamaño, fecha
    │   └─ Lista de documentos con enlaces descarga
    └─ FIN
```

## 🗄️ Modelo de Datos

### Tabla: `asset_wipe_evidence`
```sql
CREATE TABLE asset_wipe_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  type TEXT NOT NULL CHECK (type IN ('photo', 'xml', 'pdf')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  content_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  
  -- RLS Policy: Users can insert/read their own evidence
);

-- Index para búsquedas rápidas
CREATE INDEX idx_asset_wipe_evidence_asset_id ON asset_wipe_evidence(asset_id);
CREATE INDEX idx_asset_wipe_evidence_type ON asset_wipe_evidence(type);
```

### Tabla: `asset_wipe_certifications` (Certificaciones)
```sql
CREATE TABLE asset_wipe_certifications (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id),
  software TEXT NOT NULL,
  external_report_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('successful', 'failed', 'partial')),
  notes TEXT,
  certified_at TIMESTAMP,
  certified_by UUID REFERENCES auth.users(id)
);
```

## 🔐 Seguridad (RLS Policies)

### asset_wipe_evidence
```sql
-- INSERT: Usuarios autenticados pueden subir evidencia
CREATE POLICY "Users can insert wipe evidence"
  ON asset_wipe_evidence FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- SELECT: Usuarios pueden ver su propia evidencia
CREATE POLICY "Users can read wipe evidence"
  ON asset_wipe_evidence FOR SELECT
  USING (auth.role() = 'authenticated');

-- Storage bucket "wipe-evidence": Público (para URLs públicas)
-- Pero los metadatos requieren autenticación
```

## 🔄 Estado de Transiciones

```
[Estado Normal]
            │
            ├─ pending_wipe
            │       │
            │       ├─ Usuario hace click "Certificar"
            │       │   └─ Modal abre
            │       │
            │       ├─ Usuario sube fotos
            │       │   └─ POST /api/wipe/upload-evidence
            │       │       └─ Evidence guardada en BD
            │       │
            │       ├─ Usuario hace click "Certificar"
            │       │   └─ POST /api/wipe/certify
            │       │
            │       ▼
            │     wiped ✓ [FINAL]
            │       │
            │       └─ Fotos visibles en /dashboard/borrado/evidencias
```

## 📁 Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   └── wipe/
│   │       ├── upload-evidence/
│   │       │   └── route.ts          ← Endpoint: POST file upload
│   │       ├── certify/
│   │       │   └── route.ts          ← Endpoint: POST certify
│   │       └── evidence/
│   │           └── route.ts          ← Endpoint: GET evidence list
│   │
│   └── dashboard/
│       └── borrado/
│           ├── page.tsx              ← Lista de activos
│           ├── actions.ts            ← Server Actions (certifyAsset, etc.)
│           ├── components/
│           │   ├── CertificationModal.tsx  ← Modal con formulario
│           │   ├── EvidenceViewer.tsx      ← Visor de fotos
│           │   └── ...
│           └── evidencias/
│               └── page.tsx          ← Galería de evidencias
│
├── lib/
│   └── supabase/
│       └── server.ts                 ← Cliente Supabase
│
└── middleware.ts

supabase/
├── migrations/
│   ├── 20260215_add_wipe_evidence_table.sql
│   └── ...
│
└── ...

docs/
├── COMPLETION-SUMMARY.md             ← Este archivo
├── certification-test-guide.md        ← Guía de pruebas
├── migration-server-actions-to-api.md ← Explicación de cambios
└── ...
```

## 🚀 Flujo de Desarrollo

### 1️⃣ Usuario abre modal
```typescript
// CertificationModal.tsx - Componente React
<button onClick={() => setMode('certify')}>Certificar</button>
// Se abre modal con formulario
```

### 2️⃣ Usuario sube fotos
```typescript
// CertificationModal.tsx - onChange handler
const handlePhotoChange = (e) => {
  let files = Array.from(e.target.files);
  if (files.length > 5) {
    files = files.slice(0, 5);
    // Warning: "Solo se permiten máximo 5 fotos"
  }
  setPhotoFiles(files);
}
```

### 3️⃣ Usuario hace click "Certificar"
```typescript
// CertificationModal.tsx - handleCertify
startTransition(async () => {
  for (const photo of photoFiles) {
    const formData = new FormData();
    formData.append('file', photo);
    formData.append('assetId', asset.id);
    formData.append('type', 'photo');
    
    const response = await fetch('/api/wipe/upload-evidence', {
      method: 'POST',
      body: formData  // ← FormData serializable por HTTP
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
  }
  
  // Después: certificar el activo
  await certifyAsset(...);
});
```

### 4️⃣ Servidor procesa upload
```typescript
// src/app/api/wipe/upload-evidence/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file'); // File object
  
  // Validar
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: '...' }, { status: 400 });
  }
  
  // Convertir a Buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Subir a Storage
  const { error } = await supabase.storage
    .from('wipe-evidence')
    .upload(`${assetId}/photo/${path}`, buffer);
  
  // Guardar metadatos
  const { data } = await supabase
    .from('asset_wipe_evidence')
    .insert({ asset_id, type: 'photo', file_url, ... })
    .select()
    .single();
  
  return NextResponse.json({ success: true, data });
}
```

### 5️⃣ Usuario ve evidencia
```typescript
// CertificationModal.tsx - Lightbox
<ImageModal 
  src={photoUrl} 
  onClose={() => setSelectedPhoto(null)}
/>

// O en evidencias/page.tsx - Galería
<EvidenceViewer 
  evidence={[{ file_url: '...', ... }, ...]}
  onClose={...}
/>
```

## 🧪 Casos de Prueba

| Caso | Entrada | Esperado |
|------|---------|----------|
| Upload 1 foto | JPG 3MB | ✅ Guardado |
| Upload 5 fotos | 5x PNG 1MB c/u | ✅ Todas guardadas |
| Upload 6 fotos | 6x JPG 1MB c/u | ⚠️ Solo primeras 5 |
| Upload foto >6MB | JPG 8MB | ❌ Error: "no debe exceder 6MB" |
| Upload PDF 5MB | PDF válido | ✅ Guardado |
| Upload XML 3MB | XML válido | ✅ Guardado |
| Upload archivo corrupto | BIN file | ❌ Error: "imagen válida" |
| Sin certificar (sin fotos) | Botón sin fotos | ❌ Error: "al menos 1 foto" |
| Ver en evidencias | Click en activo | ✅ Abre galería |

## 📈 Métricas de Rendimiento

| Operación | Tiempo Esperado | Notas |
|-----------|-----------------|-------|
| Upload 1 foto (3MB) | 2-5 segundos | Depende de conexión |
| Upload 5 fotos (15MB total) | 10-30 segundos | Secuencial |
| Certificación final | <1 segundo | Server Action |
| Cargar galería de evidencias | 1-2 segundos | Query a BD |
| Mostrar lightbox | Inmediato | URL pública |

## 🔍 Debugging

### Chrome DevTools → Console
```javascript
// Ver logs de progreso
console.log('Subiendo foto 1 de 3...');
console.log('Response:', {success: true, data: {...}});

// Ver errores
console.error('Error al subir:', error.message);
```

### Chrome DevTools → Network
```
POST /api/wipe/upload-evidence
├─ Headers
│   └─ Content-Type: multipart/form-data; boundary=...
├─ Payload
│   ├─ file: (binary)
│   ├─ assetId: "uuid"
│   └─ type: "photo"
└─ Response: 200 OK
    └─ {success: true, data: {...}}
```

### Supabase Dashboard
- Storage → wipe-evidence bucket → ver archivos subidos
- Tables → asset_wipe_evidence → ver metadatos guardados
- Logs → ver query logs (si hay errores)

---

**Versión**: 1.0
**Fecha Actualización**: 2025-01-23
**Autor**: Sistema de Certificación de Borrado v2
