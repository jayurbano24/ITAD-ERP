import { NextRequest, NextResponse } from 'next/server'
import { setAssetPurchaseCosts } from '@/app/dashboard/inventario/bodega/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rows = Array.isArray(body?.rows) ? body.rows : []

    const result = await setAssetPurchaseCosts(rows)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      updated: result.updated,
      missing: result.missing || [],
    })
  } catch (error) {
    console.error('[set-purchase-costs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
