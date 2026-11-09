'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  GitBranchPlus,
  Loader2,
  ExternalLink,
  ThumbsUp,
  Upload,
  Trash2,
  Download,
  Eye,
  Percent,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuotationComment, QuotationStatus, SalesQuotation } from '../actions'
import {
  addQuotationComment,
  addQuotationApprovalAdvance,
  updateQuotationDiscount,
  approveQuotation,
  rejectQuotation,
  acceptQuotation,
  deleteQuotation,
} from '../actions'
import {
  QUOTATION_STATUS_STYLES,
  formatQuotationStatus,
} from '@/lib/ventas/quotationStatus'
import {
  buildQuotationPrintPayload,
  downloadQuotationPdf,
  type QuotationPrintPayload,
} from '@/lib/ventas/printQuotationPdf'
import type { QuotationTotalsView } from '@/lib/ventas/quotationIva'
import QuotationPdfViewerModal from '../components/QuotationPdfViewerModal'
import QuotationAvanceModal from '../components/QuotationAvanceModal'
import { QuotationAvanceListItem } from '../components/QuotationAvanceListItem'
import QuotationDiscountModal, {
  type DiscountFormValue,
} from '../components/QuotationDiscountModal'

const fieldClass =
  'w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 mb-3'

type Props = {
  quotation: SalesQuotation
  initialComments: QuotationComment[]
  includesIva: boolean
  iva: QuotationTotalsView
}

