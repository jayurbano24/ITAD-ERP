# ITAD ERP Guatemala — Revisión de preparación para MVP operativo

| Campo | Valor |
|-------|--------|
| Fecha | 2026-10-30 |
| Alcance | Auditoría **solo lectura** del repositorio local |
| Dictamen | **READY WITH BLOCKERS** |
| Autor del informe | Auditoría técnica asistida (evidencia de repo) |

---

## 1. Resumen ejecutivo y dictamen

### Dictamen: READY WITH BLOCKERS

El código del monolito Next.js **sí contiene la superficie funcional** de la cadena MVP (clientes/tickets → logística → recepción → bodega → wipe → despacho/destrucción). Sin embargo, **no está listo para construir/operar el MVP de punta a punta solo a partir del repositorio**, porque:

1. **No existen migraciones versionadas que creen** `public.crm_entities`, `public.operations_tickets` ni `public.assets` (solo `ALTER`/`REFERENCES` que asumen tablas previas). Un reset limpio desde migraciones **falla por diseño**. *(Verificado)*
2. El estado del proyecto Supabase **hospedado** (tablas presentes, Auth, Storage, datos) **no se verificó en esta auditoría** (restricción: sin acciones remotas). *(Pendiente de confirmar)*
3. Hay **deuda de seguridad y operabilidad** (rutas `/api/admin` y `/api/debug`, RLS parcial/permisivo, middleware RBAC incompleto, secrets embebidos como fallback). *(Verificado)*
4. Existe una **restricción comunicada** de no introducir PHP / Next.js / TypeScript en un “módulo nuevo”, incompatible con el stack actual del monolito. Requiere decisión de arquitectura del responsable; esta revisión **no propone migración**. *(Inferido a partir del enunciado de la solicitud)*

**Interpretación práctica:** se puede *construir* el MVP sobre este codebase **si** se cierra Fase 0 (DB/Auth/Storage alineados) y se mitigan P0 de seguridad. No se puede declarar “operativo en producción” solo con `npm run build` + migraciones actuales.

---

## 2. Evidencia consultada

| Fuente | Uso |
|--------|-----|
| `package.json` | Stack y scripts |
| `src/app/**/page.tsx` | Conteo de páginas (40) |
| `src/app/api/**/route.ts` | Conteo de API routes (74) |
| `src/**/actions.ts` | Server actions (16) |
| `src/app/dashboard/components/Sidebar.tsx` | Mapa de módulos UI |
| `src/middleware.ts` | Auth/RBAC/sesión |
| `src/lib/supabase/types.ts` | Modelo tipado manual |
| `src/lib/supabase/config.ts` | Config cliente |
| `supabase/migrations/*.sql` (78 archivos) | DDL/RLS incremental |
| `supabase/tests/workshop_and_audit_trigger_tests.sql` | Stubs de tablas en tests |
| `sql/015_create_asset_wipe_evidence.sql` | DDL wipe (fuera de `supabase/migrations`) |
| `src/app/dashboard/{clientes,tickets,logistica,inventario,borrado,taller}/**` | Cadena operativa |
| `src/app/api/{logistica,inventario,wipe,admin,debug}/**` | Endpoints |
| `env.local.example` | Nombres de variables (sin reproducir secretos) |
| `docs/*` | Guías wipe/storage existentes |
| Conteo raíz | ~106 archivos no-core en raíz |

**No consultado en esta pasada (por regla):** estado live de Supabase, ejecución de migraciones, tests, despliegues.

---

## 3. Inventario técnico real del repositorio

### 3.1 Stack (Verificado)

| Pieza | Valor en repo |
|-------|----------------|
| Framework | **Next.js 14.2.18** (App Router) |
| UI | React **18.3.1**, Tailwind **3.4.19** |
| Lenguaje | **TypeScript 5.7.2** |
| Backend de datos | **Supabase** (`@supabase/supabase-js` ^2.47, `@supabase/ssr` ^0.5) |
| Validación | Zod ^4.3 |
| PDF/export | jspdf, html2canvas, xlsx, bwip-js/jsbarcode |
| Scripts npm | `dev`, `build`, `start`, `lint` — **sin** `test` en `package.json` |

