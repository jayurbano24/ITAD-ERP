'use server'

import { createClient } from '@/lib/supabase/server'

// =====================================================
// INTERFACE: InventoryItem
// =====================================================

export interface InventoryItem {
  brand: string
  model: string
  type: string
  available_count: number
  in_process_count: number
  total_quantity: number
  total_cost_value: number
  rotation_days: number | null
  oldest_entry_date: string | null
  // Nuevos campos para vista detallada
  box_number: number | null
  box_numbers: number[] // Todos los box_numbers del grupo
  reception_date: string | null // Fecha de recepción más reciente
  location: string | null
  driver_name: string | null
  vehicle_plate: string | null
  transport_guide: string | null
  batch_code: string | null
  classification_f: string | null
  classification_c: string | null
}

// =====================================================
// ESTADOS DE ASSETS
// =====================================================
// NOTA: Ya no filtramos por estados específicos, sino por ubicación en bodegas
// Esto asegura que TODOS los assets en cualquier bodega aparezcan en el inventario,
// incluyendo los que están en Taller de Reparación (BOD-REP)

// Estados que indican que el asset YA NO está en inventario (excluir del reporte)
const EXCLUDED_STATUSES = ['scrapped', 'sold', 'destroyed']

// =====================================================
// SERVER ACTION: getInventoryMaster
// =====================================================

