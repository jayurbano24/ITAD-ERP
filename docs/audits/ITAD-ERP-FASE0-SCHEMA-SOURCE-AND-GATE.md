# Fase 0 — Fuente de esquema, respaldos y gate ampliado

| Campo | Valor |
|-------|--------|
| Fecha | 2026-10-30 |
| Modo | Solo lectura (sin migrar, restaurar ni tocar producción) |
| Relacionado | `docs/audits/ITAD-ERP-MVP-READINESS-REVIEW.md` |
| Prioridad acordada | Cerrar **P0 de base de datos**; diferir refactor LogisticaModule / rutas |

---

## 1. Reconciliación con el gate “17/17” y reset aislado

**Conclusión (Verificado + Inferido):** un reset aislado puede pasar 17/17 controles **sin** demostrar que existan `public.assets`, `public.operations_tickets` y `public.crm_entities`, si el gate no las exigió por nombre.

Evidencia local:

- En `supabase/migrations/` **no hay** `CREATE TABLE` de esas tres tablas; solo `ALTER` / `REFERENCES` / triggers que las asumen.
- En `sql/` ocurre lo mismo: scripts consolidados (`006`, `007`, `008`, `010`, `015`…) crean tablas **dependientes** (`work_orders`, wipe evidence, ventas…) referenciando `assets` / `operations_tickets` / `crm_entities` ya existentes.
- `supabase/tests/workshop_and_audit_trigger_tests.sql` crea stubs mínimos de `operations_tickets` y `assets` **solo para tests**, no como baseline de producto.

Por tanto: **ampliar el gate de Fase 0** (sección 5). El 17/17 previo no sustituye esta prueba.

---

## 2. Fuentes de esquema candidatas (ranking de confiabilidad)

| Rank | Fuente | ¿Crea las 3 tablas núcleo? | Qué sí aporta | Limitación | Confianza |
|------|--------|----------------------------|---------------|------------|-----------|
| 1 | **Proyecto Supabase histórico con datos ITAD** (host que alguna vez tuvo el ERP) | Sí *(si el host es el correcto)* | Schema real + datos + Auth/Storage parcial | Fuera del repo; requiere dump/clone/PITR; **Pendiente de confirmar** existencia | Alta **si** se valida inventario de tablas |
| 2 | `src/lib/supabase/types.ts` + consultas del código | No (solo contrato TS) | Forma esperada de filas/enums MVP | Drift vs wipe (`data_wipe_*` vs `wipe_*`); incompleto vs tablas reales | Media (contrato app) |
| 3 | `supabase/migrations/` (78) | **No** para las 3 | Evolución incremental, warehouses `BOD-*`, dispatches RLS, wipe evidence migration, auditoría | **No es baseline completa del MVP** | Media para deltas; **baja** como bootstrap |
| 4 | `sql/*.sql` (consolidados de editor) | **No** para las 3 | Taller, inventario, wipe evidence, ventas | Asumen núcleo previo; no ordenados como goose | Media-baja |
| 5 | `schema_dump.sql` | No | — | ~160 B; no es dump usable | Nula |
| 6 | `restore_master.py` | N/A | Restaura `LogisticaModule.tsx` desde `.bak` | **No es respaldo de BD** | Nula para Fase 0 DB |
| 7 | `scripts/apply_schema_fix.js` | N/A | ALTER de clasificaciones | Requiere `DATABASE_URL` / Postgres; no crea núcleo | Nula como fuente |

**Fuente de esquema “confiable” hoy:** no hay un baseline DDL versionado en el repo que cree el núcleo MVP. La única fuente potencialmente completa es un **host/backup externo** (rank 1). Mientras no exista, la fuente operativa para *diseñar* el baseline es la **unión** de `types.ts` + queries de la cadena MVP + migrations/sql como delta — pero eso es trabajo de **escritura futura**, no algo listo para reset.

---

## 3. ¿Existe un respaldo válido con datos a conservar?

### En el repositorio (Verificado)

| Candidato | Resultado |
|-----------|-----------|
| `schema_dump.sql` | No usable |
| `*.dump` / `*.backup` / `pg_dump` | **No encontrados** en el árbol del proyecto |
| `sql/` | Scripts DDL/DML de evolución, no snapshot de datos |
| `restore_master.py` / `*.bak` de componentes | Respaldo de **código UI**, no de datos |

### Fuera del repo (Pendiente de confirmar — checklist para el responsable)

Sin esto no se puede elegir A vs C con certeza:

1. ¿Existe en Supabase Dashboard un proyecto ITAD con `assets` / `operations_tickets` / `crm_entities` (activo, pausado o en papelera)?
2. ¿Hay **Physical backup / PITR** o export lógico (CSV/`pg_dump`) con fecha y checksum?
3. ¿Qué datos son obligatorios a conservar (clientes, tickets, assets, evidencias wipe, Storage)?
4. ¿Ese host es exclusivo ITAD o compartido con otro producto (riesgo de mezcla de schemas)?
5. ¿Quién aprueba el costo/tiempo de un proyecto de staging aislado?

**Estado actual según evidencia local:** **no hay respaldo de datos válido dentro del repo.** Opción C solo procede si aparece un dump/clone externo validado.

---

## 4. Elección A / C (alineada al informe y a tus reglas)

Reglas que aceptamos:

- Prioridad P0 DB.
- **No** tratar migrations actuales como base completa.
- **No** restaurar sobre producción.
- Entorno **aislado** primero.

