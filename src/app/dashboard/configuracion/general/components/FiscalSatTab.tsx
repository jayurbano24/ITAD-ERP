'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Loader2, RefreshCcw, ShieldCheck, Link2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { updateSatFiscalSettings, type FiscalSatCatalogStatus } from '../actions'

type FiscalSatTabProps = {
  initial: FiscalSatCatalogStatus
}

export function FiscalSatTab({ initial }: FiscalSatTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState(initial)
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? '')
  const [withholdingRate, setWithholdingRate] = useState(
    String((initial.withholdingRate ?? 0.15) * 100)
  )
  const [uploading, setUploading] = useState(false)
  const [uploadPhase, setUploadPhase] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSaveSettings = async () => {
    setSaving(true)
    const ratePct = Math.max(0, Math.min(100, Number(withholdingRate) || 0))
    const result = await updateSatFiscalSettings({
      sat_retenedores_source_url: sourceUrl.trim() || null,
      iva_withholding_rate: ratePct / 100,
    })
    setSaving(false)
    if (!result.success) {
      toast.warning('Configuración', result.error || 'No se guardó la configuración')
      return
    }
    toast.success('Configuración fiscal', 'Configuración guardada')
    setStatus((s) => ({
      ...s,
      sourceUrl: sourceUrl.trim() || null,
      withholdingRate: ratePct / 100,
    }))
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    setUploadPhase('Leyendo PDF y extrayendo NIT (~30 s)…')
    try {
      const form = new FormData()
      form.append('file', file)
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 5 * 60 * 1000)
      setUploadPhase('Guardando en base de datos (~7.000 registros)…')
      const res = await fetch('/api/fiscal/sat-retenedores/import', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
      window.clearTimeout(timeout)
      const json = (await res.json()) as { nitCount?: number; error?: string }
      if (!res.ok) {
        throw new Error(json.error || 'Error al importar')
      }
      const count = json.nitCount ?? 0
      toast.success('Catálogo SAT', `Catálogo activo: ${count.toLocaleString('es-GT')} NIT`)
      setStatus((s) => ({
        ...s,
        agentCount: count,
        lastSyncAt: new Date().toISOString(),
        lastImportLabel: file.name,
      }))
      router.refresh()
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'La importación tardó demasiado. Intenta de nuevo o revisa la consola del servidor.'
          : err instanceof Error
            ? err.message
            : 'Error al importar PDF'
      setUploadError(msg)
      toast.warning('Importación', msg)
    } finally {
      setUploading(false)
      setUploadPhase('')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/fiscal/sat-retenedores/sync', { method: 'POST' })
      const json = (await res.json()) as { nitCount?: number; error?: string }
      if (!res.ok) {
        throw new Error(json.error || 'Error al sincronizar')
      }
      toast.success('Sincronización', `OK: ${json.nitCount ?? 0} NIT`)
      const count = json.nitCount ?? 0
      setStatus((s) => ({
        ...s,
        agentCount: count,
        lastSyncAt: new Date().toISOString(),
      }))
      router.refresh()
    } catch (err) {
      toast.warning('Sincronización', err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-2xl bg-amber-500/10">
          <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Agentes retenedores SAT</h2>
          <Text variant="body" className="text-surface-500">
            Sube el PDF oficial de la SAT o configura una URL para sincronizar automáticamente. Al
            capturar un NIT en ventas, el sistema indicará si aplica retención de IVA.
          </Text>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest',
              status.agentCount > 0
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
            )}
          >
            <ShieldCheck className="w-3 h-3" />
            {status.agentCount > 0 ? 'Catálogo activo' : 'Sin catálogo — validación NIT desactivada'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">NIT en catálogo</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {status.agentCount.toLocaleString('es-GT')}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Última actualización</p>
            <p className="text-sm font-bold text-gray-700 dark:text-surface-300">
              {status.lastSyncAt
                ? new Date(status.lastSyncAt).toLocaleString('es-GT', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Sin cargar'}
            </p>
            {status.lastImportLabel ? (
              <p className="text-[10px] text-gray-500 dark:text-surface-400 mt-1 truncate">
                Archivo: {status.lastImportLabel}
              </p>
            ) : null}
          </div>
        </div>
        {status.agentCount > 0 ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-300/90">
            Al colocar un NIT en <strong>Ventas → Nueva venta</strong> (modo NIT / Factura), verás «Agente retenedor SAT»
            si está en este listado.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-rose-700/90 dark:text-rose-300/90">
              El PDF no quedó registrado. Vuelve a subirlo; la carga puede tardar ~1 minuto (~7.000 NIT).
            </p>
            {uploadError ? (
              <p className="text-xs font-mono text-rose-800 dark:text-rose-200 bg-rose-500/10 rounded-lg p-2">
                {uploadError}
              </p>
            ) : null}
          </div>
        )}

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-surface-700 p-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-950/50 transition-colors">
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUpload(f)
              e.target.value = ''
            }}
          />
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          ) : (
            <FileUp className="w-8 h-8 text-amber-600" />
          )}
          <span className="text-sm font-black uppercase tracking-wide text-gray-700 dark:text-surface-300">
            {uploading ? 'Importando…' : 'Subir PDF agentes retenedores'}
          </span>
          {uploading && uploadPhase ? (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 text-center max-w-sm">
              {uploadPhase}
            </span>
          ) : null}
        </label>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-900 dark:text-white">Sincronización automática</h3>
        </div>
        <p className="text-xs text-gray-500">
          Pega el enlace directo al PDF publicado por la SAT. Usa &quot;Sincronizar ahora&quot; o el cron
          semanal en Vercel (configura <code className="font-mono">CRON_SECRET</code>).
        </p>
        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…/agentes-retenedores.pdf"
          className="w-full rounded-xl border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-3 py-2 text-sm font-mono"
        />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Retención de IVA (% del IVA de la factura)
        </p>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={withholdingRate}
          onChange={(e) => setWithholdingRate(e.target.value)}
          className="w-32 rounded-xl border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-3 py-2 text-sm font-bold"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveSettings()}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar URL y tasa'}
          </button>
          <button
            type="button"
            disabled={syncing || !sourceUrl.trim()}
            onClick={() => void handleSync()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-black uppercase disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Sincronizar ahora
          </button>
        </div>
      </div>
    </div>
  )
}