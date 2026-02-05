import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Check BOD-HARV warehouse
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('code', 'BOD-HARV')
      .maybeSingle()

    console.log('[debug-bodega-harv] Warehouse query result:', {
      hasWarehouse: !!warehouse,
      warehouseError: warehouseError?.message,
      warehouse: warehouse ? {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        is_active: warehouse.is_active
      } : null
    })

    if (!warehouse) {
      return NextResponse.json({
        status: 'warehouse_not_found',
        message: 'BOD-HARV warehouse does not exist',
        warehouse: null,
        assets: [],
        totalAssets: 0
      })
    }

    // 2. Check if warehouse is active
    if (!warehouse.is_active) {
      return NextResponse.json({
        status: 'warehouse_inactive',
        message: 'BOD-HARV warehouse exists but is not active',
        warehouse: {
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          is_active: warehouse.is_active
        },
        assets: [],
        totalAssets: 0
      })
    }

    // 3. Get all assets in this warehouse
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, serial_number, internal_tag, manufacturer, model, status, current_warehouse_id, updated_at')
      .eq('current_warehouse_id', warehouse.id)
      .order('updated_at', { ascending: false })

    console.log('[debug-bodega-harv] Assets query result:', {
      assetCount: assets?.length || 0,
      assetsError: assetsError?.message
    })

    if (assetsError) {
      return NextResponse.json({
        status: 'error',
        message: 'Error fetching assets',
        warehouseError: null,
        assetsError: assetsError.message,
        warehouse,
        assets: []
      })
    }

    return NextResponse.json({
      status: 'success',
      message: `Found ${assets?.length || 0} assets in BOD-HARV warehouse`,
      warehouse: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        is_active: warehouse.is_active,
        description: warehouse.description
      },
      totalAssets: assets?.length || 0,
      assets: assets || []
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[debug-bodega-harv] Exception:', message)
    return NextResponse.json({
      status: 'error',
      message,
      exception: true
    }, { status: 500 })
  }
}
