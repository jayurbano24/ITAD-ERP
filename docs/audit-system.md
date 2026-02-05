# Sistema de Auditoría - ERP ITAD Guatemala

## 📋 Descripción General

Sistema completo de auditoría que registra automáticamente todas las acciones del sistema y permite agregar comentarios manuales. Proporciona trazabilidad completa de Tickets, Lotes y Números de Serie.

---

## 🏗️ Arquitectura del Sistema

### Base de Datos

**Tabla principal:** `audit_logs`

```sql
- id: UUID (PK)
- action: ENUM (CREATE, UPDATE, DELETE, STATUS_CHANGE, COMMENT, etc.)
- module: ENUM (TICKETS, LOGISTICS, RECEPTION, WAREHOUSE, etc.)
- description: TEXT (descripción legible para humanos)
- user_id, user_name, user_email, user_role: Datos del usuario
- entity_type: ENUM (TICKET, BATCH, ASSET)
- entity_id, entity_reference: Identificación de la entidad
- ticket_id, batch_id, asset_id: Relaciones cruzadas
- data_before, data_after: JSONB (estado antes/después)
- changes_summary: JSONB (resumen de cambios)
- created_at: TIMESTAMPTZ
```

### Triggers Automáticos

Se registran automáticamente:
- ✅ **TICKETS**: Creación, actualizaciones, cambios de estado
- ✅ **BATCHES (LOTES)**: Creación, actualizaciones, cambios de ubicación/estado
- ✅ **ASSETS (SERIES)**: Creación, actualizaciones, movimientos, cambios de precio

---

## 🎯 Casos de Uso

### 1. Registro Automático

**Ejemplo: Cambio de estado de ticket**
```typescript
// Automático al ejecutar:
UPDATE operations_tickets SET status = 'completed' WHERE id = '...'

// Genera en audit_logs:
{
  action: 'STATUS_CHANGE',
  module: 'TICKETS',
  description: 'Estado cambiado de in_progress a completed',
  entity_type: 'TICKET',
  entity_reference: 'TK-2026-00123',
  changes_summary: {
    status: { old: 'in_progress', new: 'completed' }
  }
}
```

### 2. Comentarios Manuales

**Endpoint:** `POST /api/audit/comments`

```typescript
// Agregar comentario
const response = await fetch('/api/audit/comments', {
  method: 'POST',
  body: JSON.stringify({
    entityType: 'TICKET', // o 'BATCH' o 'ASSET'
    entityId: 'uuid-del-ticket',
    entityReference: 'TK-2026-00123',
    comment: 'Cliente solicitó prioridad alta',
    module: 'TICKETS'
  })
})
```

### 3. Consultar Historial

**Endpoint:** `GET /api/audit/comments`

```typescript
// Obtener historial de un ticket
const logs = await fetch('/api/audit/comments?entityType=TICKET&entityId=...')

// Con filtros
const logs = await fetch('/api/audit/comments?entityType=TICKET&entityId=...&action=COMMENT&userId=...')
```

---

## 🎨 Uso del Componente UI

### Integración en Tickets

```tsx
import AuditTimeline from '@/components/audit/AuditTimeline'

<AuditTimeline
  entityType="TICKET"
  entityId={ticket.id}
  entityReference={ticket.readable_id}
  module="TICKETS"
  showAddComment={true}
/>
```

### Integración en Lotes

```tsx
<AuditTimeline
  entityType="BATCH"
  entityId={batch.id}
  entityReference={batch.internal_batch_id}
  module="LOGISTICS"
  showAddComment={true}
/>
```

### Integración en Series

```tsx
<AuditTimeline
  entityType="ASSET"
  entityId={asset.id}
  entityReference={asset.serial_number}
  module="WAREHOUSE"
  showAddComment={true}
/>
```

---

## 🔐 Permisos y Seguridad

### Políticas RLS (Row Level Security)

#### Administrador / Superadmin
- ✅ Ver todos los logs
- ✅ Agregar comentarios en cualquier entidad
- ✅ Aplicar filtros avanzados
- ❌ NO puede editar ni eliminar logs (inmutables)

#### Supervisor
- ✅ Ver logs de su módulo
- ✅ Agregar comentarios
- ✅ Ver historial completo de tickets asignados
- ❌ NO puede ver logs de otros módulos
- ❌ NO puede editar ni eliminar

#### Usuario Operativo
- ✅ Ver sus propios logs
- ✅ Agregar comentarios en registros asignados
- ❌ NO puede ver logs de otros usuarios
- ❌ NO puede editar ni eliminar

#### Cliente
- ✅ Ver logs de sus propios tickets (si se implementa portal)
- ❌ NO puede agregar comentarios
- ❌ NO puede ver datos sensibles (precios, costos)

---

## 📊 Eventos Registrados Automáticamente

### TICKETS (operations_tickets)
- `CREATE`: Ticket creado
- `UPDATE`: Datos actualizados
- `STATUS_CHANGE`: Cambio de estado
- `COMMENT`: Comentario manual

