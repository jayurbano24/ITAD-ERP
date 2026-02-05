import { createClient } from '@/lib/supabase/server'
import { useState } from 'react'
import Image from 'next/image'

export interface WipeEvidence {
  id: string
  asset_id: string
  type: 'photo' | 'xml' | 'pdf'
  file_name: string
  file_url: string
  content_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

interface EvidenceViewerProps {
  evidence: WipeEvidence[]
  assetSerialNumber?: string
  onClose?: () => void
}

export function EvidenceViewer({ evidence, assetSerialNumber, onClose }: EvidenceViewerProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<WipeEvidence | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const photos = evidence.filter((e) => e.type === 'photo')
  const documents = evidence.filter((e) => e.type === 'pdf' || e.type === 'xml')

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
    setSelectedEvidence(photos[currentIndex === 0 ? photos.length - 1 : currentIndex - 1])
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
    setSelectedEvidence(photos[currentIndex === photos.length - 1 ? 0 : currentIndex + 1])
  }

  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No hay evidencias registradas para este activo</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-slate-900 rounded-lg">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Evidencias de Borrado de Datos</h2>
          {assetSerialNumber && <p className="text-sm text-gray-400 mt-1">Serie: {assetSerialNumber}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Fotos */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Fotos ({photos.length})</h3>

          {selectedEvidence && selectedEvidence.type === 'photo' ? (
            <div className="space-y-4">
              {/* Visor de foto */}
              <div className="relative bg-black rounded-lg overflow-hidden h-96">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedEvidence.file_url}
                  alt={selectedEvidence.file_name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full text-gray-400">
                          <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p>No se pudo cargar la imagen</p>
                          <p class="text-sm mt-2">Usa el botón de descarga para ver el archivo</p>
                        </div>
                      `
                    }
                  }}
                />
              </div>

              {/* Navegación y botón de descarga */}
              <div className="flex justify-between items-center gap-4">
                {photos.length > 1 ? (
                  <>
                    <button
                      onClick={handlePrevious}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-400">
                      {currentIndex + 1} de {photos.length}
                    </span>
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                      Siguiente →
                    </button>
                  </>
                ) : (
                  <div className="flex-1"></div>
                )}
                <a
                  href={selectedEvidence.file_url}
                  download={selectedEvidence.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar
                </a>
              </div>

              {/* Info de la foto */}
              <div className="bg-slate-800 p-3 rounded text-sm text-gray-400">
                <p>
                  <strong>Archivo:</strong> {selectedEvidence.file_name}
                </p>
                <p>
                  <strong>Tamaño:</strong>{' '}
                  {selectedEvidence.file_size ? `${(selectedEvidence.file_size / 1024).toFixed(2)} KB` : 'N/A'}
                </p>
                <p>
                  <strong>Fecha:</strong> {new Date(selectedEvidence.created_at).toLocaleString()}
                </p>
                <p>
                  <strong>URL:</strong>{' '}
                  <a
                    href={selectedEvidence.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs break-all"
                  >
                    {selectedEvidence.file_url}
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="relative">
                  <button
                    onClick={() => {
                      setSelectedEvidence(photo)
                      setCurrentIndex(idx)
                    }}
                    className={`relative rounded overflow-hidden h-24 w-full border-2 transition-all ${selectedEvidence?.id === photo.id
                        ? 'border-blue-500'
                        : 'border-slate-700 hover:border-slate-600'
                      }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.file_url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex items-center justify-center h-full bg-slate-700">
                              <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          `
                        }
                      }}
                    />
                  </button>
                  <a
                    href={photo.file_url}
                    download={photo.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-1 right-1 p-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
                    title="Descargar"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documentos (PDF/XML) */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Documentos ({documents.length})</h3>

          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between bg-slate-800 p-4 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white font-bold">
                    {doc.type === 'pdf' ? 'PDF' : 'XML'}
                  </div>
                  <div className="text-sm">
                    <p className="text-white font-medium">{doc.file_name}</p>
                    <p className="text-gray-400 text-xs">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'N/A'} •{' '}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  Ver
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="bg-slate-800 p-4 rounded text-sm text-gray-400">
        <p>
          <strong>Total:</strong> {evidence.length} archivo(s) ({photos.length} foto(s), {documents.length}{' '}
          documento(s))
        </p>
      </div>
    </div>
  )
}