### 3.2 Estructura (Verificado / Inferido)

```
src/
  app/                 # rutas App Router (dashboard, api, recepcion, portal, bodega, login)
  components/          # UI global limitada (ui/ + pocos organismos)
  lib/supabase|services|auth
  hooks/, context/, utils/
supabase/migrations/   # 78 SQL incrementales (ALTER-heavy)
sql/                   # scripts SQL sueltos (no necesariamente en cadena goose)
scripts/ + raíz        # scripts ops/debug/python/sql/logs (~100+ archivos sueltos)
```

Arquitectura: **monolito modular por features** en Next.js (UI + Server Actions + Route Handlers + Supabase). *(Verificado)*

### 3.3 Cifras comunicadas vs reales (Verificado)

| Métrica | Comunicada | Medida en repo | Nota |
|---------|------------|----------------|------|
| Páginas `page.tsx` | 28 | **40** | Incluye portal, bodega legacy, audit-seed, login, etc. |
| API `route.ts` | 74 | **74** | Coincide |
| Server `actions.ts` | 16 | **16** | Coincide |
| Migraciones `supabase/migrations` | — | **78** | |
| Archivos sueltos en raíz | ~97 | **~106** | Ops/debug/logs/md/sql/py |

Páginas **relevantes al MVP** (subconjunto, Inferido): login, dashboard, clientes, tickets, logística, recepción, inventario/bodega/despacho, borrado(+evidencias), taller, configuración usuarios, auditoría.

### 3.4 God components (Verificado)

| Archivo | Tamaño aprox. | Líneas aprox. |
|---------|---------------|---------------|
| `src/app/dashboard/logistica/components/LogisticaModule.tsx` | 112 KB | ~2422 |
| `src/app/dashboard/taller/components/TallerStageDashboard.tsx` | 120 KB | ~1954 |
| `src/app/recepcion/components/RecepcionModule.tsx` | 72 KB | ~1328 |

Otros hotspots: `TicketsTable.tsx`, `WarehouseAssetTable.tsx`, varios `actions.ts` densos (finanzas/taller/borrado). *(Verificado por tamaño; riesgo Inferido)*

### 3.5 Doble canal Actions vs API (Verificado)

- **API-heavy:** logística (`/api/logistica/*`), bodega (`/api/inventario/bodega/*`), wipe upload (`/api/wipe/*`).
- **Actions-heavy:** clientes, tickets, taller, borrado (lógica), finanzas/ventas/partes (fuera de MVP).
- **Riesgo:** misma entidad mutada por dos caminos sin contrato único → inconsistencias e idempotencia débil. *(Inferido)*

### 3.6 Admin / debug expuestos (Verificado)

Bajo `src/app/api/admin/`: `fix-asset-825328`, `fix-bodega-harv`, `move-to-harv`, `move-to-val`, `seed-*`, `sync-reception-data`, `update-asset-info`, etc.

Bajo `src/app/api/debug/`: `bodega-harv`, `bodega-harv-v2`, `work-orders`.

Varias rutas leen `process.env.SUPABASE_SERVICE_ROLE_KEY`. **No se verificó** en esta auditoría si hay gate de rol en cada handler. *(Pendiente de confirmar por ruta)*

### 3.7 Tests (Verificado)

- Un test de componente: `TallerStageDashboard.test.tsx`.
- SQL de prueba: `supabase/tests/workshop_and_audit_trigger_tests.sql` (crea stubs mínimos de `operations_tickets`/`assets`).
- **No** hay script `test` en `package.json`.

### 3.8 Restricción “módulo nuevo” sin PHP / Next / TypeScript (documentación de opciones)

El MVP actual **está implementado en Next.js + TypeScript**. Una restricción de no usar esos lenguajes en un módulo nuevo **no es resoluble dentro de este repo sin decisión externa**.

