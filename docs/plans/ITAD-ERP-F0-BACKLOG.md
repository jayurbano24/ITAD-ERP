# Backlog Fase 0 — ITAD ERP Guatemala

| Campo | Valor |
|-------|--------|
| Entrada | `docs/plans/ITAD-ERP-MVP-EXECUTION-PLAN.md` v3 |
| Objetivo | Cerrar gate F0 en **staging aislado** antes de F1–F4 |
| Fuera de este backlog | Refactor LogisticaModule, E2E completo, ventas/finanzas, offline-first |

**Dependencia transversal:** ADR de stack (**S1** reutilizar Next/TS del monolito **o** **S2** aislar módulo). Sin ADR no se abren tareas de UI/API del módulo; el resto de F0 sí puede avanzar.

---

## Épica F0-A — Fuente de datos

| ID | Tarea | Resultado / DoD | Owner sugerido |
|----|-------|-----------------|----------------|
| F0-A1 | Inventariar si existe dump/proyecto ITAD recuperable con `assets`, `operations_tickets`, `crm_entities`, `ticket_items` | Acta: URL/ref proyecto o ruta dump + fecha + checksum (sin pegar secretos) | Ops / responsable datos |
| F0-A2 | Decidir **C (restore aislado)** vs **baseline DDL** si no hay dump | Decisión firmada en el acta F0 | Responsable técnico |
| F0-A3 | Si hay Storage histórico: decidir migrar evidencias **sí / no / parcial** | Nota: archivos **no** vienen en dump Postgres | Ops + negocio |
| F0-A4 | Prohibir restore sobre producción / hosts compartidos | Confirmación en runbook | Responsable técnico |

---

## Épica F0-B — Proyecto de staging aislado

| ID | Tarea | Resultado / DoD | Owner sugerido |
|----|-------|-----------------|----------------|
| F0-B1 | Crear o asignar proyecto Supabase **staging** (org acordada, no prod) | Ref de proyecto + región documentados | Ops |
| F0-B2 | Aplicar fuente (restore dump **o** apply baseline revisado) | Schema accesible; sin tocar prod | Ops / backend |
| F0-B3 | Post-clon / post-create: configurar **Auth** (URLs, email confirm, usuarios prueba) | Login de prueba OK | Backend |
| F0-B4 | Post-clon: configurar **Storage** (buckets + policies) | Bucket evidencias operativo | Backend |
| F0-B5 | Post-clon: revisar **Realtime** / extensiones / jobs externos | Checklist firmado (N/A si no aplica) | Backend |
| F0-B6 | Wire env staging: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`; secreto privilegiado solo server-side si hace falta | App apunta a staging; sin secretos en cliente | Backend |

---

## Épica F0-C — Baseline / schema

| ID | Tarea | Resultado / DoD | Owner sugerido |
|----|-------|-----------------|----------------|
| F0-C1 | Si no hay dump: redactar DDL baseline que **cree** núcleo (`crm_entities`, `operations_tickets`, `ticket_items`, `assets`, warehouses, perfiles mínimos, enums) | PR revisado; **no** asumir que `supabase/migrations` bastan | Backend |
| F0-C2 | Validar FKs: ticket→cliente, items→ticket, assets↔lote/items | Query de integridad documentada | Backend |
| F0-C3 | Modelar separación ubicación / estado de proceso / disposición (columnas o tablas mínimas) | Documento de mapping + columnas existen | Backend + negocio |
| F0-C4 | Preparar soporte de registro wipe (§6 del plan): columnas/metadatos para método, estándar, serial medio, serial estación, operador, fecha, verificación, excepciones + link a Storage | Schema o tabla evidencia alineada | Backend |
| F0-C5 | Runbook “reset/restore reproducible” con hash/versión de fuente | Markdown en `docs/` o runbook ops | Ops |

---

## Épica F0-D — Permisos, RLS y rutas privilegiadas

| ID | Tarea | Resultado / DoD | Owner sugerido |
|----|-------|-----------------|----------------|
| F0-D1 | Habilitar RLS en tablas núcleo; policies para `authenticated` según roles MVP | `anon` sin write | Backend |
| F0-D2 | Acceso normal = **sesión usuario + RLS**; inventariar call sites que usan privilegio | Lista de rutas que aún necesitan secreto | Backend |
| F0-D3 | Reducir privilegio: solo operaciones server justificadas; plan migrar legacy `service_role` → **secret keys** Supabase | Nota de migración de claves | Backend |
| F0-D4 | Gate o exclusión de `/api/admin/*` y `/api/debug/*` en staging (authz rol o deshabilitar) | Curl anónimo/autenticado no-admin → denegado | Backend |
| F0-D5 | Secretos nunca en `NEXT_PUBLIC_*` ni fallbacks embebidos en cliente/middleware para privilegio | Revisión estática de nombres de env | Backend |

---

## Épica F0-E — Auth y roles

| ID | Tarea | Resultado / DoD | Owner sugerido |
|----|-------|-----------------|----------------|
| F0-E1 | Usuario(s) de prueba + `profiles.role` (+ `allowed_modules` si aplica) | Login → dashboard según rol | Backend |
| F0-E2 | Documentar roles mínimos MVP (p.ej. super_admin, logistics, tech_lead) | Tabla rol→módulos | Negocio + backend |

---

## Épica F0-F — Bucket de evidencias wipe

| ID | Tarea | Resultado / DoD | Owner sugerido |
|----|-------|-----------------|----------------|
| F0-F1 | Crear bucket evidencias (nombre acordado) + policies autenticadas | Upload/list de prueba OK | Backend |
| F0-F2 | Si F0-A3 = migrar: copiar evidencias históricas al bucket staging | Inventario contado origen vs destino | Ops |
| F0-F3 | Si F0-A3 = no migrar: documentar “staging sin histórico de archivos” | Acta | Negocio |

---

## Épica F0-G — Gate de aceptación F0

| ID | Tarea | Resultado / DoD | Owner sugerido |
|----|-------|-----------------|----------------|
| F0-G1 | Ejecutar checklist §7.4 del plan de ejecución | Checklist verde o lista de gaps | QA / técnico |
| F0-G2 | Registrar ADR stack **S1 o S2** | ADR mergeado o aprobado | Responsable |
| F0-G3 | Acta “F0 cerrado — autorizado F1” (o no-go) | Firma responsable | Responsable |

---

## Orden sugerido

```
F0-A1 → F0-A2 → F0-B1
              ↘ F0-A3 / F0-A4
F0-B2 (restore o baseline F0-C*) → F0-B3 → F0-B4 → F0-B5 → F0-B6
F0-D* y F0-E* en paralelo tras B2
F0-F* tras B4
F0-G* al final
F0-G2 (ADR stack) puede ir en paralelo desde el inicio
```

---

## Criterio de salida del backlog F0

Todas las épicas A–G en Done (o N/A justificado), gate F0 verde, ADR stack decidido → **autorización explícita para abrir F1** (y tareas UI/API del módulo solo si S1/S2 lo permite).

---

*Backlog F0 — fuente, staging, schema, permisos, Auth, bucket, gate.*
