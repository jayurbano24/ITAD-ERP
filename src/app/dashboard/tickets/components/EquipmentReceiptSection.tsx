'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Download,
  Eye,
  EyeOff,
  FileSignature,
  FileText,
  Loader2,
  RefreshCw,
  ScanLine,
  Upload,
} from 'lucide-react'
import { isReceiptPdfFile, isReceptionSpreadsheetFile } from '@/lib/tickets/parseReceptionExcel'
import { cn } from '@/lib/utils'
import {
  buildEquipmentReceiptPayload,
  DEFAULT_RECEIPT_CUSTOMER,
  type ReceiptPayloadEnrichment,
} from '@/lib/receipts/buildEquipmentReceiptPayload'
import {
  buildEquipmentReceiptPdfBlob,
  downloadEquipmentReceiptPdf,
  receiptPdfFileName,
} from '@/lib/receipts/printEquipmentReceiptPdf'
import {
  getTicketReceiptEnrichmentAction,
  saveEquipmentReceiptNotesAction,
  uploadSignedEquipmentReceiptAction,
  type OperationsTicket,
} from '../actions'

type AssetRow = {
  asset_type?: string | null
  manufacturer?: string | null
  model?: string | null
  serial_number?: string | null
}

type Props = {
  ticket: OperationsTicket
  assets: AssetRow[]
  onTicketPatch?: (patch: Partial<OperationsTicket>) => void
  onManifestSynced?: () => void
}