| Opción | Descripción | Impacto | Decisión requerida |
|--------|-------------|---------|---------------------|
| A | Mantener monolito Next/TS; el “módulo nuevo” es feature dentro del mismo stack | Bajo costo; incumple la restricción literal | Aceptar excepción para este producto |
| B | Sidecar en lenguaje permitido (p. ej. Go/Python) + API; Next solo UI | Alta complejidad; contratos/OpenAPI; doble deploy | Elegir lenguaje, ownership, límites de API |
| C | Reescribir MVP fuera de Next/TS | Coste máximo; descarta la mayor parte del código actual | Solo si la restricción es innegociable |
| D | Congelar este repo como “legacy UI” y construir MVP en otra base | Duplicación temporal; riesgo de doble verdad | Definir SSOT de datos |

**Esta revisión no elige ni implementa ninguna opción.**

---

## 4. Matriz de las siete etapas operativas y brechas

Orden canónico requerido:  
**Cliente/ticket → logística → recepción → bodega → wipe → despacho/destrucción.**

| # | Etapa | Tablas (evidencia en código/SQL) | Pantallas / endpoints | Roles (código) | Validaciones vistas | Evidencia | Brechas / dependencias |
|---|-------|----------------------------------|------------------------|----------------|---------------------|-----------|-------------------------|
| 1 | Cliente + ticket | `crm_entities`, `operations_tickets` (tipos + actions; **sin CREATE en migrations**) | `/dashboard/clientes`, `/dashboard/tickets`; `clientes/actions.ts`, `tickets/actions.ts` | `profiles.role`, `allowed_modules` en sidebar | NIT único en create client *(Verificado en actions)* | Tipos + UI + actions | **CREATE DDL ausente** en migraciones; estado remoto pendiente |
| 2 | Logística | `operations_tickets`, `ticket_items`, collectors/boxes APIs | `/dashboard/logistica`, `/dashboard/logistica/[id]`; `/api/logistica/*` | logistics / super_admin *(Inferido por módulos)* | Idempotencia parcial en boxes (`route.ts` comenta evitar duplicados) | God component LogisticaModule | Cierre “finalize” + guía PDF dependen de plantillas/storage |
| 3 | Recepción | `ticket_items`, `assets`, `batches`, `warehouses` (`BOD-REC`) | `/recepcion`; `/api/logistica/reception*`, `RecepcionModule` | ops recepción | Marca/modelo/serie en flujo documentado en `ANALISIS_LOGICA_NEGOCIO.md` | Código recepción actualiza `assets` a `received` + warehouse | Unicidad fuerte de `serial_number` **no verificada** en DDL de migrations |
| 4 | Inventario/bodega | `assets`, `warehouses` (REC/REM/VAL/HARV/DES en seeds posteriores), `inventory_movements` | `/dashboard/inventario/bodega?warehouse=…`; bodega actions + APIs move | tech/logistics | Movimientos y export | Códigos `BOD-*` en Sidebar y migrations | Seed inicial `20241209` usa `BOD-001`… distintos de UI; se corrige en migraciones posteriores *(Verificado)* |
| 5 | Taller mínimo | `work_orders`, `assets`, `part_requests` (joins) | `/dashboard/taller`, `[id]`; `taller/actions.ts` | tech_lead | Estados/taller stages | Test unitario parcial del dashboard | `work_orders` **sin CREATE** en migrations encontradas; solo ALTER/triggers *(Verificado gap)* |
| 6 | Wipe | `asset_wipe_evidence`, columnas wipe en `assets` / `work_orders.status='data_wipe'` | `/dashboard/borrado`, `/evidencias`; `/api/wipe/*`; `borrado/actions.ts` | tech | Evidencias photo/xml/pdf; software/cert id | SQL en `sql/015_…` y `supabase/migrations/20251215_add_wipe_evidence_table.sql` | Drift de nombres: types usan `data_wipe_*`, borrado usa `wipe_*` *(Verificado)*; bucket Storage pendiente de confirmar en host |
| 7 | Despacho / destrucción | `dispatches`, `dispatch_items`, APIs destruction/dispatch | `/dashboard/inventario/despacho`, `bodega/despachos`; `DestructionModal`; certificates | ops/admin | Destrucción marcada irreversible en UI | `20260224_create_dispatches_logic.sql` crea dispatches + RLS “allow all authenticated” | Debe ejecutarse **después** de wipe en ruta de sanitización; destrucción es vía alternativa documental *(Inferido/Verificado en UI)* |

