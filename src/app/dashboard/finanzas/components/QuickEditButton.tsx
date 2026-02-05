'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'

interface Props {
  batchId: string
  currentAmount: number
  type: 'cost' | 'revenue'
}

export function QuickEditButton({ batchId, currentAmount, type }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(currentAmount || ''))
  const [saving, setSaving] = useState(false)

  const label = type === 'cost' ? 'Costo' : 'Ventas'

  const save = async () => {
    const value = Number(amount)
    console.log('[QuickEditButton] Saving:', { batchId, type, amount, parsedValue: value })

    if (isNaN(value) || value < 0) {
      alert('Ingresa un monto válido (≥ 0)')
      return
    }
    setSaving(true)
    try {
      const payload = { batchId, type, amount: value }
      console.log('[QuickEditButton] POST payload:', payload)

      const res = await fetch('/api/finanzas/update-batch-totals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorData}`)
      }

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al guardar')
      }

      setOpen(false)
      window.location.reload()
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido al guardar'
      console.error('[QuickEditButton] Error:', errorMsg)
      alert(`Error: ${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="ml-2 p-1.5 rounded-lg text-gray-400 dark:text-surface-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
        title={`Editar ${label}`}
      >
        <Pencil className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 dark:border-surface-800 bg-white dark:bg-surface-950 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ajustar {label}</h3>
                <p className="text-sm text-gray-500 dark:text-surface-400 mt-1">Lote: {batchId}</p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-gray-100 dark:bg-white/5 p-2 text-gray-500 dark:text-surface-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-surface-300">Monto (Q)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 rounded-xl px-4 py-3 
                           text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder-surface-500 focus:outline-none 
                           focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-surface-500 mt-2 italic">
                {type === 'cost'
                  ? 'Este valor se usará como costo de adquisición en el P&L'
                  : 'Este valor se usará como ingresos por ventas en el P&L'}
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-surface-700 text-gray-700 dark:text-surface-300 
                         hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg 
                         shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
