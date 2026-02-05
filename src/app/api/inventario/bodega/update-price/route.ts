import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { assetId, price } = body

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID requerido' }, { status: 400 })
    }

    if (price === null || price === undefined || isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)

    // Actualizar el precio de venta en el asset
    const { error: updateError } = await supabase
      .from('assets')
      .update({ sales_price: price })
      .eq('id', assetId)

    if (updateError) {
      console.error('Error updating price:', updateError)
      return NextResponse.json({ error: 'Error al actualizar precio' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-price:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
