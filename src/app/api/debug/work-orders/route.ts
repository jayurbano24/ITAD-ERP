import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open'

  try {
    const supabase = await createClient()

    // Get work orders in diagnostico stage
    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        status,
        asset_id,
        assets (
          id,
          serial_number,
          internal_tag,
          current_warehouse_id
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get warehouse info for assets
    const assetWarehouseIds = workOrders
      ?.map(wo => (wo.assets as any)?.current_warehouse_id)
      .filter(Boolean) || []

    let warehousesMap: Record<string, { code: string; name: string }> = {}

    if (assetWarehouseIds.length > 0) {
      const { data: warehouses } = await supabase
        .from('warehouses')
        .select('id, code, name')
        .in('id', assetWarehouseIds)

      warehouses?.forEach(w => {
        warehousesMap[w.id] = { code: w.code, name: w.name }
      })
    }

    const summary = {
      total: workOrders?.length || 0,
      withAsset: workOrders?.filter(wo => wo.asset_id).length || 0,
      withoutAsset: workOrders?.filter(wo => !wo.asset_id).length || 0,
      workOrders: workOrders?.map(wo => {
        const warehouse = (wo.assets as any)?.current_warehouse_id
          ? warehousesMap[(wo.assets as any).current_warehouse_id]
          : null

        return {
          id: wo.id,
          status: wo.status,
          hasAssetId: !!wo.asset_id,
          assetId: wo.asset_id,
          asset: wo.assets ? {
            serial: (wo.assets as any).serial_number,
            tag: (wo.assets as any).internal_tag,
            warehouseId: (wo.assets as any).current_warehouse_id,
            warehouseCode: warehouse?.code,
            warehouseName: warehouse?.name
          } : null
        }
      })
    }

    return NextResponse.json(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
