'use client'

import { useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  downloadSalesHistoryExcel,
  type SalesExcelRow,
} from '@/lib/ventas/exportSalesExcel'

type Props = {
  rows: SalesExcelRow[]
  className?: string
  exportHint?: string
}

export default function DownloadSalesExcelButton({ rows, className, exportHint }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (rows.length === 0) {
      setError('No hay ventas para exportar en este filtro')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await downloadSalesHistoryExcel(rows)
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
        disabled={loading || rows.length === 0}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-black uppercase tracking-wide transition-colors',
          loading || rows.length === 0
            ? 'bg-gray-200 dark:bg-surface-800 text-gray-400 cursor-not-allowed'
            : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm'
        )}
        title={exportHint || 'Descargar Excel del listado filtrado'}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5" />
        )}
        Excel
      </button>
      {error ? (
        <span className="text-[10px] font-bold text-rose-600 max-w-[180px] text-right">{error}</span>
      ) : null}
    </div>
  )
}
