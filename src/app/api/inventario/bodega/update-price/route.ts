import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { assetId, price } = body
    const field = body.field === 'sales_price' ? 'sales_price' : 'cost_amount'

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID requerido' }, { status: 400 })
    }

    if (price === null || price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)

    const { error: updateError } = await supabase
      .from('assets')
      .update({ [field]: Number(price), updated_at: new Date().toISOString() })
      .eq('id', assetId)

    if (updateError) {
      console.error('Error updating price:', updateError)
      return NextResponse.json({ error: 'Error al actualizar precio' }, { status: 500 })
    }

    return NextResponse.json({ success: true, field })
  } catch (error) {
    console.error('Error in update-price:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
