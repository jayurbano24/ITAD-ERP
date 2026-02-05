import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const ticketId = url.searchParams.get('ticketId')?.trim()

    if (!ticketId) {
      return NextResponse.json({ error: 'Falta ticketId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseConfig.url
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configura SUPABASE_SERVICE_ROLE_KEY en .env.local para obtener los items' },
        { status: 500 }
      )
    }

    const supabase = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)

    let ticketRecord: { id: string } | null = null

    if (isUuid) {
      const { data, error } = await supabase
        .from('operations_tickets')
        .select('id')
        .eq('id', ticketId)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      ticketRecord = data
    }

    if (!ticketRecord) {
      const { data, error } = await supabase
        .from('operations_tickets')
        .select('id')
        .ilike('readable_id', ticketId)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      ticketRecord = data
    }

    if (!ticketRecord) {
      const { data, error } = await supabase
        .from('operations_tickets')
        .select('id')
        .eq('id', ticketId)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      ticketRecord = data
    }

    if (!ticketRecord?.id) {
      return NextResponse.json({ items: [] })
    }

    const { data: items, error } = await supabase
      .from('ticket_items')
      .select(`
        id,
        expected_quantity,
        received_quantity,
        catalog_brand:catalog_brands ( name ),
        catalog_model:catalog_models ( name ),
        catalog_product_type:catalog_product_types ( name )
      `)
      .eq('ticket_id', ticketRecord.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error inesperado'
    }, { status: 500 })
  }
}
