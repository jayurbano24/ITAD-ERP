


import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const serial = url.searchParams.get('serial')

  if (!serial) {
    return NextResponse.json({ error: 'Serial requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Buscar el activo por Serial o Tag Interno (Consulta optimizada)
  const { data: assets, error: assetError } = await supabase
    .from('assets')
    .select('id, serial_number')
    .or(`serial_number.eq.${serial},internal_tag.eq.${serial}`)
    .limit(1)

  if (assetError || !assets?.length) {
    return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
  }

  const asset = assets[0]

  // 2. Obtener historial real ORDENADO DESCENDENTE (Lo más nuevo arriba)
  const { data: assetHistory, error: historyError } = await supabase
    .from('asset_history')
    .select(`id, action, module, details, previous_status, new_status, location, comments, created_at`)
    .eq('asset_id', asset.id)
    .order('created_at', { ascending: false }); // <-- CRÍTICO: Ver lo más reciente primero

  if (historyError) {
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }

  // 3. Obtener última work order con Join de perfiles para el técnico
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select(`*, profiles:technician_id (full_name)`)
    .eq('asset_id', asset.id)
    .order('updated_at', { ascending: false })
    .limit(1)

  const workOrder = workOrders?.[0] || null

  // 4. Mapeo de respuesta para compatibilidad con las columnas de tu tabla
  const responsePayload = {
    assetId: asset.id,
    serial: asset.serial_number,
    workOrder: workOrder ? {
      ...workOrder,
      technicianName: workOrder.profiles?.full_name || 'No asignado'
    } : null,
    // Formateamos el historial para que coincida con los headers de tu imagen
    history: (assetHistory || []).map(h => ({
      id: h.id,
      fecha: h.created_at,
      estado: h.new_status,
      bodega: h.location || 'N/A',
      accion: h.action,
      modulo: h.module,
      comentario: h.comments || 'N/A',
      // Extraemos diagnóstico/reparación del JSON de detalles si están disponibles
      diagnostico: h.details?.diagnosis || 'N/A',
      reparacion: h.details?.resolution || 'N/A',
      tecnico: workOrder?.profiles?.full_name || 'Sistema'
    }))
  }

  return NextResponse.json(responsePayload)
}
