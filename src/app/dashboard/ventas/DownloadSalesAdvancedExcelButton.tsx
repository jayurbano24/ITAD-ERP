'use client'

import { useState } from 'react'
import { FileBarChart, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  downloadSalesAdvancedExcel,
  type SalesAdvancedExcelRow,
} from '@/lib/ventas/exportSalesAdvancedExcel'

type Props = {
  rows: SalesAdvancedExcelRow[]
  className?: string
  exportHint?: string
}

export default function DownloadSalesAdvancedExcelButton({ rows, className, exportHint }: Props) {
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
      await downloadSalesAdvancedExcel(rows)
    } catch (err) {
      console.error(err)
      setError('No se pudo generar el Excel avanzado')
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
            : 'bg-violet-700 hover:bg-violet-600 text-white shadow-sm'
        )}
        title={
          exportHint ||
          'Excel avanzado: comisión Visacuota por plazo, neto estimado y hojas de resumen'
        }
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileBarChart className="h-3.5 w-3.5" />
        )}
        Excel avanzado
      </button>
      {error ? (
        <span className="text-[10px] font-bold text-rose-600 max-w-[200px] text-right">{error}</span>
      ) : null}
    </div>
  )
}