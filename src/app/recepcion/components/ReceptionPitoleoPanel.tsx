'use client'

import type { Ref } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PitoleoProductLine, PitoleoUnit } from '@/app/recepcion/components/ReceptionConduceWorkbench'

type Props = {
  line: PitoleoProductLine
  serialInput: string
  onSerialInputChange: (value: string) => void
  onSerialKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  serialError: string | null
  addingSerial: boolean
  onRemoveSerial: (unit: PitoleoUnit) => void
  onAddAdditionalSlot: () => void
  serialInputRef: Ref<HTMLInputElement>
  panelRef?: Ref<HTMLDivElement>
  inputsDisabled?: boolean
  className?: string
}

export default function ReceptionPitoleoPanel({
  line,
  serialInput,
  onSerialInputChange,
  onSerialKeyDown,
  serialError,
  addingSerial,
  onRemoveSerial,
  onAddAdditionalSlot,
  serialInputRef,
  panelRef,
  inputsDisabled,
  className,
}: Props) {
  const nextUnitIndex = line.units.findIndex((u) => !(u.serie || '').trim())
  const safeUnitIndex = nextUnitIndex >= 0 ? nextUnitIndex + 1 : line.quantity

  return (
    <div
      ref={panelRef}
      className={cn(
        'rounded-2xl border-2 border-cyan-500/35 bg-cyan-500/[0.04] dark:bg-cyan-500/5 p-4 sm:p-5 space-y-4',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
            {line.tipo} • {line.marca}
          </p>
          <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{line.modelo}</h4>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">
            {line.withSerial}/{line.quantity} series capturadas
          </p>
        </div>
        <button
          type="button"
          onClick={onAddAdditionalSlot}
          disabled={addingSerial || inputsDisabled}
          className="shrink-0 px-3 py-2 rounded-xl border border-cyan-600/30 text-cyan-800 dark:text-cyan-300 text-[9px] font-black uppercase tracking-widest hover:bg-cyan-500/10 disabled:opacity-50"
        >
          <Plus className="w-3 h-3 inline mr-1" />
          Cupo adicional
        </button>
      </div>

      {line.withSerial >= line.quantity ? (
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 text-center py-1">
          Línea completa — cierre y seleccione otra cantidad
        </p>
      ) : (
        <div className="space-y-2">
          <input
            ref={serialInputRef}
            value={serialInput}
            onChange={(e) => onSerialInputChange(e.target.value)}
            onKeyDown={onSerialKeyDown}
            placeholder={`Pistolear serie — unidad ${safeUnitIndex} (Enter)`}
            disabled={addingSerial || inputsDisabled}
            className="w-full px-4 py-4 rounded-xl bg-white dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 font-mono text-sm font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            autoComplete="off"
          />
          {serialError ? (
            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">{serialError}</p>
          ) : null}
          <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
            <span>Escanee o escriba la serie y pulse Enter</span>
            <span className="font-mono font-black">
              {line.withSerial} / {line.quantity}
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-surface-800">
        <table className="w-full min-w-[400px] text-left text-[11px]">
          <thead className="bg-gray-50 dark:bg-surface-950 text-[9px] font-black uppercase tracking-widest text-gray-500">
            <tr>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2">Serie</th>
              <th className="px-3 py-2 text-center">Estado</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {line.units.map((unit, idx) => {
              const has = !!(unit.serie || '').trim()
              return (
                <tr key={unit.id} className="border-t border-gray-50 dark:border-surface-800">
                  <td className="px-3 py-2 font-black uppercase text-gray-600">Unidad {idx + 1}</td>
                  <td className="px-3 py-2 font-mono font-bold text-gray-900 dark:text-white">
                    {has ? unit.serie : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase tracking-widest',
                        has ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {has ? 'OK' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {has ? (
                      <button
                        type="button"
                        onClick={() => onRemoveSerial(unit)}
                        disabled={addingSerial || inputsDisabled}
                        className="p-1 text-rose-500 hover:text-rose-600 disabled:opacity-40"
                        title="Quitar serie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReceptionPitoleoModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 shadow-2xl animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pitoleo-modal-title"
      >
        <div className="sticky top-0 z-10 px-5 py-3 border-b border-gray-100 dark:border-surface-800 flex items-center justify-between gap-3 bg-white/95 dark:bg-surface-900/95 backdrop-blur">
          <div className="min-w-0">
            <h3
              id="pitoleo-modal-title"
              className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate"
            >
              {title}
            </h3>
            {subtitle ? (
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-50 dark:bg-surface-950 text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-100 dark:border-surface-800 shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
