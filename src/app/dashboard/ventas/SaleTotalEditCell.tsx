'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateSalesOrderTotal } from './actions'

type Props = {
  orderId: string
  value: number | null | undefined
  disabled?: boolean
  onSaved?: (next: {
    total_amount: number
    subtotal: number
    tax_amount: number
  }) => void
}

export default function SaleTotalEditCell({ orderId, value, disabled, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [display, setDisplay] = useState(Number(value || 0))
  const [draftTotal, setDraftTotal] = useState('')
  const [draftComment, setDraftComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) setDisplay(Number(value || 0))
  }, [value, editing])

  const formatted = display.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const open = () => {
    if (disabled) return
    setError(null)
    setDraftTotal(display > 0 ? String(display) : '')
    setDraftComment('')
    setEditing(true)
  }

  const close = () => {
    if (saving) return
    setEditing(false)
    setError(null)
  }

  const save = async () => {
    const comment = draftComment.trim()
    if (comment.length < 3) {
      setError('Indica el motivo del cambio (mínimo 3 caracteres)')
      return
    }
    const nextTotal = Math.max(0, Number(draftTotal.replace(',', '.')) || 0)
    if (nextTotal <= 0) {
      setError('Total inválido')
      return
    }
    setSaving(true)
    setError(null)
    const result = await updateSalesOrderTotal(orderId, nextTotal, comment)
    setSaving(false)
    if (!result.success || !result.data) {
      setError(result.error || 'No se pudo guardar')
      return
    }
    setDisplay(result.data.total_amount)
    onSaved?.({
      total_amount: result.data.total_amount,
      subtotal: result.data.subtotal,
      tax_amount: result.data.tax_amount,
    })
    setEditing(false)
  }

  return (
    <>
      <div className="inline-flex items-center justify-end gap-1 tabular-nums">
        <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">Q{formatted}</span>
        {!disabled ? (
          <button
            type="button"
            onClick={open}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-70 group-hover:opacity-100"
            title="Editar total (requiere comentario)"
          >
            <Pencil className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-surface-800 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Ajustar total de venta</h3>
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-[11px] text-gray-500 dark:text-surface-400">
                Total anterior:{' '}
                <span className="font-bold text-gray-900 dark:text-white">Q{formatted}</span>
                {' · '}Se recalcula subtotal e IVA 12% automáticamente.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-surface-300">
                  Nuevo total (Q, con IVA)
                </label>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  step="0.01"
                  value={draftTotal}
                  onChange={(e) => setDraftTotal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-950 px-3 py-2 text-sm font-bold tabular-nums text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-surface-300">
                  Comentario obligatorio
                </label>
                <textarea
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  rows={3}
                  placeholder="Motivo del ajuste (cobro, corrección, acuerdo con cliente…)"
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-950 px-3 py-2 text-sm text-gray-900 dark:text-white resize-y min-h-[72px]"
                />
              </div>
              {error ? <p className="text-xs font-bold text-rose-500">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-surface-800 px-4 py-3">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="h-9 px-3 rounded-lg text-xs font-bold text-gray-600 dark:text-surface-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className={cn(
                  'inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase disabled:opacity-60'
                )}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}