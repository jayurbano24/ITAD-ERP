import { NextRequest, NextResponse } from 'next/server'
import { sendSelectedAssetsToRepair } from '@/app/dashboard/inventario/bodega/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const assetIds = Array.isArray(body.assetIds) ? body.assetIds : []

    if (!assetIds.length) {
      return NextResponse.json({ error: 'assetIds es requerido' }, { status: 400 })
    }

    const result = await sendSelectedAssetsToRepair(assetIds)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      created: result.created ?? 0,
      skipped: result.skipped ?? 0,
      moved: result.moved ?? 0,
      workOrders: result.workOrders ?? [],
      message: `Enviados a Por Reparación: ${result.moved} equipos · ${result.created} OS nuevas en Diagnóstico`,
    })
  } catch (error) {
    console.error('[send-to-repair]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
