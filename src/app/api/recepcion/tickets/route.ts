import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Lista tickets disponibles para recepción (con conteo de ítems).
 * GET /api/recepcion/tickets
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('operations_tickets')
      .select(`
        id,
        readable_id,
        title,
        status,
        pickup_date,
        pickup_address,
        attachment_url,
        created_at,
        client:crm_entities!client_id (
          id,
          commercial_name
        ),
        ticket_items (
          id,
          validation_status,
          classification_f,
          classification_c
        )
      `)
      .not('status', 'in', '("cancelled","completed","closed")')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[recepcion/tickets]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tickets = (data ?? []).map((row) => {
      const items = Array.isArray(row.ticket_items) ? row.ticket_items : []
      const pending = items.filter(
        (item) => !(item.classification_f && item.classification_c)
      ).length
      const client = Array.isArray(row.client)
        ? row.client[0]
        : row.client

      return {
        id: row.id,
        readableId: row.readable_id,
        title: row.title,
        status: row.status,
        pickupDate: row.pickup_date,
        pickupAddress: row.pickup_address,
        attachmentUrl: row.attachment_url,
        createdAt: row.created_at,
        client: (client as { commercial_name?: string } | null)?.commercial_name || 'Sin cliente',
        itemCount: items.length,
        pendingCount: pending,
      }
    })

    return NextResponse.json({ tickets })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error listando tickets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
