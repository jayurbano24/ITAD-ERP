# Plan de ejecución MVP — ITAD ERP Guatemala

| Campo | Valor |
|-------|--------|
| Estado | Listo para backlog F0 (precisiones de seguridad, privilegios, stack, wipe) |
| Dictamen previo | READY WITH BLOCKERS — P0 DB primero |
| Fuera de MVP | Ventas avanzadas, finanzas/P&L, partes avanzadas, portal B2B, multi-país, BI, MDM/upgrade framework, offline-first |
| Decisión pendiente | Stack del módulo (§3): ¿reutilizar Next/TS del monolito o aislarlo? |

---

## 1. Promesa del MVP

Un operador, desde un **navegador tipo kiosco** con conexión a Supabase del proyecto correcto, lleva un lote:

**Cliente/ticket → logística → recepción → bodega (movimientos + decisión de disposición) → wipe con evidencia (si aplica sanitización) → despacho o destrucción documentada.**

Trazabilidad mínima: **serial del equipo**, **ubicación de bodega**, **evidencia/documento de wipe o destrucción** (incluye wipe hecho desde otra estación).

### 1.1 Kiosco vs offline

| Interpretación | ¿En MVP? | Implicación |
|----------------|----------|-------------|
| **Kiosco con red a Supabase** | **Sí** | A9 = operar contra el proyecto configurado |
| Offline-first real | **No** | Cola local, sync, dedupe (incl. evidencias) → post-MVP |

---

## 2. Ubicación vs estado vs disposición

| Concepto | Ejemplos | Significa |
|----------|----------|-----------|
| **Ubicación** | `BOD-REC`, `REM`, `VAL`, `HARV`, `DES` | Dónde está el asset |
| **Estado de proceso** | `received`, `wiping`, `wiped`, … | Etapa del flujo |
| **Disposición / salida** | Sanitizar→despachar \| Destruir + documento | Qué se hará/hizo; el documento acredita |

- Ubicado en `BOD-DES` ≠ destrucción completada.  
- Despacho TRANSFER de sanitizables solo tras wipe + evidencia (F3 → F4).

---

## 3. Decisión de stack (bloqueante antes de tareas UI/API)

El repositorio es **Next.js 14 + TypeScript**. Hubo una exclusión comunicada de no introducir PHP / Next / TypeScript en un “módulo nuevo”.

| Opción | Implicación | Cuándo programar UI/API |
|--------|-------------|-------------------------|
| **S1 — Reutilizar monolito** | Excepción aprobada; F1–F4 sobre el código actual | Tras F0 + ADR de excepción |
| **S2 — Aislar módulo** | Sidecar u otro runtime sin Next/TS; contratos con el monolito | Tras F0 + diseño de frontera API |

**Sin ADR S1 o S2 no se abren tareas de UI/API del módulo.** F0 (datos/Auth/Storage/permisos) puede avanzar en paralelo.

---

## 4. Cadena canónica

1. Cliente + ticket (`crm_entities`, `operations_tickets`, `ticket_items`)  
2. Logística  
3. Recepción → asset en `BOD-REC`  
4. Bodega: movimientos + decisión de disposición (**sin** despacho TRANSFER sanitizable)  
5. Taller mínimo (opcional si no bloquea wipe)  
6. **Wipe** + evidencia completa (§6)  
7. **Salida documentada** (TRANSFER post-wipe o destrucción con certificado)

---

## 5. Fases de construcción

| Fase | Objetivo | Exit |
|------|----------|------|
| **F0 — Fundación + seguridad base** | Staging aislado, schema, Auth, RLS, roles, bucket evidencias, **protección admin/debug**, privilegios solo server-side | Gate F0 (§7) |
| **F1 — Ingreso** | Cliente → ticket → logística → recepción → `BOD-REC` | Lote con serials en REC |
| **F2 — Bodega + disposición** | Movimientos + decisión sanitizar/destruir; **sin** TRANSFER sanitizable; **sin** “venta” | Movimiento + disposición registrada |
| **F3 — Wipe** | Evidencia trazable (§6), incl. estación distinta | Registro wipe completo + archivos en bucket |
| **F4 — Salida documentada** | TRANSFER si wipe OK, o destrucción certificada | Documento ligado al asset |
| **F5 — Gate de liberación (antes de producción)** | Hardening final, re-chequeo RLS/admin/debug, humo E2E A1–A9 | **Go / no-go prod** — ocurre **antes** de producción, no “después del MVP en prod” |

