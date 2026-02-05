import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface FinalizeRequest {
  ticketId?: string | null
  ticketReadableId?: string | null
  collector: string
  boxesCount: number
  unitsCount: number
  manifestNumber?: string
  securitySeal?: string
  notes?: string | null
  otherDetails?: string | null
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

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FinalizeRequest
    const explicitId = body.ticketId?.trim() || ''
    const readableId = body.ticketReadableId?.trim() || explicitId

    if (!explicitId && !readableId) {
      return NextResponse.json({ error: 'Falta el ticket a finalizar' }, { status: 400 })
    }

    const collectorId = body.collector?.trim() || ''
    if (!collectorId) {
      return NextResponse.json({ error: 'Debes indicar quién recolectó los equipos' }, { status: 400 })
    }

    if (!body.boxesCount || body.boxesCount <= 0) {
      return NextResponse.json({ error: 'No se detectaron cajas guardadas para finalizar' }, { status: 400 })
    }

    const supabase = await createClient()
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const completedById = user?.id || null;
    const normalizeText = (value?: string | null) => {
      if (value === undefined) return undefined
      const trimmed = value?.trim() || ''
      return trimmed.length === 0 ? null : trimmed
    }

    const updates: Record<string, unknown> = {
      received_units: body.unitsCount,
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: completedById
    }

    if (isUuid(collectorId)) {
      updates.assigned_to = collectorId
    }

    const notesValue = normalizeText(body.notes)
    const otherDetailsValue = normalizeText(body.otherDetails)
    if (notesValue || otherDetailsValue) {
      updates.notes = [notesValue, otherDetailsValue].filter(Boolean).join('\n\n')
    }

    const collectorNameValue = normalizeText(body.collectorName)
    if (collectorNameValue !== undefined) {
      updates.collector_name = collectorNameValue
    }

    const collectorPhoneValue = normalizeText(body.collectorPhone)
    if (collectorPhoneValue !== undefined) {
      updates.collector_phone = collectorPhoneValue
    }

    const vehicleModelValue = normalizeText(body.vehicleModel)
    if (vehicleModelValue !== undefined) {
      updates.vehicle_model = vehicleModelValue
    }

    const vehiclePlateValue = normalizeText(body.vehiclePlate)
    if (vehiclePlateValue !== undefined) {
      updates.vehicle_plate = vehiclePlateValue
    }

    const ramCapacityValue = normalizeText(body.ramCapacity)
    if (ramCapacityValue !== undefined) {
      updates.ram_capacity = ramCapacityValue
    }

    const ramTypeValue = normalizeText(body.ramType)
    if (ramTypeValue !== undefined) {
      updates.ram_type = ramTypeValue
    }

    const diskCapacityValue = normalizeText(body.diskCapacity)
    if (diskCapacityValue !== undefined) {
      updates.disk_capacity = diskCapacityValue
    }

    const diskTypeValue = normalizeText(body.diskType)
    if (diskTypeValue !== undefined) {
      updates.disk_type = diskTypeValue
    }

    const keyboardTypeValue = normalizeText(body.keyboardType)
    if (keyboardTypeValue !== undefined) {
      updates.keyboard_type = keyboardTypeValue
    }

    const keyboardVersionValue = normalizeText(body.keyboardVersion)
    if (keyboardVersionValue !== undefined) {
      updates.keyboard_version = keyboardVersionValue
    }

    let ticketIdToUpdate: string | null = null

    if (explicitId && isUuid(explicitId)) {
      ticketIdToUpdate = explicitId
    }

    if (!ticketIdToUpdate) {
      const { data: readableMatch, error: readableError } = await supabase
        .from('operations_tickets')
        .select('id')
        .ilike('readable_id', readableId)
        .maybeSingle()

      if (readableError) {
        return NextResponse.json({ error: readableError.message }, { status: 500 })
      }

      ticketIdToUpdate = readableMatch?.id ?? null
    }

    if (!ticketIdToUpdate) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const { error } = await supabase
      .from('operations_tickets')
      .update(updates)
      .eq('id', ticketIdToUpdate)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al finalizar la logística'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