| Escenario | Elección | Motivo |
|-----------|----------|--------|
| Hay proyecto/dump ITAD recuperable con las 3 tablas + datos a conservar | **C** (clone/restore a proyecto **aislado** / staging) | Preserva datos; no toca prod; permite ampliar gate; Auth/Storage/Realtime/extensiones se revisan a mano post-clon |
| Hay proyecto vivo pero vacío de negocio / solo schema | **A sobre copia aislada** (reparar schema en staging clonado o proyecto nuevo alimentado por introspección), **no** sobre prod | Evita escribir en prod; schema se saca del host fuente |
| No hay dump ni host recuperable | **Ni A ni C bastan solos** → hace falta **baseline DDL nuevo** (lo que el informe llamaba B *después* de escribir CREATE núcleo) + seed mínimo; datos históricos se dan por no recuperables | Migrations actuales no bootstrap-ean |

**Recomendación operativa ahora:**

1. **Bloquear** cualquier restore a producción.
2. Buscar en Dashboard/ops el host o dump (checklist §3).
3. Si aparece → **C aislado**.
4. Si no aparece → preparar baseline CREATE (trabajo autorizado aparte) + proyecto staging vacío; **no** vender el reset 17/17 como evidencia de núcleo.

Hasta confirmar §3, la decisión A/C queda: **inclinada a C si hay datos; en ausencia de backup en repo, C está bloqueada y hay que confirmar fuente externa o pasar a baseline.**

---

## 5. Gate de Fase 0 ampliado (mínimo)

Ejecutar solo en **entorno aislado**, con autorización explícita. Fallar el gate si cualquier ítem crítico falla.

### 5.1 Tablas núcleo (obligatorio — más que tres)

Para cada una de `public.crm_entities`, `public.operations_tickets`, `public.ticket_items`, `public.assets`:

- [ ] `to_regclass('public.<tabla>')` no es null  
- [ ] Columnas mínimas alineadas al contrato de app (`types.ts` + queries MVP)  
- [ ] PK presente  

### 5.2 Relaciones (obligatorio)

- [ ] `operations_tickets.client_id` → `crm_entities(id)` (o equivalente documentado)  
- [ ] `ticket_items.ticket_id` → `operations_tickets(id)`  
- [ ] `assets` enlazable a lote/ticket vía `batch_id` / `ticket_items.asset_id` según diseño elegido  
- [ ] `asset_wipe_evidence.asset_id` → `assets(id)` (wipe en camino crítico)  
- [ ] Distinción modelada: **ubicación** (`warehouses` / `current_warehouse_id`) ≠ **estado de proceso** ≠ **disposición/salida documentada**  

### 5.3 Permisos / RLS / roles (obligatorio)

- [ ] RLS enabled en tablas núcleo (o excepción staging firmada)  
- [ ] Policies no abiertas a `anon` para INSERT/UPDATE  
- [ ] `profiles.role` (y `allowed_modules` si aplica) para usuario de prueba  

### 5.4 Autenticación (obligatorio)

- [ ] Login password funciona contra el proyecto **aislado**  
- [ ] `/dashboard` accesible post-login  

### 5.5 Storage evidencias (obligatorio en F0)

- [ ] Bucket de evidencias de wipe existe  
- [ ] Upload de prueba con usuario autenticado  
- [ ] Lectura acorde a policies (sin exponer escritura anónima)  

### 5.6 Service role (obligatorio)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (nunca `NEXT_PUBLIC_*`)  
- [ ] Rutas admin que la usen validan autorización en backend  

### 5.7 Reset reproducible (obligatorio — definición estricta)

Un “reset reproducible” **solo cuenta** si:

- [ ] Fuente = **dump C verificado en proyecto aislado** **o** **baseline DDL revisado** (migrations actuales solas **no** bastan)  
- [ ] Tras apply, pasan 5.1–5.6  
- [ ] Runbook + versión/hash de la fuente documentados  
- [ ] **No** restore sobre producción  

**No cuenta:** 17/17 genéricos sin nombrar las tablas de 5.1.

### 5.8 Post-clon Supabase (manual — si se elige C)

- [ ] Storage (buckets + policies)  
- [ ] Auth (providers, redirects, usuarios prueba)  
- [ ] Realtime si aplica  
- [ ] Extensiones / jobs externos re-registrados  
- [ ] Env del app apunta a staging  

### 5.9 Fuera de este gate (después)

- E2E F1→F4 con wipe **antes** de despacho sanitizable  
- Refactor LogisticaModule / rutas (diferido)  

---

## 6. Plan inmediato (sin ejecutar aún)

1. **Inventario externo (humano/ops):** responder checklist §3.  
2. **Si hay dump/proyecto ITAD:** aprobar proyecto staging → **C aislado** → gate §5 + checklist post-clon.  
3. **Si no hay dump:** autorizar diseño/escritura de **baseline CREATE** de las 3 tablas (+ dependencias mínimas) en PR aparte; luego staging vacío + gate §5.  
4. Solo con gate verde → lote E2E.

---

## 7. Qué no hacer

- Usar `supabase/migrations` actuales como si ya fueran bootstrap completo del MVP.  
- Restaurar sobre producción.  
- Declarar Fase 0 cerrada por un 17/17 que no nombre las 3 tablas.  
- Confiar en `schema_dump.sql` o `restore_master.py` como respaldo de datos.

---

*Documento de reconciliación Fase 0. No modifica código de aplicación ni estado remoto.*
