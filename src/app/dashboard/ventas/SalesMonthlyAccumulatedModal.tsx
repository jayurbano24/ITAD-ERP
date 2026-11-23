'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SalesFiscalComputed } from '@/lib/ventas/salesFiscalStats'
import { SALES_TEAM_COMMISSION_RATE } from '@/lib/ventas/salesFiscalStats'

type MonthRow = SalesFiscalComputed & {
  monthKey: string
  label: string
  orderCount: number
}

function money(n: number) {
  return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Props = {
  open: boolean
  onClose: () => void
}

export default function SalesMonthlyAccumulatedModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState<MonthRow[]>([])
  const [totals, setTotals] = useState<SalesFiscalComputed | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/ventas/fiscal-by-month?months=12', { cache: 'no-store' })
      const json = (await res.json()) as {
        months?: MonthRow[]
        totals?: SalesFiscalComputed
        error?: string
      }
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar')
      setMonths(json.months || [])
      setTotals(json.totals || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setMonths([])
      setTotals(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  if (!open) return null

  const pct = (SALES_TEAM_COMMISSION_RATE * 100).toFixed(0)

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-3xl max-h-[85dvh] overflow-hidden flex flex-col',
          'bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 rounded-xl shadow-xl'
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-surface-800">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">
              Acumulado por mes
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-surface-400">
              Neto liquidado = total − IVA − NeoNet − comisión ventas ({pct}%)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Cargando…</span>
            </div>
          ) : error ? (
            <p className="text-sm font-bold text-rose-600 text-center py-8">{error}</p>
          ) : months.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Sin ventas en los últimos meses.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-surface-800">
                  <th className="pb-2 pr-2">Mes</th>
                  <th className="pb-2 pr-2 text-right">Ventas</th>
                  <th className="pb-2 pr-2 text-right">Total</th>
                  <th className="pb-2 pr-2 text-right">NeoNet</th>
                  <th className="pb-2 pr-2 text-right">{pct}% ventas</th>
                  <th className="pb-2 text-right">Neto liq.</th>
                </tr>
              </thead>
              <tbody>
                {months.map((row) => (
                  <tr
                    key={row.monthKey}
                    className="border-b border-gray-50 dark:border-surface-800/80 tabular-nums"
                  >
                    <td className="py-2 pr-2 font-semibold text-gray-800 dark:text-surface-200 capitalize">
                      {row.label}
                      <span className="text-[10px] text-gray-400 block">{row.orderCount} venta(s)</span>
                    </td>
                    <td className="py-2 pr-2 text-right text-gray-600 dark:text-surface-400">
                      {row.orderCount}
                    </td>
                    <td className="py-2 pr-2 text-right font-medium">{money(row.totalGross)}</td>
                    <td className="py-2 pr-2 text-right text-rose-600 dark:text-rose-400">
                      {money(row.neonetCommissions)}
                    </td>
                    <td className="py-2 pr-2 text-right text-orange-600 dark:text-orange-400">
                      {money(row.salesTeamCommission)}
                    </td>
                    <td className="py-2 text-right font-black text-indigo-700 dark:text-indigo-300">
                      {money(row.netIncome)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals ? (
                <tfoot>
                  <tr className="text-xs font-black border-t-2 border-gray-200 dark:border-surface-700">
                    <td className="pt-3 pr-2" colSpan={2}>
                      Total periodo
                    </td>
                    <td className="pt-3 pr-2 text-right">{money(totals.totalGross)}</td>
                    <td className="pt-3 pr-2 text-right text-rose-600">{money(totals.neonetCommissions)}</td>
                    <td className="pt-3 pr-2 text-right text-orange-600">{money(totals.salesTeamCommission)}</td>
                    <td className="pt-3 text-right text-indigo-700">{money(totals.netIncome)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}