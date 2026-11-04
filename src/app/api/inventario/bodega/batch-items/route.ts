import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')?.trim() || ''

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId parameter' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)

    const { data, error } = await supabase
      .from('assets')
      .select('serial_number, manufacturer, model, asset_type, created_at, color, status')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('batch-items error:', error)
      return NextResponse.json(
        { error: error.message || 'Error al obtener los items del lote' },
        { status: 500 }
      )
    }

    const items = (data || []).map((item) => ({
      serial_number: item.serial_number,
      manufacturer: item.manufacturer,
      model: item.model,
      asset_type: item.asset_type,
      color: item.color,
      status: item.status,
      received_date: item.created_at,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('batch-items unexpected:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
