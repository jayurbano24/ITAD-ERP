import { NextRequest, NextResponse } from 'next/server'
import { setSelectedAssetsSalesPrice } from '@/app/dashboard/inventario/bodega/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const assetIds = Array.isArray(body.assetIds) ? body.assetIds : []
    const salesPrice = Number(body.salesPrice)

    if (!assetIds.length) {
      return NextResponse.json({ error: 'assetIds es requerido' }, { status: 400 })
    }
    if (!Number.isFinite(salesPrice) || salesPrice < 0) {
      return NextResponse.json({ error: 'salesPrice inválido' }, { status: 400 })
    }

    const result = await setSelectedAssetsSalesPrice(assetIds, salesPrice)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      updated: result.updated,
      message: `Precio de venta Q${salesPrice.toFixed(2)} aplicado a ${result.updated} equipos`,
    })
  } catch (error) {
    console.error('[set-selected-sales-price]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
