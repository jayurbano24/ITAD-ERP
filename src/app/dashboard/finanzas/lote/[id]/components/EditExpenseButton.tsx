'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'

interface Props {
  batchId: string
  type: 'acquisition' | 'logistics' | 'parts' | 'labor' | 'data_wipe' | 'storage' | 'other' | 'marketing'
  currentAmount: number
  label: string
}

export function EditExpenseButton({ batchId, type, currentAmount, label }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(currentAmount || ''))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const value = Number(amount)
    if (isNaN(value) || value < 0) {
      alert('Ingresa un monto válido (≥ 0)')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/finanzas/set-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, type, amount: value, description: `Ajuste ${label}` })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`)
      setOpen(false)
      // Refrescar
      window.location.reload()
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido al guardar'
      console.error('[EditExpenseButton] Error:', errorMsg)
      alert(`Error al guardar: ${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 text-xs text-indigo-400 hover:text-indigo-300 underline"
        title={`Editar ${label}`}
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-surface-800 bg-surface-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Ajustar {label}</h3>
                <p className="text-sm text-surface-400 mt-1">Lote: {batchId}</p>
              </div>
              <button type="button" className="rounded-full bg-white/5 p-2 text-surface-300 hover:text-white" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Monto (Q)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white placeholder:text-surface-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-surface-700 text-surface-300 hover:text-white hover:border-surface-600 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
