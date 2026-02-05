'use client'

import React, { useState } from 'react'
import { UploadCloud, X } from 'lucide-react'

interface CollectionGuideModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string
}

export const CollectionGuideModal: React.FC<CollectionGuideModalProps> = ({ isOpen, onClose, ticketId }) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0])
      setError(null)
      setSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo.')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('ticketId', ticketId)

    try {
      const response = await fetch('/api/logistica/guide', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar el archivo.')
      }

      setSuccess('Guía cargada exitosamente.')
      setFile(null)
      // Optionally, you can call a function to refresh the data
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 dark:bg-surface-950/80 backdrop-blur-sm px-4 py-8 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-[2.5rem] bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 shadow-2xl p-8 space-y-8 animate-in zoom-in-95 duration-200">
        <header className="flex items-center justify-between pb-6 border-b border-gray-50 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-xl">
              <UploadCloud className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Gestionar Recolección y Cargar Guía</h2>
              <p className="text-xs font-bold text-gray-500 dark:text-surface-400">Sube la guía de recolección con los detalles de los equipos.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="space-y-4">
          <div className="p-6 border-2 border-dashed border-gray-300 dark:border-surface-700 rounded-2xl text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-gray-100 dark:bg-surface-800 rounded-full">
                  <UploadCloud className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {file ? file.name : 'Haz clic para seleccionar un archivo'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">CSV, XLSX o XLS</p>
              </div>
            </label>
          </div>

          {file && (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              Tamaño: {(file.size / 1024).toFixed(2)} KB
            </div>
          )}

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          {success && <p className="text-sm text-green-500 text-center">{success}</p>}
        </div>

        <div className="flex items-center gap-4 pt-6 border-t border-gray-50 dark:border-surface-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-sm font-black rounded-2xl border border-gray-200 dark:border-surface-800 text-gray-500 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Cargando...' : 'Cargar Guía'}
          </button>
        </div>
      </div>
    </div>
  )
}
