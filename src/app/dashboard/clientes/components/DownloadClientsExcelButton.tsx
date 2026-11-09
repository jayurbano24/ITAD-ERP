'use client'

import { useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  crmEntityToExcelRow,
  downloadClientsExcel,
} from '@/lib/clientes/exportClientsExcel'
import type { CrmEntity } from '../actions'

type Props = {
  clients: CrmEntity[]
  /** Catálogo completo para resolver empresa asociada en exportación */
  allClients?: CrmEntity[]
  className?: string
}

export default function DownloadClientsExcelButton({ clients, allClients, className }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (clients.length === 0) {
      setError('No hay registros para exportar')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const byId = new Map((allClients ?? clients).map((c) => [c.id, c]))
      await downloadClientsExcel(
        clients.map((c) =>
          crmEntityToExcelRow(
            c,
            c.parent_entity_id ? byId.get(c.parent_entity_id)?.commercial_name : undefined
          )
        )
      )
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
        disabled={loading || clients.length === 0}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
          loading || clients.length === 0
            ? 'bg-gray-200 dark:bg-surface-800 text-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        )}
        title="Descargar Excel del listado filtrado"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Excel</span>
      </button>
      {error ? (
        <span className="text-[10px] font-bold text-rose-600 max-w-[180px] text-right">{error}</span>
      ) : null}
    </div>
  )
}
