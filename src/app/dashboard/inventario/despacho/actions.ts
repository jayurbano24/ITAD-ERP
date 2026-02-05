'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// TIPOS
// =====================================================

export interface PendingDispatchOrder {
  id: string
  work_order_number: string
  status: string
  priority: string
  reported_issue: string | null
  failure_type: string | null
  original_imei: string | null
  original_serial: string | null
  created_at: string
  asset?: {
    id: string
    internal_tag: string
    serial_number: string | null
    manufacturer: string | null
    model: string | null
    asset_type: string
  }
  part_requests?: PartRequest[]
}

export interface PartRequest {
  id: string
  part_sku: string
  part_name: string | null
  quantity: number
  status: string
  created_at: string
}

export interface PartCatalogItem {
  id: string
  sku: string
  name: string
  description: string | null
  category: string
  stock_quantity: number
  min_stock_level: number
  location: string | null
  unit_cost: number | null
}

export interface SeedstockItem {
  id: string
  imei: string | null
  serial_number: string | null
  brand: string
  model: string
  color: string | null
  storage_capacity: string | null
  status: string
  condition: string
  warehouse_location: string | null
}

// =====================================================
// OBTENER ÓRDENES PENDIENTES DE PIEZAS
// =====================================================

export async function getOrdersWaitingParts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      work_order_number,
      status,
      priority,
      reported_issue,
      failure_type,
      created_at,
      asset:assets(id, internal_tag, serial_number, manufacturer, model, asset_type),
      part_requests(id, part_sku, part_name, quantity, status, created_at)
    `)
    .eq('status', 'waiting_parts')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching orders waiting parts:', error)
    return { data: [], error: error.message }
  }

  const normalized = (data || []).map(order => ({
    ...order,
    asset: Array.isArray(order.asset) ? order.asset[0] : order.asset
  })) as PendingDispatchOrder[]

  return { data: normalized, error: null }
}

// =====================================================
// OBTENER ÓRDENES PENDIENTES DE SEEDSTOCK
// =====================================================

export async function getOrdersWaitingSeedstock() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      work_order_number,
      status,
      priority,
      reported_issue,
      failure_type,
      original_imei,
      original_serial,
      created_at,
      asset:assets(id, internal_tag, serial_number, manufacturer, model, asset_type)
    `)
    .eq('status', 'waiting_seedstock')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching orders waiting seedstock:', error)
    return { data: [], error: error.message }
  }

  const normalized = (data || []).map(order => ({
    ...order,
    asset: Array.isArray(order.asset) ? order.asset[0] : order.asset
  })) as PendingDispatchOrder[]

  return { data: normalized, error: null }
}

// =====================================================
// OBTENER CATÁLOGO DE PIEZAS
// =====================================================

export async function getPartsWithStock() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parts_catalog')
    .select('*')
    .gt('stock_quantity', 0)
    .order('name')

  if (error) {
    console.error('Error fetching parts:', error)
    return { data: [], error: error.message }
  }

  return { data: data as PartCatalogItem[], error: null }
}

// =====================================================
// BUSCAR PIEZA POR SKU
// =====================================================

export async function searchPartBySku(sku: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parts_catalog')
    .select('*')
    .ilike('sku', `%${sku}%`)
    .limit(10)

  if (error) {
    console.error('Error searching parts:', error)
    return { data: [], error: error.message }
  }

  return { data: data as PartCatalogItem[], error: null }
}

// =====================================================
// OBTENER SEEDSTOCK DISPONIBLE
// =====================================================

