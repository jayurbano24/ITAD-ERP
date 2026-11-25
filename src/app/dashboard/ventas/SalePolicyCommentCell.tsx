'use client'

import { useEffect, useState } from 'react'
import { Loader2, MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateSalesCustomerNotes } from './actions'

type Props = {
  orderId: string
  value: string | null | undefined
  onSaved?: (next: string | null) => void
  compact?: boolean
  iconOnly?: boolean
}

export default function SalePolicyCommentCell({
  orderId,
  value,
  onSaved,
  compact = true,
  iconOnly = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState((value || '').trim())
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setDisplay((value || '').trim())
  }, [value, open])

  const openEditor = () => {
    setError(null)
    setDraft(display)
    setOpen(true)
  }

  const close = () => {
    if (saving) return
    setOpen(false)
    setError(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const trimmed = draft.trim()
    const result = await updateSalesCustomerNotes(orderId, trimmed)
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'No se pudo guardar')
      return
    }
    setDisplay(trimmed)
    onSaved?.(trimmed || null)
    setOpen(false)
  }

  const hasComment = display.length > 0

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        title={
          hasComment
            ? 'Editar comentario (aparece en PDF de política)'
            : 'Agregar comentario para la política PDF'
        }
        className={cn(
          'inline-flex items-center justify-center gap-1 rounded-md font-black uppercase tracking-wide transition-colors shrink-0',
          iconOnly
            ? 'h-7 w-7 border'
            : compact
              ? 'w-full px-2 py-1 text-[8px]'
              : 'px-3 py-2 text-[10px]',
          hasComment
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600'
            : 'bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-200 border border-gray-200 dark:border-surface-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300'
        )}
      >
        <MessageSquare className={cn(iconOnly || compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5', 'shrink-0')} />
        {iconOnly ? null : hasComment ? 'Comentario' : '+ Comentario'}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`policy-comment-title-${orderId}`}
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-surface-800 px-4 py-3">
              <h3
                id={`policy-comment-title-${orderId}`}
                className="text-sm font-bold text-gray-900 dark:text-white"
              >
                Comentario — política de garantía
              </h3>
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[11px] text-gray-500 dark:text-surface-400">
                Este texto se imprime en el PDF de política y queda en el historial de la venta.
              </p>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                placeholder="Detalle del equipo, condiciones, recomendaciones…"
                className="w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 resize-y min-h-[100px]"
              />
              {error ? <p className="text-xs font-bold text-rose-500">{error}</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 dark:border-surface-800 px-4 py-3">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="h-9 px-3 rounded-lg text-xs font-bold text-gray-600 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-surface-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wide disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}