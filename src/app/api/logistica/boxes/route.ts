import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SerialPayload {
  serial: string
  color: string
}

interface BoxItemPayload {
  marca: string
  modelo: string
  tipoProducto: string
  serials: SerialPayload[]
}

interface BoxSaveRequest {
  ticketId: string
  boxNumber: number
  sku?: string
  seal?: string
  items: BoxItemPayload[]
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type TicketItemRow = {
  id: string
  box_number: number | null
  box_sku: string | null
  box_seal: string | null
  box_reception_code: string | null
  brand: string | null
  model: string | null
  product_type: string | null
  collected_serial: string | null
  color: string | null
  validation_status: string
  // Added missing fields
  brand_full: string | null
  model_full: string | null
  color_detail: string | null
  processor: string | null
  bios_version: string | null
  observations: string | null
  classification_rec: string | null
  classification_f: string | null
  classification_c: string | null
  ram_capacity: string | null
  ram_type: string | null
  disk_capacity: string | null
  disk_type: string | null
  keyboard_type: string | null
  keyboard_version: string | null
  brand_id: string | null
  model_id: string | null
  product_type_id: string | null
}

const DEFAULT_VALIDATION_STATUS = 'PENDIENTE_VALIDACION'

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

const resolveTicketId = async (supabaseClient: SupabaseServerClient, explicitId: string, readableId: string) => {
  if (explicitId && isUuid(explicitId)) {
    return explicitId
  }

  if (!readableId) {
    return null
  }

  const { data, error } = await supabaseClient
    .from('operations_tickets')
    .select('id')
    .ilike('readable_id', readableId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.id ?? null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BoxSaveRequest
    const ticketIdentifier = body.ticketId?.trim() || ''

    if (!ticketIdentifier) {
      return NextResponse.json({ error: 'Falta el identificador del ticket' }, { status: 400 })
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'La caja no contiene equipos registrados' }, { status: 400 })
    }

    const supabase = await createClient()

    // Intentar resolver el UUID del ticket (acepta UUID o readable_id)
    let ticketId: string | null = null

