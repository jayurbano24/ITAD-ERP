import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseBulkSerialPaste, type BulkSerialRow } from '@/lib/tickets/parseBulkSerialPaste'
import { runBulkSerialImport } from '@/lib/tickets/runBulkSerialImport'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/**
 * POST /api/recepcion/serials/bulk
 * body: { ticketId?, ticketReadableId?, paste?: string, rows?: BulkSerialRow[] }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ticketId?: string
      ticketReadableId?: string
      paste?: string
      rows?: BulkSerialRow[]
      completeTicket?: boolean
    }

    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id ?? null
    let capturedByName = authData?.user?.email?.split('@')[0] || 'Importación masiva'
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.full_name) capturedByName = profile.full_name
    }

    const ticketKey = (body.ticketId || body.ticketReadableId || '').trim()
    if (!ticketKey) {
      return NextResponse.json({ error: 'Indique ticketId o ticketReadableId' }, { status: 400 })
    }

    let ticketQuery = supabase.from('operations_tickets').select('id, readable_id')
    ticketQuery = isUuid(ticketKey) ? ticketQuery.eq('id', ticketKey) : ticketQuery.ilike('readable_id', ticketKey)

    const { data: ticket, error: ticketError } = await ticketQuery.maybeSingle()
    if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 })
    if (!ticket?.id) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

    const rows = body.rows?.length
      ? body.rows
      : body.paste
        ? parseBulkSerialPaste(body.paste)
        : []

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas con serie en el pegado' }, { status: 400 })
    }

    const result = await runBulkSerialImport(
      supabase,
      ticket.id,
      ticket.readable_id,
      rows,
      userId,
      capturedByName
    )

    return NextResponse.json({
      ok: true,
      ...result,
      readyToComplete: result.remainingWithoutSerial === 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en importación masiva'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}