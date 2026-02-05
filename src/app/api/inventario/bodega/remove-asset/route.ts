import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''

    if (!assetId) {
      return NextResponse.json({ error: 'assetId requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('assets')
      .update({
        current_warehouse_id: null,
        last_transfer_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error eliminando activo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
