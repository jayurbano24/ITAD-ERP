'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera, Check, Loader2, RefreshCw, ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/utils'

type MobileLine = {
  key: string
  marca: string
  modelo: string
  tipo: string
  quantity: number
  withSerial: number
  pending: number
  templateItemId: string
}

type MobilePayload = {
  ticket: { id: string; readableId: string; client: string; title: string }
  totals: { total: number; captured: number; pending: number }
  lines: MobileLine[]
  recentCaptures: Array<{ serial: string; brand: string; model: string; capturedBy: string | null }>
}

export default function ReceptionMobileCapture() {
  const searchParams = useSearchParams()
  const initialTk = searchParams.get('tk')?.trim() || ''

  const [ticketInput, setTicketInput] = useState(initialTk)
  const [activeTk, setActiveTk] = useState(initialTk)
  const [payload, setPayload] = useState<MobilePayload | null>(null)
  const [lineKey, setLineKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serial, setSerial] = useState('')
  const [saving, setSaving] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [successFlash, setSuccessFlash] = useState<string | null>(null)
  const serialRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeLine = useMemo(
    () => payload?.lines.find((l) => l.key === lineKey) || null,
    [payload, lineKey]
  )

  const loadTicket = useCallback(async (tk: string) => {
    const normalized = tk.trim()
    if (!normalized) {
      setError('Escriba el número de ticket (ej. TK-2026-00009)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/recepcion/mobile?ticket=${encodeURIComponent(normalized)}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setPayload(null)
        setError(data.error || 'No se encontró el ticket')
        return
      }
      setPayload(data as MobilePayload)
      setActiveTk(normalized)
      setLineKey((prev) => {
        if (prev && data.lines.some((l: MobileLine) => l.key === prev)) return prev
        const firstPending = (data.lines as MobileLine[]).find((l) => l.pending > 0)
        return firstPending?.key || data.lines[0]?.key || null
      })
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialTk) void loadTicket(initialTk)
  }, [initialTk, loadTicket])

  useEffect(() => {
    if (!activeTk) return
    const id = window.setInterval(() => {
      void loadTicket(activeTk)
    }, 5000)
    return () => window.clearInterval(id)
  }, [activeTk, loadTicket])

  const submitSerial = async () => {
    if (!payload || !activeLine) return
    const value = serial.trim().toUpperCase()
    if (!value) {
      setError('Ingrese o escanee una serie')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/recepcion/serials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan',
          ticketId: payload.ticket.id,
          templateItemId: activeLine.templateItemId,
          serial: value,
          source: 'mobile',
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'No se pudo registrar la serie')
        return
      }
      setSerial('')
      setSuccessFlash(value)
      window.setTimeout(() => setSuccessFlash(null), 2000)
      await loadTicket(activeTk)
      serialRef.current?.focus()
    } catch {
      setError('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  const runOcr = async (file: File) => {
    setOcrBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('image', file)
      const response = await fetch('/api/recepcion/serial-ocr', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'OCR no pudo leer la etiqueta')
        return
      }
      const picked = (data.best as string) || (data.candidates?.[0] as string) || ''
      if (!picked) {
        setError('No se detectó serie en la foto. Escriba manualmente.')
        return
      }
      setSerial(picked)
      serialRef.current?.focus()
    } catch {
      setError('Error al procesar la imagen')
    } finally {
      setOcrBusy(false)
    }
  }

  const progressPct = payload
    ? Math.round((payload.totals.captured / Math.max(payload.totals.total, 1)) * 100)
    : 0

  return (
    <div className="px-4 pb-10 pt-4 max-w-lg mx-auto space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ticket (TK)</label>
        <div className="flex gap-2">
          <input
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
            placeholder="TK-2026-00009"
            className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-black/40 border border-white/15 font-mono text-sm font-bold text-white placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void loadTicket(ticketInput)
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadTicket(ticketInput)}
            className="shrink-0 px-4 py-3 rounded-xl bg-cyan-600 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Abrir'}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 leading-snug">
          Varios operadores pueden abrir el mismo TK en su teléfono. Los avances se sincronizan cada pocos segundos.
        </p>
      </section>

      {payload ? (
        <>
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <p className="text-xs font-black uppercase tracking-tight text-white">{payload.ticket.readableId}</p>
            <p className="text-[10px] text-cyan-200/90 mt-1">{payload.ticket.client}</p>
            <div className="mt-3 h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 text-[11px] font-mono font-bold text-gray-200">
              {payload.totals.captured} / {payload.totals.total} series · {payload.totals.pending} pendiente(s)
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Línea a capturar</p>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {payload.lines.map((line) => {
                const selected = line.key === lineKey
                return (
                  <button
                    key={line.key}
                    type="button"
                    onClick={() => setLineKey(line.key)}
                    className={cn(
                      'w-full text-left rounded-xl border px-3 py-3 transition-colors',
                      selected
                        ? 'border-cyan-500 bg-cyan-500/15'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{line.tipo}</p>
                    <p className="text-sm font-black text-white">
                      {line.marca} · {line.modelo}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-400 mt-1">
                      {line.withSerial}/{line.quantity} capturadas
                    </p>
                  </button>
                )
              })}
            </div>
          </section>

          {activeLine ? (
            <section className="rounded-2xl border border-white/10 bg-[#101820] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                  <ScanBarcode className="inline w-3.5 h-3.5 mr-1" />
                  Pistoleo
                </p>
                <button
                  type="button"
                  onClick={() => void loadTicket(activeTk)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white"
                  title="Actualizar"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <input
                ref={serialRef}
                value={serial}
                onChange={(e) => setSerial(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void submitSerial()
                  }
                }}
                placeholder={`Serie ${activeLine.withSerial + 1} de ${activeLine.quantity}`}
                disabled={saving || activeLine.pending <= 0}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                className="w-full px-4 py-4 rounded-xl bg-black border-2 border-white/10 font-mono text-lg font-bold text-white focus:outline-none focus:border-cyan-500 disabled:opacity-40"
              />

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void runOcr(file)
                }}
              />

              <MotionRow>
                <button
                  type="button"
                  disabled={ocrBusy || activeLine.pending <= 0}
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 py-3 rounded-xl border border-white/15 text-[10px] font-black uppercase tracking-widest text-gray-200 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {ocrBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  OCR etiqueta
                </button>
                <button
                  type="button"
                  disabled={saving || !serial.trim() || activeLine.pending <= 0}
                  onClick={() => void submitSerial()}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar
                </button>
              </MotionRow>

              {successFlash ? (
                <p className="text-center text-emerald-400 text-xs font-black uppercase tracking-widest animate-pulse">
                  ✓ Serie {successFlash} guardada
                </p>
              ) : null}
            </section>
          ) : null}

          {payload.recentCaptures.length > 0 ? (
            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Últimas capturas</p>
              <ul className="space-y-1.5 text-[11px]">
                {payload.recentCaptures.map((row, i) => (
                  <li key={`${row.serial}-${i}`} className="flex justify-between gap-2 font-mono text-gray-300">
                    <span className="truncate">{row.serial}</span>
                    <span className="text-gray-500 truncate text-[10px]">{row.capturedBy || '—'}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {error ? (
        <p className="text-center text-rose-400 text-[11px] font-bold px-2">{error}</p>
      ) : null}
    </div>
  )
}

function MotionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>
}