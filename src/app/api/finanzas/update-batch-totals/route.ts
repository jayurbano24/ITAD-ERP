import { NextRequest, NextResponse } from 'next/server'
import { updateBatchTotals } from '@/app/dashboard/finanzas/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[update-batch-totals] Request body:', body)
    
    const { batchId, type, amount } = body

    if (!batchId || !type || amount === undefined) {
      console.log('[update-batch-totals] Validation failed:', { batchId, type, amount })
      return NextResponse.json(
        { error: 'batchId, type y amount son requeridos' },
        { status: 400 }
      )
    }

    if (type !== 'cost' && type !== 'revenue') {
      return NextResponse.json(
        { error: 'type debe ser "cost" o "revenue"' },
        { status: 400 }
      )
    }

    const parsedAmount = Number(amount)
    console.log('[update-batch-totals] Parsed amount:', parsedAmount)
    
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      console.log('[update-batch-totals] Invalid amount:', parsedAmount)
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    console.log('[update-batch-totals] Calling updateBatchTotals:', { batchId, type, amount: parsedAmount })
    const result = await updateBatchTotals(batchId, type, parsedAmount)
    console.log('[update-batch-totals] Result:', result)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[update-batch-totals] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
