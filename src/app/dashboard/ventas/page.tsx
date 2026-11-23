import Link from 'next/link'
import { ShoppingCart, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSalesOrders, type SalesPeriod } from './actions'
import { type SalesFiscalPeriodStats } from './SalesPeriodFiscalCards'
import VentasMainContent from './VentasMainContent'
import VentasMonthFilterForm from './VentasMonthFilterForm'
import { resolveVentasExportDefaultRange } from '@/lib/ventas/salesExportDateRange'
import { computeSalesFiscalStats, formatMonthKeyLabel } from '@/lib/ventas/salesFiscalStats'

export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  status?: string
  period?: string
  month?: string
}

const PERIODS: { id: SalesPeriod; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'all', label: 'Todo' },
]

function parsePeriod(raw?: string): SalesPeriod {
  if (raw === 'today' || raw === '7d' || raw === '30d' || raw === 'month' || raw === 'all') {
    return raw
  }
  return 'month'
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const sp = await Promise.resolve(searchParams || {})
  const q = (sp.q || '').trim()
  const period = parsePeriod(sp.period)
  const month = (sp.month || '').trim() || undefined
  const activePeriod = month ? 'month' : period

  const kpiMonthKey = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const [{ data: orders }, { data: kpiMonthOrders }] = await Promise.all([
    getSalesOrders({
      status: sp.status,
      search: q || undefined,
      period,
      month,
    }),
    getSalesOrders({ month: kpiMonthKey }),
  ])

  const fiscalStats: SalesFiscalPeriodStats = computeSalesFiscalStats(kpiMonthOrders || [])
  const liquidationMonthLabel = formatMonthKeyLabel(kpiMonthKey)

  const stats = {
    totalOrders: orders?.length || 0,
    confirmedOrders: orders?.filter((o) => o.status === 'confirmed').length || 0,
    draftOrders: orders?.filter((o) => o.status === 'draft').length || 0,
  }

  const periodLabel = PERIODS.find((p) => p.id === activePeriod)?.label || (month ? month : 'Período')

  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const exportDefaultRange = resolveVentasExportDefaultRange(period, month)
  const queryBase = new URLSearchParams()
  if (q) queryBase.set('q', q)
  if (sp.status) queryBase.set('status', sp.status)

  return (
    <div className="p-3 sm:p-4 pb-6 sm:pb-8 flex flex-col gap-2 sm:gap-3 bg-gray-50/50 dark:bg-surface-950 min-h-[calc(100dvh-4rem)] transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingCart className="w-6 h-6 text-emerald-600 dark:text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              Ventas
            </h1>
            <p className="text-xs text-gray-500 dark:text-surface-400 font-medium">
              Historial por factura · POS serializado
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/ventas/nuevo"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 
                   text-white text-sm font-bold rounded-lg transition-all shadow-sm shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </Link>
      </div>

      {/* Filtro de período (ingresos) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 shrink-0">
          Ingresos
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {PERIODS.map((p) => {
            const params = new URLSearchParams(queryBase)
            params.set('period', p.id)
            const isActive = !month && activePeriod === p.id
            return (
              <Link
                key={p.id}
                href={`/dashboard/ventas?${params.toString()}`}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-bold transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-surface-300 hover:bg-gray-200 dark:hover:bg-surface-700'
                )}
              >
                {p.label}
              </Link>
            )
          })}
        </div>
        <VentasMonthFilterForm
          month={month}
          currentMonthValue={currentMonthValue}
          q={q || undefined}
          status={sp.status}
        />
      </div>

      <VentasMainContent
        orders={orders || []}
        fiscalStats={fiscalStats}
        periodLabel={periodLabel}
        liquidationMonthLabel={liquidationMonthLabel}
        defaultExportDateFrom={exportDefaultRange.from}
        defaultExportDateTo={exportDefaultRange.to}
        stats={stats}
        searchQuery={q}
        period={period}
        month={month}
        status={sp.status}
      />
    </div>
  )
}
