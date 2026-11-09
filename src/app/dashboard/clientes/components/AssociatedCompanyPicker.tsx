'use client'

import { useState, useTransition } from 'react'
import { Building2, Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createParentCompanyQuickAction, type CrmEntity } from '../actions'

type Props = {
  options: CrmEntity[]
  value: string
  onChange: (parentId: string) => void
  onOptionsUpdated: (next: CrmEntity[]) => void
  disabled?: boolean
}

export default function AssociatedCompanyPicker({
  options,
  value,
  onChange,
  onOptionsUpdated,
  disabled,
}: Props) {
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickNit, setQuickNit] = useState('')
  const [quickError, setQuickError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleQuickCreate = () => {
    setQuickError(null)
    const name = quickName.trim()
    const nit = quickNit.trim()
    if (!name || !nit) {
      setQuickError('Nombre y NIT son requeridos')
      return
    }
    startTransition(async () => {
      const res = await createParentCompanyQuickAction(name, nit)
      if (!res.success || !res.data) {
        setQuickError(res.error || 'No se pudo crear la empresa')
        return
      }
      const created: CrmEntity = {
        id: res.data.id,
        commercial_name: res.data.commercial_name,
        tax_id_nit: res.data.tax_id_nit,
        legal_name: null,
        entity_type: 'client',
        account_class: 'empresa',
        email: null,
        phone: null,
        address: null,
        city: 'Guatemala',
        country: 'Guatemala',
        contact_person: null,
        notes: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      onOptionsUpdated([...options, created].sort((a, b) =>
        a.commercial_name.localeCompare(b.commercial_name, 'es')
      ))
      onChange(created.id)
      setQuickOpen(false)
      setQuickName('')
      setQuickNit('')
    })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
        Empresa asociada
      </label>
      <div className="flex gap-2">
        <select
          name="parent_entity_id"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                   text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                   focus:border-brand-500 transition-all cursor-pointer disabled:opacity-50"
        >
          <option value="">Sin empresa asociada</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.commercial_name} · {p.tax_id_nit}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={() => {
            setQuickError(null)
            setQuickOpen(true)
          }}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors',
            'border-brand-500/40 bg-brand-50 text-brand-700 hover:bg-brand-100',
            'dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25',
            'disabled:opacity-50'
          )}
          title="Registrar nueva empresa y asociarla"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Empresa</span>
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-surface-500">
        Seleccione una empresa existente o cree una nueva para asociar este registro.
      </p>

      {quickOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isPending && setQuickOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nueva empresa</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {quickError ? (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{quickError}</p>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">Nombre *</label>
              <input
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm"
                placeholder="Razón comercial"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">NIT *</label>
              <input
                value={quickNit}
                onChange={(e) => setQuickNit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm font-mono"
                placeholder="1234567-8"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setQuickOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-surface-700 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleQuickCreate()}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Crear y asociar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
