import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ticketParam = params.id?.trim()

    if (!ticketParam) {
      return NextResponse.json({ error: 'Falta el identificador del ticket' }, { status: 400 })
    }

    const supabase = await createClient()

    let ticketId: string | null = null
    if (isUuid(ticketParam)) {
      ticketId = ticketParam
    } else {
      const { data, error } = await supabase
        .from('operations_tickets')
        .select('id')
        .ilike('readable_id', ticketParam)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      ticketId = data?.id ?? null
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('operations_tickets')
      .update({
        status: 'in_progress',
        completed_at: null,
        completed_by: null
      })
      .eq('id', ticketId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error reabriendo logística'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
