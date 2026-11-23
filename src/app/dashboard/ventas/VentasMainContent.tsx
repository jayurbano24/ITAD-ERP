'use client'

import { useCallback, useState } from 'react'
import { Clock, FileText, TrendingUp } from 'lucide-react'
import SalesHistoryTable, { type SalesHistoryOrder } from './SalesHistoryTable'
import SalesPeriodFiscalCards, { type SalesFiscalPeriodStats } from './SalesPeriodFiscalCards'
import type { VentasExportSelection } from './ventasExportTypes'

type Props = {
  orders: SalesHistoryOrder[]
  fiscalStats: SalesFiscalPeriodStats
  periodLabel: string
  liquidationMonthLabel: string
  defaultExportDateFrom: string
  defaultExportDateTo: string
  stats: {
    totalOrders: number
    confirmedOrders: number
    draftOrders: number
  }
  searchQuery?: string
  period?: string
  month?: string
  status?: string
}

export default function VentasMainContent({
  orders,
  fiscalStats,
  periodLabel,
  liquidationMonthLabel,
  defaultExportDateFrom,
  defaultExportDateTo,
  stats,
  searchQuery,
  period,
  month,
  status,
}: Props) {
  const [exportSelection, setExportSelection] = useState<VentasExportSelection | null>(null)

  const onExportSelectionChange = useCallback((next: VentasExportSelection | null) => {
    setExportSelection(next)
  }, [])

  return (
    <>
      <SalesPeriodFiscalCards
        stats={fiscalStats}
        orders={orders}
        periodLabel={periodLabel}
        liquidationMonthLabel={liquidationMonthLabel}
        defaultExportDateFrom={defaultExportDateFrom}
        defaultExportDateTo={defaultExportDateTo}
        exportSelection={exportSelection}
      />

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shrink-0">
            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Órdenes
            </p>
            <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums leading-tight">
              {stats.totalOrders}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-50 dark:bg-purple-500/10 rounded-lg shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Confirmadas
            </p>
            <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums leading-tight">
              {stats.confirmedOrders}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Borradores
            </p>
            <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums leading-tight">
              {stats.draftOrders}
            </p>
          </div>
        </div>
      </div>

      <SalesHistoryTable
        className="flex-1 min-h-0 lg:min-h-[48rem]"
        orders={orders}
        searchQuery={searchQuery}
        period={period}
        month={month}
        status={status}
        onExportSelectionChange={onExportSelectionChange}
      />
    </>
  )
}