### 4.1 Orden wipe vs despacho (Verificado / Inferido)

- El Sidebar y el flujo de negocio colocan **Borrado** como módulo propio y **Despacho/Historial salidas** en inventario. *(Verificado)*
- Bodega Valorización (`BOD-VAL`) se documenta en migración como post-borrado. *(Verificado en `20260115_add_remarketing_valuation_warehouses.sql`)*
- **No** se encontró un enforcement de BD del tipo “no despachar si wipe incompleto” en las migrations revisadas. *(Pendiente / brecha)*
- **Ruta sanitización:** wipe + evidencia/certificado → (opcional VAL/REM) → despacho `TRANSFER` con documento.  
- **Ruta destrucción:** activos en `BOD-DES` → `process-destruction` / certificado de destrucción (`movement_type` DESTRUCTION). *(Verificado en componentes/API)*

### 4.2 Inconsistencia con planes previos

Cualquier plan que coloque **despacho antes de wipe** como fase obligatoria de sanitización **contradice** el objetivo MVP y la semántica de `BOD-VAL` post-wipe. El orden correcto queda fijado en la sección 8.

---

## 5. Estado de `assets`, `operations_tickets` y `crm_entities`

### 5.1 Hallazgo transversal (Verificado)

En `supabase/migrations/` **no hay** `CREATE TABLE` para:

- `public.crm_entities`
- `public.operations_tickets`
- `public.assets`

Sí hay abundantes `ALTER TABLE …`, `REFERENCES …`, índices y triggers que **presuponen** su existencia.  
Stubs mínimos aparecen solo en `supabase/tests/workshop_and_audit_trigger_tests.sql` (no son migraciones de producto).

**Consecuencia:** la secuencia local de migraciones **no permite un reset limpio** a esquema vacío → MVP. *(Verificado)*

**Estado en proyecto Supabase hospedado:** *Pendiente de confirmar* (esta auditoría no consultó el remoto).

### 5.2 `public.crm_entities`

| Aspecto | Evidencia |
|---------|-----------|
| CREATE en migrations | **No encontrado** |
| Modelo tipado | `src/lib/supabase/types.ts` (~L102–118, L261–265): NIT, commercial_name, entity_type, city, country, is_active, … |
| Consumo | `src/app/dashboard/clientes/actions.ts` (CRUD `.from('crm_entities')`) |
| Relaciones | `dispatches.client_id` → `crm_entities` (`20260224_create_dispatches_logic.sql`); tickets tipados con `client_id` |
| RLS en migrations | **No encontrada** política específica para `crm_entities` |
| Permisos app | Acceso vía cliente autenticado + UI; sin política DB evidenciada |

### 5.3 `public.operations_tickets`

| Aspecto | Evidencia |
|---------|-----------|
| CREATE en migrations | **No encontrado** |
| ALTER / dependencias | p.ej. `20241208_add_ticket_attachments.sql`, `20260124_add_completed_by_…`, triggers auditoría `20260209_audit_logs_system.sql`, unique `readable_id` |
| Consumo | tickets UI/actions; APIs logística; recepción |
| RLS | **No encontrada** política dedicada en sample de migrations |
| Reset limpio | Bloqueado por ausencia de CREATE |

### 5.4 `public.assets`

| Aspecto | Evidencia |
|---------|-----------|
| CREATE en migrations | **No encontrado** |
| RLS | `20260224_fix_logistics_assets_rls.sql`: ENABLE RLS + política **SELECT** para roles internos listados; **no** se evidenció política INSERT/UPDATE/DELETE en ese archivo |
| Consumo | inventario, logística, recepción, borrado, despacho, admin fixes |
| Tipos vs runtime | `types.ts` usa `data_wipe_*`; `borrado/actions.ts` selecciona `wipe_*` — **drift** *(Verificado)* |
| Relaciones | `ticket_items.asset_id`, `inventory_movements.asset_id`, `asset_wipe_evidence.asset_id`, `dispatch_items.asset_id`, finanzas, etc. |

