import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function fixWarehouseName() {
  try {
    const supabase = await createClient()

    // Update warehouse name
    const { data, error } = await supabase
      .from('warehouses')
      .update({ name: 'Bodega Hardvesting' })
      .eq('code', 'BOD-HARV')
      .select()

    if (error) {
      return {
        error: 'Error updating warehouse',
        details: error
      }
    }

    return {
      success: true,
      message: 'Warehouse name updated to "Bodega Hardvesting"',
      updated: data
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET() {
  const result = await fixWarehouseName()
  return NextResponse.json(result)
}

export async function POST() {
  const result = await fixWarehouseName()
  return NextResponse.json(result)
}
