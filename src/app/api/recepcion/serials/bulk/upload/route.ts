import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseBulkSerialExcelBuffer } from '@/lib/tickets/parseBulkSerialExcel'
import { runBulkSerialImport } from '@/lib/tickets/runBulkSerialImport'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/**
 * POST multipart: file + ticketId | ticketReadableId
 * Opcional: completeTicket=true → llama cierre si quedan 0 sin serie
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const ticketKey = String(form.get('ticketId') || form.get('ticketReadableId') || '').trim()
    const completeTicket = String(form.get('completeTicket') || '').toLowerCase() === 'true'

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Seleccione un archivo Excel (.xlsx)' }, { status: 400 })
    }
    if (!ticketKey) {
      return NextResponse.json({ error: 'Indique el ticket (TK-...)' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    if (!/\.(xlsx|xls|csv)$/.test(name)) {
      return NextResponse.json({ error: 'Formato no soportado. Use .xlsx, .xls o .csv' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rows = parseBulkSerialExcelBuffer(buffer, file.name)
    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            'No se encontraron series en el archivo. Use el informe ITAD (hoja Laptops: Make, Model, Serial Number) o su listado interno con columnas Model y Serial-TA (marca opcional).',
        },
        { status: 400 }
      )
    }

    const sample = rows[0]
    if (!sample.make?.trim() && !sample.model?.trim()) {
      return NextResponse.json(
        {
          error:
            'El Excel no tiene columnas Make/Model reconocibles. Verifique que sea la hoja Laptops del informe ITAD.',
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id ?? null
    let capturedByName = authData?.user?.email?.split('@')[0] || 'Excel ITAD'
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.full_name) capturedByName = profile.full_name
    }

    let ticketQuery = supabase.from('operations_tickets').select('id, readable_id')
    ticketQuery = isUuid(ticketKey) ? ticketQuery.eq('id', ticketKey) : ticketQuery.ilike('readable_id', ticketKey)

    const { data: ticket, error: ticketError } = await ticketQuery.maybeSingle()
    if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 })
    if (!ticket?.id) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

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
      completeTicketRequested: completeTicket,
      readyToComplete: result.remainingWithoutSerial === 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al importar Excel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}