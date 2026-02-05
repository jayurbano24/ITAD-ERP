import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id
    
    if (!ticketId) {
      return NextResponse.json({ error: 'ID de ticket requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Primero intentar buscar por readable_id
    let { data: ticket, error } = await supabase
      .from('operations_tickets')
      .select('id, readable_id, collector_name, collector_phone, vehicle_plate, vehicle_model, status, completed_at, completed_by')
      .eq('readable_id', ticketId)
      .maybeSingle()
    
    // Si no se encuentra, intentar por UUID
    if (!ticket) {
      const { data: ticketByUuid, error: errorUuid } = await supabase
        .from('operations_tickets')
        .select('id, readable_id, collector_name, collector_phone, vehicle_plate, vehicle_model, status, completed_at, completed_by')
        .eq('id', ticketId)
        .maybeSingle()
      
      ticket = ticketByUuid
      error = errorUuid
    }

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error obteniendo ticket:', error)
    return NextResponse.json(
      { error: 'Error al obtener el ticket' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id

    if (!ticketId || !ticketId.trim()) {
      return NextResponse.json({ error: 'ID del ticket es requerido' }, { status: 400 })
    }

    const supabaseClient = await createClient()

    // Resolver el ID real del ticket (puede ser UUID o readable_id)
    let realTicketId = ticketId

    if (!isUuid(ticketId)) {
      // Si no es UUID, buscar por readable_id
      const { data: ticketRecord } = await supabaseClient
        .from('operations_tickets')
        .select('id')
        .ilike('readable_id', ticketId)
        .single()

      if (!ticketRecord) {
        return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
      }

      realTicketId = ticketRecord.id
    }

    // Verificar que el ticket existe
    const { data: ticketExists } = await supabaseClient
      .from('operations_tickets')
      .select('id')
      .eq('id', realTicketId)
      .single()

    if (!ticketExists) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    // 1. Obtener todos los batches asociados a este ticket
    const { data: batches, error: batchError } = await supabaseClient
      .from('batches')
      .select('id')
      .eq('ticket_id', realTicketId)

    if (batchError) {
      throw new Error(`Error fetching batches: ${batchError.message}`)
    }

    const batchIds = batches?.map(b => b.id) || []

    // 2. Si hay batches, eliminar assets relacionados primero (antes de borrar los batches)
    if (batchIds.length > 0) {
      const { error: assetsError } = await supabaseClient
        .from('assets')
        .delete()
        .in('batch_id', batchIds)

      if (assetsError) {
        throw new Error(`Error eliminating assets: ${assetsError.message}`)
      }
    }

    // 3. Eliminar todos los items del ticket
    const { error: itemsError } = await supabaseClient
      .from('ticket_items')
      .delete()
      .eq('ticket_id', realTicketId)

    if (itemsError) {
      throw new Error(`Error eliminating ticket items: ${itemsError.message}`)
    }

    // 4. Eliminar los batches
    if (batchIds.length > 0) {
      const { error: batchDeleteError } = await supabaseClient
        .from('batches')
        .delete()
        .in('id', batchIds)

      if (batchDeleteError) {
        throw new Error(`Error eliminating batches: ${batchDeleteError.message}`)
      }
    }

    // 5. Eliminar el ticket
    const { error: deleteError } = await supabaseClient
      .from('operations_tickets')
      .delete()
      .eq('id', realTicketId)

    if (deleteError) {
      throw new Error(`Error en base de datos: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Ticket ${ticketId} eliminado correctamente`
    })
  } catch (error) {
    console.error('Error eliminando ticket:', error)
    const message = error instanceof Error ? error.message : 'Error al eliminar el ticket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
