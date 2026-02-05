'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeAssetData } from '@/lib/schemas'

export interface WarehouseAsset {
  id: string
  serial_number: string | null
  internal_tag: string
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  color: string | null
  status: string
  condition_grade: string | null
  created_at: string | null
  batch_id: string | null
  batch_code: string | null
  batch_location: string | null
  container_type: string | null
  ticket_id: string | null
  ticket_code: string | null
  warehouse_code: string | null
  warehouse_name: string | null
  current_warehouse_id: string | null
  warehouse_received_at: string | null
  last_transfer_date: string | null
  sales_price: number | null
  specifications: Record<string, unknown> | null
  box_number?: number | null
  wipe_status: string | null
  wiped_at: string | null
}

interface Warehouse {
  id: string
  code: string
  name: string
  description: string | null
  status?: string | null
}

interface ExpectedItemColor {
  batch_id: string
  product_type: string | null
  brand: string | null
  model: string | null
  color: string | null
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() || ''

function getExpectedItemColor(items: ExpectedItemColor[] | undefined, asset: any): string | null {
  if (!items || items.length === 0) return null

  const assetBrand = normalize(asset.manufacturer)
  const assetModel = normalize(asset.model)
  const assetType = normalize(asset.asset_type)

  const match = items.find((item) => {
    if (!item.color) return false
    const itemColor = normalize(item.color)
    if (!itemColor) return false

    const itemBrand = normalize(item.brand)
    const itemModel = normalize(item.model)
    const itemType = normalize(item.product_type)

    const matchesBrandModel = itemBrand && itemModel && itemBrand === assetBrand && itemModel === assetModel
    const matchesModelType = itemModel && itemModel === assetModel && itemType && itemType === assetType
    const matchesType = itemType && itemType === assetType

    return matchesBrandModel || matchesModelType || matchesType
  })

  if (match) {
    return match.color
  }

  const fallback = items.find((item) => item.color && item.color.trim().length > 0)
  return fallback?.color || null
}

export async function getWarehouseAssets(): Promise<WarehouseAsset[]> {
  const supabase = await createClient()

  // Obtener activos con bodega asignada
  const { data, error } = await supabase
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
      condition_grade,
      created_at,
      batch_id,
      specifications,
      current_warehouse_id,
      sales_price,
      last_transfer_date
    `)
    .not('current_warehouse_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching warehouse assets:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Obtener IDs únicos
  // Obtener IDs únicos
  const warehouseIds = Array.from(new Set(data.map(a => a.current_warehouse_id).filter(Boolean)))
  const batchIds = Array.from(new Set(data.map(a => a.batch_id).filter(Boolean)))

  // Obtener bodegas
  let warehousesMap: Record<string, { code: string; name: string }> = {}
  if (warehouseIds.length > 0) {
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .in('id', warehouseIds)

    warehouses?.forEach(w => {
      warehousesMap[w.id] = { code: w.code, name: w.name }
    })
  }

  // Obtener lotes con ubicación, tipo de contenedor y ticket
  let batchesMap: Record<string, {
    code: string
    location: string | null
    container_type: string | null
    ticket_id: string | null
    ticket_code: string | null
  }> = {}
  if (batchIds.length > 0) {
    const { data: batches } = await supabase
      .from('batches')
      .select(`
        id, 
        internal_batch_id, 
        location, 
        container_type,
        ticket_id
      `)
      .in('id', batchIds)

    // Obtener IDs de tickets
    const ticketIds = batches?.map(b => b.ticket_id).filter(Boolean) || []
    let ticketsMap: Record<string, string> = {}

    if (ticketIds.length > 0) {
      const { data: tickets } = await supabase
        .from('operations_tickets')
        .select('id, readable_id')
        .in('id', ticketIds)

      tickets?.forEach(t => {
        ticketsMap[t.id] = t.readable_id
      })
    }

    batches?.forEach(b => {
      batchesMap[b.id] = {
        code: b.internal_batch_id,
        location: b.location,
        container_type: b.container_type,
        ticket_id: b.ticket_id,
        ticket_code: b.ticket_id ? ticketsMap[b.ticket_id] : null
      }
    })
  }

  // Obtener colores definidos en los items esperados del lote
  const expectedItemsMap: Record<string, ExpectedItemColor[]> = {}
  if (batchIds.length > 0) {
    const { data: expectedItems } = await supabase
      .from('batch_expected_items')
      .select('batch_id, product_type, brand, model, color')
      .in('batch_id', batchIds)

    expectedItems?.forEach((item) => {
      if (!item.batch_id) return
      expectedItemsMap[item.batch_id] = expectedItemsMap[item.batch_id] || []
      expectedItemsMap[item.batch_id].push(item)
    })
  }

  // Registrar la última fecha en que el activo llegó a su bodega actual
  const assetIds = data.map((asset: any) => asset.id).filter(Boolean)
  const serialNumbers = data.map((asset: any) => asset.serial_number).filter(Boolean)
  const movementDates: Record<string, string | null> = {}

  if (assetIds.length > 0) {
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('asset_id, to_warehouse_id, created_at')
      .in('asset_id', assetIds)
      .order('created_at', { ascending: false })

    const assetsById = data.reduce((acc: Record<string, any>, asset: any) => {
      acc[asset.id] = asset
      return acc
    }, {})

    // Primero marcar con fecha de creación como fallback
    data.forEach((asset: any) => {
      movementDates[asset.id] = asset.created_at
    })

    const recorded = new Set<string>();
    // Forzar el tipo any para iterar sin problemas de linter
    (movements as any[])?.forEach((movement: any) => {
      if (!movement.asset_id || recorded.has(movement.asset_id)) return
      const asset = assetsById[movement.asset_id]
      if (!asset) return
      if (movement.to_warehouse_id === asset.current_warehouse_id) {
        movementDates[movement.asset_id] = movement.created_at
        recorded.add(movement.asset_id)
      }
    })
  } else {
    // Fallback: usar fecha de creación del asset
    data.forEach((asset: any) => {
      movementDates[asset.id] = asset.created_at
    })
  }

  // Obtener datos de clasificación directamente de ticket_items como fallback
  interface TicketItemData {
    id: string | null
    asset_id: string | null
    collected_serial: string | null
    color_detail: string | null
    classification_rec: string | null
    classification_f: string | null
    classification_c: string | null
    processor: string | null
    bios_version: string | null
    ram_capacity: string | null
    ram_type: string | null
    disk_capacity: string | null
    disk_type: string | null
    keyboard_type: string | null
    keyboard_version: string | null
    observations: string | null
    box_number: number | null
  }

  const ticketItemsMap: Record<string, TicketItemData> = {}

  // Obtener clasificaciones de Salida (Control de Calidad) de work_orders
  interface WorkOrderClassifications {
    rec_classification: string | null
    f_classification: string | null
    c_classification: string | null
  }
  const workOrdersMap: Record<string, WorkOrderClassifications> = {}

  if (assetIds.length > 0) {
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('asset_id, rec_classification, f_classification, c_classification, updated_at')
      .in('asset_id', assetIds)
      .or('rec_classification.not.is.null,f_classification.not.is.null,c_classification.not.is.null')
      .order('updated_at', { ascending: false })

    workOrders?.forEach((wo) => {
      if (wo.asset_id && !workOrdersMap[wo.asset_id]) {
        if (wo.rec_classification || wo.f_classification || wo.c_classification) {
          workOrdersMap[wo.asset_id] = {
            rec_classification: wo.rec_classification,
            f_classification: wo.f_classification,
            c_classification: wo.c_classification
          }
        }
      }
    })
  }

  if (assetIds.length > 0 || serialNumbers.length > 0) {
    // Buscar por asset_id, incluyendo box_number
    const { data: ticketItemsByAssetId } = await supabase
      .from('ticket_items')
      .select(`
        id,
        asset_id,
        collected_serial,
        color_detail,
        classification_rec,
        classification_f,
        classification_c,
        processor,
        bios_version,
        ram_capacity,
        ram_type,
        disk_capacity,
        disk_type,
        keyboard_type,
        keyboard_version,
        observations,
        box_number
      `)
      .in('asset_id', assetIds)

    ticketItemsByAssetId?.forEach((ti) => {
      if (ti.asset_id) {
        ticketItemsMap[ti.asset_id] = ti
      }
    })

    // Buscar por serial_number para assets que no tienen asset_id en ticket_items, incluyendo box_number
    const { data: ticketItemsBySerial } = await supabase
      .from('ticket_items')
      .select(`
        id,
        asset_id,
        collected_serial,
        color_detail,
        classification_rec,
        classification_f,
        classification_c,
        processor,
        bios_version,
        ram_capacity,
        ram_type,
        disk_capacity,
        disk_type,
        keyboard_type,
        keyboard_version,
        observations,
        box_number
      `)
      .in('collected_serial', serialNumbers)

    // Crear mapa de serial -> asset_id
    const serialToAssetId: Record<string, string> = {}
    data.forEach((asset: any) => {
      if (asset.serial_number && asset.id) {
        serialToAssetId[asset.serial_number] = asset.id
      }
    })

    ticketItemsBySerial?.forEach((ti) => {
      if (ti.collected_serial) {
        const assetId = serialToAssetId[ti.collected_serial]
        if (assetId && !ticketItemsMap[assetId]) {
          ticketItemsMap[assetId] = ti
        }
      }
    })
  }


  // Obtener accesorios para todos los ticket_items
  const ticketItemIds = Object.values(ticketItemsMap).map(ti => ti && ti.id).filter(Boolean);
  let accessoriesByTicketItem: Record<string, { name: string, quantity: number }[]> = {};
  if (ticketItemIds.length > 0) {
    const supabase = await createClient();
    const { data: accessoriesData } = await supabase
      .from('ticket_item_accessories')
      .select('ticket_item_id, quantity, catalog_accessories(name)')
      .in('ticket_item_id', ticketItemIds);
    if (accessoriesData) {
      for (const acc of accessoriesData) {
        if (!acc.ticket_item_id) continue;
        accessoriesByTicketItem[acc.ticket_item_id] = accessoriesByTicketItem[acc.ticket_item_id] || [];
        const accData = acc.catalog_accessories as any
        const accessoriesName = Array.isArray(accData) ? accData[0]?.name : accData?.name
        accessoriesByTicketItem[acc.ticket_item_id].push({
          name: accessoriesName || 'Accesorio',
          quantity: acc.quantity || 1
        });
      }
    }
  }

  // Obtener rol del usuario actual para RBAC
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const userRole = profile?.role || 'technician'

  return data.map((asset: any) => {
    const specs = (asset.specifications ?? null) as Record<string, unknown> | null;
    const specColor = specs && typeof (specs as Record<string, unknown>).color === 'string'
      ? (specs as Record<string, unknown>).color
      : null;
    const batchExpectedColor = getExpectedItemColor(expectedItemsMap[asset.batch_id], asset);

    // Obtener datos de ticket_items como fallback
    const ticketItem = ticketItemsMap[asset.id];
    const workOrder = workOrdersMap[asset.id];

    // Construir specifications combinando datos existentes con fallback de ticket_items
    let finalSpecs = specs ? { ...specs } : {};

    if (ticketItem) {
      // Workshop classifications (REC de Ingreso)
      const existingClassifications = (finalSpecs.workshop_classifications as Record<string, unknown>) || {};
      const hasExistingRec = existingClassifications.rec;
      const hasExistingF = existingClassifications.f;
      const hasExistingC = existingClassifications.c;

      // Actualizar solo los campos que faltan
      if (!hasExistingRec || !hasExistingF || !hasExistingC) {
        finalSpecs.workshop_classifications = {
          rec: existingClassifications.rec || ticketItem.classification_rec || undefined,
          f: existingClassifications.f || ticketItem.classification_f || undefined,
          c: existingClassifications.c || ticketItem.classification_c || undefined
        };
      }

      // Hardware specs
      const existingHardware = (finalSpecs.hardware_specs as Record<string, unknown>) || {};
      const hasExistingHardware = existingHardware.processor || existingHardware.ram_capacity || existingHardware.disk_capacity;

      // Agregar accesorios si existen
      let accessoriesArr: { name: string; quantity: number }[] = [];
      if (ticketItem.id && accessoriesByTicketItem[ticketItem.id]) {
        accessoriesArr = accessoriesByTicketItem[ticketItem.id];
      }

      if (!hasExistingHardware) {
        if (ticketItem.processor || ticketItem.ram_capacity || ticketItem.disk_capacity || ticketItem.keyboard_type || accessoriesArr.length > 0) {
          finalSpecs.hardware_specs = {
            processor: ticketItem.processor || undefined,
            bios_version: ticketItem.bios_version || undefined,
            ram_capacity: ticketItem.ram_capacity || undefined,
            ram_type: ticketItem.ram_type || undefined,
            disk_capacity: ticketItem.disk_capacity || undefined,
            disk_type: ticketItem.disk_type || undefined,
            keyboard_type: ticketItem.keyboard_type || undefined,
            keyboard_version: ticketItem.keyboard_version || undefined,
            accessories: accessoriesArr.length > 0 ? accessoriesArr : undefined
          };
        }
      } else if (accessoriesArr.length > 0) {
        // Si ya hay hardware_specs, solo agrega accesorios
        finalSpecs.hardware_specs = {
          ...existingHardware,
          accessories: accessoriesArr
        };
      }

      // Reception notes
      if (!finalSpecs.reception_notes && ticketItem.observations) {
        finalSpecs.reception_notes = ticketItem.observations;
      }
    }

    // Agregar clasificaciones de Salida (Control de Calidad)
    if (workOrder?.rec_classification || workOrder?.f_classification || workOrder?.c_classification) {
      if (workOrder.rec_classification) {
        finalSpecs.rec_classification_out = workOrder.rec_classification
      }
      if (workOrder.f_classification) {
        finalSpecs.f_classification_out = workOrder.f_classification
      }
      if (workOrder.c_classification) {
        finalSpecs.c_classification_out = workOrder.c_classification
      }

      // Si no hay REC en workshop_classifications, usar el del work_order como fallback
      const existingClassifications = (finalSpecs.workshop_classifications as Record<string, unknown>) || {}
      if (!existingClassifications.rec && workOrder.rec_classification) {
        finalSpecs.workshop_classifications = {
          ...existingClassifications,
          rec: workOrder.rec_classification
        }
      }
    }

    // Determinar el color final
    const ticketColor = ticketItem?.color_detail || null
    const finalColor = asset.color || ticketColor || batchExpectedColor || (typeof specColor === 'string' ? specColor : null)

    const rawAsset = {
      id: asset.id,
      serial_number: asset.serial_number,
      internal_tag: asset.internal_tag,
      manufacturer: asset.manufacturer,
      model: asset.model,
      asset_type: asset.asset_type,
      color: finalColor,
      status: asset.status,
      condition_grade: asset.condition_grade,
      created_at: asset.created_at,
      batch_id: asset.batch_id,
      batch_code: asset.batch_id ? batchesMap[asset.batch_id]?.code : null,
      batch_location: asset.batch_id ? batchesMap[asset.batch_id]?.location : null,
      container_type: asset.batch_id ? batchesMap[asset.batch_id]?.container_type : null,
      ticket_id: asset.batch_id ? batchesMap[asset.batch_id]?.ticket_id : null,
      ticket_code: asset.batch_id ? batchesMap[asset.batch_id]?.ticket_code : null,
      warehouse_code: asset.current_warehouse_id ? warehousesMap[asset.current_warehouse_id]?.code : null,
      warehouse_name: asset.current_warehouse_id ? warehousesMap[asset.current_warehouse_id]?.name : null,
      current_warehouse_id: asset.current_warehouse_id,
      warehouse_received_at: movementDates[asset.id] || null,
      last_transfer_date: asset.last_transfer_date || null,
      sales_price: asset.sales_price,
      specifications: Object.keys(finalSpecs).length > 0 ? finalSpecs : null,
      box_number: ticketItem?.box_number ?? null,
      wipe_status: null,
      wiped_at: null
    }

    // Aplicar filtrado por rol (RBAC)
    return sanitizeAssetData(rawAsset, userRole)
  })
}

export async function getAccessoryLookup(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('catalog_accessories')
    .select('id, name')
    .order('name', { ascending: true })

  if (!data) return {}

  return data.reduce<Record<string, string>>((acc, item) => {
    if (item.id && item.name) {
      acc[item.id] = item.name
    }
    return acc
  }, {})
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) {
    console.error('Error fetching warehouses:', error)
    return []
  }

  return data || []
}

import { setSession } from '@/lib/supabase/session'

// Asignar precio a todos los assets de un lote en una bodega específica (diviendo el precio total)
export async function setBatchPrice(
  batchId: string,
  warehouseCode: string,
  totalPrice: number
): Promise<{ success: boolean; error?: string; count?: number; pricePerUnit?: number }> {
  const supabase = await createClient()
  await setSession(supabase)

  try {
    // Validar que el precio sea positivo
    if (totalPrice <= 0) {
      return { success: false, error: 'El precio debe ser mayor a 0' }
    }

    // Obtener la bodega
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('code', warehouseCode)
      .maybeSingle()

    if (warehouseError || !warehouse) {
      return { success: false, error: 'Bodega no encontrada' }
    }

    // Contar primero cuántos assets hay
    const { data: countData, error: countError } = await supabase
      .from('assets')
      .select('id', { count: 'exact' })
      .eq('batch_id', batchId)
      .eq('current_warehouse_id', warehouse.id)

    if (countError) {
      console.error('[setBatchPrice] Error al contar:', countError)
      return { success: false, error: countError.message }
    }

    const totalAssets = countData?.length || 0

    if (totalAssets === 0) {
      return { success: false, error: 'No hay equipos en esta bodega para este lote' }
    }

    // Calcular precio por equipo
    const pricePerUnit = totalPrice / totalAssets

    // Actualizar todos los assets del lote que están en esa bodega
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        sales_price: pricePerUnit,
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', batchId)
      .eq('current_warehouse_id', warehouse.id)

    if (updateError) {
      console.error('[setBatchPrice] Error:', updateError)
      return { success: false, error: updateError.message }
    }

    // Actualizar el acquisition_cost en settlements si existe
    const { data: settlements, error: settlementError } = await supabase
      .from('settlements')
      .select('id')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!settlementError && settlements && settlements.length > 0) {
      const settlementId = settlements[0].id
      const { error: settlementUpdateError } = await supabase
        .from('settlements')
        .update({
          acquisition_cost: totalPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', settlementId)

      if (settlementUpdateError) {
        console.warn('[setBatchPrice] Advertencia al actualizar settlement:', settlementUpdateError)
      } else {
        console.log(`[setBatchPrice] Settlement actualizado con acquisition_cost: Q${totalPrice}`)
      }
    }

    console.log(`[setBatchPrice] Precio total Q${totalPrice} distribuido en Q${pricePerUnit.toFixed(2)} para ${totalAssets} equipos`)

    return { success: true, count: totalAssets, pricePerUnit: pricePerUnit }
  } catch (error) {
    console.error('[setBatchPrice] Error inesperado:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}
