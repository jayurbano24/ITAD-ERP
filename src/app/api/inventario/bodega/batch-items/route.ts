import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId parameter' }, { status: 400 })
    }

    // Fetch all assets in the batch with their details
    const { data, error } = await supabase
      .from('assets')
      .select(`
        serial_number,
        manufacturer,
        model,
        asset_type,
        created_at
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Error al obtener los items del lote' },
        { status: 500 }
      )
    }

    // Map data to response format
    const items = (data || []).map(item => ({
      serial_number: item.serial_number,
      manufacturer: item.manufacturer,
      model: item.model,
      asset_type: item.asset_type,
      received_date: item.created_at
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
