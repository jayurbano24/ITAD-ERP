'use client'

import { useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SalesQuotation } from './actions'
import {
  downloadQuotationsExcel,
  quotationToExcelRow,
} from '@/lib/ventas/exportQuotationsExcel'

type Props = {
  quotations: SalesQuotation[]
  className?: string
  exportHint?: string
}

export default function DownloadQuotationsExcelButton({
  quotations,
  className,
  exportHint,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (quotations.length === 0) {
      setError('No hay cotizaciones para exportar en este filtro')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = quotations.map(quotationToExcelRow)
      await downloadQuotationsExcel(rows)
    } catch (err) {
      console.error(err)
      setError('No se pudo generar el Excel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('inline-flex flex-col items-end gap-1', className)}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading || quotations.length === 0}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors',
          loading || quotations.length === 0
            ? 'border border-gray-300 dark:border-surface-600 bg-gray-100 dark:bg-surface-800 text-gray-400 cursor-not-allowed'
            : 'border border-emerald-700/40 bg-emerald-700 hover:bg-emerald-600 text-white'
        )}
        title={exportHint || 'Descargar Excel del listado con el filtro actual'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        Exportar Excel
      </button>
      {error ? (
        <span className="text-[10px] font-bold text-rose-600 max-w-[200px] text-right">{error}</span>
      ) : null}
    </div>
  )
}
