'use client'

import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react'

type Props = {
  open: boolean
  quoteNumber?: string
  title?: string
  busy: boolean
  onClose: () => void
  onSave: (body: string, file: File | null) => void
}

export default function QuotationAvanceModal({
  open,
  quoteNumber,
  title = 'Registrar avance de aprobación',
  busy,
  onClose,
  onSave,
}: Props) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    clearFile()
    setText('')
    onClose()
  }

  const pickFile = (next: File | null) => {
    clearFile()
    if (!next || next.size === 0) return
    setFile(next)
    if (next.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(next))
    }
  }

  const handleSave = () => {
    onSave(text, file)
  }

  useEffect(() => {
    if (!open) return
    setText('')
    clearFile()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset al abrir
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 shadow-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
            {quoteNumber ? (
              <p className="text-xs text-gray-500 font-mono mt-0.5">{quoteNumber}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white"
          >
            Cerrar
          </button>
        </div>

        <div className="relative mb-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-white px-3 py-2 pr-12 text-sm text-gray-900 placeholder:text-gray-500 resize-y min-h-[100px]"
            placeholder="Estado del proceso de aprobación..."
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            title="Adjuntar foto o PDF"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-white shadow hover:bg-amber-700"
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>

        {file ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-500/10 px-3 py-2 flex items-start gap-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-14 w-14 rounded object-cover shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded bg-gray-200 flex items-center justify-center shrink-0">
                <ImageIcon className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-[10px] text-gray-500">Se subirá con el avance</p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="text-gray-500 hover:text-gray-800 p-1"
              aria-label="Quitar adjunto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-gray-500 mb-3">
            Use la flecha naranja para adjuntar captura, correo o PDF del proceso.
          </p>
        )}

        <button
          type="button"
          disabled={busy || (!text.trim() && !file)}
          onClick={handleSave}
          className="w-full rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2 text-sm font-semibold flex justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Guardar avance
        </button>
      </div>
    </div>
  )
}
