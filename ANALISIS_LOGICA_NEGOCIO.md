# ANÁLISIS DE LÓGICA DE NEGOCIO - ITAD ERP GUATEMALA

**Fecha:** 4 de Febrero, 2026  
**Versión:** 1.0  
**Alcance:** Análisis completo de arquitectura, flujos de datos y validaciones

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Análisis de Módulos Principales](#análisis-de-módulos-principales)
4. [Flujos de Datos](#flujos-de-datos)
5. [Validaciones y Restricciones](#validaciones-y-restricciones)
6. [Seguridad y Permisos](#seguridad-y-permisos)
7. [Base de Datos](#base-de-datos)
8. [Hallazgos y Recomendaciones](#hallazgos-y-recomendaciones)

---

## 📊 RESUMEN EJECUTIVO

### Stack Tecnológico
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js API Routes, Server Actions
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth + Service Role Key
- **Styling:** Tailwind CSS
- **Auditoría:** Sistema de logs automático con triggers PostgreSQL

### Módulos Principales
1. **Recepción (REC)** - Clasificación de equipos recibidos
2. **Configuración** - Gestión de usuarios y catálogos maestros
3. **Auditoría** - Logging automático de cambios
4. **Logística** - Gestión de bodegas y movimientos
5. **Taller** - Gestión de reparaciones y diagnósticos

### Características Clave
- ✅ Sistema de catálogos maestros dinámicos
- ✅ Row-Level Security (RLS) en PostgreSQL
- ✅ Auditoría automática de cambios
- ✅ Relaciones brand-model con filtrado
- ✅ Hardware catalogs (RAM, Procesadores, Almacenamiento)

---

## 🏗️ ARQUITECTURA GENERAL

### Flujo de Datos Típico

```
Cliente (Next.js)
    ↓
Server Actions / API Routes
    ↓
Supabase Client (RLS)
    ↓
PostgreSQL (Con Triggers de Auditoría)
    ↓
Audit Logs (Automático)
```

### Jerarquía de Carpetas Relevantes

```
src/
├── app/
│   ├── api/
│   │   └── maestros/route.ts          ← API de catálogos dinámicos
│   ├── dashboard/
│   │   ├── configuracion/usuarios/
│   │   │   ├── actions.ts             ← Server actions CRUD
│   │   │   └── components/
│   │   │       └── CatalogsTab.tsx    ← UI de catálogos
│   │   ├── borrado/evidencias/        ← Evidencias de borrado
│   │   └── auditoria/page.tsx         ← Logs de auditoría
│   └── recepcion/
│       ├── page.tsx                   ← Página principal
│       └── components/
│           └── RecepcionModule.tsx    ← Módulo de recepción
├── components/
│   └── ui/
│       ├── PageHeader.tsx             ← Encabezado reutilizable
│       └── CatalogsTab.tsx            ← Gestión de catálogos
└── lib/
    ├── services/
    │   └── audit-service.ts           ← Servicio de auditoría
    └── supabase/
        └── server.ts                  ← Cliente Supabase
```

---

## 🎯 ANÁLISIS DE MÓDULOS PRINCIPALES

### 1. MÓDULO DE RECEPCIÓN (RecepcionModule.tsx)

#### Responsabilidades
- Clasificación de equipos por ticket
- Captura de especificaciones técnicas
- Registro de accesorios
- Generación de etiquetas de cajas
- Sincronización con catálogos maestros

#### Flujo Principal

```
1. Usuario ingresa Ticket ID
   ↓
2. Sistema carga boxes/items del ticket
   ↓
3. Usuario selecciona unit para recibir
   ↓
4. Carga dinámicamente catálogos:
   - Marcas (brands)
   - Modelos (models) [FILTRADOS POR MARCA]
   - Procesadores (procesador)
   - RAM: Capacity + Type
   - Almacenamiento: Capacity + Type
   - Teclados (teclado)
   ↓
5. Usuario completa formulario de recepción
   ↓
6. Valida campos obligatorios:
   - clasificacionRec (REC classification)
   - marca (brand_id mandatory)
   - modelo (model_id)
   - serie (serial)
   ↓
7. Persiste detalles a ticket_items.reception_metadata
   ↓
8. Genera etiqueta de caja
```

#### Estados del Formulario

```typescript
type ReceptionForm = {
  clasificacionRec: string          // Clasificación REC
  clasificacionF: string            // Clasificación F
  clasificacionC: string            // Clasificación C
  marca: string                     // Nombre marca
  marcaId: string                   // UUID marca
  modelo: string                    // Nombre modelo
  modeloId: string                  // UUID modelo
  serie: string                     // Serial/SN
  tipo: string                      // Tipo producto
  tipoId: string                    // UUID tipo
  tamanoPantalla: string            // Screen size
  procesador: string                // Procesador
  color: string                     // Color
  ramCapacity: string               // RAM GB
  ramType: string                   // DDR3/4/5
  diskCapacity: string              // Capacidad disco
  diskType: string                  // HDD/SSD/NVMe
  teclado: string                   // Teclado
  versionTeclado: string            // Versión teclado
  biosVersion: string               // BIOS version
  accessories: SelectedAccessory[]  // Accesorios
  observaciones: string             // Notas
}
```

#### Catálogos Cargados Dinámicamente

**API Endpoint:** `GET /api/maestros?tipo={tipo}`

| Tipo | Tabla | Campo Extraído | Notas |
|------|-------|-----------------|-------|
| `marca` | catalog_brands | name | ID devuelto también |
| `modelo` | catalog_models | name | Devuelve brand_id, product_type_id |
| `procesador` | catalog_processors | name | Solo nombre |
| `ram_capacity` | catalog_memory | ram_capacity | Valores únicos |
| `ram_type` | catalog_memory | ram_type | DDR3, DDR4, DDR5, LPDDR... |
| `disk_capacity` | catalog_storage | storage_capacity | 256GB, 512GB, 1TB... |
| `disk_type` | catalog_storage | storage_type | HDD, SSD, NVMe, eMMC |
| `teclado` | catalog_keyboards | name | Solo nombre |

#### Validación de Marca-Modelo

```typescript
// En RecepcionModule.tsx línea ~400
const handleMarcaChange = (marcaId: string) => {
  // 1. Busca marca en lista de marcas
  const selectedMarca = brands.find(b => b.id === marcaId)
  
  // 2. FILTRA MODELOS POR MARCA
  const filtered = models.filter(m => m.brand_id === marcaId)
  setModels(filtered)
  
  // 3. Limpia modelo anterior si existía
  setReceptionForm(prev => ({ ...prev, modeloId: '', modelo: '' }))
}
```

**✅ CORRECTO:** La relación es obligatoria y filtra correctamente.

---

### 2. MÓDULO DE CONFIGURACIÓN (Usuarios y Catálogos)

#### Admin Verification Flow

```typescript
async verifyAdminAccess() {
  1. Obtiene usuario actual de auth
  2. Valida que role = 'super_admin' en table profiles
  3. Retorna { authorized: true/false, userId, error }
}
```

**Todos los CRUD de catálogos requieren:**
- ✅ Usuario autenticado
- ✅ role = 'super_admin'
- ✅ Admin Client (SERVICE_ROLE_KEY) configurado

#### CRUD de Catálogos

**Función Universal:** `manageCatalog(action, table, data)`

```typescript
type CatalogTable = 
  | 'catalog_brands'
  | 'catalog_models'
  | 'catalog_product_types'
  | 'catalog_colors'
  | 'catalog_diagnostics'
  | 'catalog_repairs'
  | 'catalog_service_types'
  | 'catalog_processors'
  | 'catalog_memory'
  | 'catalog_keyboards'
  | 'catalog_storage'
```

**Acciones Soportadas:**
- `CREATE` - INSERT
- `READ` - SELECT
- `UPDATE` - UPDATE (nombre, is_active)
- `DELETE` - DELETE

**Ejemplo: Crear Marca**

```typescript
export async function createBrand(name: string) {
  const access = await verifyAdminAccess()      // Validar admin
  if (!access.authorized) return error
  
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('catalog_brands')
    .insert({ name, is_active: true })
  
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/dashboard/configuracion/usuarios')  // ISR
  return { success: true }
}
```

**⚠️ NOTA IMPORTANTE:** Se usa `revalidatePath()` para invalidar caché ISR después de modificar catálogos.

---

### 3. SISTEMA DE AUDITORÍA

#### Estructura de Logs

```typescript
type AuditLog = {
  id: UUID
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'COMMENT'
  module: 'TICKETS' | 'LOGISTICS' | 'WORKSHOP' | 'DIAGNOSTIC' | 'CONFIGURATION'
  description: string
  user_id: UUID
  user_name: string | null
  user_email: string | null
  user_role: string | null
  entity_type: 'TICKET' | 'BATCH' | 'ASSET' | 'WORK_ORDER'
  entity_id: UUID
  entity_reference: string | null
  ticket_id?: UUID
  batch_id?: UUID
  asset_id?: UUID
  work_order_id?: UUID
  data_before?: JSONB
  data_after?: JSONB
  changes_summary?: JSONB
  created_at: TIMESTAMPTZ
}
```

#### Triggers de Auditoría Automática

PostgreSQL tiene triggers en:
- `assets` - Auto-log cambios de estado/warehouse
- `inventory_movements` - Auto-log movimientos
- `work_orders` - Auto-log cambios de reparación
- `ticket_items` - Auto-log cambios de clasificación

**Ejemplo Trigger:**

```sql
-- Cuando asset.current_warehouse_id cambia
CREATE TRIGGER audit_asset_warehouse_change
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION log_asset_warehouse_change()

-- Función registra cambio automáticamente
FUNCTION log_asset_warehouse_change() {
  INSERT INTO audit_logs (action, module, description, ...)
  VALUES ('STATUS_CHANGE', 'LOGISTICS', ...)
}
```

#### AuditService (Client-Side)

```typescript
static async registrar(datos: {
  action: string
  module: string
  description: string
  entityType: string
  entityId: string
  entityReference?: string
  dataBefore?: any
  dataAfter?: any
  changesSummary?: any
}) {
  // Inserta en audit_logs table
  // Captura user_id, user_name, user_email, user_role
}

static async registrarCambios(objetoAnterior, objetoNuevo, config) {
  // Compara objetos
  // Genera changesSummary automáticamente
  // Registra cambios detectados
}
```

**Uso:**

```typescript
// Antes de actualizar un catálogo
const antes = { name: "Old Name", is_active: true }
const despues = { name: "New Name", is_active: true }

await AuditService.registrarCambios(antes, despues, {
  module: 'CONFIGURATION',
  entityType: 'BRAND',
  entityId: brandId
})
```

---

### 4. GESTIÓN DE USUARIOS

#### Crear Usuario

```
Input: { email, password, fullName, role }
  ↓
1. verifyAdminAccess() → Solo super_admin
  ↓
2. Admin Client crea en auth.users (email_confirm=true)
  ↓
3. Inserta en profiles table:
   - id (del auth user)
   - full_name
   - role (super_admin|admin|tech|logistic)
   - is_active: true
   - allowed_modules: []
   - module_permissions: {}
  ↓
Output: { success: true, userId } o { success: false, error }
```

**Validaciones:**
- ✅ Solo super_admin puede crear usuarios
- ✅ Email único (constraint en auth.users)
- ✅ Password >= 6 caracteres (Supabase default)
- ✅ Si falla crear profile, elimina auth user (transacción manual)

#### Roles y Permisos

```typescript
type Role = 'super_admin' | 'admin' | 'tech' | 'logistic'

// Permisos por módulo
type ModulePermissions = {
  recepcion?: ['read' | 'create' | 'update']
  logistica?: ['read' | 'create' | 'update']
  taller?: ['read' | 'create' | 'update']
  configuracion?: ['read' | 'create' | 'update']
  auditoria?: ['read']
}

// Ejemplo: Tech solo puede leer recepción
user.module_permissions = {
  recepcion: ['read'],
  taller: ['read', 'create', 'update']
}
```

#### Resettear Password

```typescript
export async function resetUserPassword(userId: string, newPassword: string) {
  // Valida admin access
  // Usa Admin Client para updateUserById()
  // Solo super_admin puede hacerlo
}
```

**⚠️ Consideración:** Sin email de reset, el usuario no puede cambiar password por sí solo.

---

## 🔄 FLUJOS DE DATOS

### Flujo 1: Agregar un Equipo a Recepción

```
1. Usuario abre Recepción → Carga ticket TK-2026-00008
   GET /api/maestros?tipo=marca → [{ id, name }, ...]
   
2. Carga todos los catálogos:
   GET /api/maestros?tipo=marca
   GET /api/maestros?tipo=modelo
   GET /api/maestros?tipo=procesador
   GET /api/maestros?tipo=ram_capacity
   GET /api/maestros?tipo=ram_type
   GET /api/maestros?tipo=disk_capacity
   GET /api/maestros?tipo=disk_type
   GET /api/maestros?tipo=teclado
   
3. Usuario selecciona marca → FILTRA MODELOS POR BRAND_ID
   
4. Completa forma:
   {
     clasificacionRec: "A",
     marca: "Dell",
     marcaId: "uuid-123",
     modelo: "Latitude 5430",
     modeloId: "uuid-456",
     serie: "ABC123XYZ",
     procesador: "Intel i7",
     ramCapacity: "16 GB",
     ramType: "DDR4",
     diskCapacity: "512 GB",
     diskType: "SSD",
     teclado: "US English"
   }
   
5. Click "Guardar Recepción" →
   POST /api/reception-save
   {
     ticketId: "uuid-ticket",
     boxId: "uuid-box",
     itemId: "uuid-item",
     metadata: { ...receptionForm }
   }
   
6. Backend:
   - Valida ticketId, boxId, itemId
   - Inserta en ticket_items.reception_metadata (JSONB)
   - Actualiza ticket_items.status = 'received'
   - TRIGGER AUTOMÁTICO registra en audit_logs
   
7. Retorna:
   {
     success: true,
     label: { boxId, boxNumber, ticket, totalUnits, ... }
   }
```

### Flujo 2: Crear Nueva Marca en Configuración

```
1. Admin abre Configuración → Catálogos → Marcas
   
2. Ingresa "Samsung" y click "Crear"
   
3. POST server action createBrand("Samsung"):
   - verifyAdminAccess() → ¿Es super_admin?
   - INSERT INTO catalog_brands (name, is_active)
   - Si error → Return { success: false, error: "..." }
   - Si OK → revalidatePath() + Return { success: true }
   
4. Frontend:
   - Muestra toast "Marca creada"
   - Recarga lista de marcas
   - Limpia input
   
5. Próximo visit a Recepción:
   - GET /api/maestros?tipo=marca
   - Incluye "Samsung" en lista
```

### Flujo 3: Filtro de Modelos por Marca

```
ANTES:
catalog_models TABLE:
| id     | name           | brand_id  |
|--------|----------------|-----------|
| uuid-1 | Latitude 5430  | NULL      | ❌ SIN MARCA
| uuid-2 | Optiplex 7090  | dell-id   |
| uuid-3 | MacBook Pro    | apple-id  |
| uuid-4 | ThinkPad X1    | lenovo-id |

Recepción Form:
1. Usuario selecciona marcaId = "dell-id"
2. Frontend: const filtered = models.filter(m => m.brand_id === "dell-id")
3. Dropdown solo muestra: ["Optiplex 7090"]
4. Usuario selecciona Optiplex 7090 → modeloId = "uuid-2"

PERSISTENCIA:
ticket_items.reception_metadata = {
  "marca": "Dell",
  "marcaId": "dell-id",
  "modelo": "Optiplex 7090",
  "modeloId": "uuid-2"
}
```

### Flujo 4: Auditoría de Cambio

```
1. Admin actualiza marca "Dell" → "DELL Corporation"

2. Frontend:
   const antes = { name: "Dell", is_active: true }
   const despues = { name: "DELL Corporation", is_active: true }
   await AuditService.registrarCambios(antes, despues, {
     module: 'CONFIGURATION',
     entityType: 'BRAND',
     entityId: 'dell-id'
   })

3. AuditService.registrarCambios() calcula diff:
   changes = {
     name: { old: "Dell", new: "DELL Corporation" }
   }

4. Inserta en audit_logs:
   {
     action: 'UPDATE',
     module: 'CONFIGURATION',
     description: 'Actualización de BRAND',
     entity_type: 'BRAND',
     entity_id: 'dell-id',
     user_id: 'current-user-id',
     user_name: 'Admin Name',
     user_email: 'admin@example.com',
     user_role: 'super_admin',
     changes_summary: { name: { old: "Dell", new: "DELL Corporation" } },
     data_before: { name: "Dell", is_active: true },
     data_after: { name: "DELL Corporation", is_active: true }
   }

5. Página Auditoría:
   Muestra: "Admin Name cambió BRAND 'Dell' el 4/2/2026 10:30"
   Detalles: "name: Dell → DELL Corporation"
```

---

## ✅ VALIDACIONES Y RESTRICCIONES

### 1. Validaciones a Nivel Frontend (RecepcionModule.tsx)

```typescript
// Campo requerido de marca
<FormLabel required>Marca</FormLabel>

// Marca debe estar seleccionada antes de elegir modelo
disabled={!receptionForm.marcaId}

// Series debe contener algo
<input required name="serie" ... />

// Observaciones limitado a 500 caracteres
<textarea maxLength={500} ... />
```

### 2. Validaciones a Nivel Base de Datos

```sql
-- Uniqueness Constraints
ALTER TABLE catalog_brands 
ADD CONSTRAINT catalog_brands_name_unique UNIQUE (name);

ALTER TABLE catalog_models 
ADD CONSTRAINT catalog_models_brand_model_unique 
UNIQUE (brand_id, name);  -- Modelo único por marca

-- Foreign Keys
ALTER TABLE catalog_models 
ADD CONSTRAINT fk_models_brand 
FOREIGN KEY (brand_id) REFERENCES catalog_brands(id) ON DELETE SET NULL;

-- NOT NULL
ALTER TABLE ticket_items 
ALTER COLUMN ticket_id SET NOT NULL;  -- Todo item debe tener ticket

-- Enum Constraints
ALTER TABLE audit_logs 
ADD CONSTRAINT check_audit_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'COMMENT'));
```

### 3. Validaciones de API (/api/maestros/route.ts)

```typescript
GET /api/maestros?tipo={tipo}

✅ Validaciones:
1. if (!tipo) return 400 Bad Request
2. if (tipo not in catalogMap) return 400 Unsupported Catalog
3. Try/catch en queries → Fallback a default values si falla BD

❌ Falla silenciosa (problemas potenciales):
- Si catalog_memory está vacía → USA VALORES POR DEFECTO
- Si catalog_storage está vacía → USA VALORES POR DEFECTO
```

### 4. Restricciones de Seguridad RLS (Row-Level Security)

```sql
-- En catalog_brands
CREATE POLICY "Allow read access for authenticated users" 
ON public.catalog_brands 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow full access for super_admin"
ON public.catalog_brands
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Resultado: Solo super_admin puede INSERT/UPDATE/DELETE catálogos
```

---

## 🔐 SEGURIDAD Y PERMISOS

### 1. Autenticación

```
┌─────────────────┐
│  Supabase Auth  │
│  (Magic Link)   │
└────────┬────────┘
         │
    ✅ Email/Password Login
         │
         ↓
┌─────────────────┐
│ JWT Token       │ 
│ (Almacenado en  │
│  localStorage)  │
└────────┬────────┘
         │
    ✅ Enviado en Authorization: Bearer {token}
         │
         ↓
┌─────────────────┐
│ Supabase Client │  ← Valida JWT en cada request
│ (RLS)           │
└────────┬────────┘
         │
    ✅ o ❌ Permite acceso según RLS policies
         │
         ↓
┌─────────────────┐
│ PostgreSQL      │
│ (Ejecuta RLS)   │
└─────────────────┘
```

### 2. Roles y RBAC

```typescript
// Roles definidos
enum Role {
  SUPER_ADMIN = 'super_admin',  // Todo acceso
  ADMIN = 'admin',              // Gestión de usuarios, catálogos
  TECH = 'tech',                // Taller, diagnóstico
  LOGISTIC = 'logistic'         // Logística, bodegas
}

// Permisos granulares por módulo
type ModulePermissions = {
  [module: string]: ('read' | 'create' | 'update' | 'delete')[]
}

// Verificación en cada acción sensible
async verifyAdminAccess() {
  const user = await auth.getUser()
  const profile = await db.profiles.findOne(user.id)
  if (profile.role !== 'super_admin') throw Unauthorized
}
```

### 3. Service Role Key Usage

```typescript
// En server actions (actions.ts)
function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Crea cliente con permisos de admin (bypass RLS)
  return new AdminClient(serviceRoleKey)
}

// Uso para operaciones administrativas
const adminClient = getAdminClient()
await adminClient.auth.admin.createUser(...)  // Crear usuario
await adminClient.from('profiles').insert(...) // Crear profile
```

**⚠️ ADVERTENCIA:** Service Role Key está en .env.local (NO en .env.local.example). Nunca exponerla al cliente.

### 4. Validaciones de Admin en Server Actions

```typescript
export async function createBrand(name: string) {
  // 1. Verifica que sea super_admin
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: 'Unauthorized' }
  }
  
  // 2. Valida input
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Name required' }
  }
  
  // 3. Ejecuta insert
  const { error } = await supabase
    .from('catalog_brands')
    .insert({ name: name.trim(), is_active: true })
  
  if (error) {
    // Maneja constraint violations
    if (error.code === '23505') { // Unique constraint
      return { success: false, error: 'Brand already exists' }
    }
    return { success: false, error: error.message }
  }
  
  // 4. Invalida caché
  revalidatePath('/dashboard/configuracion/usuarios')
  
  return { success: true }
}
```

---

## 💾 BASE DE DATOS

### Diagrama de Relaciones

```
┌──────────────────────────────────────────────────────────────┐
│                    CATÁLOGOS MAESTROS                         │
├──────────────────┬──────────────────┬──────────────────────────┤
│  catalog_brands  │ catalog_models   │ catalog_product_types    │
├──────────────────┼──────────────────┼──────────────────────────┤
│ id (PK)          │ id (PK)          │ id (PK)                  │
│ name (UNIQUE)    │ name             │ name (UNIQUE)            │
│ is_active        │ brand_id (FK) ←──┘ description              │
│ created_at       │ is_active        │ is_active                │
│                  │ created_at       │ created_at               │
└──────────────────┴──────────────────┴──────────────────────────┘
         ↑                                      ↑
         │                                      │
         │ REFERENCIAS EN:                      │
         │ - ticket_items.brand_id             │ - ticket_items.product_type_id
         │ - reception_metadata.marcaId        │ - reception_metadata.tipo

┌────────────────────────────────────────────────────────────────┐
│                    CATÁLOGOS HARDWARE                           │
├──────────────────┬──────────────────┬──────────────────────────┤
│ catalog_memory   │ catalog_storage  │ catalog_processors       │
├──────────────────┼──────────────────┼──────────────────────────┤
│ id (PK)          │ id (PK)          │ id (PK)                  │
│ name             │ name             │ name                     │
│ ram_capacity     │ storage_capacity │ is_active                │
│ ram_type         │ storage_type     │ created_at               │
│ is_active        │ is_active        │                          │
│ created_at       │ created_at       │                          │
└──────────────────┴──────────────────┴──────────────────────────┘
         ↑                  ↑                      ↑
         │                  │                      │
         │ REFERENCIAS EN JSONB:                   │
         └──────────────────┴──────────────────────┘
           ticket_items.reception_metadata:
           {
             "ramCapacity": "16 GB",
             "ramType": "DDR4",
             "diskCapacity": "512 GB",
             "diskType": "SSD",
             "procesador": "Intel i7"
           }

┌──────────────────────────────────────────────────────────────┐
│                     OPERACIONES                                │
├──────────────────────────────────────────────────────────────┤
│ operations_tickets                                             │
│  - id (PK, UUID)                                              │
│  - readable_id (UNIQUE, TEXT) ← TK-2026-00008                │
│  - title                                                       │
│  - status (ENUM)                                              │
│  - created_at                                                 │
├──────────────────────────────────────────────────────────────┤
│ ticket_items                                                   │
│  - id (PK, UUID)                                              │
│  - ticket_id (FK) → operations_tickets.id                    │
│  - status (ENUM)                                              │
│  - reception_metadata (JSONB) ← Form data completo           │
│  - created_at                                                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     AUDITORÍA                                  │
├──────────────────────────────────────────────────────────────┤
│ audit_logs                                                     │
│  - id (PK, UUID)                                              │
│  - action (ENUM: CREATE, UPDATE, DELETE)                    │
│  - module (ENUM: TICKETS, LOGISTICS, WORKSHOP)              │
│  - entity_type (ENUM: TICKET, BATCH, ASSET, WORK_ORDER)    │
│  - entity_id (UUID)                                           │
│  - user_id (FK) → profiles.id                               │
│  - changes_summary (JSONB)                                    │
│  - data_before (JSONB)                                        │
│  - data_after (JSONB)                                         │
│  - created_at (AUTO)                                          │
└──────────────────────────────────────────────────────────────┘
```

### Tablas Críticas

#### 1. catalog_brands
```sql
CREATE TABLE catalog_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10 marcas por defecto:
-- HP, Dell, Lenovo, Apple, Samsung, Asus, Acer, Microsoft, LG, Toshiba
```

#### 2. catalog_models
```sql
CREATE TABLE catalog_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand_id UUID REFERENCES catalog_brands(id) ON DELETE SET NULL,
    product_type_id UUID REFERENCES catalog_product_types(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMPORTANTE: brand_id debe estar poblado (obligatorio en forma)
-- CONSTRAINT: El modelo debe corresponder a la marca seleccionada
```

#### 3. catalog_memory
```sql
CREATE TABLE catalog_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ram_capacity TEXT,        -- '4 GB', '8 GB', '16 GB', '32 GB', '64 GB'
    ram_type TEXT,           -- 'DDR3', 'DDR4', 'DDR5', 'LPDDR3', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ejemplo de datos:
-- | Kingston HyperX | 16 GB | DDR4 |
-- | Corsair Vengeance | 32 GB | DDR5 |
```

#### 4. catalog_storage
```sql
CREATE TABLE catalog_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    storage_capacity TEXT,    -- '256 GB', '512 GB', '1 TB', '2 TB'
    storage_type TEXT,        -- 'HDD', 'SSD', 'NVMe', 'eMMC'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ejemplo:
-- | Samsung 970 EVO | 512 GB | NVMe |
-- | WD Blue HDD | 1 TB | HDD |
```

#### 5. ticket_items
```sql
CREATE TABLE ticket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES operations_tickets(id),
    status TEXT DEFAULT 'pending',
    reception_metadata JSONB,  -- Almacena TODA la forma de recepción
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- reception_metadata estructura:
{
  "clasificacionRec": "A",
  "clasificacionF": "F1",
  "clasificacionC": "C1",
  "marca": "Dell",
  "marcaId": "uuid-brand-123",
  "modelo": "Optiplex 7090",
  "modeloId": "uuid-model-456",
  "serie": "ABC123XYZ",
  "tipo": "Desktop",
  "tipoId": "uuid-type-789",
  "tamanoPantalla": "24\"",
  "procesador": "Intel i7-11700",
  "color": "Black",
  "ramCapacity": "16 GB",
  "ramType": "DDR4",
  "diskCapacity": "512 GB",
  "diskType": "SSD",
  "teclado": "USB English",
  "versionTeclado": "Standard",
  "biosVersion": "F.21",
  "accessories": [
    { "accessoryId": "uuid-acc-1", "name": "Mouse", "quantity": 1, "notes": "Logitech" }
  ],
  "observaciones": "Sin problemas en recepción"
}
```

### Queries Importantes

#### Get all brands para dropdown
```sql
SELECT id, name FROM catalog_brands WHERE is_active = true ORDER BY name;
```

#### Get models by brand
```sql
SELECT id, name, product_type_id 
FROM catalog_models 
WHERE brand_id = $1 AND is_active = true 
ORDER BY name;
```

#### Get unique RAM capacities
```sql
SELECT DISTINCT ram_capacity 
FROM catalog_memory 
WHERE is_active = true AND ram_capacity IS NOT NULL 
ORDER BY ram_capacity;
```

#### Get audit log for entity
```sql
SELECT * FROM audit_logs 
WHERE entity_id = $1 
ORDER BY created_at DESC 
LIMIT 50;
```

---

## 🚨 HALLAZGOS Y RECOMENDACIONES

### ✅ FORTALEZAS

1. **Separación de Responsabilidades**
   - API (`/api/maestros`) para obtener catálogos
   - Server actions para CRUD protegido
   - Componentes UI sin lógica de negocio
   - ✅ BIEN HECHO

2. **Auditoría Automática**
   - Triggers PostgreSQL capturan cambios
   - Logs completos con before/after
   - Trazabilidad de quién hizo qué y cuándo
   - ✅ BIEN IMPLEMENTADO

3. **Relaciones Brand-Model**
   - Filtrado correcto en frontend
   - Constraint de FK en BD
   - ✅ FUNCIONANDO CORRECTAMENTE

4. **RLS + Service Role Key**
   - Separación clara entre usuario y admin
   - Admin client solo en server actions
   - ✅ SEGURIDAD ADECUADA

5. **Fallback Values en API**
   - Si catálogos están vacíos, usa defaults
   - No devuelve error 500
   - ✅ RESILIENTE

---

### ⚠️ ÁREAS DE MEJORA

#### 1. **Validación en API de Maestros**

**Problema:**
```typescript
// En /api/maestros/route.ts línea 20-50
if (!tipo) return 400 Bad Request
if (tipo not in catalogMap) return 400 Unsupported

// PERO después:
try {
  const { data } = await supabase.from(tabla).select(...)
  if (!data) return FALLBACK VALUES  // ❌ Silencioso
} catch {
  return FALLBACK VALUES            // ❌ No se sabe qué falló
}
```

**Recomendación:**
```typescript
// Agregar logging
console.error(`[maestros/${tipo}] DB Error:`, error)

// O retornar estado mejor
return NextResponse.json({
  items: [],
  status: 'fallback',  // Informar al cliente
  reason: 'database_error'
})
```

**Prioridad:** ⚠️ MEDIO - Afecta debugging

---

#### 2. **Validación de Modelo vs Marca**

**Problema:**
```
// Frontend filtra, pero user podría:
// 1. Enviar payload con marca != modelo.brand_id
// 2. Persistir inconsistencia en BD
```

**Recomendación:**
```typescript
// En el POST /api/reception-save agregar validación:
const marca = await supabase
  .from('catalog_brands').select('id').eq('id', marcaId)
  
const modelo = await supabase
  .from('catalog_models').select('brand_id').eq('id', modeloId)
  
if (modelo[0].brand_id !== marca[0].id) {
  return 400 Bad Request "Marca y Modelo no coinciden"
}
```

**Prioridad:** 🔴 ALTO - Integridad de datos

---

#### 3. **Falta de Transacciones en Crear Usuario**

**Problema:**
```typescript
// createSystemUser() - línea 140-180
// 1. Crea en auth.users ✅
// 2. Crea en profiles ❌
// Si (2) falla, (1) queda huérfano
```

**Recomendación:**
```typescript
// Usar Supabase RPC o manual rollback
try {
  const authUser = await admin.auth.admin.createUser(...)
  const profileError = await admin.from('profiles').insert(...)
  
  if (profileError) {
    // ROLLBACK: Eliminar auth user creado
    await admin.auth.admin.deleteUser(authUser.id)
    throw new Error('Rollback: Profile creation failed')
  }
} catch (e) {
  // Log y retornar error
  console.error('Transaction failed:', e)
  return { success: false, error: 'User creation failed' }
}
```

**Prioridad:** 🔴 ALTO - Inconsistencia de datos

---

#### 4. **Falta de Rate Limiting en API**

**Problema:**
```
GET /api/maestros?tipo=marca (sin rate limiting)
→ User podría hacer 1000 requests/segundo
→ DoS potencial
```

**Recomendación:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
})

export async function GET(request: NextRequest) {
  const { success } = await ratelimit.limit(request.ip)
  if (!success) return new Response('Rate limit exceeded', { status: 429 })
  // ... resto del código
}
```

**Prioridad:** ⚠️ MEDIO - Seguridad

---

#### 5. **No Hay Validación de Campos Requeridos en el Backend**

**Problema:**
```typescript
// En RecepcionModule.tsx, validación solo en frontend
<input required name="serie" />

// Pero POST /api/reception-save NO valida:
if (!serie || !marca || !modelo) {
  return 400 Bad Request
}
```

**Recomendación:**
```typescript
// En receipt handler (backend)
const REQUIRED_FIELDS = ['clasificacionRec', 'marcaId', 'modeloId', 'serie']

const missing = REQUIRED_FIELDS.filter(field => !formData[field])
if (missing.length > 0) {
  return NextResponse.json(
    { error: `Missing fields: ${missing.join(', ')}` },
    { status: 400 }
  )
}
```

**Prioridad:** 🔴 ALTO - Validación de entrada

---

#### 6. **Caché ISR sin Invalidación Proactiva**

**Problema:**
```typescript
// revalidatePath('/dashboard/configuracion/usuarios')
// Invalida caché para futuro visit, pero:
// - User actual NO ve cambios inmediatamente
// - Necesita refrescar página
```

**Recomendación:**
```typescript
// Retornar datos actualizados junto con OK
return {
  success: true,
  brand: { id, name, is_active },  // Nuevo dato
  message: 'Brand created'
}

// Frontend actualiza estado local inmediatamente
setBrands([...brands, newBrand])
```

**Prioridad:** ⚠️ BAJO - UX minor

---

#### 7. **Falta de Constraint NOT NULL en brand_id de Models**

**Problema:**
```sql
ALTER TABLE catalog_models
-- Actualmente permite: brand_id NULL
-- Debería forzar: brand_id NOT NULL
```

**Recomendación:**
```sql
ALTER TABLE catalog_models
ALTER COLUMN brand_id SET NOT NULL;

-- ANTES: Asegurarse de que NO hay NULLs
UPDATE catalog_models SET brand_id = (
  SELECT id FROM catalog_brands LIMIT 1
) WHERE brand_id IS NULL;
```

**Prioridad:** ⚠️ MEDIO - Data quality

---

#### 8. **Logging Insuficiente en Errores Críticos**

**Problema:**
```typescript
const { error } = await supabase.from(...).select(...)
if (error) {
  console.warn(`[API/maestros] Catalog ${tipo}:`, error.message)
  return { items: [] }
}
// ❌ No se sabe: qué tipo falló, timestamp, request ID
```

**Recomendación:**
```typescript
import { v4 as uuid } from 'uuid'

const requestId = uuid()
console.error(`[${requestId}] [maestros/${tipo}] at ${new Date().toISOString()}`, {
  error: error.message,
  code: error.code,
  details: error.details
})

// Return también incluya requestId para tracking
return NextResponse.json({
  error: 'Internal Server Error',
  requestId,
  status: 500
})
```

**Prioridad:** ⚠️ MEDIO - Observability

---

### 🔍 RECOMENDACIONES POR PRIORIDAD

| # | Prioridad | Tema | Estimado | Impacto |
|----|----------|------|----------|---------|
| 1 | 🔴 ALTO | Validación Backend (campos requeridos) | 2h | Data Quality |
| 2 | 🔴 ALTO | Transacción en createUser | 1.5h | Data Integrity |
| 3 | 🔴 ALTO | Validación Marca-Modelo backend | 1h | Data Consistency |
| 4 | ⚠️ MEDIO | Validación en /api/maestros | 2h | Debugging |
| 5 | ⚠️ MEDIO | Rate Limiting en API | 1h | Security |
| 6 | ⚠️ MEDIO | Constraint NOT NULL brand_id | 1h | Data Quality |
| 7 | ⚠️ MEDIO | Logging mejorado | 1.5h | Observability |
| 8 | ⚠️ BAJO | Caché ISR proactivo | 2h | UX |

**Estimado Total:** ~12 horas de desarrollo

---

## 📝 CONCLUSIÓN

### Estado General: ✅ BUENO

El código tiene:
- ✅ Arquitectura clara y escalable
- ✅ Auditoría automática robusta
- ✅ Seguridad de autenticación adecuada
- ✅ Relaciones de datos bien diseñadas
- ⚠️ Pero necesita validación más estricta en backend
- ⚠️ Y mejor manejo de transacciones

### Recomendación para PASAR CODE REVIEW

**CON CAMBIOS REQUERIDOS:**

1. ✅ Implementar validación de campos requeridos en backend
2. ✅ Agregar transacciones en createUser
3. ✅ Validar marca-modelo match en backend
4. ✅ Agregar logging estructurado con requestId

**OPCIONALES (para siguiente sprint):**
- Rate limiting en API
- NOT NULL constraint en brand_id
- ISR proactivo

---

**Análisis completado:** 4 de Febrero, 2026  
**Analista:** AI Code Review  
**Versión:** 1.0