### BATCHES (batches)
- `CREATE`: Lote creado
- `UPDATE`: Datos actualizados
- `STATUS_CHANGE`: Cambio de estado del lote
- `MOVE`: Cambio de ubicación
- `COMMENT`: Comentario manual

### ASSETS (assets)
- `CREATE`: Serie registrada
- `UPDATE`: Datos actualizados
- `STATUS_CHANGE`: Cambio de estado
- `MOVE`: Cambio de ubicación en bodega
- `TRANSFER`: Transferencia entre bodegas
- `LIQUIDATE`: Precio de venta actualizado
- `COMMENT`: Comentario manual

---

## 🛡️ Reglas de Negocio

### Inmutabilidad
- ❌ **NO se pueden editar** registros de audit_logs
- ❌ **NO se pueden eliminar** registros (solo admins con SQL directo)
- ✅ Los logs son **permanentes y auditables**

### Validaciones de Comentarios
- Mínimo 3 caracteres
- Máximo 1000 caracteres
- No puede estar vacío o solo espacios
- Se guarda con información del usuario autenticado

### Relaciones Cruzadas
- Un log de ASSET se vincula automáticamente a su BATCH y TICKET
- Un log de BATCH se vincula automáticamente a su TICKET
- Permite trazabilidad completa en toda la cadena

---

## 🚀 Extensibilidad

### Agregar Nuevo Trigger

```sql
CREATE OR REPLACE FUNCTION trigger_audit_nueva_tabla()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM log_audit_event(
        'CREATE'::audit_action_type,
        'MODULO'::audit_module_type,
        format('Descripción: %s', NEW.campo),
        'ENTITY_TYPE'::audit_entity_type,
        NEW.id,
        NEW.reference_field,
        NEW.ticket_id,
        NEW.batch_id,
        NEW.asset_id,
        NULL,
        to_jsonb(NEW),
        jsonb_build_object('campo', NEW.campo),
        auth.uid()
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_nueva_tabla_trigger
AFTER INSERT ON nueva_tabla
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_nueva_tabla();
```

### Agregar Nueva Acción

```sql
-- Modificar ENUM
ALTER TYPE audit_action_type ADD VALUE 'NUEVA_ACCION';
```

### Personalizar Colores en UI

```typescript
// En AuditTimeline.tsx
const actionColors: Record<string, { bg: string; text: string; icon: string }> = {
  NUEVA_ACCION: { 
    bg: 'bg-lime-500/20', 
    text: 'text-lime-400', 
    icon: '🚀' 
  }
}
```

---

## 📈 Consultas Útiles

### Ver últimos 50 logs del sistema
```sql
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

### Ver historial completo de un ticket
```sql
SELECT * FROM audit_logs
WHERE ticket_id = 'uuid-del-ticket'
ORDER BY created_at ASC;
```

### Ver comentarios manuales
```sql
SELECT * FROM audit_logs
WHERE action = 'COMMENT'
ORDER BY created_at DESC;
```

### Ver cambios de estado
```sql
SELECT 
  entity_reference,
  description,
  user_name,
  created_at
FROM audit_logs
WHERE action = 'STATUS_CHANGE'
ORDER BY created_at DESC;
```

### Auditoría por usuario
```sql
SELECT 
  user_name,
  action,
  module,
  COUNT(*) as total_acciones
FROM audit_logs
WHERE user_id = 'uuid-del-usuario'
GROUP BY user_name, action, module
ORDER BY total_acciones DESC;
```

---

## ✅ Checklist de Implementación

1. [ ] Ejecutar migración: `20260209_audit_logs_system.sql`
2. [ ] Verificar que los triggers se crearon correctamente
3. [ ] Probar registro automático (crear ticket, actualizar estado)
4. [ ] Probar API de comentarios: `POST /api/audit/comments`
5. [ ] Integrar componente `<AuditTimeline>` en páginas de tickets
6. [ ] Integrar componente en páginas de lotes
7. [ ] Integrar componente en páginas de series
8. [ ] Configurar permisos RLS según roles
9. [ ] Capacitar a usuarios sobre comentarios manuales
10. [ ] Documentar flujos de auditoría en manual de usuario

---

## 🎯 Próximas Mejoras (Roadmap)

- [ ] Exportar historial a PDF/Excel
- [ ] Notificaciones por email en eventos críticos
- [ ] Dashboard de auditoría con métricas
- [ ] Búsqueda avanzada con texto completo
- [ ] Comparador visual de cambios (diff viewer)
- [ ] Alertas automáticas por patrones anómalos
- [ ] Integración con sistema de notificaciones
- [ ] API para reportes de auditoría personalizados

---

## 📞 Soporte

Para preguntas sobre el sistema de auditoría:
- Revisar documentación técnica en `/docs/audit-system.md`
- Consultar logs en la tabla `audit_logs`
- Verificar políticas RLS en Supabase Dashboard
