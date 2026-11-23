import { NextResponse } from 'next/server'
import { getSalesOrders } from '@/app/dashboard/ventas/actions'

export const dynamic = 'force-dynamic'

const DATE_YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_YM_RE = /^\d{4}-\d{2}$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateFrom = (searchParams.get('dateFrom') || '').trim()
  const dateTo = (searchParams.get('dateTo') || '').trim()
  const monthFrom = (searchParams.get('monthFrom') || '').trim()
  const monthTo = (searchParams.get('monthTo') || '').trim()

  try {
    let result
    if (DATE_YMD_RE.test(dateFrom) && DATE_YMD_RE.test(dateTo)) {
      if (dateFrom > dateTo) {
        return NextResponse.json(
          { data: [], error: 'La fecha «desde» debe ser anterior o igual a «hasta»' },
          { status: 400 }
        )
      }
      result = await getSalesOrders({ dateFrom, dateTo })
    } else if (MONTH_YM_RE.test(monthFrom) && MONTH_YM_RE.test(monthTo)) {
      if (monthFrom > monthTo) {
        return NextResponse.json(
          { data: [], error: 'El mes «desde» debe ser anterior o igual al «hasta»' },
          { status: 400 }
        )
      }
      result = await getSalesOrders({ monthFrom, monthTo })
    } else {
      return NextResponse.json(
        { data: [], error: 'Indique dateFrom y dateTo (AAAA-MM-DD)' },
        { status: 400 }
      )
    }
    return NextResponse.json({
      data: result?.data ?? [],
      error: result?.error ?? null,
    })
  } catch (err) {
    console.error('[ventas/orders-range]', err)
    const message = err instanceof Error ? err.message : 'Error al cargar ventas'
    return NextResponse.json({ data: [], error: message }, { status: 500 })
  }
}