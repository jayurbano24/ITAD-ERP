import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Obtener accesorios de un ticket_item específico
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const ticketItemId = searchParams.get('ticketItemId')

    if (!ticketItemId) {
      return NextResponse.json(
        { error: 'ticketItemId es requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ticket_item_accessories')
      .select(`
        id,
        ticket_item_id,
        accessory_id,
        quantity,
        notes,
        created_at,
        catalog_accessories (
          id,
          name,
          product_type_id,
          is_required
        )
      `)
      .eq('ticket_item_id', ticketItemId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching accessories for ticketItemId:', ticketItemId, error)
      // Retornar array vacío en lugar de error, ya que no tener accesorios no es un error
      return NextResponse.json({ accessories: [] })
    }

    return NextResponse.json({ accessories: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST: Agregar/actualizar accesorios de un ticket_item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { ticketItemId, accessories } = body

    if (!ticketItemId || !Array.isArray(accessories)) {
      return NextResponse.json(
        { error: 'ticketItemId y accessories[] son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el ticket_item existe
    const { data: ticketItem, error: itemError } = await supabase
      .from('ticket_items')
      .select('id')
      .eq('id', ticketItemId)
      .single()

    if (itemError || !ticketItem) {
      return NextResponse.json(
        { error: 'El ticket_item no existe' },
        { status: 404 }
      )
    }

    // Eliminar accesorios actuales para este ticket_item
    const { error: deleteError } = await supabase
      .from('ticket_item_accessories')
      .delete()
      .eq('ticket_item_id', ticketItemId)

    if (deleteError) {
      console.error('Error deleting old accessories:', deleteError)
      return NextResponse.json(
        { error: 'No se pudieron actualizar los accesorios' },
        { status: 500 }
      )
    }

    // Insertar los nuevos accesorios si hay alguno
    if (accessories.length > 0) {
      const itemsToInsert = accessories.map((acc: any) => ({
        ticket_item_id: ticketItemId,
        accessory_id: acc.accessoryId,
        quantity: acc.quantity || 1,
        notes: acc.notes || null
      }))

      const { error: insertError } = await supabase
        .from('ticket_item_accessories')
        .insert(itemsToInsert)

      if (insertError) {
        console.error('Error inserting accessories:', insertError)
        return NextResponse.json(
          { error: 'No se pudieron guardar los accesorios' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Accesorios actualizados correctamente'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar un accesorio específico
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const accessoryLinkId = searchParams.get('id')

    if (!accessoryLinkId) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('ticket_item_accessories')
      .delete()
      .eq('id', accessoryLinkId)

    if (error) {
      console.error('Error deleting accessory:', error)
      return NextResponse.json(
        { error: 'No se pudo eliminar el accesorio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Accesorio eliminado correctamente'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
