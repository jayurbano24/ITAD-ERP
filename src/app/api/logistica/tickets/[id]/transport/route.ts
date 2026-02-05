import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ticketParam = params.id?.trim()

    if (!ticketParam) {
      return NextResponse.json({ error: 'Falta el identificador del ticket' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({})) as {
      pilotName?: string
      vehiclePlate?: string
      phoneNumber?: string
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

    const updates: Record<string, string | null> = {}

    if (typeof body.pilotName === 'string') {
      updates.collector_name = body.pilotName.trim() || null
    }

    if (typeof body.phoneNumber === 'string') {
      updates.collector_phone = body.phoneNumber.trim() || null
    }

    if (typeof body.vehiclePlate === 'string') {
      updates.vehicle_plate = body.vehiclePlate.trim() || null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('operations_tickets')
      .update(updates)
      .eq('id', ticketId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error guardando datos del transporte'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