export function EquipmentReceiptSection({
  ticket,
  assets,
  onTicketPatch,
  onManifestSynced,
}: Props) {
  const [receptionNotes, setReceptionNotes] = useState(
    ticket.equipment_receipt_notes?.trim() || ''
  )
  const [customerLabel, setCustomerLabel] = useState(DEFAULT_RECEIPT_CUSTOMER)
  const [companyOverride, setCompanyOverride] = useState('')
  const [busy, setBusy] = useState<'download' | 'upload' | 'notes' | 'preview' | 'manifest' | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewStale, setPreviewStale] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const manifestRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [enrichment, setEnrichment] = useState<ReceiptPayloadEnrichment | null>(null)

  useEffect(() => {
    let cancelled = false
    void getTicketReceiptEnrichmentAction(ticket.id).then((res) => {
      if (cancelled || !res.data) return
      setEnrichment({
        batchOrdCodes: res.data.batchOrdCodes,
        batchReceptionDate: res.data.batchReceptionDate,
        ...(res.data.clientAddress
          ? { client: { address: res.data.clientAddress } }
          : {}),
      })
    })
    return () => {
      cancelled = true
    }
  }, [ticket.id])

  const signedUrl = ticket.signed_receipt_url
  const signedName = ticket.signed_receipt_name
  const sourceAttachmentUrl = ticket.attachment_url
  const sourceAttachmentName = ticket.attachment_name
  const manifestSlots = ticket.ticket_items?.length ?? 0

  const itemCount =
    assets.length > 0 ? assets.length : (ticket.ticket_items?.length ?? 0)

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
  }, [])

  useEffect(() => {
    return () => revokePreviewUrl()
  }, [revokePreviewUrl])

  useEffect(() => {
    setPreviewStale(true)
  }, [receptionNotes, customerLabel, companyOverride, assets.length, ticket.id, enrichment])

  const persistNotesIfChanged = async (): Promise<boolean> => {
    if (receptionNotes.trim() === (ticket.equipment_receipt_notes || '').trim()) return true
    const saved = await saveEquipmentReceiptNotesAction(ticket.id, receptionNotes)
    if (!saved.success) {
      setError(saved.error || 'No se pudieron guardar las notas')
      return false
    }
    onTicketPatch?.({ equipment_receipt_notes: receptionNotes.trim() || null })
    return true
  }

  const buildPayload = () => {
    const base = buildEquipmentReceiptPayload(ticket, assets, {
      receptionNotes,
      customer: customerLabel,
      enrichment: enrichment || undefined,
    })
    if (companyOverride.trim()) {
      return { ...base, companyName: companyOverride.trim() }
    }
    return base
  }

  const headerPreview = buildEquipmentReceiptPayload(ticket, assets, {
    customer: customerLabel,
    enrichment: enrichment || undefined,
  })

  const refreshPreview = async () => {
    setBusy('preview')
    setError(null)
    setInfo(null)
    try {
      const ok = await persistNotesIfChanged()
      if (!ok) return

      const payload = buildPayload()
      const blob = await buildEquipmentReceiptPdfBlob(payload)
      revokePreviewUrl()
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreviewUrl(url)
      setPreviewOpen(true)
      setPreviewStale(false)
      setInfo('Vista previa actualizada.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la vista previa')
    } finally {
      setBusy(null)
    }
  }

  const handleDownload = async () => {
    setBusy('download')
    setError(null)
    setInfo(null)
    try {
      const ok = await persistNotesIfChanged()
      if (!ok) return

      const payload = buildPayload()
      await downloadEquipmentReceiptPdf(payload, receiptPdfFileName(payload, ticket.readable_id))
      setInfo('PDF listo para imprimir y firmar.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el PDF')
    } finally {
      setBusy(null)
    }
  }

  const handleManifestUpload = async (file: File) => {
    setError(null)
    setInfo(null)
    setBusy('manifest')
    try {
      const fd = new FormData()
      fd.set('receipt', file)
      const response = await fetch(`/api/tickets/${ticket.id}/receipt-manifest`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const payload = (await response.json().catch(() => null)) as {
        error?: string
        insertedSlots?: number
        expectedUnits?: number
        attachment_url?: string
        attachment_name?: string
      } | null
      if (!response.ok || !payload?.insertedSlots) {
        throw new Error(payload?.error || `No se pudo cargar el recibo (HTTP ${response.status})`)
      }
      onTicketPatch?.({
        attachment_url: payload.attachment_url ?? ticket.attachment_url,
        attachment_name: payload.attachment_name ?? ticket.attachment_name,
        expected_units: payload.expectedUnits ?? ticket.expected_units,
      })
      setInfo(
        `Manifiesto listo: ${payload.insertedSlots} cupo(s) para pistoleo en Recepción. Abra TK en módulo Recepción.`
      )
      onManifestSynced?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir el recibo')
    } finally {
      setBusy(null)
      if (manifestRef.current) manifestRef.current.value = ''
    }
  }

  const handleUpload = async (file: File) => {
    setBusy('upload')
    setError(null)
    setInfo(null)
    try {
      const fd = new FormData()
      fd.set('signed_receipt', file)
      const result = await uploadSignedEquipmentReceiptAction(ticket.id, fd)
      if (!result.success) {
        setError(result.error || 'Error al subir')
        return
      }
      onTicketPatch?.({
        signed_receipt_url: result.signed_receipt_url ?? null,
        signed_receipt_name: result.signed_receipt_name ?? null,
      })
      setInfo('Recibo firmado guardado correctamente.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSaveNotes = async () => {
    setBusy('notes')
    setError(null)
    try {
      const result = await saveEquipmentReceiptNotesAction(ticket.id, receptionNotes)
      if (!result.success) {
        setError(result.error || 'No se guardaron las notas')
        return
      }
      onTicketPatch?.({ equipment_receipt_notes: receptionNotes.trim() || null })
      setPreviewStale(true)
      setInfo('Notas guardadas.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="border border-surface-700 rounded-xl bg-surface-800/40 p-4 space-y-3">
      <div className="rounded-lg border border-dashed border-cyan-500/35 bg-cyan-500/5 p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5" />
              Recibo del cliente → pistoleo
            </p>
            <p className="text-[11px] text-surface-400 mt-0.5">
              Suba el Receipt of Equipment (PDF/foto/Excel). Crea los cupos por cantidad para escanear series en{' '}
              <span className="text-surface-300">Recepción</span>.
              {manifestSlots > 0 ? (
                <span className="text-emerald-400"> · {manifestSlots} cupo(s) actuales</span>
              ) : (
                <span className="text-amber-400"> · Sin cupos — suba el recibo</span>
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => manifestRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-black uppercase disabled:opacity-50"
          >
            {busy === 'manifest' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Subir recibo XSi
          </button>
          <input
            ref={manifestRef}
            type="file"
            accept="image/*,.pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleManifestUpload(f)
            }}
          />
        </div>
        {sourceAttachmentUrl ? (
          <a
            href={sourceAttachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[11px] text-cyan-200 hover:text-white"
          >
            <FileText className="w-3.5 h-3.5" />
            {sourceAttachmentName || 'Recibo adjunto'}
            {isReceiptPdfFile({
              name: sourceAttachmentName || '',
              type: '',
            }) || /\.pdf(\?|$)/i.test(sourceAttachmentUrl)
              ? ' (PDF)'
              : isReceptionSpreadsheetFile({ name: sourceAttachmentName || '', type: '' })
                ? ' (Excel)'
                : ''}
          </a>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Receipt of Equipment (recibir / firmar)</p>
          <p className="text-xs text-surface-400 mt-0.5">
            Imprime el formato XSi con {itemCount || 'los'} equipo(s) del ticket. Use las notas para faltantes o extras.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void refreshPreview()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-500/50 bg-brand-500/10 hover:bg-brand-500/20 text-brand-200 text-xs font-bold uppercase disabled:opacity-50"
          >
            {busy === 'preview' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Ver recibo
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleDownload()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold uppercase disabled:opacity-50"
          >
            {busy === 'download' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Descargar para firmar
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase disabled:opacity-50"
          >
            {busy === 'upload' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Subir firmado
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUpload(f)
            }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-bold uppercase text-surface-500">Customer (recibo)</span>
          <input
            value={customerLabel}
            onChange={(e) => setCustomerLabel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white"
            placeholder={DEFAULT_RECEIPT_CUSTOMER}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase text-surface-500">Company Name (recibo)</span>
          <input
            value={companyOverride}
            onChange={(e) => setCompanyOverride(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white"
            placeholder={headerPreview.companyName || 'Ej. CAPGEMINI, Uber…'}
          />
        </label>
      </div>

      <div className="rounded-lg border border-surface-700/80 bg-surface-900/60 px-3 py-2 text-[11px] text-surface-400 grid gap-1 sm:grid-cols-2">
        <p>
          <span className="text-surface-500">ORD:</span>{' '}
          <span className="text-surface-200 font-medium">{headerPreview.orderNumber || '—'}</span>
        </p>
        <p>
          <span className="text-surface-500">Project ID:</span>{' '}
          <span className="text-surface-200 font-medium">{headerPreview.projectId || '—'}</span>
        </p>
        <p>
          <span className="text-surface-500">Pickup:</span>{' '}
          <span className="text-surface-200 font-medium">{headerPreview.pickupDate || '—'}</span>
        </p>
        <p className="sm:col-span-2">
          <span className="text-surface-500">Dirección:</span>{' '}
          <span className="text-surface-200 font-medium">
            {headerPreview.collectionAddress || '— (edita dirección en el ticket)'}
          </span>
        </p>
      </div>

      <label className="block">
        <span className="text-[10px] font-bold uppercase text-surface-500">
          Notas de recepción (se imprimen en el PDF)
        </span>
        <textarea
          value={receptionNotes}
          onChange={(e) => setReceptionNotes(e.target.value)}
          rows={3}
          placeholder="Ej.: Falta serial ABC123; se entregó 1 laptop adicional no listada; daño en caja #2…"
          className="mt-1 w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white placeholder:text-surface-600"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void handleSaveNotes()}
          className="text-xs font-medium text-brand-400 hover:text-brand-300 disabled:opacity-50"
        >
          {busy === 'notes' ? 'Guardando…' : 'Guardar notas sin descargar'}
        </button>
      </div>

      {previewOpen && previewUrl && (
        <div className="rounded-xl border border-surface-600 bg-surface-900 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-surface-700 bg-surface-800/80">
            <p className="text-xs font-bold uppercase tracking-wide text-surface-300">
              Vista previa — Receipt of Equipment
            </p>
            <div className="flex flex-wrap gap-2">
              {previewStale && (
                <span className="text-[10px] text-amber-400 font-medium">Cambios sin actualizar</span>
              )}
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshPreview()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase text-brand-300 hover:bg-surface-700 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3 h-3', busy === 'preview' && 'animate-spin')} />
                Actualizar
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase text-surface-300 hover:bg-surface-700"
              >
                Abrir en pestaña
              </a>
              <button
                type="button"
                onClick={() => {
                  setPreviewOpen(false)
                  revokePreviewUrl()
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase text-surface-400 hover:bg-surface-700"
              >
                <EyeOff className="w-3 h-3" />
                Ocultar
              </button>
            </div>
          </div>
          <iframe
            title="Vista previa Receipt of Equipment"
            src={`${previewUrl}#toolbar=1&navpanes=0`}
            className="w-full h-[min(70vh,520px)] bg-white"
          />
        </div>
      )}

      {signedUrl && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30',
            'bg-emerald-500/10 px-3 py-2'
          )}
        >
          <div className="flex items-center gap-2 text-emerald-300 min-w-0">
            <FileSignature className="w-4 h-4 shrink-0" />
            <span className="text-sm truncate">{signedName || 'Recibo firmado'}</span>
          </div>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase text-emerald-400 hover:text-emerald-300 shrink-0"
          >
            Ver / descargar
          </a>
        </div>
      )}

      {info && <p className="text-xs text-brand-300">{info}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </section>
  )
}