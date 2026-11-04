'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWarrantyPrintPayloadForOrder } from './actions'
import { printWarrantyPolicy } from '@/lib/ventas/printWarrantyPolicy'

type Props = {
  orderId: string
  /** Compacto para filas de tabla del historial */
  compact?: boolean
  className?: string
}

export default function DownloadWarrantyButton({ orderId, compact = false, className }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const { payload, error: fetchError } = await getWarrantyPrintPayloadForOrder(orderId, {
        registerIfMissing: true,
      })
      if (fetchError || !payload) {
        setError(fetchError || 'No se encontró la venta')
        return
      }
      await printWarrantyPolicy(payload)
    } catch (err) {
      console.error(err)
      setError('No se pudo generar el PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        disabled={loading}
        title="Descargar política de garantía PDF"
        onClick={() => void handleDownload()}
        className={cn(
          compact
            ? 'inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1e3a5f] hover:bg-[#274b7a] disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-wide'
            : 'inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#274b7a] disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest',
          className
        )}
      >
        {loading ? (
          <Loader2 className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', 'animate-spin')} />
        ) : (
          <FileDown className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        )}
        {compact ? 'PDF' : 'Descargar política PDF'}
      </button>
      {error && <span className="text-[9px] text-red-500 font-bold max-w-[8rem] text-right">{error}</span>}
    </div>
  )
}
