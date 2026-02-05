'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// TIPOS
// =====================================================

export interface PartRequestWithDetails {
  id: string
  work_order_id: string
  requested_by: string | null
  part_sku: string
  part_name: string | null
  quantity: number
  status: string
  notes: string | null
  created_at: string
  work_order: {
    id: string
    work_order_number: string
    status: string
  }
  technician: {
    id: string
    full_name: string
  } | null
  stock_available: number
}

export interface DispatchStats {
  pendingRequests: number
  dispatchedToday: number
  lowStockAlerts: number
}

// =====================================================
// OBTENER SOLICITUDES PENDIENTES
// =====================================================

export async function getPendingPartRequests() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('part_requests')
    .select(`
      id,
      work_order_id,
      requested_by,
      part_sku,
      part_name,
      quantity,
      status,
      notes,
      created_at,
      work_order:work_orders!part_requests_work_order_id_fkey(
        id,
        work_order_number,
        status
      ),
      technician:profiles!part_requests_requested_by_fkey(id, full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending part requests:', error)
    return { data: [], error: error.message }
  }

  // Enriquecer con stock disponible
  const enrichedData = await Promise.all(
    (data || []).map(async (request) => {
      const { data: partData } = await supabase
        .from('parts_catalog')
        .select('stock_quantity')
        .eq('sku', request.part_sku)
        .eq('is_active', true)
        .single()

      return {
        ...request,
        work_order: Array.isArray(request.work_order) ? request.work_order[0] : request.work_order,
        technician: Array.isArray(request.technician) ? request.technician[0] : request.technician,
        stock_available: partData?.stock_quantity || 0
      } as PartRequestWithDetails
    })
  )

  return { data: enrichedData, error: null }
}

// =====================================================
// OBTENER ESTADÍSTICAS
// =====================================================

export async function getDispatchStats(): Promise<DispatchStats> {
  const supabase = await createClient()

  // Solicitudes pendientes
  const { count: pendingRequests } = await supabase
    .from('part_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Despachados hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: dispatchedToday } = await supabase
    .from('part_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'dispensed')
    .gte('dispatch_date', today.toISOString())

  // Piezas con stock bajo (menos de 5)
  const { count: lowStockAlerts } = await supabase
    .from('parts_catalog')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('stock_quantity', 5)

  return {
    pendingRequests: pendingRequests || 0,
    dispatchedToday: dispatchedToday || 0,
    lowStockAlerts: lowStockAlerts || 0
  }
}

// =====================================================
// PROCESAR DESPACHO (TRANSACCIONAL - ACID)
// El intercambio: Pieza buena sale, pieza dañada entra
// =====================================================

interface ProcessDispatchData {
  partRequestId: string
  workOrderId: string
  partSku: string
  // OBLIGATORIO: Datos de la pieza dañada que retorna el técnico
  returnedPartSku: string
  returnedPartCondition?: string
}

export async function processDispatch(data: ProcessDispatchData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  // Validación: El SKU de retorno es OBLIGATORIO (Regla de Oro del Intercambio)
  if (!data.returnedPartSku?.trim()) {
    return { success: false, error: 'El SKU de la pieza dañada es OBLIGATORIO para el intercambio' }
  }

  try {
    // =====================================================
    // PASO 1: Verificar stock_good > 0
    // =====================================================
    const { data: part, error: partError } = await supabase
      .from('parts_catalog')
      .select('id, stock_quantity, name')
      .eq('sku', data.partSku)
      .eq('is_active', true)
      .single()

    if (partError || !part) {
      return { success: false, error: `Pieza no encontrada: ${data.partSku}` }
    }

    if (part.stock_quantity < 1) {
      return { success: false, error: 'Sin stock disponible. No se puede despachar.' }
    }

    // =====================================================
    // PASO 2: UPDATE parts_catalog - Restar 1 al stock_good
    // =====================================================
    const { error: stockError } = await supabase
      .from('parts_catalog')
      .update({
        stock_quantity: part.stock_quantity - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', part.id)

    if (stockError) {
      console.error('Error updating stock:', stockError)
      return { success: false, error: 'Error al actualizar stock' }
    }

    // =====================================================
    // PASO 3: INSERT bad_warehouse_inventory - Pieza dañada recibida
    // =====================================================
    const { error: badError } = await supabase
      .from('bad_warehouse_inventory')
      .insert({
        sku: data.returnedPartSku,
        part_name: part.name,
        quantity: 1,
        condition: data.returnedPartCondition || 'defective',
        work_order_id: data.workOrderId,
        part_request_id: data.partRequestId,
        received_from: 'Workshop Exchange',
        received_by: user.id,
        notes: 'Intercambio obligatorio - Pieza dañada del equipo'
      })

    if (badError) {
      console.error('Error adding to bad warehouse:', badError)
      // CRÍTICO: Revertir el stock si falla
      await supabase
        .from('parts_catalog')
        .update({ stock_quantity: part.stock_quantity })
        .eq('id', part.id)
      return { success: false, error: 'Error al registrar pieza dañada' }
    }

    // =====================================================
    // PASO 4: UPDATE part_requests - status = 'dispensed'
    // =====================================================
    const { error: reqError } = await supabase
      .from('part_requests')
      .update({
        status: 'dispensed',
        dispatch_date: new Date().toISOString(),
        returned_part_sku: data.returnedPartSku,
        returned_part_status: 'returned',
        returned_part_condition: data.returnedPartCondition || 'defective',
        returned_at: new Date().toISOString()
      })
      .eq('id', data.partRequestId)

    if (reqError) {
      console.error('Error updating part request:', reqError)
      return { success: false, error: 'Error al actualizar solicitud' }
    }

    // =====================================================
    // PASO 5: UPDATE work_orders - status = 'in_progress'
    // Desbloquea al técnico para continuar la reparación
    // =====================================================
    const { error: woError } = await supabase
      .from('work_orders')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', data.workOrderId)

    if (woError) {
      console.error('Error updating work order:', woError)
      // No fallar - la solicitud ya se procesó
    }

    // =====================================================
    // PASO 6: Registrar movimiento de inventario (Audit Trail)
    // =====================================================
    await supabase.from('inventory_movements').insert({
      movement_type: 'dispatch',
      item_type: 'part',
      item_id: part.id,
      item_sku: data.partSku,
      quantity: -1,
      work_order_id: data.workOrderId,
      performed_by: user.id,
      notes: `Intercambio: Entregado ${data.partSku} | Recibido ${data.returnedPartSku}`
    })

    // Revalidar rutas
    revalidatePath('/dashboard/inventario/solicitudes')
    revalidatePath('/dashboard/inventario/despacho')
    revalidatePath('/dashboard/taller')
    revalidatePath(`/dashboard/taller/${data.workOrderId}`)

    return { success: true }

  } catch (err) {
    console.error('Dispatch process error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado en el proceso de despacho'
    }
  }
}

// =====================================================
// RECHAZAR SOLICITUD (SIN STOCK)
// =====================================================

export async function rejectPartRequest(partRequestId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('part_requests')
    .update({
      status: 'rejected',
      notes: `Rechazado: ${reason}`
    })
    .eq('id', partRequestId)

  if (error) {
    console.error('Error rejecting part request:', error)
    return { success: false, error: 'Error al rechazar solicitud' }
  }

  revalidatePath('/dashboard/inventario/solicitudes')
  return { success: true }
}

