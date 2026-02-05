'use server'

import { createClient } from '@/lib/supabase/server'

export interface FilteredAsset {
  id: string
  serial_number: string | null
  internal_tag: string
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  color: string | null
  status: string
  condition: string | null
  condition_grade: string | null
  cost_amount: number | null
  created_at: string | null
  current_warehouse_id: string | null
  batch_id: string | null
  warehouse_code: string | null
  warehouse_name: string | null
  batch_code: string | null
  batch_location: string | null
  box_number: number | null
  driver_name: string | null
  vehicle_plate: string | null
  transport_guide: string | null
  ticket_code: string | null
  specifications: Record<string, unknown> | null
  work_order_id: string | null
  work_order_status: string | null
}

export async function getFilteredAssets(
  brand?: string,
  model?: string,
  type?: string
): Promise<{ data: FilteredAsset[]; error: string | null }> {
  const supabase = await createClient()

  let query = supabase
    .from('assets')
    .select(`
      id,
      serial_number,
      internal_tag,
      manufacturer,
      model,
      asset_type,
      color,
      status,
      condition,
      condition_grade,
      cost_amount,
      created_at,
      current_warehouse_id,
      batch_id,
      specifications
    `)
    .in('status', ['received', 'wiped', 'wiping', 'diagnosing', 'ready_for_sale'])
    .order('created_at', { ascending: false })

  // Aplicar filtros
  if (brand && brand !== 'Sin Marca') {
    query = query.eq('manufacturer', brand)
  } else if (brand === 'Sin Marca') {
    query = query.is('manufacturer', null)
  }

  if (model && model !== 'Sin Modelo') {
    query = query.eq('model', model)
  } else if (model === 'Sin Modelo') {
    query = query.is('model', null)
  }

  if (type && type !== 'Sin Tipo') {
    query = query.eq('asset_type', type)
  } else if (type === 'Sin Tipo') {
    query = query.is('asset_type', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching assets:', error)
    return { data: [], error: error.message }
  }

  // Obtener bodegas y lotes para mapear
  const warehouseIds = Array.from(new Set((data || []).map((a: any) => a.current_warehouse_id).filter(Boolean)))
  const batchIds = Array.from(new Set((data || []).map((a: any) => a.batch_id).filter(Boolean)))

  let warehousesMap: Record<string, { code: string; name: string }> = {}

  if (warehouseIds.length > 0) {
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .in('id', warehouseIds)

    warehouses?.forEach((w: any) => {
      warehousesMap[w.id] = { code: w.code, name: w.name }
    })
  }

  interface BatchInfo {
    code: string
    location: string | null
    driver_name: string | null
    vehicle_plate: string | null
    transport_guide: string | null
    ticket_id: string | null
    ticket_code: string | null
  }

  let batchesMap: Record<string, BatchInfo> = {}

  if (batchIds.length > 0) {
    const { data: batches } = await supabase
      .from('batches')
      .select(`
        id, 
        internal_batch_id, 
        location,
        driver_name,
        vehicle_plate,
        transport_guide,
        ticket_id
      `)
      .in('id', batchIds)

    // Obtener códigos de tickets
    const ticketIds = batches?.map((b: any) => b.ticket_id).filter(Boolean) || []
    let ticketsMap: Record<string, string> = {}

    if (ticketIds.length > 0) {
      const { data: tickets } = await supabase
        .from('operations_tickets')
        .select('id, readable_id')
        .in('id', ticketIds)

      tickets?.forEach((t: any) => {
        ticketsMap[t.id] = t.readable_id
      })
    }

    batches?.forEach((b: any) => {
      batchesMap[b.id] = {
        code: b.internal_batch_id,
        location: b.location,
        driver_name: b.driver_name,
        vehicle_plate: b.vehicle_plate,
        transport_guide: b.transport_guide,
        ticket_id: b.ticket_id,
        ticket_code: b.ticket_id ? ticketsMap[b.ticket_id] : null
      }
    })
  }

  // Obtener número de caja desde ticket_items
  const assetIds = (data || []).map((a: any) => a.id).filter(Boolean)
  let boxNumbersMap: Record<string, number> = {}

  if (assetIds.length > 0) {
    const { data: ticketItems } = await supabase
      .from('ticket_items')
      .select('asset_id, box_number')
      .in('asset_id', assetIds)
      .not('box_number', 'is', null)

    ticketItems?.forEach((ti: any) => {
      if (ti.asset_id && ti.box_number !== null) {
        boxNumbersMap[ti.asset_id] = ti.box_number
      }
    })
  }

  let workOrdersMap: Record<string, { id: string; status: string }> = {}

  if (assetIds.length > 0) {
    const { data: workOrders, error: workOrdersError } = await supabase
      .from('work_orders')
      .select('id, asset_id, status, updated_at')
      .in('asset_id', assetIds)
      .order('updated_at', { ascending: false })

    if (workOrdersError) {
      console.error('Error fetching work orders:', workOrdersError)
    } else {
      workOrders?.forEach((wo) => {
        if (wo.asset_id && !workOrdersMap[wo.asset_id]) {
          workOrdersMap[wo.asset_id] = {
            id: wo.id,
            status: wo.status
          }
        }
      })
    }
  }

  // Mapear datos
  const mappedData = (data || []).map((asset: any) => {
    const batch = asset.batch_id ? batchesMap[asset.batch_id] : null
    return {
      ...asset,
      warehouse_code: asset.current_warehouse_id ? warehousesMap[asset.current_warehouse_id]?.code : null,
      warehouse_name: asset.current_warehouse_id ? warehousesMap[asset.current_warehouse_id]?.name : null,
      batch_code: batch?.code || null,
      batch_location: batch?.location || null,
      box_number: boxNumbersMap[asset.id] || null,
      driver_name: batch?.driver_name || null,
      vehicle_plate: batch?.vehicle_plate || null,
      transport_guide: batch?.transport_guide || null,
      ticket_code: batch?.ticket_code || null,
      specifications: asset.specifications ?? null,
      work_order_id: workOrdersMap[asset.id]?.id || null,
      work_order_status: workOrdersMap[asset.id]?.status || null
    }
  })

  return { data: mappedData, error: null }
}

