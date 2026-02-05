import { NextRequest, NextResponse } from 'next/server'
import { setBatchPrice } from '@/app/dashboard/inventario/bodega/actions'

export async function POST(request: NextRequest) {
  try {
    const { batchId, warehouseCode, totalPrice } = await request.json()

    if (!batchId || !warehouseCode || totalPrice === undefined) {
      return NextResponse.json(
        { error: 'batchId, warehouseCode y totalPrice son requeridos' },
        { status: 400 }
      )
    }

    const result = await setBatchPrice(batchId, warehouseCode, totalPrice)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      pricePerUnit: result.pricePerUnit,
      message: `Precio Q${totalPrice.toFixed(2)} distribuido entre ${result.count} equipos`
    })
  } catch (error) {
    console.error('[set-batch-price] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
