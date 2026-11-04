import { NextRequest, NextResponse } from 'next/server'
import { setBatchPrice, type BatchPriceKind } from '@/app/dashboard/inventario/bodega/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { batchId, warehouseCode, totalPrice } = body
    const kind: BatchPriceKind = body.kind === 'sale' ? 'sale' : 'cost'

    if (!batchId || !warehouseCode || totalPrice === undefined) {
      return NextResponse.json(
        { error: 'batchId, warehouseCode y totalPrice son requeridos' },
        { status: 400 }
      )
    }

    const result = await setBatchPrice(batchId, warehouseCode, Number(totalPrice), kind)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const label = kind === 'sale' ? 'Precio de venta' : 'Costo de compra'
    return NextResponse.json({
      success: true,
      count: result.count,
      pricePerUnit: result.pricePerUnit,
      kind,
      message: `${label} Q${Number(totalPrice).toFixed(2)} distribuido entre ${result.count} equipos`,
    })
  } catch (error) {
    console.error('[set-batch-price] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
