'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateSalesSatInvoice } from './actions'

type Props = {
  orderId: string
  value: string | null | undefined
  onSaved?: (next: string | null) => void
}

export default function SatInvoiceEditCell({ orderId, value, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [display, setDisplay] = useState((value || '').trim())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) setDisplay((value || '').trim())
  }, [value, editing])

  const startEdit = () => {
    setError(null)
    setDraft(display)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft('')
    setError(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const trimmed = draft.trim()
    const result = await updateSalesSatInvoice(orderId, trimmed)
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'No se pudo guardar')
      return
    }
    const next = trimmed || ''
    setDisplay(next)
    onSaved?.(trimmed || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex min-w-[140px] flex-col gap-1">
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
              if (e.key === 'Escape') cancel()
            }}
            placeholder="Nº SAT"
            className="h-7 flex-1 min-w-0 rounded-md border border-sky-500/50 bg-white dark:bg-surface-950 px-2 text-[10px] font-mono font-bold text-gray-900 dark:text-white"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            title="Guardar"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={cancel}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-300 dark:border-surface-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800"
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {error && <p className="text-[9px] font-bold text-rose-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className={cn(
          'font-mono font-bold text-[10px] truncate max-w-[120px]',
          display ? 'text-sky-700 dark:text-sky-300' : 'text-gray-400 dark:text-surface-500'
        )}
        title={display || 'Sin factura SAT'}
      >
        {display || '—'}
      </span>
      <button
        type="button"
        onClick={startEdit}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 opacity-70 group-hover:opacity-100"
        title="Editar factura SAT"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )
}
