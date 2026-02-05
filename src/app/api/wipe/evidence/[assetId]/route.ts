import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createClient()
    const assetId = params.assetId

    // Obtener datos del activo
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, serial_number, internal_tag')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Activo no encontrado' },
        { status: 404 }
      )
    }

    // Obtener evidencias
    const { data: evidence, error: evidenceError } = await supabase
      .from('asset_wipe_evidence')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })

    if (evidenceError) {
      console.error('Error fetching evidence:', evidenceError)
      return NextResponse.json(
        { error: evidenceError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      asset,
      evidence: evidence || [],
      count: evidence?.length || 0
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
