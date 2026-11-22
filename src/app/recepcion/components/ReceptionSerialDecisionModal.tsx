'use client'

import { useState, type ReactNode } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SerialDecisionPayload =
  | { action: 'retry' }
  | { action: 'accept_mismatch'; justification: string }
  | { action: 'reassign'; targetItemId: string; justification: string }
  | { action: 'register_additional'; justification: string }

type Candidate = {
  id: string
  label: string
  expectedSerial?: string
}

type Props = {
  open: boolean
  scannedSerial: string
  expectedSerial: string
  candidates: Candidate[]
  submitting?: boolean
  onConfirm: (payload: SerialDecisionPayload) => void
  onCancel: () => void
}

export function ReceptionSerialDecisionModal({
  open,
  scannedSerial,
  expectedSerial,
  candidates,
  submitting,
  onConfirm,
  onCancel,
}: Props) {
  const [mode, setMode] = useState<'choose' | 'reassign' | 'additional' | 'force'>('choose')
  const [justification, setJustification] = useState('')
  const [targetItemId, setTargetItemId] = useState('')

  if (!open) return null

  const resetAnd = (m: typeof mode) => {
    setMode(m)
    setJustification('')
    setTargetItemId(m === 'reassign' && candidates[0] ? candidates[0].id : '')
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/65">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-white dark:bg-surface-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100 dark:border-surface-800">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">
                Serie no coincide con el Receipt
              </p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                Pistoleó: {scannedSerial}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Receipt: <span className="font-mono font-bold">{expectedSerial}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {mode === 'choose' ? (
            <>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Revise etiqueta, dígito o lectura del escáner antes de registrar.
              </p>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[10px] font-black uppercase bg-gray-100 dark:bg-surface-800 text-gray-800 dark:text-gray-200"
                onClick={() => onConfirm({ action: 'retry' })}
              >
                Corregir lectura — volver a pistolear
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[10px] font-black uppercase border border-purple-500/40 text-purple-700 dark:text-purple-300"
                onClick={() => resetAnd('reassign')}
              >
                Vincular a otro cupo / serie del recibo incorrecta
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[10px] font-black uppercase border border-cyan-500/40 text-cyan-800 dark:text-cyan-300"
                onClick={() => resetAnd('additional')}
              >
                Registrar equipo adicional (no estaba en el recibo)
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[10px] font-black uppercase border border-amber-500/50 text-amber-800 dark:text-amber-300"
                onClick={() => resetAnd('force')}
              >
                Aceptar discrepancia en este cupo
              </button>
            </>
          ) : null}

          {mode === 'reassign' ? (
            <MotionFields
              title="Corrección de vinculación"
              justification={justification}
              onJustificationChange={setJustification}
              extra={
                <label className="block text-[10px] font-bold uppercase text-gray-500">
                  Cupo del recibo a corregir
                  <select
                    value={targetItemId}
                    onChange={(e) => setTargetItemId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-950 px-3 py-2 text-sm"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                        {c.expectedSerial ? ` · ${c.expectedSerial}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              }
              canSubmit={justification.trim().length > 5 && !!targetItemId}
              submitting={submitting}
              onBack={() => setMode('choose')}
              onSubmit={() =>
                onConfirm({ action: 'reassign', targetItemId, justification: justification.trim() })
              }
            />
          ) : null}

          {mode === 'additional' ? (
            <MotionFields
              title="Activo adicional"
              justification={justification}
              onJustificationChange={setJustification}
              hint="Indique tipo/marca/modelo y motivo (cliente entregó unidad extra)."
              canSubmit={justification.trim().length > 8}
              submitting={submitting}
              onBack={() => setMode('choose')}
              onSubmit={() =>
                onConfirm({ action: 'register_additional', justification: justification.trim() })
              }
            />
          ) : null}

          {mode === 'force' ? (
            <MotionFields
              title="Discrepancia autorizada"
              justification={justification}
              onJustificationChange={setJustification}
              hint="Explique por qué la serie física no coincide con el PDF."
              canSubmit={justification.trim().length > 5}
              submitting={submitting}
              onBack={() => setMode('choose')}
              onSubmit={() =>
                onConfirm({ action: 'accept_mismatch', justification: justification.trim() })
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function MotionFields({
  title,
  hint,
  justification,
  onJustificationChange,
  extra,
  canSubmit,
  submitting,
  onBack,
  onSubmit,
}: {
  title: string
  hint?: string
  justification: string
  onJustificationChange: (v: string) => void
  extra?: ReactNode
  canSubmit: boolean
  submitting?: boolean
  onBack: () => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
      {hint ? <p className="text-[11px] text-gray-500">{hint}</p> : null}
      {extra}
      <textarea
        value={justification}
        onChange={(e) => onJustificationChange(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-gray-200 dark:border-surface-700 px-3 py-2 text-sm"
        placeholder="Justificación obligatoria…"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-gray-100 dark:bg-surface-800"
        >
          Atrás
        </button>
        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase text-white bg-indigo-600 disabled:opacity-40 flex items-center justify-center gap-2'
          )}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Confirmar
        </button>
      </div>
    </div>
  )
}