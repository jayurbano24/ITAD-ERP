'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileBarChart, FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadSalesHistoryExcel, type SalesExcelRow } from '@/lib/ventas/exportSalesExcel'
import {
  downloadSalesAdvancedExcel,
  saleOrderToAdvancedExcelRow,
  type SalesAdvancedExcelRow,
} from '@/lib/ventas/exportSalesAdvancedExcel'
import { mapSalesOrderToExcelRow } from '@/lib/ventas/mapSalesOrderToExcelRow'
import type { SalesHistoryOrder } from './SalesHistoryTable'
import DateYmdPicker, { formatYmdLabel, isValidYmd } from '@/components/ui/DateYmdPicker'
import { formatYmdLocal } from '@/lib/ventas/salesExportDateRange'

const DATE_YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function sanitizeYmd(value: string, fallback: string): string {
  return isValidYmd(value) ? value : fallback
}

function isValidDateRange(from: string, to: string): string | null {
  if (!DATE_YMD_RE.test(from) || !DATE_YMD_RE.test(to)) {
    return 'Seleccione fechas válidas'
  }
  if (from > to) {
    return '«Desde» debe ser anterior o igual a «hasta»'
  }
  return null
}

function rangeFileSuffix(from: string, to: string) {
  return from === to ? from : `${from}_${to}`
}

function formatRangeHint(from: string, to: string) {
  if (!isValidYmd(from) || !isValidYmd(to)) return 'Seleccione fechas válidas'
  if (from === to) return formatYmdLabel(from)
  return `${formatYmdLabel(from)} → ${formatYmdLabel(to)}`
}

type Props = {
  defaultFromDate: string
  defaultToDate: string
  showExcel?: boolean
  showAdvanced?: boolean
  periodLabel?: string
  visibleOrderCount?: number
  selectedCount?: number
  selectedExcelRows?: SalesExcelRow[]
  selectedAdvancedRows?: SalesAdvancedExcelRow[]
  className?: string
}

