'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import {
  buildQuotationPdfBlob,
  downloadQuotationPdf,
  quotationPdfFileName,
  type QuotationPrintPayload,
} from '@/lib/ventas/printQuotationPdf'

type Props = {
  open: boolean
  onClose: () => void
  payload: QuotationPrintPayload | null
}

export default function QuotationPdfViewerModal({ open, onClose, payload }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !payload) {
      setPreviewUrl(null)
      setError(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const blob = await buildQuotationPdfBlob(payload)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch {
        if (!cancelled) setError('No se pudo generar la vista previa del PDF')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, payload])

  if (!open) return null

  const handleDownload = async () => {
    if (!payload) return
    await downloadQuotationPdf(payload)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="flex flex-col w-full max-w-5xl h-[min(92dvh,900px)] rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800">
          <PdfViewerTitle payload={payload} />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!payload || loading}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-surface-600 p-1.5 text-gray-600 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-surface-700"
              aria-label="Cerrar visor PDF"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-gray-100 dark:bg-surface-950 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-surface-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Generando PDF…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-red-600">{error}</div>
          )}
          {previewUrl && !loading && !error && (
            <iframe
              title="Vista previa cotización PDF"
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function PdfViewerTitle({ payload }: { payload: QuotationPrintPayload | null }) {
  if (!payload) {
    return <p className="text-sm font-semibold text-gray-800 dark:text-white">Vista previa PDF</p>
  }
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
        {payload.quoteNumber} — {payload.title}
      </p>
      <p className="text-[11px] text-gray-500 dark:text-surface-400 font-mono truncate">
        {quotationPdfFileName(payload.quoteNumber)}
      </p>
    </div>
  )
}
