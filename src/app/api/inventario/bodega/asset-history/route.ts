import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Historial de un activo para el modal de Bodega.
 * Nota: la tabla `asset_history` no existe en esta BD; se arma desde
 * work_orders + inventory_movements + audit_logs (si hay).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const serial = (url.searchParams.get('serial') || '').trim()

    if (!serial) {
      return NextResponse.json({ error: 'Serial requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('id, serial_number, internal_tag, status, current_warehouse_id, created_at, updated_at, last_transfer_date')
      .or(`serial_number.eq.${serial},internal_tag.eq.${serial}`)
      .limit(1)

    if (assetError) {
      return NextResponse.json({ error: assetError.message }, { status: 500 })
    }
    if (!assets?.length) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
    }

    const asset = assets[0]

    // Work orders (puede no haber ninguna aún)
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('*, profiles:technician_id (full_name)')
      .eq('asset_id', asset.id)
      .order('updated_at', { ascending: false })
      .limit(5)

    const workOrder = workOrders?.[0] || null

    // Movimientos de inventario (si la tabla/columnas existen)
    type HistoryRow = {
      id: string
      fecha: string
      estado: string | null
      bodega: string
      accion: string
      modulo: string
      comentario: string
      diagnostico: string
      reparacion: string
      tecnico: string
    }

    const history: HistoryRow[] = []

    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('id, movement_type, notes, created_at, to_warehouse_id, from_warehouse_id')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (Array.isArray(movements)) {
      for (const m of movements) {
        history.push({
          id: m.id,
          fecha: m.created_at,
          estado: m.movement_type || null,
          bodega: 'N/A',
          accion: m.movement_type || 'MOVIMIENTO',
          modulo: 'INVENTARIO',
          comentario: m.notes || 'N/A',
          diagnostico: 'N/A',
          reparacion: 'N/A',
          tecnico: 'Sistema',
        })
      }
    }

    // Audit logs ligados al asset (schema real: record_id / changed_at)
    const { data: audits } = await supabase
      .from('audit_logs')
      .select('id, action, table_name, description, changed_at')
      .eq('record_id', asset.id)
      .order('changed_at', { ascending: false })
      .limit(50)

    if (Array.isArray(audits)) {
      for (const a of audits) {
        history.push({
          id: a.id,
          fecha: a.changed_at,
          estado: a.action || null,
          bodega: 'N/A',
          accion: a.action || 'AUDIT',
          modulo: a.table_name || 'SISTEMA',
          comentario: a.description || 'N/A',
          diagnostico: 'N/A',
          reparacion: 'N/A',
          tecnico: 'Sistema',
        })
      }
    }

    // Evento sintético de recepción si no hay historial aún
    if (history.length === 0) {
      history.push({
        id: `recv-${asset.id}`,
        fecha: asset.last_transfer_date || asset.created_at || new Date().toISOString(),
        estado: asset.status || 'received',
        bodega: 'BOD-REC',
        accion: 'RECEPCION',
        modulo: 'RECEPCION',
        comentario: `Activo ${asset.serial_number || asset.internal_tag} en Bodega Recepción`,
        diagnostico: 'N/A',
        reparacion: 'N/A',
        tecnico: 'Sistema',
      })
    }

    history.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    const technicianName =
      (workOrder as { profiles?: { full_name?: string } | null } | null)?.profiles?.full_name ||
      'No asignado'

    return NextResponse.json({
      assetId: asset.id,
      serial: asset.serial_number,
      workOrder: workOrder
        ? {
            ...workOrder,
            technicianName,
          }
        : null,
      history,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al obtener historial'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
