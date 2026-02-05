import { NextRequest, NextResponse } from 'next/server'
import { setBatchExpense } from '@/app/dashboard/finanzas/actions'

export async function POST(request: NextRequest) {
  try {
    const { batchId, type, amount, description } = await request.json()

    if (!batchId || !type || amount === undefined) {
      return NextResponse.json(
        { error: 'batchId, type y amount son requeridos' },
        { status: 400 }
      )
    }

    const normalizedType = String(type) as any
    const parsedAmount = Number(amount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const result = await setBatchExpense(batchId, normalizedType, parsedAmount, description)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[set-expense] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