### 5.5 Diferencias migrations ↔ types ↔ código (Verificado)

- Types manuales incompletos (faltan `warehouses`, `work_orders`, `dispatches`, `asset_wipe_evidence` en `Database.Tables`).
- Wipe: dual naming `data_wipe_*` vs `wipe_*`.
- Warehouses: seeds históricos `BOD-001` vs códigos de producto `BOD-REC`/`BOD-DES`/…
- `sql/015_create_asset_wipe_evidence.sql` está **fuera** de la carpeta canónica `supabase/migrations` (duplicado parcial con `20251215_…`).

---

## 6. Decisión recomendada para Fase 0

### Opciones (sin ejecutar remotas)

| Opción | Descripción | Preserva datos históricos | Historial migraciones | Auth/Storage/Realtime/Functions | Riesgos | Costos | Esfuerzo |
|--------|-------------|---------------------------|-----------------------|----------------------------------|---------|--------|----------|
| **A. Reparar/restaurar proyecto existente** | Recuperar proyecto original o reaplicar DDL faltante sobre host actual | Sí, si el proyecto/backup existe | Puede quedar divergente del repo | Se conserva si el proyecto vive | Host equivocado / schema mixto con otros ERPs | Bajo si ya pagado | Medio–alto (diagnóstico + backfill) |
| **B. Staging nuevo desde migraciones versionadas** | Proyecto limpio + replay migrations | No (vacío) | **Hoy incompleto** sin CREATE core | Hay que re-provisionar Auth users, buckets, policies | **Migraciones actuales no bootstrap-ean** tablas núcleo | Nuevo proyecto (costo a confirmar con proveedor) | Alto: primero escribir baseline DDL + luego migrate |
| **C. Copia aislada / restore de dump** | Restore PITR/dump a proyecto aislado | Sí (si hay dump) | Depende del dump | Se restaura con el backup | Dump desactualizado; secretos; tiempo downtime | Storage/restore fees | Medio si dump bueno |

### Recomendación

**No se recomienda B “tal cual”** con el árbol de migrations actual: fallaría o quedaría a medias por falta de CREATE de tablas núcleo. *(Verificado)*

**Recomendación condicionada:**

1. Si existe backup/proyecto recuperable con el schema ITAD completo → **A o C** (preferir C si hay riesgo de tocar producción compartida).
2. Si no hay backup → **B solo después** de añadir una migración baseline (`000_init_core.sql` o equivalente) que cree `crm_entities`, `operations_tickets`, `assets`, `batches`, `ticket_items`, `work_orders`, perfiles/company_settings, enums y RLS mínimas; luego replay ordenado + seeds de warehouses `BOD-*` + buckets wipe.

### Datos faltantes para decidir (Pendiente de confirmar)

- ¿Existe dump o proyecto restaurable del schema ITAD (`assets`/`tickets`/`crm`)?
- ¿El host actual de `.env` es exclusivo de este ERP o compartido con otro producto?
- ¿Hay buckets Storage (`wipe` / plantillas) y políticas ya provisionadas?
- ¿Presupuesto/aprobación de proyecto Supabase adicional?
- ¿Quién es SSOT de usuarios Auth?

---

## 7. Hallazgos priorizados P0 / P1 / P2

### P0 — Bloquean MVP operable

