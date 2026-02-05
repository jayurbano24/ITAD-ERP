import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CollectorInfoRequest {
  ticketId?: string | null
  ticketReadableId?: string | null
  collectorName?: string | null
  collectorPhone?: string | null
  vehicleModel?: string | null
  vehiclePlate?: string | null
  ramCapacity?: string | null
  ramType?: string | null
  diskCapacity?: string | null
  diskType?: string | null
  keyboardType?: string | null
  keyboardVersion?: string | null
}

const normalizeTextField = (value?: string | null) => {
  if (value === undefined) {
    return { present: false, value: null }
  }

  if (value === null) {
    return { present: true, value: null }
  }

  const trimmed = value.trim()
  return { present: true, value: trimmed.length > 0 ? trimmed : null }
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

const resolveTicketId = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  readableId: string
) => {
  const { data, error } = await supabase
    .from('operations_tickets')
    .select('id')
    .ilike('readable_id', readableId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (data?.id) {
    return data.id
  }

  if (!isUuid(readableId)) {
    return null
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('operations_tickets')
    .select('id')
    .eq('id', readableId)
    .maybeSingle()

  if (fallbackError) {
    throw new Error(fallbackError.message)
  }

  return fallback?.id ?? null
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const ticketId = url.searchParams.get('ticketId')

    if (!ticketId) {
      return NextResponse.json({ error: 'Falta el ticket' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('operations_tickets')
      .select('collector_name, collector_phone, vehicle_model, vehicle_plate')
      .eq('id', ticketId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      collectorName: data.collector_name || '',
      collectorPhone: data.collector_phone || '',
      vehicleModel: data.vehicle_model || '',
      vehiclePlate: data.vehicle_plate || ''
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error obteniendo los datos de recolección'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CollectorInfoRequest
    const explicitId = body.ticketId?.trim() || ''
    const readableIdSource = body.ticketReadableId?.trim() || explicitId

    if (!explicitId && !readableIdSource) {
      return NextResponse.json({ error: 'Falta el ticket a actualizar' }, { status: 400 })
    }

    const supabase = await createClient()
    let resolvedTicketId: string | null = null

    if (explicitId && isUuid(explicitId)) {
      resolvedTicketId = explicitId
    } else if (readableIdSource) {
      resolvedTicketId = await resolveTicketId(supabase, readableIdSource)
    }

    if (!resolvedTicketId) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    const collectorName = normalizeTextField(body.collectorName)
    if (collectorName.present) {
      updates.collector_name = collectorName.value
    }

    const collectorPhone = normalizeTextField(body.collectorPhone)
    if (collectorPhone.present) {
      updates.collector_phone = collectorPhone.value
    }

    const vehicleModel = normalizeTextField(body.vehicleModel)
    if (vehicleModel.present) {
      updates.vehicle_model = vehicleModel.value
    }

    const vehiclePlate = normalizeTextField(body.vehiclePlate)
    if (vehiclePlate.present) {
      updates.vehicle_plate = vehiclePlate.value
    }

    const ramCapacity = normalizeTextField(body.ramCapacity)
    if (ramCapacity.present) {
      updates.ram_capacity = ramCapacity.value
    }

    const ramType = normalizeTextField(body.ramType)
    if (ramType.present) {
      updates.ram_type = ramType.value
    }

    const diskCapacity = normalizeTextField(body.diskCapacity)
    if (diskCapacity.present) {
      updates.disk_capacity = diskCapacity.value
    }

    const diskType = normalizeTextField(body.diskType)
    if (diskType.present) {
      updates.disk_type = diskType.value
    }

    const keyboardType = normalizeTextField(body.keyboardType)
    if (keyboardType.present) {
      updates.keyboard_type = keyboardType.value
    }

    const keyboardVersion = normalizeTextField(body.keyboardVersion)
    if (keyboardVersion.present) {
      updates.keyboard_version = keyboardVersion.value
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Proporciona al menos un campo para guardar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('operations_tickets')
      .update(updates)
      .eq('id', resolvedTicketId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error guardando los datos de recolección'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