F5 **no** es post-producción: cierra el MVP para liberar. Post-MVP (offline, ventas, etc.) es roadmap aparte.

---

## 6. Evidencia de wipe (trazabilidad mínima)

Cada wipe registrado debe poder acreditar (campos de negocio; mapping a columnas/Storage en F0/F3):

| Campo | Descripción |
|-------|-------------|
| Método / procedimiento | Qué se ejecutó |
| Estándar aplicado | p.ej. referencia NIST/R2 u otro acordado |
| Serial del medio borrado | Disco/dispositivo sanitizado |
| Serial de estación / PC usada | Equipo desde el que se borró (puede ser distinto al asset) |
| Operador | Quién ejecutó |
| Fecha/hora | Timestamp del wipe |
| Resultado de verificación | Pass/fail u resultado del chequeo |
| Certificado / evidencia | Archivo(s) en bucket + enlace/metadatos |
| Excepciones | Motivo si no aplica wipe completo o hay desviación |

Cubre el caso: **activo trazado en el ERP, borrado físico desde otra computadora.**

---

## 7. Fase 0 — Criterios y privilegios

### 7.1 Estrategia de datos

1. Dump/respaldo **verificado** → proyecto **staging aislado** (preferido).  
2. Si no hay dump → **DDL baseline revisado** (migrations actuales **no** crean el núcleo) → staging vacío.  
3. **No** restaurar sobre producción.  
4. Post-clon: configurar a mano **Auth, Storage, Realtime**; los **objetos de Storage no viajan con el dump de Postgres** → decidir si se migran evidencias históricas (sí/no/parcial) y documentarlo.

### 7.2 Acceso privilegiado (no “service role obligatorio siempre”)

- El **acceso normal** usa **sesión del usuario + RLS**.  
- Acceso privilegiado (clave secreta / legacy `service_role`) **solo** cuando una operación de **servidor** lo necesite (p.ej. admin justificado).  
- Secretos **nunca** en el navegador (`NEXT_PUBLIC_*` prohibido para privilegios).  
- Preferir migrar de claves heredadas `service_role` a **secret keys** nuevas de Supabase cuando el proyecto lo permita.  
- Rutas `/api/admin/*` y `/api/debug/*`: gate de rol en backend o fuera del deploy de staging/prod.

### 7.3 Seguridad ya en F0 (no dejar todo para F5)

F0 debe incluir:

- RLS en tablas núcleo  
- Roles / permisos de prueba  
- Protección o exclusión de admin/debug en el entorno de trabajo  

F5 re-verifica y firma liberación a producción.

### 7.4 Checklist gate F0

- [ ] Staging aislado (no prod).  
- [ ] Existen `crm_entities`, `operations_tickets`, `ticket_items`, `assets` (+ relaciones).  
- [ ] RLS + perfil/rol de prueba.  
- [ ] Login OK.  
- [ ] Bucket evidencias wipe + upload autenticado.  
- [ ] Decisión documentada sobre **migración de archivos históricos** de Storage.  
- [ ] Post-clon: Auth, Storage, Realtime revisados.  
- [ ] Privilegio: sesión+RLS por defecto; secreto solo server + authz.  
- [ ] Admin/debug gated o ausentes en staging.  
- [ ] Runbook restore/baseline reproducible.  
- [ ] ADR stack **S1 o S2** registrado (bloquea UI/API del módulo, no el resto de F0).

---

## 8. A1–A9 (E2E producto)

| ID | Criterio |
|----|----------|
| A1 | Login + módulos por rol |
| A2 | Cliente + ticket + ítems |
| A3 | Logística cerrada |
| A4 | Recepción → asset + serial en `BOD-REC` |
| A5 | F2: movimientos + disposición (sin TRANSFER sanitizable) |
| A6 | F3: wipe con campos §6 + evidencia en Storage |
| A7 | F4: salida documentada (TRANSFER post-wipe o destrucción certificada; DES ≠ destruido) |
| A8 | Auditoría mínima |
| A9 | Contra Supabase del entorno (kiosco); no offline |

---

## 9. Referencias

- `docs/audits/ITAD-ERP-MVP-READINESS-REVIEW.md`  
- `docs/audits/ITAD-ERP-FASE0-SCHEMA-SOURCE-AND-GATE.md`  
- Backlog F0: `docs/plans/ITAD-ERP-F0-BACKLOG.md`

---

*v3 — seguridad en F0, privilegios mínimos, decisión de stack, evidencia wipe ampliada, F5 pre-producción.*
