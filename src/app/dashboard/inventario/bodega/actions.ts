'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeAssetData } from '@/lib/schemas'
import { resolveAssetModuleLabel } from './moduleLabel'

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
  /** Número ORD de la foto/recibo (ej. ORD26876), preferido como “Lote” en UI */
  order_code: string | null
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
  /** Precio / costo de compra unitario (adquisición del lote) */
  cost_amount: number | null
  specifications: Record<string, unknown> | null
  box_number?: number | null
  wipe_status: string | null
  wiped_at: string | null
  /** Etiqueta legible del módulo / etapa operativa actual */
  module_label: string | null
}

const extractOrderCode = (text?: string | null): string | null => {
  if (!text) return null
  const match = text.match(/\b(ORD\s*[-]?\s*\d{4,})\b/i)
  if (!match?.[1]) return null
  return match[1].replace(/\s+/g, '').replace(/ORD-/i, 'ORD').toUpperCase()
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

  // Obtener activos con bodega asignada (excluye vendidos / destruidos)
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
      cost_amount,
      last_transfer_date,
      wipe_result,
      wipe_completed_at,
      wipe_certificate_id,
      wipe_software
    `)
    .not('current_warehouse_id', 'is', null)
    .not('status', 'in', '("sold","destroyed","scrapped")')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching warehouse assets:', error)
    return []
  }

  if (!data || data.length === 0) return []

  const batchIds = Array.from(new Set(data.map(a => a.batch_id).filter(Boolean)))

  // Catálogo completo de bodegas (evita filas sin código por .in parcial / caché)
  let warehousesMap: Record<string, { code: string; name: string }> = {}
  {
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, code, name')

    warehouses?.forEach((w) => {
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
    order_code: string | null
  }> = {}
  if (batchIds.length > 0) {
    // Solo columnas reales de batches (sin container_type — no existe en esta BD)
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('id, internal_batch_id, location, ticket_id')
      .in('id', batchIds)

    if (batchesError) {
      console.error('Error fetching batches for warehouse assets:', batchesError)
    }

    // Obtener IDs de tickets
    const ticketIds = batches?.map(b => b.ticket_id).filter(Boolean) || []
    let ticketsMap: Record<string, { readable_id: string; order_code: string | null }> = {}

    if (ticketIds.length > 0) {
      const { data: tickets } = await supabase
        .from('operations_tickets')
        .select('id, readable_id, description, title')
        .in('id', ticketIds)

      tickets?.forEach(t => {
        if (!t.readable_id) return
        ticketsMap[t.id] = {
          readable_id: t.readable_id,
          order_code: extractOrderCode(t.description) || extractOrderCode(t.title),
        }
      })
    }

    batches?.forEach(b => {
      const ticketMeta = b.ticket_id ? ticketsMap[b.ticket_id] : null
      batchesMap[b.id] = {
        code: b.internal_batch_id,
        location: b.location,
        container_type: null,
        ticket_id: b.ticket_id,
        ticket_code: ticketMeta?.readable_id || null,
        order_code: ticketMeta?.order_code || extractOrderCode(b.internal_batch_id),
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

  // ticket_items reales de esta BD (+ reception_metadata JSON)
  interface TicketItemData {
    id: string | null
    asset_id: string | null
    collected_serial: string | null
    color: string | null
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

  const mapTicketItemRow = (ti: Record<string, unknown>): TicketItemData => {
    const meta = (ti.reception_metadata || {}) as Record<string, unknown>
    return {
      id: (ti.id as string) || null,
      asset_id: (ti.asset_id as string) || null,
      collected_serial: (ti.collected_serial as string) || null,
      color: (ti.color as string) || null,
      color_detail: (meta.color_detail as string) || (ti.color as string) || null,
      classification_rec: (meta.classification_rec as string) || null,
      classification_f: (ti.classification_f as string) || null,
      classification_c: (ti.classification_c as string) || null,
      processor: (meta.processor as string) || null,
      bios_version: (meta.bios_version as string) || null,
      ram_capacity: (meta.ram_capacity as string) || null,
      ram_type: (meta.ram_type as string) || null,
      disk_capacity: (meta.disk_capacity as string) || null,
      disk_type: (meta.disk_type as string) || null,
      keyboard_type: (meta.keyboard_type as string) || null,
      keyboard_version: (meta.keyboard_version as string) || null,
      observations: (meta.observations as string) || null,
      box_number: typeof ti.box_number === 'number' ? ti.box_number : ti.box_number != null ? Number(ti.box_number) : null,
    }
  }

  if (assetIds.length > 0 || serialNumbers.length > 0) {
    const ticketItemSelect =
      'id, asset_id, collected_serial, color, classification_f, classification_c, box_number, reception_metadata'

    if (assetIds.length > 0) {
      const { data: ticketItemsByAssetId } = await supabase
        .from('ticket_items')
        .select(ticketItemSelect)
        .in('asset_id', assetIds)

      ticketItemsByAssetId?.forEach((raw) => {
        const ti = mapTicketItemRow(raw as Record<string, unknown>)
        if (ti.asset_id) ticketItemsMap[ti.asset_id] = ti
      })
    }

    if (serialNumbers.length > 0) {
      const { data: ticketItemsBySerial } = await supabase
        .from('ticket_items')
        .select(ticketItemSelect)
        .in('collected_serial', serialNumbers)

      const serialToAssetId: Record<string, string> = {}
      data.forEach((asset: any) => {
        if (asset.serial_number && asset.id) {
          serialToAssetId[asset.serial_number] = asset.id
        }
      })

      ticketItemsBySerial?.forEach((raw) => {
        const ti = mapTicketItemRow(raw as Record<string, unknown>)
        if (!ti.collected_serial) return
        const assetId = serialToAssetId[ti.collected_serial]
        if (assetId && !ticketItemsMap[assetId]) {
          ticketItemsMap[assetId] = ti
        }
      })
    }
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
    const ticketColor = ticketItem?.color_detail || ticketItem?.color || null
    const finalColor = asset.color || ticketColor || batchExpectedColor || (typeof specColor === 'string' ? specColor : null)

    const batchInfo = asset.batch_id ? batchesMap[asset.batch_id] : null
    const ticketFromSpecs =
      typeof finalSpecs.ticket_readable_id === 'string' ? finalSpecs.ticket_readable_id : null
    const orderFromSpecs =
      typeof finalSpecs.source_order_number === 'string'
        ? extractOrderCode(finalSpecs.source_order_number as string)
        : null

    const mappedWarehouse = asset.current_warehouse_id
      ? warehousesMap[asset.current_warehouse_id]
      : null
    const warehouseCode = mappedWarehouse?.code || null
    const warehouseName = mappedWarehouse?.name || null

    // Si "ubicación" del lote solo repite el código de bodega, no es ubicación física útil
    const rawBatchLocation = batchInfo?.location || null
    const batchLocation =
      rawBatchLocation &&
      warehouseCode &&
      rawBatchLocation.trim().toUpperCase() === warehouseCode.trim().toUpperCase()
        ? null
        : rawBatchLocation

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
      batch_code: batchInfo?.code || null,
      order_code: batchInfo?.order_code || orderFromSpecs || null,
      batch_location: batchLocation,
      container_type: batchInfo?.container_type || null,
      ticket_id: batchInfo?.ticket_id || null,
      ticket_code: batchInfo?.ticket_code || ticketFromSpecs || null,
      warehouse_code: warehouseCode,
      warehouse_name: warehouseName,
      current_warehouse_id: asset.current_warehouse_id,
      warehouse_received_at: movementDates[asset.id] || null,
      last_transfer_date: asset.last_transfer_date || null,
      sales_price: asset.sales_price,
      cost_amount: asset.cost_amount != null ? Number(asset.cost_amount) : null,
      specifications: Object.keys(finalSpecs).length > 0 ? finalSpecs : null,
      box_number: ticketItem?.box_number ?? null,
      wipe_status:
        asset.status === 'wiped' || asset.wipe_result === 'success' || asset.wipe_result === 'Pass'
          ? 'wiped'
          : asset.wipe_result || null,
      wiped_at: asset.wipe_completed_at || null,
      module_label: resolveAssetModuleLabel(warehouseCode, asset.status, warehouseName),
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

export type RepairStageKey = 'diagnostico' | 'reparacion' | 'control_calidad'

const DIAGNOSTICO_STATUSES = new Set([
  'open',
  'waiting_quote',
  'quote_rejected',
  'en diagnostico',
  'diagnosing',
])
const REPARACION_STATUSES = new Set([
  'in_progress',
  'waiting_parts',
  'waiting_seedstock',
  'quote_approved',
  'en reparacion',
])
const QC_STATUSES = new Set([
  'qc_pending',
  'qc_failed',
  'en control de calidad',
  'qc pendiente',
  'en qc',
])

function resolveRepairStage(status?: string | null): RepairStageKey {
  const normalized = (status || '').trim().toLowerCase()
  if (QC_STATUSES.has(normalized)) return 'control_calidad'
  if (REPARACION_STATUSES.has(normalized)) return 'reparacion'
  if (DIAGNOSTICO_STATUSES.has(normalized)) return 'diagnostico'
  // Sin OS o estado desconocido: entra como Diagnóstico (cola de ingreso)
  return 'diagnostico'
}

/**
 * Inventario de Por Reparación (BOD-REP) enriquecido con OS y etapa del taller.
 */
export async function getRepairWarehouseBoard(): Promise<{
  rows: Array<{
    assetId: string
    serial: string
    manufacturer: string
    model: string
    assetType: string
    workOrderId: string | null
    workOrderNumber: string | null
    status: string
    stage: RepairStageKey
    updatedAt: string | null
  }>
  counts: Record<RepairStageKey, number>
}> {
  const emptyCounts: Record<RepairStageKey, number> = {
    diagnostico: 0,
    reparacion: 0,
    control_calidad: 0,
  }
  const supabase = await createClient()

  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', 'BOD-REP')
    .maybeSingle()

  if (!warehouse?.id) {
    return { rows: [], counts: emptyCounts }
  }

  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, serial_number, internal_tag, manufacturer, model, asset_type, status, updated_at')
    .eq('current_warehouse_id', warehouse.id)
    .not('status', 'in', '("sold","destroyed","scrapped")')
    .order('updated_at', { ascending: false })

  if (error || !assets?.length) {
    if (error) console.error('[getRepairWarehouseBoard]', error)
    return { rows: [], counts: emptyCounts }
  }

  const assetIds = assets.map((a) => a.id)
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('id, work_order_number, status, asset_id, updated_at')
    .in('asset_id', assetIds)
    .not('status', 'in', '("qc_passed","completed","cancelled","closed")')
    .order('updated_at', { ascending: false })

  const woByAsset = new Map<string, { id: string; work_order_number: string; status: string; updated_at: string | null }>()
  for (const wo of workOrders || []) {
    if (!wo.asset_id || woByAsset.has(wo.asset_id)) continue
    woByAsset.set(wo.asset_id, {
      id: wo.id,
      work_order_number: wo.work_order_number,
      status: wo.status,
      updated_at: wo.updated_at,
    })
  }

  const rows = assets.map((asset) => {
    const wo = woByAsset.get(asset.id)
    const status = wo?.status || asset.status || 'open'
    const stage = resolveRepairStage(status)
    return {
      assetId: asset.id,
      serial: asset.serial_number || asset.internal_tag || '—',
      manufacturer: asset.manufacturer || '—',
      model: asset.model || '—',
      assetType: asset.asset_type || '—',
      workOrderId: wo?.id || null,
      workOrderNumber: wo?.work_order_number || null,
      status,
      stage,
      updatedAt: wo?.updated_at || asset.updated_at || null,
    }
  })

  const counts = { ...emptyCounts }
  for (const row of rows) counts[row.stage] += 1

  return { rows, counts }
}

import { setSession } from '@/lib/supabase/session'

export type BatchPriceKind = 'cost' | 'sale'

/**
 * Asigna precio a todos los assets de un lote en una bodega (divide el total).
 * - cost → assets.cost_amount (compra / adquisición) + settlement.acquisition_cost
 * - sale → assets.sales_price (venta)
 */
export async function setBatchPrice(
  batchId: string,
  warehouseCode: string,
  totalPrice: number,
  kind: BatchPriceKind = 'cost'
): Promise<{ success: boolean; error?: string; count?: number; pricePerUnit?: number; kind?: BatchPriceKind }> {
  const supabase = await createClient()
  await setSession(supabase)

  try {
    if (totalPrice <= 0) {
      return { success: false, error: 'El precio debe ser mayor a 0' }
    }

    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('code', warehouseCode)
      .maybeSingle()

    if (warehouseError || !warehouse) {
      return { success: false, error: 'Bodega no encontrada' }
    }

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

    const pricePerUnit = totalPrice / totalAssets
    const updatePayload =
      kind === 'sale'
        ? { sales_price: pricePerUnit, updated_at: new Date().toISOString() }
        : { cost_amount: pricePerUnit, updated_at: new Date().toISOString() }

    const { error: updateError } = await supabase
      .from('assets')
      .update(updatePayload)
      .eq('batch_id', batchId)
      .eq('current_warehouse_id', warehouse.id)

    if (updateError) {
      console.error('[setBatchPrice] Error:', updateError)
      return { success: false, error: updateError.message }
    }

    if (kind === 'cost') {
      const { data: settlements, error: settlementError } = await supabase
        .from('settlements')
        .select('id')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!settlementError && settlements && settlements.length > 0) {
        await supabase
          .from('settlements')
          .update({
            acquisition_cost: totalPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlements[0].id)
      }
    }

    return { success: true, count: totalAssets, pricePerUnit, kind }
  } catch (error) {
    console.error('[setBatchPrice] Error inesperado:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}

/**
 * Asigna el mismo precio de venta (P. Base) a una lista de assets seleccionados.
 */
export async function setSelectedAssetsSalesPrice(
  assetIds: string[],
  salesPrice: number
): Promise<{ success: boolean; error?: string; updated?: number }> {
  const supabase = await createClient()
  await setSession(supabase)

  try {
    const ids = Array.from(new Set((assetIds || []).map((id) => String(id || '').trim()).filter(Boolean)))
    if (ids.length === 0) {
      return { success: false, error: 'Selecciona al menos un equipo' }
    }
    if (!Number.isFinite(salesPrice) || salesPrice < 0) {
      return { success: false, error: 'Precio de venta inválido' }
    }

    const { data, error } = await supabase
      .from('assets')
      .update({ sales_price: salesPrice, updated_at: new Date().toISOString() })
      .in('id', ids)
      .select('id')

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, updated: data?.length || ids.length }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}

/** Aplica costos de compra distintos por serie (pega desde Excel: serie + precio). */
export async function setAssetPurchaseCosts(
  rows: Array<{ serial: string; cost: number }>
): Promise<{ success: boolean; error?: string; updated?: number; missing?: string[] }> {
  const supabase = await createClient()
  await setSession(supabase)

  try {
    const cleaned = rows
      .map((r) => ({
        serial: String(r.serial || '').trim().toUpperCase(),
        cost: Number(r.cost),
      }))
      .filter((r) => r.serial && Number.isFinite(r.cost) && r.cost >= 0)

    if (cleaned.length === 0) {
      return { success: false, error: 'No hay filas válidas (serie + costo)' }
    }

    const serials = cleaned.map((r) => r.serial)
    const { data: assets, error } = await supabase
      .from('assets')
      .select('id, serial_number')
      .in('serial_number', serials)

    if (error) {
      return { success: false, error: error.message }
    }

    const bySerial = new Map(
      (assets || []).map((a) => [String(a.serial_number || '').toUpperCase(), a.id as string])
    )
    const missing: string[] = []
    let updated = 0

    for (const row of cleaned) {
      const id = bySerial.get(row.serial)
      if (!id) {
        missing.push(row.serial)
        continue
      }
      const { error: upErr } = await supabase
        .from('assets')
        .update({ cost_amount: row.cost, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (!upErr) updated += 1
    }

    return { success: true, updated, missing }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}

export type PurchaseLotLine = {
  serial: string
  manufacturer?: string | null
  model?: string | null
  asset_type?: string | null
  /** Grade A|B|C|Scrap (enum assets.condition_grade) */
  conditionGrade?: string | null
  cost: number
  configuration?: string | null
  hardwareSpecs?: Record<string, string> | null
}

/**
 * Alta de lote comprado → ticket + batch + assets en BOD-REM con costo c/u.
 * No pasa por wipe/recepción de cliente.
 */
export async function createPurchaseLot(input: {
  supplierName: string
  invoiceRef?: string | null
  notes?: string | null
  lines: PurchaseLotLine[]
}): Promise<{ success: boolean; error?: string; batchCode?: string; count?: number; ticketId?: string }> {
  const supabase = await createClient()
  await setSession(supabase)

  try {
    const supplierName = String(input.supplierName || '').trim()
    if (!supplierName) {
      return { success: false, error: 'Indica el proveedor / vendedor' }
    }

    const allowedGrades = new Set(['Grade A', 'Grade B', 'Grade C', 'Scrap'])
    const lines = (input.lines || [])
      .map((l) => {
        const gradeRaw = l.conditionGrade?.trim() || null
        const condition_grade =
          gradeRaw && allowedGrades.has(gradeRaw)
            ? gradeRaw
            : gradeRaw && /grade\s*d/i.test(gradeRaw)
              ? 'Scrap'
              : null
        return {
          serial: String(l.serial || '').trim().toUpperCase(),
          manufacturer: l.manufacturer?.trim() || null,
          model: l.model?.trim() || null,
          asset_type: l.asset_type?.trim() || 'Laptop',
          condition_grade,
          cost: Number(l.cost),
          configuration: l.configuration?.trim() || null,
          hardwareSpecs: l.hardwareSpecs && typeof l.hardwareSpecs === 'object' ? l.hardwareSpecs : {},
        }
      })
      .filter((l) => l.serial && Number.isFinite(l.cost) && l.cost >= 0)

    if (lines.length === 0) {
      return { success: false, error: 'Agrega al menos un equipo con serie y costo' }
    }

    const serials = lines.map((l) => l.serial)
    if (new Set(serials).size !== serials.length) {
      return { success: false, error: 'Hay series duplicadas en el lote' }
    }

    // Comparación case-insensitive para evitar serie duplicada (PF3… vs pf3…)
    const { data: existingAll } = await supabase
      .from('assets')
      .select('id, serial_number, status, current_warehouse_id')
      .not('serial_number', 'is', null)

    const serialSet = new Set(serials.map((s) => s.toUpperCase()))
    const existing = (existingAll || []).filter((e) =>
      serialSet.has(String(e.serial_number || '').trim().toUpperCase())
    )

    if (existing.length > 0) {
      const dup = existing
        .map((e) => {
          const st = e.status === 'sold' ? ' (ya vendido)' : e.current_warehouse_id ? ' (en inventario)' : ''
          return `${e.serial_number}${st}`
        })
        .join(', ')
      return { success: false, error: `Series ya existentes: ${dup}` }
    }

    const { data: remWh, error: whErr } = await supabase
      .from('warehouses')
      .select('id')
      .eq('code', 'BOD-REM')
      .maybeSingle()

    if (whErr || !remWh?.id) {
      return { success: false, error: 'Bodega BOD-REM no encontrada' }
    }

    // Proveedor: reutilizar CRM o crear
    let clientId: string | null = null
    const { data: existingClient } = await supabase
      .from('crm_entities')
      .select('id')
      .ilike('commercial_name', supplierName)
      .limit(1)
      .maybeSingle()

    if (existingClient?.id) {
      clientId = existingClient.id
    } else {
      const { data: createdClient, error: clientErr } = await supabase
        .from('crm_entities')
        .insert({
          tax_id_nit: `CF-COMPRA-${Date.now().toString().slice(-8)}`,
          commercial_name: supplierName,
          legal_name: supplierName,
          entity_type: 'client',
          is_active: true,
          notes: 'Proveedor de lote comprado (Remarketing)',
        })
        .select('id')
        .single()

      if (clientErr || !createdClient?.id) {
        return {
          success: false,
          error: clientErr?.message || 'No se pudo crear el proveedor',
        }
      }
      clientId = createdClient.id
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const batchCode = `COMP-${stamp}-${String(Date.now()).slice(-4)}`
    const totalCost = lines.reduce((s, l) => s + l.cost, 0)
    const invoiceRef = input.invoiceRef?.trim() || null

    const { data: ticket, error: ticketErr } = await supabase
      .from('operations_tickets')
      .insert({
        client_id: clientId,
        ticket_type: 'compra',
        title: `Lote comprado ${batchCode}`,
        description: `Compra para Remarketing · ${lines.length} equipos · Total Q${totalCost.toFixed(2)}`,
        status: 'completed',
        expected_units: lines.length,
        received_units: lines.length,
        notes: [
          'LOTE_COMPRADO',
          invoiceRef ? `Factura/Ref: ${invoiceRef}` : null,
          input.notes?.trim() || null,
        ]
          .filter(Boolean)
          .join(' · '),
        created_by: user?.id || null,
        completed_at: new Date().toISOString(),
        completed_by: user?.id || null,
      })
      .select('id, readable_id')
      .single()

    if (ticketErr || !ticket?.id) {
      return { success: false, error: ticketErr?.message || 'No se pudo crear el ticket de compra' }
    }

    const { data: batch, error: batchErr } = await supabase
      .from('batches')
      .insert({
        internal_batch_id: batchCode,
        ticket_id: ticket.id,
        status: 'completed',
        description: `Lote comprado · ${supplierName}${invoiceRef ? ` · ${invoiceRef}` : ''}`,
        expected_units: lines.length,
        received_units: lines.length,
        reception_date: new Date().toISOString(),
        received_by: user?.id || null,
        location: 'BOD-REM',
        notes: 'acquisition_source=purchase',
      })
      .select('id, internal_batch_id')
      .single()

    if (batchErr || !batch?.id) {
      return { success: false, error: batchErr?.message || 'No se pudo crear el lote' }
    }

    const now = new Date().toISOString()
    const assetRows = lines.map((line) => {
      const internalTag = `AST-${line.serial}`.replace(/[^A-Z0-9\-]/gi, '').slice(0, 64)
      return {
        internal_tag: internalTag,
        serial_number: line.serial,
        batch_id: batch.id,
        asset_type: line.asset_type || 'Laptop',
        manufacturer: line.manufacturer,
        model: line.model,
        condition_grade: line.condition_grade,
        condition: line.condition_grade,
        status: 'ready_for_sale',
        current_warehouse_id: remWh.id,
        currency: 'GTQ',
        cost_amount: line.cost,
        specifications: {
          acquisition_source: 'purchase',
          purchase_lot: true,
          purchase_batch_code: batchCode,
          supplier_name: supplierName,
          invoice_ref: invoiceRef,
          project_number: invoiceRef,
          ticket_readable_id: ticket.readable_id,
          configuration_raw: line.configuration,
          hardware_specs: line.hardwareSpecs,
        },
        last_transfer_date: now,
        created_by: user?.id || null,
      }
    })

    const { error: assetsErr } = await supabase.from('assets').insert(assetRows)
    if (assetsErr) {
      return { success: false, error: assetsErr.message }
    }

    try {
      await supabase.from('settlements').insert({
        batch_id: batch.id,
        acquisition_cost: totalCost,
      })
    } catch {
      // liquidación opcional
    }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard/inventario/bodega')
    revalidatePath('/dashboard/finanzas')

    return {
      success: true,
      batchCode: batch.internal_batch_id,
      count: lines.length,
      ticketId: ticket.id,
    }
  } catch (error) {
    console.error('[createPurchaseLot]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}

const REPAIR_WAREHOUSE_CODE = 'BOD-REP'
const OS_NUMBER_PREFIX = 'OS-'
const OS_START_SEQUENCE = 100
const ACTIVE_WORK_ORDER_STATUSES = [
  'open',
  'in_progress',
  'waiting_parts',
  'waiting_quote',
  'quote_approved',
  'waiting_seedstock',
  'qc_pending',
  'en diagnostico',
  'en reparacion',
]

/**
 * Envía equipos a Por Reparación (BOD-REP) creando OS abiertas
 * para que alimenten la cola de Diagnóstico del taller.
 */
export async function sendSelectedAssetsToRepair(assetIds: string[]): Promise<{
  success: boolean
  error?: string
  created?: number
  skipped?: number
  moved?: number
  workOrders?: Array<{ assetId: string; serial: string | null; workOrderNumber: string }>
}> {
  const supabase = await createClient()
  await setSession(supabase)

  try {
    const ids = Array.from(new Set((assetIds || []).map((id) => String(id || '').trim()).filter(Boolean)))
    if (ids.length === 0) {
      return { success: false, error: 'Selecciona al menos un equipo' }
    }

    const { data: repairWarehouse, error: whError } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('code', REPAIR_WAREHOUSE_CODE)
      .maybeSingle()

    if (whError || !repairWarehouse?.id) {
      return { success: false, error: 'Bodega BOD-REP (Por Reparación) no encontrada' }
    }

    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, serial_number, status, current_warehouse_id')
      .in('id', ids)

    if (assetsError) {
      return { success: false, error: assetsError.message }
    }
    if (!assets?.length) {
      return { success: false, error: 'No se encontraron los equipos seleccionados' }
    }

    const destroyed = assets.filter((a) => a.status === 'destroyed' || a.status === 'sold' || a.status === 'scrapped')
    if (destroyed.length === ids.length) {
      return { success: false, error: 'Los equipos seleccionados no se pueden enviar a reparación' }
    }

    const eligible = assets.filter((a) => !destroyed.some((d) => d.id === a.id))

    const { data: activeWOs } = await supabase
      .from('work_orders')
      .select('asset_id, work_order_number, status')
      .in('asset_id', eligible.map((a) => a.id))
      .in('status', ACTIVE_WORK_ORDER_STATUSES)

    const blockedIds = new Set((activeWOs || []).map((wo) => wo.asset_id).filter(Boolean))
    const toCreate = eligible.filter((a) => !blockedIds.has(a.id))
    const skipped = eligible.length - toCreate.length

    const { data: recentWOs } = await supabase
      .from('work_orders')
      .select('work_order_number')
      .like('work_order_number', `${OS_NUMBER_PREFIX}%`)
      .order('created_at', { ascending: false })
      .limit(500)

    let nextSeq = OS_START_SEQUENCE
    recentWOs?.forEach((row) => {
      const match = String(row.work_order_number || '').match(new RegExp(`^${OS_NUMBER_PREFIX}(\\d+)$`, 'i'))
      if (match) nextSeq = Math.max(nextSeq, Number(match[1]) + 1)
    })

    const createdRows: Array<{ assetId: string; serial: string | null; workOrderNumber: string }> = []
    const insertPayload = toCreate.map((asset, index) => {
      const workOrderNumber = `${OS_NUMBER_PREFIX}${nextSeq + index}`
      createdRows.push({
        assetId: asset.id,
        serial: asset.serial_number,
        workOrderNumber,
      })
      return {
        work_order_number: workOrderNumber,
        asset_id: asset.id,
        reported_issue: 'Enviado a diagnóstico desde Bodega Remarketing',
        status: 'open',
        priority: 'normal',
      }
    })

    if (insertPayload.length > 0) {
      const { error: insertError } = await supabase.from('work_orders').insert(insertPayload)
      if (insertError) {
        return { success: false, error: insertError.message }
      }
    }

    // Mover todos los elegibles a BOD-REP (también los que ya tenían OS, por si estaban mal ubicados)
    const moveIds = eligible.map((a) => a.id)
    const transferDate = new Date().toISOString()
    const { error: moveError } = await supabase
      .from('assets')
      .update({
        current_warehouse_id: repairWarehouse.id,
        location: REPAIR_WAREHOUSE_CODE,
        status: 'diagnosing',
        last_transfer_date: transferDate,
        updated_at: transferDate,
      })
      .in('id', moveIds)

    if (moveError) {
      return { success: false, error: moveError.message }
    }

    const { data: { user } } = await supabase.auth.getUser()
    const movements = moveIds.map((assetId) => {
      const asset = assets.find((a) => a.id === assetId)
      return {
        asset_id: assetId,
        from_warehouse_id: asset?.current_warehouse_id || null,
        to_warehouse_id: repairWarehouse.id,
        movement_type: 'transfer',
        transfer_date: transferDate,
        notes: 'Traslado a Por Reparación / Diagnóstico',
        created_by: user?.id || null,
        reference_number: null,
      }
    })

    if (movements.length > 0) {
      await supabase.from('inventory_movements').insert(movements)
    }

    for (const row of createdRows) {
      await supabase.from('asset_history').insert({
        asset_id: row.assetId,
        action: 'MOVE',
        location: REPAIR_WAREHOUSE_CODE,
        description: `Enviado a Por Reparación — OS ${row.workOrderNumber} (Diagnóstico)`,
      })
    }

    return {
      success: true,
      created: createdRows.length,
      skipped,
      moved: moveIds.length,
      workOrders: createdRows,
    }
  } catch (error) {
    console.error('[sendSelectedAssetsToRepair]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}
