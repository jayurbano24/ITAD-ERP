'use client'

import { useState } from 'react'
import {
  Calculator,
  CreditCard,
  DollarSign,
  Landmark,
  MinusCircle,
  Percent,
  Wallet,
  CalendarRange,
} from 'lucide-react'
import SalesExportsWithMonthRange from './SalesExportsWithMonthRange'
import SalesMonthlyAccumulatedModal from './SalesMonthlyAccumulatedModal'
import type { SalesHistoryOrder } from './SalesHistoryTable'
import type { VentasExportSelection } from './ventasExportTypes'
import type { SalesFiscalComputed } from '@/lib/ventas/salesFiscalStats'
import { SALES_TEAM_COMMISSION_RATE } from '@/lib/ventas/salesFiscalStats'

export type SalesFiscalPeriodStats = SalesFiscalComputed

type Props = {
  stats: SalesFiscalPeriodStats
  orders: SalesHistoryOrder[]
  periodLabel?: string
  /** Mes de cierre para liquidación (reinicio mensual) */
  liquidationMonthLabel: string
  defaultExportDateFrom: string
  defaultExportDateTo: string
  exportSelection?: VentasExportSelection | null
}

function money(n: number) {
  return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SalesPeriodFiscalCards({
  stats,
  orders,
  periodLabel,
  liquidationMonthLabel,
  defaultExportDateFrom,
  defaultExportDateTo,
  exportSelection = null,
}: Props) {
  const [accumulatedOpen, setAccumulatedOpen] = useState(false)
  const visibleOrderCount = orders.filter((o) => o.status !== 'cancelled').length
  const salesPct = (SALES_TEAM_COMMISSION_RATE * 100).toFixed(0)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-wide">
          Liquidación · cierre mensual:{' '}
          <span className="text-gray-800 dark:text-surface-200 capitalize">{liquidationMonthLabel}</span>
          <span className="font-normal normal-case text-gray-400 dark:text-surface-500">
            {' '}
            (se reinicia cada mes)
          </span>
        </p>
        <button
          type="button"
          onClick={() => setAccumulatedOpen(true)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-200 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors"
        >
          <CalendarRange className="w-3.5 h-3.5" />
          Ver acumulado por mes
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-2">
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Ingreso total
            </p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight truncate">
              {money(stats.totalGross)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-sky-50 dark:bg-sky-500/10 rounded-lg shrink-0">
            <Landmark className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              IVA (impuesto)
            </p>
            <p className="text-lg font-black text-sky-700 dark:text-sky-300 tabular-nums leading-tight truncate">
              {money(stats.totalTax)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg shrink-0">
            <Percent className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Comisión ventas
            </p>
            <p className="text-[9px] text-gray-500 dark:text-surface-500 leading-tight">{salesPct}% del total</p>
            <p className="text-lg font-black text-orange-700 dark:text-orange-300 tabular-nums leading-tight truncate">
              {money(stats.salesTeamCommission)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-lg shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Comisión NeoNet
            </p>
            <p className="text-[9px] text-gray-500 dark:text-surface-500 leading-tight truncate">
              Tarjeta y NeoCuotas
            </p>
            <p className="text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums leading-tight truncate">
              {money(stats.neonetCommissions)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-3 py-2.5 flex items-center gap-2.5 col-span-2 sm:col-span-1 ring-1 ring-indigo-500/10">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg shrink-0">
            <MinusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Ingreso neto liquidado
            </p>
            <p className="text-[9px] text-gray-500 dark:text-surface-500 leading-tight">
              Total − IVA − {salesPct}% − NeoNet
            </p>
            <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 tabular-nums leading-tight truncate">
              {money(stats.netIncome)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg shrink-0">
            <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              Retención IVA
            </p>
            <p className="text-lg font-black text-amber-700 dark:text-amber-300 tabular-nums leading-tight truncate">
              {money(stats.withholdingIva)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-violet-50 dark:bg-violet-500/10 rounded-lg shrink-0">
            <Wallet className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 leading-none">
              IVA a pagar
            </p>
            <p className="text-[9px] text-gray-500 dark:text-surface-500 leading-tight">IVA − retención</p>
            <p className="text-lg font-black text-violet-700 dark:text-violet-300 tabular-nums leading-tight truncate">
              {money(stats.ivaToPay)}
            </p>
          </div>
        </div>
      </div>

      <SalesExportsWithMonthRange
        defaultFromDate={defaultExportDateFrom}
        defaultToDate={defaultExportDateTo}
        periodLabel={periodLabel}
        visibleOrderCount={visibleOrderCount}
        selectedCount={exportSelection?.selectedCount ?? 0}
        selectedExcelRows={exportSelection?.excelRows}
        selectedAdvancedRows={exportSelection?.advancedRows}
      />

      <SalesMonthlyAccumulatedModal open={accumulatedOpen} onClose={() => setAccumulatedOpen(false)} />
    </div>
  )
}