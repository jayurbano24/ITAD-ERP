import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseEquipmentReceiptText } from '@/lib/receipts/parseEquipmentReceipt'
import { extractTextFromReceiptPdfBuffer } from '@/lib/receipts/extractReceiptPdfText'
import { alignTicketItemsWithReceiptSerials } from '@/lib/tickets/alignTicketItemsWithReceiptSerials'
import { bufferLooksLikePdf } from '@/lib/tickets/parseReceptionExcel'

export const runtime = 'nodejs'
export const maxDuration = 120

type Ctx = { params: { ticketId: string } }

export async function POST(_request: Request, context: Ctx) {
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
      .select('id, readable_id, attachment_url, attachment_name')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }
    if (!ticket?.attachment_url) {
      return NextResponse.json(
        { error: 'Este ticket no tiene Receipt of Equipment adjunto. Súbalo en Tickets de Operaciones.' },
        { status: 422 }
      )
    }

    const fileRes = await fetch(ticket.attachment_url)
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'No se pudo descargar el recibo adjunto' }, { status: 502 })
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer())
    const name = (ticket.attachment_name || '').toLowerCase()
    const isPdf = name.endsWith('.pdf') || bufferLooksLikePdf(buffer)

    let text = ''
    if (isPdf) {
      text = await extractTextFromReceiptPdfBuffer(buffer)
    } else {
      return NextResponse.json(
        {
          error:
            'Solo se puede leer series automáticamente desde PDF del recibo. Suba el PDF o use Excel con columna Serie.',
        },
        { status: 422 }
      )
    }

    const parsed = parseEquipmentReceiptText(text)
    if (parsed.items.length === 0) {
      return NextResponse.json({ error: 'No se detectaron equipos en el recibo PDF' }, { status: 422 })
    }

    const result = await alignTicketItemsWithReceiptSerials(supabase, ticketId, parsed.items)

    return NextResponse.json({
      ok: true,
      readableId: ticket.readable_id,
      ...result,
      detectedItems: parsed.items.map((i) => ({
        make: i.make,
        model: i.model,
        serial: i.serial,
      })),
    })
  } catch (err) {
    console.error('[receipt-serials-sync]', err)
    const message = err instanceof Error ? err.message : 'Error al sincronizar series'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}