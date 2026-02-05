import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type RawAsset = {
  id: string
  internal_tag: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string
  status: string
  current_warehouse_id: string | null
  batch_id?: string | null
}

interface EnrichedAsset extends RawAsset {
  batch_code: string | null
  client_name: string | null
}

async function enrichAssets(client: ServerSupabaseClient, assets: RawAsset[] = []): Promise<EnrichedAsset[]> {
  if (!assets || assets.length === 0) return []

  const batchIds = Array.from(new Set(assets.map((asset) => asset.batch_id).filter(Boolean)))
  const batchInfoMap: Record<string, { code: string | null; ticketId: string | null }> = {}

  if (batchIds.length > 0) {
    const { data: batches } = await client
      .from('batches')
      .select('id, internal_batch_id, ticket_id')
      .in('id', batchIds)

    batches?.forEach((batch) => {
      if (!batch?.id) return
      batchInfoMap[batch.id] = {
        code: batch.internal_batch_id ?? null,
        ticketId: batch.ticket_id ?? null
      }
    })
  }

  const ticketIds = Array.from(new Set(
    Object.values(batchInfoMap)
      .map((info) => info.ticketId)
      .filter(Boolean)
  ))
  const ticketClientMap: Record<string, string | null> = {}

  if (ticketIds.length > 0) {
    const { data: tickets } = await client
      .from('operations_tickets')
      .select('id, client:crm_entities(id, commercial_name)')
      .in('id', ticketIds)

    tickets?.forEach((ticket) => {
      if (!ticket?.id) return
      ticketClientMap[ticket.id] = (ticket as any).client?.commercial_name ?? null
    })
  }

  return assets.map((asset) => {
    const batchInfo = asset.batch_id ? batchInfoMap[asset.batch_id] : null
    const clientName = batchInfo?.ticketId ? ticketClientMap[batchInfo.ticketId] ?? null : null
    return {
      ...asset,
      batch_code: batchInfo?.code ?? null,
      client_name: clientName
    }
  })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const RECEIVING_WAREHOUSE_CODE = 'BOD-REC'
  const url = new URL(request.url)
  const includeBlocked = url.searchParams.get('includeBlocked') === '1'
  const ignoreWarehouse = url.searchParams.get('ignoreWarehouse') === '1'

  const ACTIVE_WORK_ORDER_STATUSES = [
    'open',
    'in_progress',
    'waiting_parts',
    'waiting_quote',
    'quote_approved',
    'waiting_seedstock',
    'qc_pending'
  ]

  const { data: activeWorkOrders, error: workOrdersError } = await supabase
    .from('work_orders')
    .select('asset_id')
    .in('status', ACTIVE_WORK_ORDER_STATUSES)
    .not('asset_id', 'is', null)
    .limit(500)

  if (workOrdersError) {
    console.error('Error fetching active work orders:', workOrdersError)
  }

  const blockedAssetIds = Array.from(
    new Set(activeWorkOrders?.map((wo) => wo.asset_id).filter(Boolean))
  )
  const blockedAssetFilter =
    blockedAssetIds.length > 0 ? `(${blockedAssetIds.map((id) => `"${id}"`).join(',')})` : null

  // Resolver la bodega de Recepción para mostrar series disponibles "desde Bodega Recepción"
  const { data: receivingWarehouse, error: warehouseError } = await supabase
    .from('warehouses')
    .select('id, code')
    .eq('code', RECEIVING_WAREHOUSE_CODE)
    .maybeSingle()

  if (warehouseError) {
    console.error('Error fetching receiving warehouse:', warehouseError)
  }

  // Obtener activos que pueden tener orden de trabajo
  // (recibidos, en proceso de borrado, etc. - no los que ya están en reparación)
  let query = supabase
    .from('assets')
    .select('id, internal_tag, serial_number, manufacturer, model, asset_type, status, current_warehouse_id, batch_id')
    // Mantener alineado con los estados visibles en inventario (más realista para Recepción)
    .in('status', ['pending_reception', 'received', 'wiped', 'wiping', 'diagnosing', 'ready_for_sale'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (!ignoreWarehouse && receivingWarehouse?.id) {
    query = query.eq('current_warehouse_id', receivingWarehouse.id)
  }

  if (!includeBlocked && blockedAssetFilter) {
    query = query.not('id', 'in', blockedAssetFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json([], { status: 500 })
  }

  // Fallback: si no hay resultados, relajar filtro de status (pero mantener bodega + bloqueo),
  // porque algunos flujos guardan status distintos para activos recién recibidos.
  if (!data || data.length === 0) {
    let fallbackQuery = supabase
      .from('assets')
      .select('id, internal_tag, serial_number, manufacturer, model, asset_type, status, current_warehouse_id, batch_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!ignoreWarehouse && receivingWarehouse?.id) {
      fallbackQuery = fallbackQuery.eq('current_warehouse_id', receivingWarehouse.id)
    }

    if (!includeBlocked && blockedAssetFilter) {
      fallbackQuery = fallbackQuery.not('id', 'in', blockedAssetFilter)
    }

    // excluir estados finales típicos
    fallbackQuery = fallbackQuery.not('status', 'in', '("sold","scrapped")')

    const { data: fallbackData, error: fallbackError } = await fallbackQuery
    if (fallbackError) {
      console.error('Error fetching assets (fallback):', fallbackError)
      return NextResponse.json([], { status: 500 })
    }
    const enrichedFallback = await enrichAssets(supabase, fallbackData ?? [])
    return NextResponse.json(enrichedFallback)
  }

  const enrichedAssets = await enrichAssets(supabase, data ?? [])
  return NextResponse.json(enrichedAssets)
}

