import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type AddPartPayload = {
  sku: string
  productType: string
  brand: string
  model: string
  description: string
  quantity: number
  cost: number | null
  price: number | null
  warehouse: string
  shelf: string
  level: string
  position: string
  notes: string
}

const sanitize = (value: string | null | undefined) =>
  value?.trim().length ? value.trim() : null

const buildLocation = (payload: AddPartPayload) => {
  return [payload.warehouse, payload.shelf, payload.level, payload.position]
    .map((segment) => sanitize(segment))
    .filter(Boolean)
    .join(' · ')
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AddPartPayload

  if (!payload.sku) {
    return NextResponse.json({ success: false, error: 'El SKU es obligatorio' }, { status: 400 })
  }

  const name = sanitize(`${payload.brand} ${payload.model}`) || sanitize(payload.description) || payload.sku
  const description = sanitize(payload.description) || sanitize(payload.notes)
  const location = buildLocation(payload)

  const supabase = await createClient()
  const { error } = await supabase.from('parts_catalog').insert({
    sku: payload.sku,
    name,
    description,
    category: sanitize(payload.productType),
    stock_quantity: Math.max(0, payload.quantity),
    min_stock_level: Math.max(5, Math.floor(payload.quantity / 2) || 5),
    location,
    unit_cost: Number.isFinite(payload.cost) ? payload.cost : null,
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  revalidatePath('/dashboard/inventario/partes')
  revalidatePath('/dashboard')

  return NextResponse.json({ success: true })
}