    try {
      ticketId = await resolveTicketId(supabase, ticketIdentifier, ticketIdentifier)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Error buscando el ticket' }, { status: 500 })
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    // Obtener datos del ticket para validar
    const { data: ticketRow, error: selectError } = await supabase
      .from('operations_tickets')
      .select('id')
      .eq('id', ticketId)
      .maybeSingle()

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    if (!ticketRow?.id) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    // Validar que boxNumber sea un número válido
    if (!Number.isInteger(body.boxNumber) || body.boxNumber <= 0) {
      return NextResponse.json({ error: 'box_number debe ser un número entero positivo' }, { status: 400 })
    }

    const itemsToInsert = body.items.flatMap((item) =>
      item.serials.map((serial) => ({
        ticket_id: ticketId,
        box_number: body.boxNumber,
        box_sku: body.sku || null,
        box_seal: body.seal || null,
        brand: item.marca || null,
        model: item.modelo || null,
        product_type: item.tipoProducto || null,
        color: serial.color || null,
        collected_serial: serial.serial || null,
        validation_status: DEFAULT_VALIDATION_STATUS as string
      }))
    )

    if (itemsToInsert.length === 0) {
      return NextResponse.json({ error: 'No hay series válidas para guardar' }, { status: 400 })
    }

    // Eliminar items existentes de esta caja para evitar duplicados (idempotencia)
    const { error: deleteError } = await supabase
      .from('ticket_items')
      .delete()
      .eq('ticket_id', ticketRow.id)
      .eq('box_number', body.boxNumber)

    if (deleteError) {
      console.error('Error limpiando items previos:', deleteError)
      return NextResponse.json({ error: 'Error al actualizar la caja (limpieza)' }, { status: 500 })
    }

    const { error } = await supabase.from('ticket_items').insert(itemsToInsert)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, saved: itemsToInsert.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al procesar la solicitud'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const explicitId = url.searchParams.get('ticketId')?.trim() || ''
    const readableId = url.searchParams.get('ticketReadableId')?.trim() || explicitId

    if (!explicitId && !readableId) {
      return NextResponse.json({ error: 'Falta el identificador del ticket' }, { status: 400 })
    }

    const supabase = await createClient()
    let ticketId: string | null = null

    try {
      ticketId = await resolveTicketId(supabase, explicitId, readableId)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Error buscando el ticket' }, { status: 500 })
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const { data: ticketRecord, error: ticketError } = await supabase
      .from('operations_tickets')
      .select('id, readable_id, title, pickup_address, pickup_date, attachment_url, attachment_name, client:crm_entities ( commercial_name )')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    if (!ticketRecord) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    // @ts-ignore - Supabase types are tricky with joined tables
    const clientName = Array.isArray(ticketRecord.client)
      ? ticketRecord.client[0]?.commercial_name
      : (ticketRecord.client as any)?.commercial_name || 'Cliente desconocido'
    const readableLabel = ticketRecord.readable_id || ticketRecord.id
    const lotNumber = ticketRecord.title || `Lote ${readableLabel}`

    // Solo columnas reales de ticket_items en esta BD (sin brand_full/RAM/etc.)
    const { data: boxRows, error: boxesError } = await supabase
      .from('ticket_items')
      .select(
        'id, box_number, box_sku, box_seal, box_reception_code, brand, model, brand_id, model_id, product_type, product_type_id, expected_serial, collected_serial, color, validation_status, classification_f, classification_c, reception_metadata'
      )
      .eq('ticket_id', ticketId)
      .order('box_number', { ascending: true })
      .order('created_at', { ascending: true })

    if (boxesError) {
      return NextResponse.json({ error: boxesError.message }, { status: 500 })
    }

    const grouped = new Map<
      number,
      {
        boxNumber: number
        boxSku: string | null
        boxSeal: string | null
        boxReceptionCode: string | null
        items: TicketItemRow[]
      }
    >()

    const rows = (boxRows ?? []) as Array<TicketItemRow & { expected_serial?: string | null; reception_metadata?: Record<string, unknown> | null }>
    rows.forEach((row) => {
      const dbBoxNum = row.box_number
      const key = (dbBoxNum !== null && dbBoxNum !== undefined) ? Number(dbBoxNum) : 0
      if (!grouped.has(key)) {
        grouped.set(key, {
          boxNumber: key,
          boxSku: row.box_sku || null,
          boxSeal: row.box_seal || null,
          boxReceptionCode: row.box_reception_code || null,
          items: []
        })
      }

      const entry = grouped.get(key)
      if (entry) {
        entry.items.push(row)
        if (!entry.boxReceptionCode && row.box_reception_code) {
          entry.boxReceptionCode = row.box_reception_code
        }
      }
    })

    // Incluye caja 0 = equipos del ticket sin caja logística (precarga desde Nuevo Ticket / OCR)
    const responseBoxes = Array.from(grouped.values())
      .filter((group) => group.items.length > 0)
      .sort((a, b) => a.boxNumber - b.boxNumber)
      .map((group) => ({
        boxNumber: group.boxNumber,
        label: group.boxNumber > 0 ? `Caja ${group.boxNumber}` : 'Equipos del ticket',
        source: group.boxNumber > 0 ? 'logistics' : 'ticket',
        boxSku: group.boxSku,
        boxSeal: group.boxSeal,
        boxReceptionCode: group.boxReceptionCode,
        items: group.items.map((item) => {
          const meta = (item as { reception_metadata?: Record<string, unknown> | null }).reception_metadata || {}
          return {
            id: item.id,
            brand: item.brand,
            model: item.model,
            brand_full: item.brand,
            model_full: item.model,
            brand_id: item.brand_id,
            model_id: item.model_id,
            product_type: item.product_type,
            product_type_id: item.product_type_id,
            expected_serial: (item as { expected_serial?: string | null }).expected_serial || null,
            collected_serial: item.collected_serial,
            color: item.color,
            color_detail: item.color,
            processor: (meta.processor as string) || '',
            bios_version: (meta.bios_version as string) || '',
            observations: (meta.observations as string) || '',
            validation_status: item.validation_status,
            classification_rec: (meta.classification_rec as string) || null,
            classification_f: item.classification_f,
            classification_c: item.classification_c,
            ram_capacity: (meta.ram_capacity as string) || '',
            ram_type: (meta.ram_type as string) || '',
            disk_capacity: (meta.disk_capacity as string) || '',
            disk_type: (meta.disk_type as string) || '',
            keyboard_type: (meta.keyboard_type as string) || '',
            keyboard_version: (meta.keyboard_version as string) || '',
          }
        })
      }))

    return NextResponse.json({
      ticket: {
        id: ticketRecord.id,
        readableId: readableLabel,
        client: clientName,
        lotNumber,
        pickupAddress: (ticketRecord as { pickup_address?: string | null }).pickup_address || null,
        pickupDate: (ticketRecord as { pickup_date?: string | null }).pickup_date || null,
        attachmentUrl: (ticketRecord as { attachment_url?: string | null }).attachment_url || null,
        attachmentName: (ticketRecord as { attachment_name?: string | null }).attachment_name || null,
      },
      boxes: responseBoxes
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cargar las cajas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { ticketId, boxNumber } = await request.json()

    if (!ticketId || boxNumber === undefined) {
      return NextResponse.json({ error: 'ticketId y boxNumber son requeridos' }, { status: 400 })
    }

    const supabaseClient = await createClient()

    // Obtener el ticket UUID a partir del readable ID o UUID
    let ticketRecord = null

    // Primero intentar como UUID
    if (isUuid(ticketId)) {
      const { data } = await supabaseClient
        .from('operations_tickets')
        .select('id')
        .eq('id', ticketId)
        .maybeSingle()

      if (data) {
        ticketRecord = data
      }
    }

    // Si no encontró por UUID, intentar por readable_id
    if (!ticketRecord) {
      const { data } = await supabaseClient
        .from('operations_tickets')
        .select('id')
        .ilike('readable_id', ticketId)
        .maybeSingle()

      if (data) {
        ticketRecord = data
      }
    }

    // Si aún no encontró, intentar buscar en ticket_items por box_number
    // y obtener el ticket_id desde allí
    if (!ticketRecord) {
      const { data: itemsWithTicket } = await supabaseClient
        .from('ticket_items')
        .select('ticket_id')
        .eq('box_number', boxNumber)
        .limit(1)
        .maybeSingle()

      if (itemsWithTicket?.ticket_id) {
        ticketRecord = { id: itemsWithTicket.ticket_id }
      }
    }

    // Eliminar todos los items de esta caja
    // Si encontramos el ticket, filtrar por ticket_id también (más seguro)
    // Si no, eliminar solo por box_number
    let deleteQuery = supabaseClient
      .from('ticket_items')
      .delete()
      .eq('box_number', boxNumber)

    if (ticketRecord) {
      deleteQuery = deleteQuery.eq('ticket_id', ticketRecord.id)
    }

    const { error: deleteError, count } = await deleteQuery

    if (deleteError) {
      throw deleteError
    }

    // Si no encontró items (caja vacía), retornar éxito igualmente
    // porque la intención es eliminar la caja
    return NextResponse.json({
      success: true,
      message: `Caja ${boxNumber} eliminada correctamente${count && count > 0 ? ` (${count} items removidos)` : ' (caja vacía)'}`
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al eliminar la caja'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
