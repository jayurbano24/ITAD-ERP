import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildReceptionTicketTitle,
  receptionKindToTicketType,
  type ReceptionServiceKind,
} from '@/lib/tickets/receptionService'

/**
 * Lista tickets disponibles para recepción (con conteo de ítems).
 * GET /api/recepcion/tickets
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('operations_tickets')
      .select(`
        id,
        readable_id,
        title,
        status,
        pickup_date,
        pickup_address,
        attachment_url,
        created_at,
        client:crm_entities!client_id (
          id,
          commercial_name
        ),
        ticket_items (
          id,
          validation_status,
          classification_f,
          classification_c
        )
      `)
      .not('status', 'in', '("cancelled","completed","closed")')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[recepcion/tickets]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tickets = (data ?? []).map((row) => {
      const items = Array.isArray(row.ticket_items) ? row.ticket_items : []
      const pending = items.filter(
        (item) => !(item.classification_f && item.classification_c)
      ).length
      const client = Array.isArray(row.client)
        ? row.client[0]
        : row.client

      return {
        id: row.id,
        readableId: row.readable_id,
        title: row.title,
        status: row.status,
        pickupDate: row.pickup_date,
        pickupAddress: row.pickup_address,
        attachmentUrl: row.attachment_url,
        createdAt: row.created_at,
        client: (client as { commercial_name?: string } | null)?.commercial_name || 'Sin cliente',
        itemCount: items.length,
        pendingCount: pending,
      }
    })

    return NextResponse.json({ tickets })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error listando tickets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type ReceptionTicketItemInput = {
  brandId: string
  modelId: string
  productTypeId: string
  quantity: number
  brand?: string
  model?: string
  productType?: string
  expectedSerial?: string | null
}

type CreateBody = {
  clientId: string
  serviceKind: ReceptionServiceKind
  expectedUnits?: number
  notes?: string
  items?: ReceptionTicketItemInput[]
}

async function insertReceptionTicketItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ticketId: string,
  items: ReceptionTicketItemInput[]
) {
  type Row = {
    ticket_id: string
    brand_id: string
    model_id: string
    product_type_id: string
    brand: string | null
    model: string | null
    product_type: string | null
    box_number: number
    validation_status: 'PENDIENTE_VALIDACION'
    expected_serial: string | null
  }

  const payload: Row[] = items.flatMap((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1)
    const base = {
      ticket_id: ticketId,
      brand_id: item.brandId,
      model_id: item.modelId,
      product_type_id: item.productTypeId,
      brand: item.brand?.trim() || null,
      model: item.model?.trim() || null,
      product_type: item.productType?.trim() || null,
      box_number: 0,
      validation_status: 'PENDIENTE_VALIDACION' as const,
    }
    const serial = item.expectedSerial?.trim()
    if (serial) {
      const row: Row = { ...base, expected_serial: serial }
      return [row]
    }
    return Array.from({ length: qty }, (): Row => ({ ...base, expected_serial: null }))
  })

  const { error } = await supabase.from('ticket_items').insert(payload)
  return error
}

/**
 * Crea ticket desde recepción según línea de servicio (ITAD, Post-Venta, Cliente Final).
 * POST /api/recepcion/tickets
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json()) as CreateBody
    const clientId = body.clientId?.trim()
    const serviceKind = body.serviceKind

    if (!clientId || !serviceKind) {
      return NextResponse.json({ error: 'Cliente y tipo de servicio son requeridos' }, { status: 400 })
    }

    const allowed: ReceptionServiceKind[] = ['itad', 'post_venta', 'cliente_final']
    if (!allowed.includes(serviceKind)) {
      return NextResponse.json({ error: 'Tipo de servicio no válido' }, { status: 400 })
    }

    const { data: clientRow, error: clientErr } = await supabase
      .from('crm_entities')
      .select('id, commercial_name')
      .eq('id', clientId)
      .eq('is_active', true)
      .maybeSingle()

    if (clientErr || !clientRow) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 400 })
    }

    const rawItems = Array.isArray(body.items) ? body.items : []
    const normalizedItems = rawItems
      .map((item) => ({
        brandId: item.brandId?.trim() ?? '',
        modelId: item.modelId?.trim() ?? '',
        productTypeId: item.productTypeId?.trim() ?? '',
        quantity: Math.max(1, Number(item.quantity) || 1),
        brand: item.brand,
        model: item.model,
        productType: item.productType,
        expectedSerial: item.expectedSerial,
      }))
      .filter((item) => item.brandId && item.modelId && item.productTypeId)

    if (serviceKind === 'post_venta' && normalizedItems.length === 0) {
      return NextResponse.json(
        { error: 'Post-Venta requiere al menos un equipo con marca, modelo y tipo de producto' },
        { status: 400 }
      )
    }

    const ticket_type = receptionKindToTicketType(serviceKind)
    const title = buildReceptionTicketTitle(serviceKind, clientRow.commercial_name)
    const unitsFromItems = normalizedItems.reduce((sum, item) => {
      if (item.expectedSerial?.trim()) return sum + 1
      return sum + item.quantity
    }, 0)
    const expected_units =
      unitsFromItems > 0 ? unitsFromItems : Math.max(0, Number(body.expectedUnits) || 0)

    const { data: created, error } = await supabase
      .from('operations_tickets')
      .insert({
        client_id: clientId,
        ticket_type,
        title,
        description: `Ticket creado en recepción (${serviceKind.replace('_', ' ')})`,
        status: 'open',
        expected_units,
        received_units: 0,
        priority: 3,
        notes: body.notes?.trim() || null,
        created_by: user.id,
      })
      .select('id, readable_id, title, status, ticket_type')
      .single()

    if (error || !created) {
      console.error('[recepcion/tickets POST]', error)
      return NextResponse.json({ error: error?.message || 'No se pudo crear el ticket' }, { status: 500 })
    }

    if (normalizedItems.length > 0) {
      const itemsError = await insertReceptionTicketItems(supabase, created.id, normalizedItems)
      if (itemsError) {
        console.error('[recepcion/tickets POST] ticket_items', itemsError)
        await supabase.from('operations_tickets').delete().eq('id', created.id)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
      if (unitsFromItems > 0) {
        await supabase
          .from('operations_tickets')
          .update({ expected_units: unitsFromItems })
          .eq('id', created.id)
      }
    }

    return NextResponse.json({
      ticket: {
        id: created.id,
        readableId: created.readable_id,
        title: created.title,
        status: created.status,
        ticketType: created.ticket_type,
        serviceKind,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creando ticket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
