import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { assetId } = await request.json()

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get BOD-HARV warehouse
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .eq('code', 'BOD-HARV')
      .maybeSingle()

    if (!warehouse) {
      return NextResponse.json({ error: 'BOD-HARV warehouse not found' }, { status: 404 })
    }

    // Move asset to BOD-HARV
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        current_warehouse_id: warehouse.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to move asset',
        details: updateError.message
      }, { status: 500 })
    }

    // Verify the move
    const { data: asset } = await supabase
      .from('assets')
      .select('id, serial_number, internal_tag, current_warehouse_id')
      .eq('id', assetId)
      .single()

    return NextResponse.json({
      success: true,
      message: `Asset moved to ${warehouse.name}`,
      asset,
      warehouse
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET to manually move an asset by serial/tag
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const serial = searchParams.get('serial')
  const tag = searchParams.get('tag')

  if (!serial && !tag) {
    return NextResponse.json({
      error: 'Provide serial or tag parameter',
      usage: '/api/admin/move-to-harv?serial=SERIAL or /api/admin/move-to-harv?tag=TAG'
    }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Find asset
    let query = supabase.from('assets').select('id, serial_number, internal_tag, current_warehouse_id')
    
    if (serial) {
      query = query.eq('serial_number', serial)
    } else if (tag) {
      query = query.eq('internal_tag', tag)
    }

    const { data: asset } = await query.maybeSingle()

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Get BOD-HARV warehouse
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .eq('code', 'BOD-HARV')
      .maybeSingle()

    if (!warehouse) {
      return NextResponse.json({ error: 'BOD-HARV warehouse not found' }, { status: 404 })
    }

    // Move asset
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        current_warehouse_id: warehouse.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', asset.id)

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to move asset',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Asset ${asset.serial_number || asset.internal_tag} moved to ${warehouse.name}`,
      assetId: asset.id,
      warehouseId: warehouse.id
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
