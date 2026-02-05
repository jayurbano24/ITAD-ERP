import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createSupabaseClient(supabaseConfig.url, serviceRoleKey)
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    console.log('[search-asset] Buscando:', query)

    if (!query) {
      return NextResponse.json({ error: 'Proporciona parámetro q para buscar' }, { status: 400 })
    }

    // Buscar por serial, internal_tag o contenga el query
    const { data: assets, error } = await supabase
      .from('assets')
      .select(`
        id,
        internal_tag,
        serial_number,
        status,
        asset_type,
        manufacturer,
        model,
        current_warehouse_id,
        wipe_started_at,
        wipe_completed_at,
        wipe_certificate_id,
        warehouses (
          id,
          code,
          name
        )
      `)
      .or(`serial_number.ilike.%${query}%,internal_tag.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('[search-asset] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[search-asset] Encontrados:', assets?.length || 0, 'assets')

    return NextResponse.json({
      success: true,
      query,
      count: assets?.length || 0,
      assets: assets || []
    })

  } catch (error) {
    console.error('[search-asset] Error inesperado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