| ID | Hallazgo | Impacto | Evidencia | Criterio de cierre |
|----|----------|---------|-----------|--------------------|
| P0-1 | Sin CREATE versionado de tablas núcleo | Imposible bootstrap/reset reproducible | Búsqueda CREATE en `supabase/migrations` sin matches para las 3 tablas | Baseline DDL merged + `migrate` en DB vacía crea las 3 tablas |
| P0-2 | Estado host / Auth / Storage no confirmado en esta auditoría | Riesgo de apuntar a schema incorrecto o incompleto | Regla de no remoto | Checklist Fase 0 firmado: tablas, RLS, buckets, login E2E |
| P0-3 | Rutas admin/debug con service role en runtime | Mutaciones privilegiadas si quedan públicas | `src/app/api/admin/*`, `debug/*` | Eliminadas del deploy, o gate rol+env + deny por defecto |
| P0-4 | Secrets/fallbacks embebidos en código y ejemplos | Filtración / acoplamiento a proyectos viejos | `middleware.ts` fallbacks; `env.local.example` con material tipo key | Solo env vars; ejemplos con placeholders; rotación si hubo exposición |
| P0-5 | Drift wipe columns types vs actions | Fallos de wipe/certificación | `types.ts` vs `borrado/actions.ts` | Un solo contrato de columnas + migración alineada |

### P1 — Ampliamente degradan confiabilidad

| ID | Hallazgo | Impacto | Evidencia | Criterio de cierre |
|----|----------|---------|-----------|--------------------|
| P1-1 | God components | Mantenibilidad, bugs, onboarding | Tamaños Logistica/Taller/Recepcion | Partición en hooks + presenters; PRs < umbral |
| P1-2 | Doble canal API/Actions | Condiciones de carrera / lógica duplicada | 74 routes + 16 actions | Matriz “entidad → un writer” |
| P1-3 | RLS incompleta / permisiva | Authz débil a nivel DB | assets solo SELECT; dispatches ALL authenticated | Políticas por rol alineadas a matriz MVP |
| P1-4 | Middleware no cubre `/recepcion`, `/bodega`, `/api` | Rutas fuera del matcher mental de `protectedRoutes` | `middleware.ts` L46–48 | Matcher + authz API unificados |
| P1-5 | Sin enforcement “wipe antes de despacho” | Salida sin evidencia de borrado | Ausencia en migrations revisadas | Check/constraint o gate en despacho |
| P1-6 | Unicidad de serial no evidenciada en DDL | Doble activo / doble venta | No UNIQUE serial en migrations halladas | UNIQUE parcial/negocio documentado + test |

### P2 — Deuda / post-MVP cercano

| ID | Hallazgo | Impacto | Evidencia | Criterio de cierre |
|----|----------|---------|-----------|--------------------|
| P2-1 | Clutter raíz (~106 archivos) | Ruido, onboarding | Conteo raíz | Mover a `scripts/archive` sin cambiar runtime |
| P2-2 | Types manuales incompletos | DX / bugs | `types.ts` | Generar tipos desde schema |
| P2-3 | Casi sin tests automatizados | Regresiones | 1 test TSX; sin npm test | Suite mínima cadena MVP |
| P2-4 | Módulos fuera de MVP en menú (ventas/finanzas/portal) | Scope creep | Sidebar | Feature flags / ocultar en MVP |
| P2-5 | Incompatibilidad restricción lenguaje módulo nuevo | Bloqueo organizativo | Enunciado de revisión | ADR del responsable (opciones §3.8) |

---

## 8. Plan de fases actualizado (orden canónico)

