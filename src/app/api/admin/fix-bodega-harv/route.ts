import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    console.log('[fix-bodega-harv] Starting warehouse fix...')

    // Fix the warehouse
    const { error: updateError } = await supabase
      .from('warehouses')
      .update({
        is_active: true,
        name: 'Bodega Hardvesting'
      })
      .eq('code', 'BOD-HARV')

    if (updateError) {
      console.error('[fix-bodega-harv] Error updating warehouse:', updateError)
      return NextResponse.json({
        status: 'error',
        message: 'Error updating warehouse',
        error: updateError.message
      }, { status: 500 })
    }

    // Verify the fix
    const { data: warehouse, error: verifyError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('code', 'BOD-HARV')
      .maybeSingle()

    if (verifyError) {
      console.error('[fix-bodega-harv] Error verifying warehouse:', verifyError)
    }

    console.log('[fix-bodega-harv] Warehouse fixed successfully:', {
      code: warehouse?.code,
      name: warehouse?.name,
      is_active: warehouse?.is_active
    })

    return NextResponse.json({
      status: 'success',
      message: 'Warehouse fixed successfully',
      warehouse: {
        id: warehouse?.id,
        code: warehouse?.code,
        name: warehouse?.name,
        is_active: warehouse?.is_active,
        description: warehouse?.description
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[fix-bodega-harv] Exception:', message)
    return NextResponse.json({
      status: 'error',
      message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to fix BOD-HARV warehouse',
    endpoint: '/api/admin/fix-bodega-harv'
  })
}
