import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check assets in BOD-HARV warehouse
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .eq('code', 'BOD-HARV')
      .single()

    if (warehouseError || !warehouse) {
      return NextResponse.json({
        error: 'Warehouse not found',
        warehouseError
      })
    }

    // Get all assets in this warehouse
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, serial_number, internal_tag, current_warehouse_id')
      .eq('current_warehouse_id', warehouse.id)

    if (assetsError) {
      return NextResponse.json({
        error: 'Error fetching assets',
        assetsError
      })
    }

    return NextResponse.json({
      warehouse,
      assetsCount: assets?.length || 0,
      assets: assets || []
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
