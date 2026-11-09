'use client'

import { useEffect, useState } from 'react'
import { Loader2, Percent, Tag } from 'lucide-react'

export type DiscountFormValue = {
  kind: 'percent' | 'fixed' | 'clear'
  value: number
  note: string
}

type Props = {
  open: boolean
  quoteNumber?: string
  initialPercent?: number
  initialAmount?: number
  initialNote?: string | null
  busy: boolean
  onClose: () => void
  onSave: (payload: DiscountFormValue) => void
}

export default function QuotationDiscountModal({
  open,
  quoteNumber,
  initialPercent = 0,
  initialAmount = 0,
  initialNote,
  busy,
  onClose,
  onSave,
}: Props) {
  const [kind, setKind] = useState<'percent' | 'fixed'>(
    (initialAmount ?? 0) > 0 ? 'fixed' : 'percent'
  )
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    const hasFixed = (initialAmount ?? 0) > 0
    setKind(hasFixed ? 'fixed' : 'percent')
    setValue(
      hasFixed
        ? String(initialAmount)
        : (initialPercent ?? 0) > 0
          ? String(initialPercent)
          : ''
    )
    setNote(initialNote?.trim() || '')
  }, [open, initialAmount, initialNote, initialPercent])

  if (!open) return null

  const num = Math.max(0, Number(value.replace(',', '.')) || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 shadow-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Aplicar descuento</h3>
            {quoteNumber ? (
              <p className="text-xs text-gray-500 font-mono mt-0.5">{quoteNumber}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white"
          >
            Cerrar
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-surface-400 mb-3">
          El descuento se aplica sobre el subtotal sin IVA; se recalcula el IVA y el total.
        </p>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setKind('percent')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold ${
              kind === 'percent'
                ? 'border-violet-500 bg-violet-50 text-violet-800'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Porcentaje
          </button>
          <button
            type="button"
            onClick={() => setKind('fixed')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold ${
              kind === 'fixed'
                ? 'border-violet-500 bg-violet-50 text-violet-800'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Monto (Q)
          </button>
        </div>

        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {kind === 'percent' ? 'Porcentaje de descuento' : 'Monto de descuento en quetzales'}
        </label>
        <input
          type="number"
          min={0}
          max={kind === 'percent' ? 100 : undefined}
          step={kind === 'percent' ? 0.01 : 0.01}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white px-3 py-2 text-sm text-gray-900 mb-3"
          placeholder={kind === 'percent' ? 'Ej. 5' : 'Ej. 250.00'}
        />

        <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo (opcional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white px-3 py-2 text-sm text-gray-900 mb-3"
          placeholder="Ej. cliente frecuente, promoción…"
        />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || num <= 0}
            onClick={() => onSave({ kind, value: num, note: note.trim() })}
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2 text-sm font-semibold flex justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Guardar descuento
          </button>
          {((initialPercent ?? 0) > 0 || (initialAmount ?? 0) > 0) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSave({ kind: 'clear', value: 0, note: '' })}
              className="w-full rounded-lg border border-gray-300 text-gray-700 py-2 text-sm font-medium"
            >
              Quitar descuento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