export default function SalesExportsWithMonthRange({
  defaultFromDate,
  defaultToDate,
  showExcel = true,
  showAdvanced = true,
  periodLabel,
  visibleOrderCount,
  selectedCount = 0,
  selectedExcelRows,
  selectedAdvancedRows,
  className,
}: Props) {
  const todayYmd = formatYmdLocal(new Date())
  const [fromDate, setFromDate] = useState(() => sanitizeYmd(defaultFromDate, todayYmd))
  const [toDate, setToDate] = useState(() => sanitizeYmd(defaultToDate, todayYmd))

  useEffect(() => {
    setFromDate(sanitizeYmd(defaultFromDate, todayYmd))
    setToDate(sanitizeYmd(defaultToDate, todayYmd))
  }, [defaultFromDate, defaultToDate, todayYmd])

  const [loading, setLoading] = useState<'excel' | 'advanced' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const useSelection = selectedCount > 0 && selectedExcelRows && selectedAdvancedRows

  const rangeHint = useMemo(() => {
    if (useSelection) {
      return `Exportar ${selectedCount} seleccionada${selectedCount === 1 ? '' : 's'}`
    }
    return formatRangeHint(fromDate, toDate)
  }, [useSelection, selectedCount, fromDate, toDate])

  async function loadOrdersForRange(): Promise<SalesHistoryOrder[]> {
    const validation = isValidDateRange(fromDate, toDate)
    if (validation) {
      throw new Error(validation)
    }
    const res = await fetch(
      `/api/dashboard/ventas/orders-range?dateFrom=${encodeURIComponent(fromDate)}&dateTo=${encodeURIComponent(toDate)}`,
      { cache: 'no-store' }
    )
    const json = (await res.json()) as { data?: SalesHistoryOrder[]; error?: string | null }
    if (!res.ok) {
      throw new Error(json.error || 'No se pudo cargar ventas del rango')
    }
    if (json.error) throw new Error(json.error)
    return Array.isArray(json.data) ? json.data : []
  }

  async function handleExcel() {
    setLoading('excel')
    setError(null)
    try {
      let rows: SalesExcelRow[]
      let fileName: string | undefined
      if (useSelection) {
        rows = selectedExcelRows!
        fileName = `Ventas-seleccion-${new Date().toISOString().slice(0, 10)}.xlsx`
      } else {
        const orders = await loadOrdersForRange()
        rows = orders.filter((o) => o.status !== 'cancelled').map(mapSalesOrderToExcelRow)
        fileName = `Ventas-${rangeFileSuffix(fromDate, toDate)}.xlsx`
      }
      if (rows.length === 0) {
        setError('No hay ventas en ese rango')
        return
      }
      await downloadSalesHistoryExcel(rows, fileName)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo generar el Excel')
    } finally {
      setLoading(null)
    }
  }

  async function handleAdvanced() {
    setLoading('advanced')
    setError(null)
    try {
      let rows: SalesAdvancedExcelRow[]
      let fileName: string | undefined
      if (useSelection) {
        rows = selectedAdvancedRows!
        fileName = `Ventas-avanzado-seleccion-${new Date().toISOString().slice(0, 10)}.xlsx`
      } else {
        const orders = await loadOrdersForRange()
        rows = orders.filter((o) => o.status !== 'cancelled').map(saleOrderToAdvancedExcelRow)
        fileName = `Ventas-avanzado-${rangeFileSuffix(fromDate, toDate)}.xlsx`
      }
      if (rows.length === 0) {
        setError('No hay ventas en ese rango')
        return
      }
      await downloadSalesAdvancedExcel(rows, fileName)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo generar el reporte avanzado')
    } finally {
      setLoading(null)
    }
  }

  const dateInputs = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-surface-400">
          Desde
        </span>
        <DateYmdPicker
          value={fromDate}
          onChange={setFromDate}
          disabled={!!useSelection}
          max={isValidYmd(toDate) ? toDate : undefined}
          aria-label="Fecha desde"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-surface-400">
          Hasta
        </span>
        <DateYmdPicker
          value={toDate}
          onChange={setToDate}
          disabled={!!useSelection}
          min={isValidYmd(fromDate) ? fromDate : undefined}
          aria-label="Fecha hasta"
        />
      </div>
    </div>
  )

  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      {showExcel ? (
        <button
          type="button"
          onClick={() => void handleExcel()}
          disabled={loading !== null}
          title={useSelection ? rangeHint : `Exportar · ${rangeHint}`}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-black uppercase tracking-wide transition-colors',
            loading === 'excel'
              ? 'bg-gray-200 dark:bg-surface-800 text-gray-400'
              : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm'
          )}
        >
          {loading === 'excel' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5" />
          )}
          Exportar
        </button>
      ) : null}
      {showAdvanced ? (
        <button
          type="button"
          onClick={() => void handleAdvanced()}
          disabled={loading !== null}
          title={useSelection ? rangeHint : `Exportar avanzado · ${rangeHint}`}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-black uppercase tracking-wide transition-colors',
            loading === 'advanced'
              ? 'bg-gray-200 dark:bg-surface-800 text-gray-400'
              : 'bg-violet-700 hover:bg-violet-600 text-white shadow-sm'
          )}
        >
          {loading === 'advanced' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileBarChart className="h-3.5 w-3.5" />
          )}
          Exportar avanzado
        </button>
      ) : null}
    </div>
  )

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 rounded-xl border border-violet-200/60 dark:border-violet-500/25 bg-violet-500/5 dark:bg-violet-500/10 px-3 py-2.5">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-black uppercase tracking-wide text-violet-800 dark:text-violet-200">
            Exportar por rango de fechas
          </p>
          <p className="text-[10px] text-gray-600 dark:text-surface-400 leading-snug">
            Listado en Excel y exportación avanzada (NeoCuotas, retención IVA y neto).
            {periodLabel ? ` Vista en pantalla: ${periodLabel}` : ''}
            {typeof visibleOrderCount === 'number'
              ? ` (${visibleOrderCount} venta${visibleOrderCount === 1 ? '' : 's'}).`
              : '.'}
          </p>
          {useSelection ? (
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{rangeHint}</p>
          ) : (
            <p className="text-[10px] text-gray-500 dark:text-surface-500">Rango: {rangeHint}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
          {dateInputs}
          {buttons}
        </div>
      </div>
      {error ? <p className="text-[10px] font-bold text-rose-600 text-right px-1">{error}</p> : null}
    </div>
  )
}