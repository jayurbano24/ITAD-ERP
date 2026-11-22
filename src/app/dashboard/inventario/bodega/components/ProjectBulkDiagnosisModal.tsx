'use client'

import { useMemo, useState } from 'react'
import { Loader2, X, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PROJECT_DISPOSITION_OPTIONS,
  PROJECT_DISPOSITION_VALUATION_WAREHOUSE,
  assetMatchesProjectRef,
  isAssetPendingProjectDisposition,
  normalizeProjectRef,
  type ProjectDispositionKey,
} from '@/lib/inventario/projectDisposition'

type AssetLike = {
  id: string
  serial_number: string | null
  specifications?: Record<string, unknown> | null
  order_code?: string | null
  batch_code?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  warehouseCode: string
  warehouseName: string
  assets: AssetLike[]
  initialProjectRef?: string | null
  onSuccess: () => void
}

export function ProjectBulkDiagnosisModal({
  open,
  onClose,
  warehouseCode,
  warehouseName,
  assets,
  initialProjectRef,
  onSuccess,
}: Props) {
  const [projectRef, setProjectRef] = useState(initialProjectRef || '')
  const [disposition, setDisposition] = useState<ProjectDispositionKey>('resale')
  const [onlyRemaining, setOnlyRemaining] = useState(true)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const preview = useMemo(() => {
    const ref = normalizeProjectRef(projectRef)
    if (!ref) return { count: 0, samples: [] as string[] }

    const matched = assets.filter((asset) => {
      if (!assetMatchesProjectRef(asset, ref)) return false
      return isAssetPendingProjectDisposition(asset, onlyRemaining)
    })

    return {
      count: matched.length,
      samples: matched
        .map((a) => a.serial_number || a.id.slice(0, 8))
        .filter(Boolean)
        .slice(0, 8),
    }
  }, [assets, projectRef, onlyRemaining])

  const selectedPlan = PROJECT_DISPOSITION_OPTIONS.find((o) => o.key === disposition)

  if (!open) return null

  const handleApply = async () => {
    const ref = projectRef.trim()
    if (!ref) {
      setError('Escriba el Project # (ORD…)')
      return
    }
    if (preview.count === 0) {
      setError('No hay equipos que coincidan con los criterios')
      return
    }
    if (
      !window.confirm(
        `¿Aplicar ${selectedPlan?.label} a ${preview.count} equipo(s) del proyecto ${ref.toUpperCase()}? Se trasladarán desde ${warehouseCode} a Bodega Valorización (${PROJECT_DISPOSITION_VALUATION_WAREHOUSE}).`
      )
    ) {
      return
    }

    setBusy(true)
    setError(null)
    setResultMessage(null)
    try {
      const response = await fetch('/api/inventario/bodega/bulk-project-disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRef: ref,
          disposition,
          sourceWarehouseCode: warehouseCode,
          onlyRemaining,
          notes: notes.trim() || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'No se pudo aplicar el diagnóstico masivo')
        return
      }
      setResultMessage(data.message || `Actualizados: ${data.updated ?? 0}`)
      onSuccess()
    } catch {
      setError('Error de red')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121820] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-violet-500/20">
              <ClipboardList className="w-6 h-6 text-violet-300" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Diagnóstico masivo por proyecto
              </h3>
              <p className="text-xs text-gray-400">
                {warehouseName} ({warehouseCode})
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-gray-400 leading-snug">
          Clasifique el <strong className="text-gray-200">restante</strong> del proyecto (sin disposición ITAD)
          como Resale, Recycle, Spare o Harvesting. Todos se envían a{' '}
          <strong className="text-gray-200">Bodega Valorización ({PROJECT_DISPOSITION_VALUATION_WAREHOUSE})</strong>; la
          etiqueta distingue el destino operativo.
        </p>

        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase text-gray-500">Project #</span>
          <input
            value={projectRef}
            onChange={(e) => setProjectRef(e.target.value.toUpperCase())}
            placeholder="ORD26580"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white"
          />
        </label>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-gray-500">Disposición</span>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_DISPOSITION_OPTIONS.map((opt) => {
              const selected = disposition === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDisposition(opt.key)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    selected
                      ? 'border-violet-400 bg-violet-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  )}
                >
                  <p className="text-xs font-black uppercase">{opt.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">→ Valorización</p>
                </button>
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={onlyRemaining}
            onChange={(e) => setOnlyRemaining(e.target.checked)}
            className="rounded border-gray-600"
          />
          Solo equipos sin disposición ITAD (restante del proyecto)
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase text-gray-500">Nota (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            placeholder="Motivo o referencia interna…"
          />
        </label>

        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5">
          <p className="text-xs font-bold text-cyan-100">
            Vista previa: <span className="font-mono">{preview.count}</span> equipo(s)
          </p>
          {preview.samples.length > 0 ? (
            <p className="text-[10px] font-mono text-cyan-200/80 mt-1 truncate">
              {preview.samples.join(', ')}
              {preview.count > preview.samples.length ? '…' : ''}
            </p>
          ) : null}
        </div>

        {error ? <p className="text-xs font-bold text-rose-400">{error}</p> : null}
        {resultMessage ? <p className="text-xs font-bold text-emerald-400">{resultMessage}</p> : null}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={busy || preview.count === 0}
            onClick={() => void handleApply()}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black uppercase tracking-wide disabled:opacity-50 flex items-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Aplicar a {preview.count || '…'}
          </button>
        </div>
      </div>
    </div>
  )
}