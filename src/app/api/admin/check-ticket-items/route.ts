import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Endpoint para verificar los datos en ticket_items
 * GET /api/admin/check-ticket-items
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener todos los ticket_items
    const { data: ticketItems, error } = await supabase
      .from('ticket_items')
      .select(`
        id,
        ticket_id,
        box_number,
        collected_serial,
        brand,
        model,
        brand_full,
        model_full,
        product_type,
        color,
        color_detail,
        classification_rec,
        classification_f,
        classification_c,
        processor,
        ram_capacity,
        ram_type,
        disk_capacity,
        disk_type,
        keyboard_type,
        keyboard_version,
        observations,
        asset_id
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Contar items con datos de clasificación
    const withClassification = ticketItems?.filter(ti => 
      ti.classification_rec || ti.classification_f || ti.classification_c
    ).length || 0

    const withHardware = ticketItems?.filter(ti => 
      ti.processor || ti.ram_capacity || ti.disk_capacity
    ).length || 0

    const withColor = ticketItems?.filter(ti => 
      ti.color_detail || ti.color
    ).length || 0

    return NextResponse.json({
      total: ticketItems?.length || 0,
      withClassification,
      withHardware,
      withColor,
      items: ticketItems
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