export default function QuotationDetailClient({
  quotation,
  initialComments,
  includesIva,
  iva,
}: Props) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [commentText, setCommentText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSeguimiento, setShowSeguimiento] = useState(false)
  const [showAvance, setShowAvance] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveFile, setApproveFile] = useState<File | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewPayload, setPdfPreviewPayload] = useState<QuotationPrintPayload | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  const status = quotation.status as QuotationStatus

  const refresh = () => router.refresh()

  const seguimiento = comments.filter((c) => c.comment_type !== 'avance_aprobacion')
  const avances = comments.filter((c) => c.comment_type === 'avance_aprobacion')

  const handleAddComment = async () => {
    setBusy(true)
    setError(null)
    const res = await addQuotationComment(quotation.id, commentText)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'Error')
      return
    }
    setCommentText('')
    setShowSeguimiento(false)
    refresh()
  }

  const handleDiscountSave = async (payload: DiscountFormValue) => {
    setBusy(true)
    setError(null)
    const res = await updateQuotationDiscount(quotation.id, payload)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'No se pudo guardar el descuento')
      return
    }
    setShowDiscount(false)
    refresh()
  }

  const handleAddAvance = async (body: string, file: File | null) => {
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.set('quotationId', quotation.id)
    fd.set('body', body)
    if (file) fd.set('attachment', file)
    const res = await addQuotationApprovalAdvance(fd)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'Error')
      return
    }
    setShowAvance(false)
    refresh()
  }

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approveFile) {
      setError('Seleccione PDF o imagen')
      return
    }
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.set('quotationId', quotation.id)
    fd.set('attachment', approveFile)
    const res = await approveQuotation(fd)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'Error al aprobar')
      return
    }
    setShowApprove(false)
    refresh()
  }

  const handleReject = async () => {
    setBusy(true)
    setError(null)
    const res = await rejectQuotation(quotation.id, rejectReason)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'Error')
      return
    }
    setShowReject(false)
    refresh()
  }

  const handleAccept = async () => {
    setBusy(true)
    const res = await acceptQuotation(quotation.id)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'Error')
      return
    }
    refresh()
  }

  const buildPdfPayload = () => buildQuotationPrintPayload(quotation, includesIva, iva)

  const handleViewPdf = () => {
    setError(null)
    setPdfPreviewPayload(buildPdfPayload())
    setPdfPreviewOpen(true)
  }

  const handleDownloadPdf = async () => {
    setPdfBusy(true)
    setError(null)
    try {
      await downloadQuotationPdf(buildPdfPayload())
    } catch {
      setError('No se pudo generar el PDF')
    } finally {
      setPdfBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    const res = await deleteQuotation(quotation.id)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'No se pudo eliminar')
      return
    }
    setShowDelete(false)
    router.push('/dashboard/ventas/cotizaciones')
    router.refresh()
  }

  return (
    <div className="space-y-4 print:hidden">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'text-xs font-bold uppercase px-2.5 py-1 rounded border',
            QUOTATION_STATUS_STYLES[status]
          )}
        >
          {formatQuotationStatus(status)}
        </span>
        <button
          type="button"
          onClick={handleViewPdf}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 dark:border-indigo-500/50 text-indigo-800 dark:text-indigo-200 px-3 py-1.5 text-sm font-semibold bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100"
        >
          <Eye className="w-4 h-4" />
          Ver PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfBusy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/60 text-emerald-800 dark:text-emerald-200 px-3 py-1.5 text-sm font-semibold bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 disabled:opacity-60"
        >
          {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descargar PDF
        </button>
        <button
          type="button"
          onClick={() => setShowSeguimiento(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 text-sm font-semibold bg-indigo-50 dark:bg-indigo-500/10"
        >
          <MessageSquare className="w-4 h-4" />
          Seguimiento
        </button>
        {(status === 'pendiente_aprobacion' || status === 'aprobada') && (
          <button
            type="button"
            onClick={() => {
              setError(null)
              setShowDiscount(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400 text-violet-900 dark:text-violet-200 px-3 py-1.5 text-sm font-semibold bg-violet-50 dark:bg-violet-500/15"
          >
            <Percent className="w-4 h-4" />
            Descuento
          </button>
        )}
        {status === 'pendiente_aprobacion' && (
          <button
            type="button"
            onClick={() => {
              setError(null)
              setShowAvance(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 text-amber-900 dark:text-amber-200 px-3 py-1.5 text-sm font-semibold bg-amber-50 dark:bg-amber-500/15"
          >
            <GitBranchPlus className="w-4 h-4" />
            Avance aprobación
          </button>
        )}
        {status === 'pendiente_aprobacion' && (
          <>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowApprove(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold"
            >
              <CheckCircle className="w-4 h-4" />
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowReject(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm font-semibold"
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </button>
          </>
        )}
        {status === 'aprobada' && (
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-semibold"
          >
            <ThumbsUp className="w-4 h-4" />
            Marcar aceptada
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null)
            setShowDelete(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-1.5 text-sm font-semibold"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      {status === 'rechazada' && quotation.rejection_reason && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50/80 dark:bg-red-500/10 p-3">
          <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase">Motivo de rechazo</p>
          <p className="text-sm text-red-900 dark:text-red-200 mt-1 whitespace-pre-wrap">
            {quotation.rejection_reason}
          </p>
        </div>
      )}

      {(status === 'aprobada' || status === 'aceptada') && quotation.approved_attachment_url && (
        <div className="rounded-lg border border-gray-200 dark:border-surface-700 p-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Documento aprobado</p>
            <p className="text-xs text-gray-500">{quotation.approved_attachment_name}</p>
          </div>
          <a
            href={quotation.approved_attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium"
          >
            Ver archivo <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <section className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5 p-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Avances de aprobación</h2>
        {avances.length === 0 ? (
          <p className="text-sm text-gray-500">Sin avances registrados.</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {avances.map((c) => (
              <QuotationAvanceListItem key={c.id} comment={c} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Seguimiento general</h2>
        {seguimiento.length === 0 ? (
          <p className="text-sm text-gray-500">Sin comentarios aún.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {seguimiento.map((c) => (
              <li
                key={c.id}
                className="rounded-lg bg-gray-50 dark:bg-surface-800 px-3 py-2 text-sm"
              >
                <p className="text-gray-900 dark:text-surface-100 whitespace-pre-wrap">{c.body}</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {c.author?.full_name || 'Usuario'} ·{' '}
                  {new Date(c.created_at).toLocaleString('es-GT')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <QuotationAvanceModal
        open={showAvance}
        busy={busy}
        onClose={() => setShowAvance(false)}
        onSave={handleAddAvance}
      />

      <QuotationDiscountModal
        open={showDiscount}
        quoteNumber={quotation.quote_number}
        initialPercent={quotation.discount_percent ?? 0}
        initialAmount={quotation.discount_amount ?? 0}
        initialNote={quotation.discount_note}
        busy={busy}
        onClose={() => setShowDiscount(false)}
        onSave={handleDiscountSave}
      />

      {showSeguimiento && (
        <Modal title="Agregar comentario de seguimiento" onClose={() => setShowSeguimiento(false)}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={4}
            className={fieldClass}
            placeholder="Nota para el equipo..."
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleAddComment}
            className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-semibold flex justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Guardar comentario
          </button>
        </Modal>
      )}

      {showApprove && (
        <Modal title="Aprobar cotización" onClose={() => setShowApprove(false)}>
          <p className="text-sm text-gray-600 dark:text-surface-400 mb-3">
            Adjunte el PDF o la foto de la cotización ya aprobada por el cliente o gerencia.
          </p>
          <form onSubmit={handleApprove} className="space-y-3">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-surface-600 rounded-lg p-6 cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                {approveFile ? approveFile.name : 'PDF o imagen'}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={(e) => setApproveFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-emerald-600 text-white py-2 text-sm font-semibold"
            >
              Confirmar aprobación
            </button>
          </form>
        </Modal>
      )}

      {showDelete && (
        <Modal title="Eliminar cotización" onClose={() => setShowDelete(false)}>
          <p className="text-sm text-gray-700 dark:text-surface-300 mb-3">
            ¿Eliminar <span className="font-mono font-semibold">{quotation.quote_number}</span>? Se
            borrarán líneas, comentarios y avances. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDelete(false)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-semibold flex justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Eliminar
            </button>
          </div>
        </Modal>
      )}

      {showReject && (
        <Modal title="Rechazar cotización" onClose={() => setShowReject(false)}>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            required
            className={fieldClass}
            placeholder="Motivo del rechazo..."
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleReject}
            className="w-full rounded-lg bg-red-600 text-white py-2 text-sm font-semibold"
          >
            Confirmar rechazo
          </button>
        </Modal>
      )}

      <QuotationPdfViewerModal
        open={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false)
          setPdfPreviewPayload(null)
        }}
        payload={pdfPreviewPayload}
      />
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
