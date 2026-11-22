import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groupUnitsIntoLines, type ReceptionLineUnit } from '@/lib/tickets/receptionProductLines'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/**
 * GET /api/recepcion/mobile?ticket=TK-2026-00009
 * Estado del ticket para captura concurrente (varios operadores / teléfonos).
 */
export async function GET(request: Request) {
  try {
    const ticketParam = new URL(request.url).searchParams.get('ticket')?.trim() || ''
    if (!ticketParam) {
      return NextResponse.json({ error: 'Indique el ticket (TK-...)' }, { status: 400 })
    }

    const supabase = await createClient()

    let ticketQuery = supabase
      .from('operations_tickets')
      .select('id, readable_id, title, status, client:crm_entities ( commercial_name )')

    if (isUuid(ticketParam)) {
      ticketQuery = ticketQuery.eq('id', ticketParam)
    } else {
      ticketQuery = ticketQuery.ilike('readable_id', ticketParam)
    }

    const { data: ticket, error: ticketError } = await ticketQuery.maybeSingle()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }
    if (!ticket?.id) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const clientName = Array.isArray(ticket.client)
      ? (ticket.client[0] as { commercial_name?: string })?.commercial_name
      : (ticket.client as { commercial_name?: string } | null)?.commercial_name

    const { data: items, error: itemsError } = await supabase
      .from('ticket_items')
      .select(
        'id, brand, model, product_type, brand_id, model_id, product_type_id, collected_serial, expected_serial, box_number, reception_metadata, updated_at'
      )
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const units: ReceptionLineUnit[] = (items || []).map((row) => {
      const serial = (row.collected_serial || row.expected_serial || '').trim()
      return {
        id: row.id,
        serie: serial,
        marca: (row.brand || 'Sin marca').toString(),
        marcaId: row.brand_id || '',
        modelo: (row.model || 'Sin modelo').toString(),
        modeloId: row.model_id || '',
        tipo: (row.product_type || 'Equipo').toString(),
        tipoId: row.product_type_id || '',
      }
    })

    const lines = groupUnitsIntoLines(units)
    const total = units.length
    const captured = units.filter((u) => u.serie).length
    const pending = total - captured

    const recent = (items || [])
      .filter((row) => (row.collected_serial || '').trim())
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      .slice(0, 8)
      .map((row) => {
        const meta = (row.reception_metadata || {}) as Record<string, unknown>
        return {
          serial: row.collected_serial,
          brand: row.brand,
          model: row.model,
          capturedBy: (meta.captured_by_name as string) || null,
          capturedAt: (meta.captured_at as string) || row.updated_at,
        }
      })

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        readableId: ticket.readable_id,
        title: ticket.title,
        status: ticket.status,
        client: clientName || 'Cliente',
      },
      totals: { total, captured, pending },
      lines: lines.map((line) => ({
        key: line.key,
        marca: line.marca,
        modelo: line.modelo,
        tipo: line.tipo,
        quantity: line.quantity,
        withSerial: line.withSerial,
        pending: line.quantity - line.withSerial,
        templateItemId: line.templateItemId,
      })),
      recentCaptures: recent,
      mobileUrl: `/recepcion/movil?tk=${encodeURIComponent(ticket.readable_id || ticket.id)}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al consultar ticket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}