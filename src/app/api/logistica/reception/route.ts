import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RECEIVING_WAREHOUSE_CODE = 'BOD-REC'
const ALLOWED_ITEM_TYPES = ['asset', 'part', 'seedstock'] as const
type InventoryItemType = (typeof ALLOWED_ITEM_TYPES)[number]

const parseItemType = (value?: string | null): InventoryItemType => {
  if (!value) {
    return 'asset'
  }

  const normalized = value.trim().toLowerCase()
  if (ALLOWED_ITEM_TYPES.includes(normalized as InventoryItemType)) {
    return normalized as InventoryItemType
  }

  if (normalized.includes('seed')) {
    return 'seedstock'
  }

  if (normalized.includes('part') || normalized.includes('rep')) {
    return 'part'
  }

  return 'asset'
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

const resolveTicketId = async (
  supabase: SupabaseClient,
  explicitId: string,
  readableId: string
) => {
  if (explicitId && isUuid(explicitId)) {
    return explicitId
  }

  if (!readableId) {
    return null
  }

  const { data, error } = await supabase
    .from('operations_tickets')
    .select('id')
    .ilike('readable_id', readableId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (data?.id) {
    return data.id
  }

  if (!isUuid(readableId)) {
    return null
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('operations_tickets')
    .select('id')
    .eq('id', readableId)
    .maybeSingle()

  if (fallbackError) {
    throw new Error(fallbackError.message)
  }

  return fallback?.id ?? null
}

interface ReceptionRequest {
  ticketId?: string | null
  ticketReadableId?: string | null
  boxNumber?: string | number | null
  warehouseCode?: string | null
  itemType?: string | null
}

const saveBoxReception = async (
  supabase: SupabaseClient,
  ticketId: string,
  boxNumber: number,
  warehouseCode: string,
  itemType: InventoryItemType
) => {
  const { data, error } = await supabase.rpc('save_box_reception', {
    p_ticket_id: ticketId,
    p_box_number: boxNumber,
    p_warehouse_code: warehouseCode,
    p_item_type: itemType
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No se pudo completar la recepción de la caja')
  }

  const [result] = data as Array<{
    reception_code: string | null
    moved_assets: number | null
    warehouse_code: string | null
  }>

  return {
    reception_code: result.reception_code,
    moved_assets: Number(result.moved_assets ?? 0),
    warehouse_code: result.warehouse_code ?? RECEIVING_WAREHOUSE_CODE
  }
}

// Garantiza que exista un lote para el ticket; si no, crea uno básico
const ensureBatchForTicket = async (supabase: SupabaseClient, ticketId: string) => {
  // ¿Ya existe lote?
  const { data: existingBatch, error: batchError } = await supabase
    .from('batches')
    .select('id')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (batchError) {
    throw new Error(batchError.message)
  }

  if (existingBatch?.id) {
    return existingBatch.id as string
  }

  // Datos mínimos para crear el lote
  const [{ data: ticketInfo }, { count: receivedCount }] = await Promise.all([
    supabase
      .from('operations_tickets')
      .select('expected_units')
      .eq('id', ticketId)
      .maybeSingle(),
    supabase
      .from('ticket_items')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_id', ticketId)
  ])

  const expectedUnits = Number(ticketInfo?.expected_units ?? receivedCount ?? 0)
  const internalId = `AUTO-${Date.now()}`

  const { data: created, error: createError } = await supabase
    .from('batches')
    .insert({
      internal_batch_id: internalId,
      ticket_id: ticketId,
      status: 'received',
      expected_units: expectedUnits,
      received_units: receivedCount ?? 0,
      reception_date: new Date().toISOString(),
      pallet_count: 1
    })
    .select('id')
    .single()

  if (createError) {
    throw new Error(createError.message)
  }

  return created.id as string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReceptionRequest
    const explicitId = body.ticketId?.trim() || ''
    const readableIdSource = body.ticketReadableId?.trim() || explicitId
    const rawBoxNumber = body.boxNumber ?? ''

    if (!explicitId && !readableIdSource) {
      return NextResponse.json({ error: 'Falta el ticket a procesar' }, { status: 400 })
    }

    const parsedBoxNumber = Number.parseInt(String(rawBoxNumber).replace(/\D/g, ''), 10)
    if (Number.isNaN(parsedBoxNumber)) {
      return NextResponse.json({ error: 'Número de caja inválido' }, { status: 400 })
    }

    const warehouseCode = (body.warehouseCode?.trim() || RECEIVING_WAREHOUSE_CODE)
    const itemType = parseItemType(body.itemType)
    const supabase = await createClient()
    const ticketId = await resolveTicketId(supabase, explicitId, readableIdSource)

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    // Resolver marca/modelo/tipo desde catálogos si vienen vacíos en ticket_items
    const { data: itemsToResolve } = await supabase
      .from('ticket_items')
      .select('id, brand_full, model_full, product_type, brand_id, model_id, product_type_id')
      .eq('ticket_id', ticketId)
      .eq('box_number', parsedBoxNumber)

    const brandIds = Array.from(new Set((itemsToResolve || []).map(i => i.brand_id).filter(Boolean))) as string[]
    const modelIds = Array.from(new Set((itemsToResolve || []).map(i => i.model_id).filter(Boolean))) as string[]
    const typeIds = Array.from(new Set((itemsToResolve || []).map(i => i.product_type_id).filter(Boolean))) as string[]

    const [brands, models, types] = await Promise.all([
      brandIds.length > 0
        ? supabase.from('catalog_brands').select('id, name').in('id', brandIds)
        : Promise.resolve({ data: [] }),
      modelIds.length > 0
        ? supabase.from('catalog_models').select('id, name').in('id', modelIds)
        : Promise.resolve({ data: [] }),
      typeIds.length > 0
        ? supabase.from('catalog_product_types').select('id, name').in('id', typeIds)
        : Promise.resolve({ data: [] })
    ])

    const brandMap = new Map((brands.data || []).map((b: any) => [b.id, b.name]))
    const modelMap = new Map((models.data || []).map((m: any) => [m.id, m.name]))
    const typeMap = new Map((types.data || []).map((t: any) => [t.id, t.name]))

    const isPlaceholder = (value?: string | null) => {
      const normalized = (value || '').trim().toLowerCase()
      return !normalized || normalized === 'sin marca' || normalized === 'sin modelo' || normalized === 'equipo'
    }

    if (itemsToResolve && itemsToResolve.length > 0) {
      await Promise.all(itemsToResolve.map(async (item) => {
        const nextBrand = isPlaceholder(item.brand_full) ? brandMap.get(item.brand_id) : item.brand_full
        const nextModel = isPlaceholder(item.model_full) ? modelMap.get(item.model_id) : item.model_full
        const nextType = isPlaceholder(item.product_type) ? typeMap.get(item.product_type_id) : item.product_type

        if (nextBrand !== item.brand_full || nextModel !== item.model_full || nextType !== item.product_type) {
          await supabase
            .from('ticket_items')
            .update({
              brand: nextBrand || null,
              model: nextModel || null,
              product_type: nextType || null,
              brand_full: nextBrand || null,
              model_full: nextModel || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
        }
      }))
    }

    // Crear un lote si no existe para evitar el error "No existe lote asociado"
    const batchId = await ensureBatchForTicket(supabase, ticketId)

    const reception = await saveBoxReception(supabase, ticketId, parsedBoxNumber, warehouseCode, itemType)

    // Asegurar que activos existentes vuelvan a BOD-REC si fueron removidos
    const { data: warehouseRow } = await supabase
      .from('warehouses')
      .select('id')
      .eq('code', warehouseCode)
      .maybeSingle()

    if (warehouseRow?.id) {
      const { data: items } = await supabase
        .from('ticket_items')
        .select('asset_id')
        .eq('ticket_id', ticketId)
        .eq('box_number', parsedBoxNumber)

      const assetIds = (items || []).map((i) => i.asset_id).filter(Boolean)
      if (assetIds.length > 0) {
        await supabase
          .from('assets')
          .update({
            current_warehouse_id: warehouseRow.id,
            status: 'received',
            batch_id: batchId,
            last_transfer_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', assetIds as string[])
      }
    }

    return NextResponse.json({
      success: true,
      code: reception.reception_code,
      warehouseCode: reception.warehouse_code,
      movedAssets: reception.moved_assets
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando la recepción'
    const normalized = message.toLowerCase()
    const status = normalized.includes('tipo de activo') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