export async function getInventoryMaster(): Promise<{
  data: InventoryItem[]
  error: string | null
}> {
  const supabase = await createClient()

  // Intentar con la vista SQL
  const { data: viewData, error: viewError } = await supabase
    .from('inventory_analytics_view')
    .select('*')
    .order('total_cost_value', { ascending: false })

  // Si la vista funciona, usar sus datos pero completar con datos de lotes
  if (!viewError && viewData && viewData.length > 0) {
    // La vista no tiene los nuevos campos, usar fallback para obtener datos completos
    console.log('Vista disponible pero usando fallback para datos adicionales...')
  }

  // FALLBACK: Calcular desde assets directamente
  console.log('Calculando inventario desde assets...')

  // CAMBIO IMPORTANTE: Ahora incluimos TODOS los assets que están en una bodega,
  // independientemente de su estado. Esto incluye:
  // - BOD-REC (Recepción): assets recibidos
  // - BOD-REP (Reparación/Taller): assets en órdenes de trabajo
  // - BOD-REM (Remarketing): assets listos para venta
  // - Cualquier otra bodega del sistema
  //
  // Solo excluimos assets que ya salieron del inventario (scrapped, sold, destroyed)
  const { data: assetsData, error: assetsError } = await supabase
    .from('assets')
    .select(`
      id,
      manufacturer, 
      model, 
      asset_type, 
      status, 
      cost_amount, 
      created_at,
      batch_id,
      specifications,
      current_warehouse_id
    `)
    .not('current_warehouse_id', 'is', null) // Solo assets en bodegas
    .not('status', 'in', `(${EXCLUDED_STATUSES.join(',')})`) // Excluir assets fuera de inventario


  if (assetsError) {
    console.error('Error fetching assets:', assetsError)
    return { data: [], error: assetsError.message }
  }

  // Obtener batch_ids únicos para consultar datos de lotes
  const batchIds = Array.from(new Set((assetsData || []).map(a => a.batch_id).filter(Boolean)))
  let batchesMap: Record<string, {
    code: string
    location: string | null
    driver_name: string | null
    vehicle_plate: string | null
    transport_guide: string | null
  }> = {}

  if (batchIds.length > 0) {
    const { data: batches } = await supabase
      .from('batches')
      .select('id, internal_batch_id, location, driver_name, vehicle_plate, transport_guide')
      .in('id', batchIds)

    batches?.forEach(b => {
      batchesMap[b.id] = {
        code: b.internal_batch_id,
        location: b.location,
        driver_name: b.driver_name,
        vehicle_plate: b.vehicle_plate,
        transport_guide: b.transport_guide
      }
    })
  }

  // Obtener datos de ticket_items para box_number, clasificaciones y ticket_id
  const assetIds = (assetsData || []).map(a => a.id).filter(Boolean)
  let ticketItemsMap: Record<string, {
    box_number: number | null
    ticket_id: string | null
    classification_f: string | null
    classification_c: string | null
  }> = {}

  if (assetIds.length > 0) {
    const { data: ticketItems } = await supabase
      .from('ticket_items')
      .select('asset_id, box_number, ticket_id, classification_f, classification_c')
      .in('asset_id', assetIds)

    ticketItems?.forEach(ti => {
      if (ti.asset_id) {
        ticketItemsMap[ti.asset_id] = {
          box_number: ti.box_number,
          ticket_id: ti.ticket_id,
          classification_f: ti.classification_f,
          classification_c: ti.classification_c
        }
      }
    })
  }

  // Obtener fechas de recepción desde ticket_reception_log
  const ticketIds = Array.from(new Set(
    Object.values(ticketItemsMap)
      .map(ti => ti.ticket_id)
      .filter(Boolean) as string[]
  ))

  let receptionDatesMap: Record<string, Record<number, string>> = {} // ticket_id -> box_number -> created_at

  if (ticketIds.length > 0) {
    const { data: receptionLogs } = await supabase
      .from('ticket_reception_log')
      .select('ticket_id, box_number, created_at')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false })

    receptionLogs?.forEach(log => {
      if (!receptionDatesMap[log.ticket_id]) {
        receptionDatesMap[log.ticket_id] = {}
      }
      // Guardar la fecha más reciente para cada box_number
      if (!receptionDatesMap[log.ticket_id][log.box_number] ||
        new Date(log.created_at) > new Date(receptionDatesMap[log.ticket_id][log.box_number])) {
        receptionDatesMap[log.ticket_id][log.box_number] = log.created_at
      }
    })
  }

  // Agrupar por marca/modelo/tipo
  const grouped = new Map<string, {
    brand: string
    model: string
    type: string
    available: number
    inProcess: number
    totalValue: number
    dates: Date[]
    // Datos del primer asset del grupo
    box_numbers: Set<number>
    reception_dates: Date[]
    location: string | null
    driver_name: string | null
    vehicle_plate: string | null
    transport_guide: string | null
    batch_code: string | null
    classification_f: string | null
    classification_c: string | null
  }>()

  for (const asset of assetsData || []) {
    const brand = asset.manufacturer || 'Sin Marca'
    const model = asset.model || 'Sin Modelo'
    const type = asset.asset_type || 'Sin Tipo'
    const key = `${brand}|${model}|${type}`

    const batch = asset.batch_id ? batchesMap[asset.batch_id] : null
    const ticketItem = ticketItemsMap[asset.id] || {}
    const specs = asset.specifications as Record<string, unknown> | null

    // Obtener clasificaciones de specifications o ticket_items
    let classF = ticketItem.classification_f
    let classC = ticketItem.classification_c
    if (!classF && specs?.workshop_classifications) {
      const wc = specs.workshop_classifications as Record<string, string>
      classF = wc.f || null
      classC = wc.c || null
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        brand,
        model,
        type,
        available: 0,
        inProcess: 0,
        totalValue: 0,
        dates: [],
        box_numbers: new Set<number>(),
        reception_dates: [],
        location: batch?.location || null,
        driver_name: batch?.driver_name || null,
        vehicle_plate: batch?.vehicle_plate || null,
        transport_guide: batch?.transport_guide || null,
        batch_code: batch?.code || null,
        classification_f: classF || null,
        classification_c: classC || null
      })
    }

    const item = grouped.get(key)!

    // Agregar box_number si existe
    if (ticketItem.box_number && ticketItem.box_number > 0) {
      item.box_numbers.add(ticketItem.box_number)

      // Obtener fecha de recepción si existe, o usar created_at del asset como fallback
      if (ticketItem.ticket_id && receptionDatesMap[ticketItem.ticket_id]?.[ticketItem.box_number]) {
        const receptionDate = new Date(receptionDatesMap[ticketItem.ticket_id][ticketItem.box_number])
        item.reception_dates.push(receptionDate)
      } else if (asset.created_at) {
        // Fallback: usar created_at del asset si no hay fecha de recepción registrada
        item.reception_dates.push(new Date(asset.created_at))
      }
    } else if (asset.created_at) {
      // Si no hay box_number pero hay created_at, usarlo como fecha de recepción
      item.reception_dates.push(new Date(asset.created_at))
    }

    // Clasificar el asset como "disponible" o "en proceso"
    // DISPONIBLE: Assets listos para venta (received, wiped, ready_for_sale)
    // EN PROCESO: Todos los demás (diagnosing, wiping, in_progress, qc_pending, waiting_parts, etc.)
    const isAvailable = ['received', 'wiped', 'ready_for_sale'].includes(asset.status)

    if (isAvailable) {
      // Asset disponible para venta
      item.available++
      item.totalValue += Number(asset.cost_amount) || 0
      if (asset.created_at) {
        item.dates.push(new Date(asset.created_at))
      }
    } else {
      // Asset en proceso (diagnóstico, reparación, QC, etc.)
      item.inProcess++
    }
  }

  // Convertir a array ordenado por valor
  const result: InventoryItem[] = Array.from(grouped.values())
    .map(item => {
      let rotationDays: number | null = null
      let oldestDate: string | null = null

      if (item.dates.length > 0) {
        const oldest = new Date(Math.min(...item.dates.map(d => d.getTime())))
        oldestDate = oldest.toISOString()
        const now = new Date()
        const avgDate = new Date(
          item.dates.reduce((sum, d) => sum + d.getTime(), 0) / item.dates.length
        )
        rotationDays = Math.round((now.getTime() - avgDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Obtener box_numbers ordenados (más reciente primero)
      const boxNumbers = Array.from(item.box_numbers).sort((a, b) => b - a)
      const mostRecentBox = boxNumbers.length > 0 ? boxNumbers[0] : null

      // Obtener fecha de recepción más reciente
      let receptionDate: string | null = null
      if (item.reception_dates.length > 0) {
        const mostRecent = new Date(Math.max(...item.reception_dates.map(d => d.getTime())))
        receptionDate = mostRecent.toISOString()
      }

      return {
        brand: item.brand,
        model: item.model,
        type: item.type,
        available_count: item.available,
        in_process_count: item.inProcess,
        total_quantity: item.available + item.inProcess,
        total_cost_value: item.totalValue,
        rotation_days: rotationDays,
        oldest_entry_date: oldestDate,
        box_number: mostRecentBox, // Mantener para compatibilidad
        box_numbers: boxNumbers, // Todos los box_numbers
        reception_date: receptionDate,
        location: item.location,
        driver_name: item.driver_name,
        vehicle_plate: item.vehicle_plate,
        transport_guide: item.transport_guide,
        batch_code: item.batch_code,
        classification_f: item.classification_f,
        classification_c: item.classification_c
      }
    })
    .sort((a, b) => b.total_cost_value - a.total_cost_value)

  return { data: result, error: null }
}
