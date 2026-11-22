'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Package,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type CertificateSummary = {
  marca: string | null
  modelo: string | null
  modeloMtm?: string | null
  serie: string | null
  serieDisco: string | null
  borrado: boolean | null
  estadoBorrado: string | null
  certificadoId: string | null
  software: string | null
  capacidadDisco: string | null
  memoriaRam: string | null
  metodo: string | null
  fecha: string | null
}

type BatchRow = {
  fileName: string
  ok: boolean
  error?: string
  summary?: CertificateSummary
  assetId?: string | null
  assetSerial?: string | null
  evidenceSaved?: boolean
  movedToVal?: boolean
  status:
    | 'evidencia_ok'
    | 'parseado_sin_activo'
    | 'parseado_sin_serie'
    | 'borrado_fallido'
    | 'error'
}

type Totals = {
  total: number
  ok: number
  sinActivo: number
  sinSerie: number
  fallidos: number
}

const MAX_FILES = 50

type WipeProject = {
  ordCode: string
  batchId: string
  assetCount: number
  withPdfCount: number
  pendingPdfCount: number
  customerName: string | null
}

export function CertificateIntake() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projects, setProjects] = useState<WipeProject[]>([])
  const [selectedOrd, setSelectedOrd] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [results, setResults] = useState<BatchRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true)
      const res = await fetch('/api/wipe/projects', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar proyectos')
      const list = (json.projects || []) as WipeProject[]
      setProjects(list)
      setSelectedOrd((prev) => prev || list[0]?.ordCode || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos ORD')
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const selectedProject = projects.find((p) => p.ordCode === selectedOrd) ?? null

  const reset = () => {
    setError(null)
    setResults([])
    setTotals(null)
    setProgress(null)
    setPendingCount(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )

    if (!selectedOrd) {
      setError('Seleccione primero el proyecto ORD')
      return
    }
    if (files.length === 0) {
      setError('Selecciona al menos un PDF de certificado Blancco / WipeDrive')
      return
    }
    if (files.length > MAX_FILES) {
      setError(`Máximo ${MAX_FILES} certificados por lote`)
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setTotals(null)
    setPendingCount(files.length)
    setProgress(`Procesando ${files.length} certificado(s)…`)

    try {
      const form = new FormData()
      form.set('projectOrd', selectedOrd)
      for (const file of files) {
        form.append('files', file)
      }

      const res = await fetch('/api/wipe/batch-certificates', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo procesar el lote')
      }

      setResults((json.results || []) as BatchRow[])
      setTotals((json.totals || null) as Totals | null)
      setProgress(null)
      void loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el lote')
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void processFiles(e.target.files)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!selectedOrd) {
      setError('Seleccione primero el proyecto ORD')
      return
    }
    if (e.dataTransfer.files?.length) void processFiles(e.dataTransfer.files)
  }

  return (
    <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-xl">
            <HardDrive className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Captura de certificados (lote / ETL)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Elija el <strong className="text-violet-600 dark:text-violet-400">proyecto ORD</strong>,
              luego suba los PDF Blancco: se cruza por serie solo dentro de ese lote (hasta{' '}
              {MAX_FILES} por envío).
            </p>
          </div>
        </div>
        {(results.length > 0 || error) && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 dark:hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Nuevo lote
          </button>
        )}
      </div>

      <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/60 dark:bg-violet-950/20 p-4 space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
          Proyecto (ORD)
        </label>
        {loadingProjects ? (
          <p className="text-sm text-gray-500">Cargando órdenes…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            No hay lotes ORD con equipos en inventario. Reciba un ticket con ORD en Bodega
            Recepción primero.
          </p>
        ) : (
          <>
            <select
              value={selectedOrd}
              onChange={(e) => setSelectedOrd(e.target.value)}
              className="w-full max-w-md rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-white dark:bg-[#0f1419] px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white"
            >
              {projects.map((p) => (
                <option key={p.ordCode} value={p.ordCode}>
                  {p.ordCode}
                  {p.customerName ? ` · ${p.customerName}` : ''} — {p.assetCount} equipos ·{' '}
                  {p.pendingPdfCount} sin PDF
                </option>
              ))}
            </select>
            {selectedProject && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {selectedProject.pendingPdfCount} certificado(s) pendiente(s) de{' '}
                {selectedProject.assetCount} en {selectedProject.ordCode}
                {selectedProject.withPdfCount > 0
                  ? ` (${selectedProject.withPdfCount} PDF ya cargados)`
                  : ''}
              </p>
            )}
          </>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-[#0f1419]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progress || 'Procesando lote…'}
            </p>
            <p className="text-xs text-gray-500">{pendingCount} archivo(s)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-violet-500" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Arrastra varios PDF aquí o selecciónalos
            </p>
            <button
              type="button"
              disabled={!selectedOrd || projects.length === 0}
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
            >
              Subir lote de certificados
            </button>
            <p className="text-[11px] text-gray-500">
              Máx. {MAX_FILES} PDF · 10 MB c/u · solo series del ORD seleccionado
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {totals && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Stat label="Total" value={totals.total} />
            <Stat label="Evidencia OK" value={totals.ok} tone="ok" />
            <Stat label="Sin activo" value={totals.sinActivo} tone="warn" />
            <Stat label="Sin serie" value={totals.sinSerie} tone="warn" />
            <Stat label="Fallidos" value={totals.fallidos} tone="bad" />
          </div>
          {totals.ok > 0 && (
            <Link
              href="/dashboard/borrado/evidencias"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver tabla ORD / detalle / PDF
            </Link>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-[#0f1419] text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400">
                <th className="px-3 py-2 text-left">Archivo</th>
                <th className="px-3 py-2 text-left">Marca</th>
                <th className="px-3 py-2 text-left">Modelo</th>
                <th className="px-3 py-2 text-left">Serie</th>
                <th className="px-3 py-2 text-left">Borrado</th>
                <th className="px-3 py-2 text-left">Evidencia</th>
                <th className="px-3 py-2 text-left">BOD-VAL</th>
                <th className="px-3 py-2 text-left">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr
                  key={`${row.fileName}-${row.summary?.certificadoId || row.assetId || ''}`}
                  className="border-t border-gray-100 dark:border-gray-800 align-top"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-1.5 max-w-[180px]">
                      <FileText className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                      <span className="truncate" title={row.fileName}>
                        {row.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-bold">{row.summary?.marca || '—'}</td>
                  <td
                    className="px-3 py-2"
                    title={
                      [
                        row.summary?.modeloMtm ? `MTM: ${row.summary.modeloMtm}` : null,
                        row.summary?.capacidadDisco ? `Disco: ${row.summary.capacidadDisco}` : null,
                        row.summary?.serieDisco ? `SN disco: ${row.summary.serieDisco}` : null,
                        row.summary?.memoriaRam ? `RAM: ${row.summary.memoriaRam}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                  >
                    {row.summary?.modelo || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono">{row.summary?.serie || '—'}</td>
                  <td className="px-3 py-2">
                    {row.summary?.estadoBorrado ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-bold',
                          row.summary.borrado === true
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : row.summary.borrado === false
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-gray-500'
                        )}
                      >
                        {row.summary.borrado === true ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : row.summary.borrado === false ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : null}
                        {row.summary.estadoBorrado}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.evidenceSaved ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Guardada</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.movedToVal ? (
                      <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                        <Package className="w-3.5 h-3.5" /> Sí
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} error={row.error} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'ok' | 'warn' | 'bad'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2',
        tone === 'ok' && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
        tone === 'warn' && 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
        tone === 'bad' && 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10',
        !tone && 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1419]'
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{value}</p>
    </div>
  )
}

function StatusBadge({
  status,
  error,
}: {
  status: BatchRow['status']
  error?: string
}) {
  const map: Record<BatchRow['status'], { label: string; className: string }> = {
    evidencia_ok: {
      label: 'OK · evidencia armada',
      className: 'text-emerald-700 dark:text-emerald-400',
    },
    parseado_sin_activo: {
      label: 'Leído · sin activo',
      className: 'text-amber-700 dark:text-amber-400',
    },
    parseado_sin_serie: {
      label: 'Leído · sin serie',
      className: 'text-amber-700 dark:text-amber-400',
    },
    borrado_fallido: {
      label: 'Borrado fallido',
      className: 'text-rose-700 dark:text-rose-400',
    },
    error: {
      label: 'Error',
      className: 'text-rose-700 dark:text-rose-400',
    },
  }
  const cfg = map[status]
  return (
    <div className={cn('font-bold', cfg.className)} title={error || cfg.label}>
      {cfg.label}
      {error && status !== 'evidencia_ok' ? (
        <p className="font-normal text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-[220px]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
