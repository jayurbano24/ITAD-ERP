import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  prefillTicketFromReceiptPhoto,
  prefillTicketFromReceptionExcel,
} from '@/lib/tickets/receiptPrefillService'
import { isReceptionSpreadsheetFile } from '@/lib/tickets/parseReceptionExcel'
import {
  syncTicketManifestFromPrefill,
  uploadTicketReceiptAttachment,
} from '@/lib/tickets/syncTicketManifestFromPrefill'

export const runtime = 'nodejs'
export const maxDuration = 120

type Ctx = { params: { ticketId: string } }

export async function POST(request: Request, context: Ctx) {
  try {
    const ticketId = context.params.ticketId?.trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('operations_tickets')
      .select('id, readable_id, status')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('receipt')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Adjunta el Receipt of Equipment (PDF, foto o Excel)' }, { status: 400 })
    }

    const prefill = isReceptionSpreadsheetFile(file)
      ? await prefillTicketFromReceptionExcel(formData)
      : await prefillTicketFromReceiptPhoto(formData)

    if (!prefill.success || prefill.items.length === 0) {
      return NextResponse.json(
        {
          error:
            prefill.error ||
            'No se detectaron equipos en el archivo. Agrega líneas manualmente o usa otro formato.',
        },
        { status: 422 }
      )
    }

    const attachment = await uploadTicketReceiptAttachment(supabase, ticketId, file)
    const manifest = await syncTicketManifestFromPrefill(supabase, ticketId, prefill)

    return NextResponse.json({
      ok: true,
      readableId: ticket.readable_id,
      ...manifest,
      ...attachment,
      lineCount: prefill.items.length,
      items: prefill.items.map((i) => ({
        brand: i.brand_name,
        model: i.model_name,
        type: i.product_type_name,
        quantity: i.quantity,
        expected_serial: i.expected_serial,
      })),
    })
  } catch (err) {
    console.error('[receipt-manifest]', err)
    const message = err instanceof Error ? err.message : 'Error al sincronizar el recibo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}