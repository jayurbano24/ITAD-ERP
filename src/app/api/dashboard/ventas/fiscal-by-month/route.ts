import { NextResponse } from 'next/server'
import { getSalesOrders } from '@/app/dashboard/ventas/actions'
import {
  computeSalesFiscalStats,
  formatMonthKeyLabel,
  groupOrdersByMonth,
} from '@/lib/ventas/salesFiscalStats'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const monthsBack = Math.min(36, Math.max(1, Number(searchParams.get('months') || 12)))

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1, 0, 0, 0, 0)
  const fromYmd = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
  const toYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  try {
    const result = await getSalesOrders({ dateFrom: fromYmd, dateTo: toYmd })
    const orders = result?.data || []
    const byMonth = groupOrdersByMonth(orders)

    const rows = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, monthOrders]) => {
        const stats = computeSalesFiscalStats(monthOrders)
        return {
          monthKey,
          label: formatMonthKeyLabel(monthKey),
          orderCount: monthOrders.length,
          ...stats,
        }
      })

    const totals = computeSalesFiscalStats(orders.filter((o) => o.status !== 'cancelled'))

    return NextResponse.json({
      from: fromYmd,
      to: toYmd,
      months: rows,
      totals,
    })
  } catch (err) {
    console.error('[ventas/fiscal-by-month]', err)
    const message = err instanceof Error ? err.message : 'Error al agrupar por mes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}