'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { voidSaleOrder } from './actions'

type Props = {
  orderId: string
  orderStatus: string
  label?: string
  title?: string
  className?: string
  compact?: boolean
  onDone?: () => void
}

export default function VoidSaleButton({
  orderId,
  orderStatus,
  label,
  title,
  className,
  compact,
  onDone,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blocked = ['cancelled', 'refunded'].includes(orderStatus)

  async function confirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await voidSaleOrder({ orderId, reason })
      if (!res.success) {
        setError(res.error || 'No se pudo anular')
        return
      }
      setOpen(false)
      setReason('')
      onDone?.()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={blocked}
        onClick={() => setOpen(true)}
        title={
          title ||
          (blocked
            ? 'Venta ya anulada'
            : 'Anula la venta y devuelve los equipos a Bodega Remarketing (Super Admin)')
        }
        aria-label={compact ? 'Anular venta' : undefined}
        className={cn(
          compact
            ? 'inline-flex h-7 w-7 items-center justify-center rounded-md border shrink-0 transition-colors'
            : 'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-wide transition-colors',
          blocked
            ? compact
              ? 'bg-gray-100 dark:bg-surface-800 text-gray-400 border-gray-200 dark:border-surface-600 cursor-not-allowed'
              : 'bg-gray-200 dark:bg-surface-800 text-gray-400 cursor-not-allowed'
            : compact
              ? 'bg-amber-700 hover:bg-amber-600 text-white border-amber-800 shadow-sm'
              : 'bg-amber-700 hover:bg-amber-600 text-white shadow-sm',
          className
        )}
      >
        <Ban className={compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'} />
        {!compact ? label || 'Anular venta' : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 shadow-xl space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">
              Anular venta
            </h3>
            <div className="text-xs text-gray-600 dark:text-surface-400 leading-snug space-y-2">
              <p>
                <strong>Anular</strong> es cuando <strong>no hubo cobro</strong> (error de registro,
                duplicado, cliente no pagó). La venta queda <strong>cancelada</strong>, equipos a{' '}
                <strong>BOD-REM</strong> para reventa. <strong>No</strong> crea reembolso ni
                movimiento de caja.
              </p>
              <p className="rounded-lg border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-900 dark:text-rose-200">
                Si el cliente <strong>sí pagó</strong>, use el botón rojo <strong>Devolver dinero</strong>:
                equipo a BOD-RPL y queda registrado el monto devuelto.
              </p>
            </div>
            <label className="block text-[10px] font-bold uppercase text-gray-500">
              Razón de la anulación <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={8}
              placeholder="Describa por qué se anula la venta (factura errónea, cliente desistió, duplicado…)"
              className="w-full rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
            />
            <p className="text-[10px] text-gray-400">
              Obligatoria. Quedará registrada en la venta y visible en el historial.
            </p>
            {error ? <p className="text-[10px] font-bold text-rose-600">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="h-8 px-3 rounded-lg text-xs font-bold text-gray-600 dark:text-surface-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading || reason.trim().length < 8}
                onClick={() => void confirm()}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-black uppercase disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Confirmar anulación
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}