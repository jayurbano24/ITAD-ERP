# Recepción por Receipt of Equipment — Plan de implementación

> **For agentic workers:** Implementar por fases; cada fase deja recepción y bodega operativas.

**Goal:** Flujo auditable: ticket → importación Receipt (PDF/Excel/OCR) → revisión humana → manifiesto esperado → pistoleo con validación → conciliación y cierre parcial.

**Architecture:** Reutilizar `operations_tickets`, `ticket_items`, Storage `ticket-attachments` y APIs en `/api/recepcion/*` y `/api/tickets/*`. Añadir tablas de documentos, eventos de escaneo y snapshot de conciliación. Validación de serie centralizada en biblioteca compartida + RPC Postgres con advisory lock.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + Storage + RLS), sharp/tesseract/pdf-parse, TypeScript.

**Spec:** Requerimientos funcionales/técnicos del usuario (ORD26876 / CJQQ1T3).

## Global Constraints

- No romper flujos actuales de **Bodega (BOD-REC)** y **Taller**.
- Migraciones **idempotentes** (`IF NOT EXISTS`).
- **tenant_id:** el esquema actual es **single-tenant** (sin columna tenant). Fase 5 añade tenant si el negocio lo exige; RLS por `auth.uid()` y roles hasta entonces.
- OCR **nunca** confirma activos definitivos sin paso de revisión (`import_status = confirmed`).
- Adicionales **nunca** automáticos sin decisión del operador.

---

## Diagnóstico del módulo actual (2026-11-23)

### Ya reutilizable

| Área | Artefactos |
|------|------------|
| Ticket | `operations_tickets`, `createTicketAction`, `TicketsTable`, ORD/EPC |
| Manifiesto | `ticket_items` (`expected_serial`, `collected_serial`, `validation_status`, `reception_metadata`) |
| Import OCR/PDF | `receiptPrefillService`, `parseEquipmentReceipt`, `/api/tickets/receipt-prefill` |
| Adjunto único | `attachment_url` / `attachment_name`, upload en create + `/api/tickets/[id]/receipt-manifest` |
| Series del PDF | `alignTicketItemsWithReceiptSerials`, `/api/tickets/[id]/receipt-serials-sync` |
| Recepción UI | `RecepcionModule`, `ReceptionPitoleoPanel`, `ReceiptSerialMatchHint` |
| Escaneo | `/api/recepcion/serials` (scan, additional, setQuantity) |
| Cierre parcial | `ReceptionCloseConfirmModal`, `/api/recepcion/complete` |
| Recibo firmable | `EquipmentReceiptSection`, PDF builders |

### Brechas vs spec

| Requerimiento | Estado |
|---------------|--------|
| Crear ticket antes de importar | Hecho |
| Varios Receipt por ticket | **Pendiente** (solo 1 `attachment_url`) |
| Pantalla revisión pre-confirmación | **Parcial** (prefill en modal crear ticket, sin `import_status`) |
| Coincidencia exacta serie normalizada | **Parcial** (UI + 409; falta librería única + RPC) |
| Diálogo discrepancia (reassign/additional/cancel) | **Parcial** (`confirm()`); modal estructurado en Fase 2 |
| Serie en otro ticket | **Parcial** (duplicado en mismo ticket) |
| Conciliación report final | **Parcial** (resumen en modal cierre) |
| Audit trail escaneos | **Pendiente** (tabla eventos) |
| Concurrencia escaneo | **Pendiente** (advisory lock) |
| Tests automatizados | **Inicio** (normalize/validate) |

### ENUM `ticket_validation_status`

Valores usados: `PENDIENTE_VALIDACION`, `VALIDADO`, `EXTRA`, `FALTANTE`, `DISCREPANCIA` (app; verificar ENUM en BD).

---

## Fases

### Fase 1 — Fundación (esta entrega)

- [x] Migración: `ticket_equipment_receipt_documents`, `ticket_reception_scan_events`, `ticket_reception_conciliation`
- [x] `normalizeSerial` + `evaluateSerialScan` + prueba node:test
- [x] Modal `ReceptionSerialDecisionModal` (reemplazar `confirm` en mismatch)
- [ ] API serials: registrar eventos + usar `evaluateSerialScan`
- [ ] RPC `reception_try_register_serial` con advisory lock (Fase 1b siguiente PR)

### Fase 2 — Importación con revisión

- Pantalla **Revisar importación** tras OCR (líneas editables, confianza OCR)
- Confirmación → `ticket_items` + fila en `ticket_equipment_receipt_documents.import_status = confirmed`
- Múltiples documentos por ticket

### Fase 3 — Conciliación y anexo

- Reporte PDF/HTML conciliación al cerrar
- Anexo auditable (adicionales, reassign, discrepancias)
- Persistir en `ticket_reception_conciliation`

### Fase 4 — Seguridad y concurrencia

- RLS en tablas nuevas
- `pg_try_advisory_xact_lock` en RPC de registro
- Tests integración API + concurrencia

### Fase 5 — Multi-tenant (si aplica)

- `tenant_id` en tickets y documentos; políticas RLS

---

## Criterios de aceptación (ORD26876)

1. Import PDF → revisión → 1× Laptop Dell Latitude 7430, serie **CJQQ1T3** en `expected_serial`.
2. Escanear **CJQQ1T3** → `exact_match`, estado VALIDADO.
3. Escanear otra serie → modal decisión (no auto-adicional).
4. Re-escanear misma serie → bloqueo duplicado.
5. Cierre → conciliación con trazabilidad (eventos + notas faltantes/adicionales).

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `supabase/migrations/20261123_ticket_reception_conciliation_audit.sql` | Tablas auditoría |
| `src/lib/reception/normalizeSerial.ts` | Normalización |
| `src/lib/reception/evaluateSerialScan.ts` | Reglas de negocio escaneo |
| `src/app/recepcion/components/ReceptionSerialDecisionModal.tsx` | UI discrepancia |
| `src/app/api/recepcion/serials/route.ts` | Orquestación API |
| `scripts/test-reception-serial-validation.mjs` | Tests unitarios |