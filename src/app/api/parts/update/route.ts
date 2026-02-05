import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type UpdatePartPayload = {
  sku: string
  description?: string | null
  location?: string | null
  stock_quantity?: number
  min_stock_level?: number
}

const sanitize = (value: string | null | undefined) =>
  value?.trim().length ? value.trim() : null

export async function POST(request: Request) {
  const payload = (await request.json()) as UpdatePartPayload

  if (!payload.sku) {
    return NextResponse.json({ success: false, error: 'El SKU es obligatorio' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (payload.description !== undefined) {
    updates.description = sanitize(payload.description)
  }
  if (payload.location !== undefined) {
    updates.location = sanitize(payload.location)
  }
  if (payload.stock_quantity !== undefined) {
    updates.stock_quantity = Math.max(0, Math.floor(payload.stock_quantity))
  }
  if (payload.min_stock_level !== undefined) {
    updates.min_stock_level = Math.max(0, Math.floor(payload.min_stock_level))
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('parts_catalog')
    .update(updates)
    .eq('sku', payload.sku)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  revalidatePath('/dashboard/inventario/partes')
  revalidatePath('/dashboard')

  return NextResponse.json({ success: true })
}