| Fase | Objetivo | Exit criteria |
|------|----------|---------------|
| **F0 — Fundación datos** | Baseline DDL + host dedicado + Auth + buckets wipe/plantillas + vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`) | Login OK; `crm_entities`/`operations_tickets`/`assets` existen; migrate limpio documentado |
| **F1 — Ticket → logística → recepción** | Alta cliente/ticket, cajas/ítems, finalize, recepción a `BOD-REC` con serial | 1 lote E2E con serials en `assets` |
| **F2 — Bodega** | Movimientos REC→REM/VAL/HARV/DES; historial movimientos | Asset cambia warehouse con movimiento auditable |
| **F3 — Wipe** | work_order `data_wipe`, evidencias, certificado/método/operador/fecha | Asset wiped + filas en `asset_wipe_evidence` |
| **F4 — Salida** | Despacho TRANSFER **solo si wipe OK** (ruta sanitización) **o** destrucción documentada desde `BOD-DES` | PDF/cert + `dispatches`/`dispatch_items` |
| **F5 — Hardening** | Quitar admin/debug prod, RLS, idempotencia serial, tests humo | Checklist seguridad + A1–A9 |
| **Post-MVP** | Ventas, finanzas, partes, portal, BI, upgrade framework/MDM | Fuera de DoD MVP |

---

## 9. Riesgos y decisiones que requieren aprobación del responsable

1. **Estrategia Fase 0 (A/B/C)** y presupuesto de proyecto Supabase.
2. **Excepción o no** a la restricción “sin Next/TS/PHP” para este producto (§3.8).
3. **¿Se permiten rutas admin en staging?** ¿Quién puede service role?
4. **Política de seriales:** ¿único global, único por cliente, o reingresos permitidos?
5. **¿Despacho sin wipe completo está prohibido** o hay excepciones (scrap/destrucción)?
6. **Retención y acceso** a evidencias de wipe (Storage, URLs públicas vs firmadas).
7. **Alcance de auditoría** (¿ISO/R2 claims?) — esta revisión **no** certifica cumplimiento normativo.
8. **Limpieza de secretos** potencialmente expuestos en ejemplos/fallbacks (rotación).

---

## 10. Validaciones posteriores sugeridas (no ejecutadas)

Ejecutar solo con autorización explícita:

1. **Inventario remoto:** listar tablas/policies en el proyecto configurado (sin imprimir secrets).
2. **Migrate dry-run** en DB vacía efímera; capturar primer error (esperado: missing `crm_entities`/`assets`/…).
3. **Smoke auth:** login → `profiles` → `allowed_modules`.
4. **E2E manual A1–A9** del plan MVP (ticket→…→salida) con 2–3 seriales de prueba.
5. **Prueba negativa:** intentar despacho TRANSFER sin wipe; debe fallar tras implementar P1-5.
6. **Prueba destrucción:** flujo `BOD-DES` + certificado; verificar que no exige wipe de software si política lo permite.
7. **Security review:** curl anónimo/autenticado a `/api/admin/*` y `/api/debug/*`.
8. **Storage:** upload evidencia wipe; list/get con RLS/policies de bucket.
9. **Si se añade baseline DDL:** golden schema diff vs `types.ts` / queries.
10. **Tests automatizables existentes a ampliar:** partir de `TallerStageDashboard.test.tsx` + SQL `supabase/tests/…`; comando futuro sugerido: `npm test` / `vitest` / `playwright` (hoy no cableado).

### Cómo se ejecutarían (posterior, autorizado)

```bash
# ejemplo — NO ejecutado en esta auditoría
npm run lint
npm run build
# tras añadir test runner: npm test
# E2E: npx playwright test (si se introduce)
```

Migraciones: según el flujo que use el equipo (`supabase db reset` **solo** en entorno desechable tras existir baseline).

---

## Anexo A — Variables de entorno (solo nombres)

Requeridas / referenciadas en código o ejemplos *(Verificado por nombre, sin valores)*:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- (también aparece `SUPABASE_URL` en configs locales históricas)

---

## Anexo B — Matriz de aceptación MVP vs controles (estado)

| Criterio MVP | Estado en repo |
|--------------|----------------|
| Trazabilidad por serial | Parcial — campos existen en código; UNIQUE/enforcement DB no evidenciado |
| Ubicación de bodega | Código + migraciones `warehouses` / `current_warehouse_id` |
| Evidencia de borrado | Tablas/SQL/UI presentes; host/bucket pendiente |
| Cadena ordenada con wipe antes de salida sanitizada | UI sugiere orden; **gate duro no evidenciado** |
| Roles | `profiles.role` + sidebar modules; middleware parcial |
| Auditoría | `audit_logs` + triggers (complejos/históricos); cobertura uneven |
| Cumplimiento ISO/R2 formal | **No declarado verificado** |

---

*Fin del informe. Ningún archivo de aplicación existente fue modificado en esta auditoría; este documento es el entregable nuevo en `docs/audits/`.*
