'use client'

import { Loader2, X } from 'lucide-react'

type Summary = {
  ticketLabel: string
  expectedFromReceipt: number
  scanned: number
  missingExpected: number
  additionalReceived: number
  additionalEmpty: number
  receiptAttachmentUrl?: string | null
}

type Props = {
  open: boolean
  summary: Summary
  missingNotes: string
  additionalNotes: string
  generalNotes: string
  onMissingNotesChange: (v: string) => void
  onAdditionalNotesChange: (v: string) => void
  onGeneralNotesChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  submitting?: boolean
}

export function ReceptionCloseConfirmModal({
  open,
  summary,
  missingNotes,
  additionalNotes,
  generalNotes,
  onMissingNotesChange,
  onAdditionalNotesChange,
  onGeneralNotesChange,
  onConfirm,
  onCancel,
  submitting,
}: Props) {
  if (!open) return null

  const missingRequired = summary.missingExpected > 0
  const additionalRequired = summary.additionalReceived > 0
  const canSubmit =
    (!missingRequired || missingNotes.trim().length > 0) &&
    (!additionalRequired || additionalNotes.trim().length > 0) &&
    summary.scanned > 0

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-surface-800">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
              Cerrar recepción
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{summary.ticketLabel}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-gray-50 dark:bg-surface-950 p-3 border border-gray-100 dark:border-surface-800">
              <p className="text-gray-500 uppercase font-bold text-[9px]">Cupos del recibo</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">
                {summary.expectedFromReceipt}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 border border-emerald-100 dark:border-emerald-500/20">
              <p className="text-emerald-700 dark:text-emerald-300 uppercase font-bold text-[9px]">
                Series capturadas
              </p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{summary.scanned}</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 border border-amber-100 dark:border-amber-500/20">
              <p className="text-amber-800 dark:text-amber-300 uppercase font-bold text-[9px]">Faltan (recibo)</p>
              <p className="text-lg font-black text-amber-800 dark:text-amber-300">{summary.missingExpected}</p>
            </div>
            <div className="rounded-xl bg-cyan-50 dark:bg-cyan-500/10 p-3 border border-cyan-100 dark:border-cyan-500/20">
              <p className="text-cyan-800 dark:text-cyan-300 uppercase font-bold text-[9px]">
                Adicionales recibidos
              </p>
              <p className="text-lg font-black text-cyan-800 dark:text-cyan-300">
                {summary.additionalReceived}
              </p>
            </div>
          </div>

          {summary.receiptAttachmentUrl ? (
            <a
              href={summary.receiptAttachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] font-bold uppercase tracking-wide text-indigo-600 hover:text-indigo-500"
            >
              Ver Receipt of Equipment adjunto al ticket
            </a>
          ) : null}

          {missingRequired ? (
            <label className="block">
              <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                Comentarios — equipos faltantes del recibo *
              </span>
              <textarea
                value={missingNotes}
                onChange={(e) => onMissingNotesChange(e.target.value)}
                rows={3}
                placeholder="Indique qué series/equipos del recibo no se entregaron y el motivo…"
                className="mt-1 w-full rounded-xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-surface-950 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </label>
          ) : null}

          {additionalRequired ? (
            <label className="block">
              <span className="text-[10px] font-black uppercase text-cyan-700 dark:text-cyan-400">
                Comentarios — equipos adicionales *
              </span>
              <textarea
                value={additionalNotes}
                onChange={(e) => onAdditionalNotesChange(e.target.value)}
                rows={3}
                placeholder="Describa los equipos extra recibidos (marca/modelo/serie) no listados en el recibo…"
                className="mt-1 w-full rounded-xl border border-cyan-200 dark:border-cyan-500/30 bg-white dark:bg-surface-950 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </label>
          ) : null}

          {!missingRequired && !additionalRequired ? (
            <p className="text-[11px] text-gray-500">
              Cupos del recibo completos. Puede agregar una nota general antes de enviar a bodega.
            </p>
          ) : null}

          <label className="block">
            <span className="text-[10px] font-bold uppercase text-gray-500">Notas generales (opcional)</span>
            <textarea
              value={generalNotes}
              onChange={(e) => onGeneralNotesChange(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </label>

          {summary.additionalEmpty > 0 ? (
            <p className="text-[10px] text-amber-600">
              Hay {summary.additionalEmpty} cupo(s) adicional(es) vacío(s); se eliminarán al cerrar.
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-surface-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase text-gray-600 bg-gray-100 dark:bg-surface-800"
          >
            Volver al pistoleo
          </button>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Completar → Bodega
          </button>
        </div>
      </div>
    </div>
  )
}