export async function getAvailableSeedstock(brand?: string, model?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('seedstock_inventory')
    .select('*')
    .eq('status', 'available')
    .order('brand')
    .order('model')

  if (brand) {
    query = query.ilike('brand', `%${brand}%`)
  }
  if (model) {
    query = query.ilike('model', `%${model}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching seedstock:', error)
    return { data: [], error: error.message }
  }

  return { data: data as SeedstockItem[], error: null }
}

// =====================================================
// DESPACHAR PIEZA (CON INTERCAMBIO OBLIGATORIO) - LEGACY
// Nota: el flujo actual en UI usa `dispatchPartSimple` (solo SKU).
// =====================================================

interface DispatchPartData {
  workOrderId: string
  partRequestId: string
  partSku: string
  returnedSku: string
  returnedSerial: string
  returnedCondition: string
}

export async function dispatchPart(data: DispatchPartData) {
  const supabase = await createClient()

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  // Validar datos obligatorios
  if (!data.returnedSku || !data.returnedSerial) {
    return {
      success: false,
      error: 'El SKU y Serial de la pieza dañada son obligatorios (Regla de Intercambio)'
    }
  }

  // Llamar a la función transaccional en PostgreSQL
  const { data: result, error } = await supabase.rpc('dispatch_part', {
    p_work_order_id: data.workOrderId,
    p_part_request_id: data.partRequestId,
    p_part_sku: data.partSku,
    p_returned_sku: data.returnedSku,
    p_returned_serial: data.returnedSerial,
    p_returned_condition: data.returnedCondition,
    p_performed_by: user.id
  })

  if (error) {
    console.error('Error dispatching part:', error)
    return { success: false, error: error.message }
  }

  // Verificar resultado de la función
  if (!result?.success) {
    return { success: false, error: result?.error || 'Error en el despacho' }
  }

  revalidatePath('/dashboard/inventario/despacho')
  revalidatePath('/dashboard/taller')

  return { success: true, data: result }
}

// =====================================================
// DESPACHAR PIEZA (FALLBACK SIN RPC)
// Usar si la función RPC no está disponible
// =====================================================

export async function dispatchPartFallback(data: DispatchPartData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  // Validar datos obligatorios
  if (!data.returnedSku || !data.returnedSerial) {
    return {
      success: false,
      error: 'El SKU y Serial de la pieza dañada son obligatorios'
    }
  }

  try {
    // 1. Verificar stock
    const { data: part, error: partError } = await supabase
      .from('parts_catalog')
      .select('id, stock_quantity, name')
      .eq('sku', data.partSku)
      .single()

    if (partError || !part) {
      return { success: false, error: 'Pieza no encontrada' }
    }

    if (part.stock_quantity < 1) {
      return { success: false, error: 'Sin stock disponible' }
    }

    // 2. Restar stock
    const { error: stockError } = await supabase
      .from('parts_catalog')
      .update({
        stock_quantity: part.stock_quantity - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', part.id)

    if (stockError) {
      return { success: false, error: 'Error al actualizar stock' }
    }

    // 3. Agregar a bodega mala
    const { error: badError } = await supabase
      .from('bad_warehouse_inventory')
      .insert({
        sku: data.returnedSku,
        part_name: part.name,
        quantity: 1,
        condition: data.returnedCondition || 'defective',
        work_order_id: data.workOrderId,
        part_request_id: data.partRequestId,
        original_serial: data.returnedSerial,
        received_from: 'Workshop Exchange',
        received_by: user.id,
        notes: 'Intercambio de pieza en reparación'
      })

    if (badError) {
      console.error('Error adding to bad warehouse:', badError)
      // Continuar aunque falle esto
    }

    // 4. Actualizar part_request
    const { error: reqError } = await supabase
      .from('part_requests')
      .update({
        status: 'installed',
        installed_at: new Date().toISOString(),
        returned_part_sku: data.returnedSku,
        returned_part_serial: data.returnedSerial,
        returned_part_status: 'returned',
        returned_part_condition: data.returnedCondition,
        returned_at: new Date().toISOString()
      })
      .eq('id', data.partRequestId)

    if (reqError) {
      console.error('Error updating part request:', reqError)
    }

    // 5. Actualizar orden de trabajo
    const { error: woError } = await supabase
      .from('work_orders')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', data.workOrderId)

    if (woError) {
      return { success: false, error: 'Error al actualizar orden' }
    }

    // 6. Registrar movimiento
    await supabase.from('inventory_movements').insert({
      movement_type: 'dispatch',
      item_type: 'part',
      item_id: part.id,
      item_sku: data.partSku,
      quantity: -1,
      work_order_id: data.workOrderId,
      performed_by: user.id,
      notes: `Despacho a taller. Retorno: ${data.returnedSku}`
    })

    revalidatePath('/dashboard/inventario/despacho')
    revalidatePath('/dashboard/taller')

    return { success: true }

  } catch (err) {
    console.error('Dispatch error:', err)
    return { success: false, error: 'Error inesperado en el despacho' }
  }
}

interface DispatchPartSimpleData {
  workOrderId: string
  partRequestId: string
  partSku: string
  sourceWarehouse: string
}

export async function dispatchPartSimple(data: DispatchPartSimpleData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  try {
    const normalizeSku = (value?: string | null) => (value ? value.replace(/[^a-z0-9]/gi, '').toLowerCase() : '')
    const finalizeWorkOrder = async (timestamp: string) => {
      const { count: remainingPending, error: pendingError } = await supabase
        .from('part_requests')
        .select('*', { count: 'exact', head: true })
        .eq('work_order_id', data.workOrderId)
        .eq('status', 'pending')
        // safety: ignore broken rows with 0 quantity
        .gt('quantity', 0)

      if (pendingError) {
        console.error('Error counting pending part requests:', pendingError)
        throw new Error(`Error al contar solicitudes pendientes: ${pendingError.message}`)
      }

      const nextStatus = (remainingPending || 0) > 0 ? 'waiting_parts' : 'in_progress'
      console.log(`[dispatchPartSimple] OS ${data.workOrderId}: ${remainingPending || 0} pendientes → status: ${nextStatus}`)

      const { data: updatedWo, error: woError } = await supabase
        .from('work_orders')
        .update({
          status: nextStatus,
          updated_at: timestamp,
        })
        .eq('id', data.workOrderId)
        .select('id, status')
        .single()

      if (woError) {
        console.error('Error updating work order:', woError)
        throw new Error(`Error al actualizar orden: ${woError.message}`)
      }

      if (!updatedWo) {
        throw new Error('No se pudo actualizar la orden (no se encontró registro)')
      }

      console.log(`[dispatchPartSimple] OS ${data.workOrderId} actualizada a: ${updatedWo.status}`)
    }
    const requestedNormalized = normalizeSku(data.partSku)
    if (!requestedNormalized) {
      return { success: false, error: 'SKU inválido' }
    }

    // Fetch request to support partial quantities
    const { data: reqRow, error: reqFetchError } = await supabase
      .from('part_requests')
      .select('id, quantity, status, work_order_id, part_sku')
      .eq('id', data.partRequestId)
      .single()

    if (reqFetchError || !reqRow) {
      return { success: false, error: 'Solicitud de pieza no encontrada' }
    }

    // Guard: ensure request belongs to this work order
    if (reqRow.work_order_id !== data.workOrderId) {
      return { success: false, error: 'La solicitud no pertenece a la orden indicada' }
    }

    // Find part by normalized SKU (handles hyphens/spaces differences)
    const skuPrefix = requestedNormalized.slice(0, 6)
    const skuTail = requestedNormalized.slice(-5)

    // NOTE: avoid chaining multiple `.or()` filters (can overwrite/produce invalid query).
    // We fetch candidates by sku patterns and then exact-match by normalized sku in-memory.
    const { data: candidates, error: candidatesError } = await supabase
      .from('parts_catalog')
      .select('id, sku, stock_quantity, name')
      .or(`sku.ilike.%${data.partSku}%,sku.ilike.%${skuPrefix}%,sku.ilike.%${skuTail}%`)
      .limit(50)

    if (candidatesError) {
      console.error('Error finding part candidates:', candidatesError)
      // Fallback: try exact match (some PostgREST setups reject complex OR strings)
      const { data: exact, error: exactError } = await supabase
        .from('parts_catalog')
        .select('id, sku, stock_quantity, name')
        .eq('sku', data.partSku)
        .single()

      if (exactError) {
        console.error('Error exact-matching part:', exactError)
        return { success: false, error: `Error buscando pieza: ${candidatesError.message}` }
      }

      if (!exact) {
        return { success: false, error: 'Pieza no encontrada' }
      }

      const part = { id: exact.id, sku: exact.sku, stock_quantity: exact.stock_quantity, name: exact.name }
      if (part.stock_quantity < 1) {
        return { success: false, error: 'Sin stock disponible' }
      }
      // continue with this `part` below (stock update etc.)

      // (fall through by reusing `part` variable scope)
      // eslint-disable-next-line no-inner-declarations
      const selectedPart = part

      const { error: stockError } = await supabase
        .from('parts_catalog')
        .update({
          stock_quantity: selectedPart.stock_quantity - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPart.id)

      if (stockError) {
        return { success: false, error: 'Error al actualizar stock' }
      }

      const now = new Date().toISOString()
      if (Number(reqRow.quantity || 1) > 1) {
        const { error: reqError } = await supabase
          .from('part_requests')
          .update({
            quantity: Number(reqRow.quantity) - 1,
            updated_at: now,
          })
          .eq('id', data.partRequestId)

        if (reqError) {
          console.error('Error updating part request quantity:', reqError)
          return { success: false, error: `Error al actualizar solicitud: ${reqError.message}` }
        }
      } else {
        const { error: reqError } = await supabase
          .from('part_requests')
          .update({
            status: 'installed',
            dispatch_date: now,
            installed_at: now,
          })
          .eq('id', data.partRequestId)

        if (reqError) {
          console.error('Error updating part request:', reqError)
          return { success: false, error: `Error al marcar solicitud como despachada: ${reqError.message}` }
        }
      }

      // Wait a tiny bit to ensure the update is committed before counting
      await new Promise(resolve => setTimeout(resolve, 100))

      try {
        await finalizeWorkOrder(now)
      } catch (e) {
        return { success: false, error: `Despacho realizado, pero no se pudo actualizar la OS: ${e instanceof Error ? e.message : 'Error desconocido'}` }
      }

      await supabase.from('inventory_movements').insert({
        movement_type: 'dispatch',
        item_type: 'part',
        item_id: selectedPart.id,
        item_sku: selectedPart.sku,
        quantity: -1,
        work_order_id: data.workOrderId,
        performed_by: user.id,
        notes: `Despacho desde ${data.sourceWarehouse}`
      })

      revalidatePath('/dashboard/inventario/despacho')
      revalidatePath('/dashboard/taller')

      return { success: true }
    }

    const part = (candidates || []).find((row) => normalizeSku(row.sku) === requestedNormalized) || null

    if (!part) {
      return { success: false, error: 'Pieza no encontrada' }
    }

    if (part.stock_quantity < 1) {
      return { success: false, error: 'Sin stock disponible' }
    }

    const { error: stockError } = await supabase
      .from('parts_catalog')
      .update({
        stock_quantity: part.stock_quantity - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', part.id)

    if (stockError) {
      return { success: false, error: 'Error al actualizar stock' }
    }

    const now = new Date().toISOString()

    // If requested quantity > 1, decrement quantity and keep pending.
    // Otherwise mark as dispensed.
    if (Number(reqRow.quantity || 1) > 1) {
      const { error: reqError } = await supabase
        .from('part_requests')
        .update({
          quantity: Number(reqRow.quantity) - 1,
          updated_at: now,
        })
        .eq('id', data.partRequestId)

      if (reqError) {
        console.error('Error updating part request quantity:', reqError)
        return { success: false, error: `Error al actualizar solicitud: ${reqError.message}` }
      }
    } else {
      const { error: reqError } = await supabase
        .from('part_requests')
        .update({
          status: 'installed',
          dispatch_date: now,
          installed_at: now,
        })
        .eq('id', data.partRequestId)

      if (reqError) {
        console.error('Error updating part request:', reqError)
        return { success: false, error: `Error al marcar solicitud como despachada: ${reqError.message}` }
      }
    }

    // Wait a tiny bit to ensure the update is committed before counting
    await new Promise(resolve => setTimeout(resolve, 100))

    // Keep work order in waiting_parts if there are still pending requests
    try {
      await finalizeWorkOrder(now)
    } catch (e) {
      return { success: false, error: `Despacho realizado, pero no se pudo actualizar la OS: ${e instanceof Error ? e.message : 'Error desconocido'}` }
    }

    await supabase.from('inventory_movements').insert({
      movement_type: 'dispatch',
      item_type: 'part',
      item_id: part.id,
      item_sku: part.sku,
      quantity: -1,
      work_order_id: data.workOrderId,
      performed_by: user.id,
      notes: `Despacho desde ${data.sourceWarehouse}`
    })

    revalidatePath('/dashboard/inventario/despacho')
    revalidatePath('/dashboard/taller')

    return { success: true }
  } catch (err) {
    console.error('Dispatch simple error:', err)
    return { success: false, error: 'Error inesperado en el despacho' }
  }
}

interface CancelPartRequestData {
  workOrderId: string
  partRequestId: string
  reason?: string
}

export async function cancelPartRequest(data: CancelPartRequestData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  try {
    const { data: request, error: requestError } = await supabase
      .from('part_requests')
      .select('id, part_sku, part_name, work_order_id')
      .eq('id', data.partRequestId)
      .single()

    if (requestError || !request) {
      return { success: false, error: 'Solicitud de pieza no encontrada' }
    }

    const { error: deleteError } = await supabase
      .from('part_requests')
      .delete()
      .eq('id', data.partRequestId)

    if (deleteError) {
      return { success: false, error: 'Error al eliminar la solicitud' }
    }

    const { data: remainingRequests, error: remainingError } = await supabase
      .from('part_requests')
      .select('id')
      .eq('work_order_id', data.workOrderId)

    if (remainingError) {
      console.error('Error checking remaining requests:', remainingError)
    }

    const newStatus = remainingRequests && remainingRequests.length > 0
      ? 'waiting_parts'
      : 'in_progress'

    const { error: workOrderError } = await supabase
      .from('work_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', data.workOrderId)

    if (workOrderError) {
      return { success: false, error: 'Error al actualizar el estado de la orden' }
    }

    await supabase.from('inventory_movements').insert({
      movement_type: 'request_cancel',
      item_type: 'part_request',
      item_id: request.id,
      item_sku: request.part_sku,
      quantity: 0,
      work_order_id: data.workOrderId,
      performed_by: user.id,
      notes: data.reason || 'Solicitud de pieza cancelada desde despacho'
    })

    revalidatePath('/dashboard/inventario/despacho')
    revalidatePath('/dashboard/taller')

    return { success: true }
  } catch (err) {
    console.error('Cancel part request error:', err)
    return { success: false, error: 'Error inesperado cancelando solicitud' }
  }
}

// =====================================================
// DESPACHAR SEEDSTOCK
// =====================================================

interface DispatchSeedstockData {
  workOrderId: string
  seedstockId: string
  newImei: string
}

export async function dispatchSeedstock(data: DispatchSeedstockData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  // Validar IMEI
  if (!data.newImei) {
    return { success: false, error: 'El IMEI del nuevo equipo es obligatorio' }
  }

  // Intentar llamar a la función RPC
  const { data: result, error: rpcError } = await supabase.rpc('dispatch_seedstock', {
    p_work_order_id: data.workOrderId,
    p_seedstock_id: data.seedstockId,
    p_new_imei: data.newImei,
    p_performed_by: user.id
  })

  // Si la función RPC no existe, usar fallback
  if (rpcError?.message?.includes('function') || rpcError?.code === '42883') {
    return dispatchSeedstockFallback(data)
  }

  if (rpcError) {
    console.error('Error dispatching seedstock:', rpcError)
    return { success: false, error: rpcError.message }
  }

  if (!result?.success) {
    return { success: false, error: result?.error || 'Error en el despacho' }
  }

  revalidatePath('/dashboard/inventario/despacho')
  revalidatePath('/dashboard/taller')

  return { success: true, data: result }
}

// =====================================================
// DESPACHAR SEEDSTOCK (FALLBACK)
// =====================================================

async function dispatchSeedstockFallback(data: DispatchSeedstockData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  try {
    // 1. Verificar seedstock disponible
    const { data: seedstock, error: seedError } = await supabase
      .from('seedstock_inventory')
      .select('*')
      .eq('id', data.seedstockId)
      .eq('status', 'available')
      .single()

    if (seedError || !seedstock) {
      return { success: false, error: 'Seedstock no disponible' }
    }

    // 2. Obtener IMEI original de la orden
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('original_imei, original_serial')
      .eq('id', data.workOrderId)
      .single()

    // 3. Actualizar seedstock como despachado
    const { error: updateSeedError } = await supabase
      .from('seedstock_inventory')
      .update({
        status: 'dispatched',
        work_order_id: data.workOrderId,
        dispatched_at: new Date().toISOString(),
        dispatched_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.seedstockId)

    if (updateSeedError) {
      return { success: false, error: 'Error al actualizar seedstock' }
    }

    // 4. Actualizar orden de trabajo
    const { error: updateWoError } = await supabase
      .from('work_orders')
      .update({
        seedstock_exchange: true,
        new_imei: data.newImei,
        new_serial: seedstock.serial_number,
        seedstock_date: new Date().toISOString(),
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', data.workOrderId)

    if (updateWoError) {
      return { success: false, error: 'Error al actualizar orden' }
    }

    // 5. Registrar movimiento
    await supabase.from('inventory_movements').insert({
      movement_type: 'dispatch',
      item_type: 'seedstock',
      item_id: data.seedstockId,
      item_sku: seedstock.imei,
      quantity: -1,
      work_order_id: data.workOrderId,
      performed_by: user.id,
      notes: `Seedstock despachado. Original: ${workOrder?.original_imei || 'N/A'} -> Nuevo: ${data.newImei}`
    })

    revalidatePath('/dashboard/inventario/despacho')
    revalidatePath('/dashboard/taller')

    return {
      success: true,
      data: {
        original_imei: workOrder?.original_imei,
        new_imei: data.newImei
      }
    }

  } catch (err) {
    console.error('Seedstock dispatch error:', err)
    return { success: false, error: 'Error inesperado' }
  }
}

// =====================================================
// ESTADÍSTICAS DE DESPACHO
// =====================================================

export async function getDispatchStats() {
  const supabase = await createClient()

  // Contar órdenes pendientes de piezas
  const { count: waitingParts } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting_parts')

  // Contar órdenes pendientes de seedstock
  const { count: waitingSeedstock } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting_seedstock')

  // Piezas con stock bajo
  const { count: lowStock } = await supabase
    .from('parts_catalog')
    .select('*', { count: 'exact', head: true })
    .lt('stock_quantity', 5) // Menos de 5 unidades

  // Despachos hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: dispatchedToday } = await supabase
    .from('inventory_movements')
    .select('*', { count: 'exact', head: true })
    .eq('movement_type', 'dispatch')
    .gte('created_at', today.toISOString())

  return {
    waitingParts: waitingParts || 0,
    waitingSeedstock: waitingSeedstock || 0,
    lowStock: lowStock || 0,
    dispatchedToday: dispatchedToday || 0
  }
}

