'use client'

import { useRef, useState, useTransition } from 'react'
import {
  X,
  Shield,
  ShieldCheck,
  ShieldX,
  FileCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HardDrive,
  Trash2,
  Upload,
  FileText,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type WipeAsset,
  type WipeEvidenceType,
  type WipeSoftware,
  type WipeResult,
  certifyAsset,
  startWipeProcess
} from '../actions'

interface CertificationModalProps {
  isOpen: boolean
  onClose: () => void
  asset: WipeAsset
  onComplete: () => void
  mode: 'start' | 'certify'
}

// Configuración de software de borrado
const wipeSoftwareOptions: { value: WipeSoftware; label: string; description: string }[] = [
  {
    value: 'blancco',
    label: 'Blancco Drive Eraser',
    description: 'Certificado ADISA, aprobado por NIST'
  },
  {
    value: 'killdisk',
    label: 'KillDisk',
    description: 'Borrado DoD 5220.22-M'
  },
  {
    value: 'wipedrive',
    label: 'WipeDrive',
    description: 'Borrado seguro certificado'
  },
  {
    value: 'physical_destruction',
    label: 'Destrucción Física',
    description: 'Trituración/perforación del disco'
  },
  {
    value: 'other',
    label: 'Otro Software',
    description: 'Especificar en notas'
  },
]

// Configuración de resultados
const wipeResultOptions: { value: WipeResult; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  {
    value: 'success',
    label: 'Exitoso',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30'
  },
  {
    value: 'failed',
    label: 'Fallido',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30'
  },
  {
    value: 'partial',
    label: 'Parcial',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/30'
  },
]

function detectReportEvidenceType(file: File): WipeEvidenceType | null {
  const lowerName = file.name.toLowerCase()
  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  if (lowerName.endsWith('.xml') || ['text/xml', 'application/xml'].includes(file.type)) return 'xml'
  return null
}

export function CertificationModal({ isOpen, onClose, asset, onComplete, mode }: CertificationModalProps) {
  const [software, setSoftware] = useState<WipeSoftware | ''>('')
  const [externalReportId, setExternalReportId] = useState('')
  const [result, setResult] = useState<WipeResult>('success')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [reportFiles, setReportFiles] = useState<File[]>([])
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const reportInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleStartWipe = async () => {
    setError(null)

    startTransition(async () => {
      const { success, error: apiError } = await startWipeProcess(asset.id)

      if (success) {
        setIsSuccess(true)
        setTimeout(() => {
          onComplete()
        }, 2500) // Aumentado de 1000 a 2500ms para que el usuario pueda leer el mensaje
      } else {
        setError(apiError || 'Error al iniciar el borrado')
      }
    })
  }

  const handleCertify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!software) {
      setError('Selecciona el software utilizado')
      return
    }
    if (!externalReportId.trim()) {
      setError('El ID del reporte externo es obligatorio para cumplir R2v3')
      return
    }
    // Hacer reportFiles opcional - solo advertencia si no hay
    if (reportFiles.length === 0) {
      const confirmCertify = window.confirm(
        'No hay documento de reporte (PDF/XML) cargado. ¿Deseas continuar de todos modos?'
      )
      if (!confirmCertify) return
    }

    startTransition(async () => {
      try {
        if (photoFiles.length > 0) {
          setUploadProgress('Subiendo fotos de evidencia...')
          for (let i = 0; i < photoFiles.length; i++) {
            const photo = photoFiles[i]
            setUploadProgress(`Subiendo foto ${i + 1} de ${photoFiles.length}...`)

            const formData = new FormData()
            formData.append('file', photo)
            formData.append('assetId', asset.id)
            formData.append('type', 'photo')

            const response = await fetch('/api/wipe/upload-evidence', {
              method: 'POST',
              body: formData
            })

            const responseData = await response.json()

            if (!response.ok || !responseData.success) {
              throw new Error(`Error al subir foto ${i + 1}: ${responseData.error || 'Error desconocido'}`)
            }
          }
        }

        if (reportFiles.length > 0) {
          setUploadProgress('Subiendo documentos de reporte...')
          for (let i = 0; i < reportFiles.length; i++) {
            const reportFile = reportFiles[i]
            setUploadProgress(`Subiendo reporte ${i + 1} de ${reportFiles.length}...`)
            const evidenceType = detectReportEvidenceType(reportFile)
            if (!evidenceType) {
              throw new Error('Archivo de reporte inválido. Solo se aceptan PDF o XML.')
            }

            const formData = new FormData()
            formData.append('file', reportFile)
            formData.append('assetId', asset.id)
            formData.append('type', evidenceType)

            const response = await fetch('/api/wipe/upload-evidence', {
              method: 'POST',
              body: formData
            })

            const responseData = await response.json()

            if (!response.ok || !responseData.success) {
              throw new Error(`Error al subir reporte: ${responseData.error || 'Error desconocido'}`)
            }
          }
        }

        setUploadProgress('Finalizando certificación...')
        const { success, error: apiError } = await certifyAsset(
          asset.id,
          software as WipeSoftware,
          externalReportId.trim(),
          result,
          notes.trim() || undefined
        )

        if (success) {
          setIsSuccess(true)
          setPhotoFiles([])
          setReportFiles([])
          setUploadProgress('')
          if (photoInputRef.current) photoInputRef.current.value = ''
          if (reportInputRef.current) reportInputRef.current.value = ''
          setTimeout(() => {
            onComplete()
          }, 1500)
        } else {
          throw new Error(apiError || 'Error al certificar el borrado')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error procesando la evidencia'
        setError(message)
        setUploadProgress('')
        console.error('Error en certificación:', err)
      }
    })
  }

  // Modo "Iniciar Borrado"
  if (mode === 'start') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/50 dark:to-cyan-900/50 p-6 border-b border-gray-100 dark:border-surface-700 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
                  <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Iniciar Borrado</h2>
                  <p className="text-gray-500 dark:text-surface-400 text-sm">Comenzar proceso de sanitización</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Info del activo */}
            <div className="bg-gray-50 dark:bg-surface-800 rounded-xl p-4 mb-6 border border-gray-100 dark:border-surface-700 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <HardDrive className="w-5 h-5 text-gray-400 dark:text-surface-400" />
                <span className="font-mono text-gray-900 dark:text-white font-bold">{asset.internal_tag}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-surface-500 font-medium">Serial:</span>
                  <span className="text-gray-700 dark:text-surface-300 ml-2">{asset.serial_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-surface-500 font-medium">Tipo:</span>
                  <span className="text-gray-700 dark:text-surface-300 ml-2">{asset.asset_type}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-surface-500 font-medium">Equipo:</span>
                  <span className="text-gray-700 dark:text-surface-300 ml-2">{asset.manufacturer} {asset.model}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <ShieldX className="w-5 h-5 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {isSuccess ? (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-400" />
                  <div>
                    <p className="text-blue-400 font-medium">¡Proceso Iniciado!</p>
                    <p className="text-blue-400/70 text-sm">El equipo está listo para borrado</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-surface-800/50 rounded-lg">
                  <p className="text-surface-300 text-sm font-medium mb-2">Siguiente paso:</p>
                  <ol className="text-surface-400 text-sm space-y-1 list-decimal list-inside">
                    <li>Ejecuta el borrado con tu software certificado</li>
                    <li>Captura fotos del proceso</li>
                    <li>Busca nuevamente el equipo</li>
                    <li>Haz clic en &quot;Certificar&quot; para cargar evidencias</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-surface-400 text-sm">
                  Al iniciar, el estado del equipo cambiará a <span className="text-blue-400 font-medium">&quot;En Proceso&quot;</span>.
                  Procede a ejecutar el borrado con tu software certificado.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1 px-4 py-3 text-gray-500 dark:text-surface-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-colors font-bold text-sm uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleStartWipe}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <HardDrive className="w-5 h-5" />
                    )}
                    {isPending ? 'Iniciando...' : 'Iniciar Borrado'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Modo "Certificar"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 rounded-2xl w-full max-w-xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/50 dark:to-cyan-900/50 p-6 border-b border-gray-100 dark:border-surface-700 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Certificar Borrado</h2>
                <p className="text-gray-500 dark:text-surface-400 text-sm">Documentación R2v3 obligatoria</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info del activo */}
        <div className="px-6 py-4 bg-surface-850 border-b border-surface-700">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-surface-800 rounded-lg">
              <HardDrive className="w-5 h-5 text-surface-400" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-white font-medium">{asset.internal_tag}</p>
              <p className="text-sm text-surface-400">
                {asset.serial_number} • {asset.manufacturer} {asset.model}
              </p>
            </div>
            <div className="text-right">
              <p className="text-surface-400 text-sm">{asset.client_name}</p>
              <p className="text-xs text-surface-500">{asset.batch_code}</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleCertify} className="p-6 space-y-6">
          {uploadProgress && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="text-blue-400 font-medium">Procesando...</p>
                <p className="text-blue-400/70 text-sm">{uploadProgress}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <ShieldX className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-medium">¡Borrado Certificado!</p>
                <p className="text-emerald-400/70 text-sm">Registro guardado en audit log</p>
              </div>
            </div>
          )}

          {/* Software utilizado */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-surface-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Software Utilizado <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={software}
                onChange={(e) => setSoftware(e.target.value as WipeSoftware)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-surface-800 border border-gray-100 dark:border-surface-700 rounded-xl 
                         text-gray-900 dark:text-white appearance-none cursor-pointer font-bold
                         focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                required
              >
                <option value="">Seleccionar software...</option>
                {wipeSoftwareOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-surface-500 pointer-events-none" />
            </div>
          </div>

          {/* ID del Reporte Externo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-300 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              ID de Reporte / Licencia Externo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={externalReportId}
              onChange={(e) => setExternalReportId(e.target.value)}
              placeholder="Ej: BLC-2025-0001234, KD-A1B2C3, PHYS-001"
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white placeholder-surface-500 font-mono
                       focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              required
            />
            <p className="text-xs text-surface-500">
              Este ID debe coincidir con el reporte generado por {software ? wipeSoftwareOptions.find(s => s.value === software)?.label : 'el software de borrado'}
            </p>
          </div>

          {/* Evidencia fotográfica y documental */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-300 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                Fotos de evidencia <span className="text-amber-400">(Opcional)</span>
              </label>
              <div className="relative">
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || [])
                    if (files.length > 5) {
                      setError('Máximo 5 fotos permitidas. Solo se cargarán las primeras 5.')
                      setPhotoFiles(files.slice(0, 5))
                    } else {
                      setError(null)
                      setPhotoFiles(files)
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={cn(
                  "border-2 border-dashed rounded-xl px-4 py-6 text-center transition-all",
                  photoFiles.length >= 5
                    ? "border-emerald-500 bg-emerald-500/10"
                    : photoFiles.length > 0
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-surface-700 bg-surface-800 hover:border-surface-600"
                )}>
                  <FileText className="w-6 h-6 text-surface-400 mx-auto mb-2" />
                  {photoFiles.length > 0 ? (
                    <p className="text-sm text-emerald-300 font-medium">
                      {photoFiles.length} de 5 foto{photoFiles.length > 1 ? 's' : ''} cargada{photoFiles.length > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-surface-400">Arrastra aquí o haz clic para subir fotos</p>
                      <p className="text-xs text-surface-500 mt-1">Máximo 5 fotos, formatos JPG/PNG recomendados</p>
                    </>
                  )}
                </div>
              </div>
              {photoFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {photoFiles.map((file, idx) => (
                      <button
                        key={`${file.name}-${file.lastModified}`}
                        type="button"
                        onClick={() => {
                          const reader = new FileReader()
                          reader.onload = (e) => {
                            setSelectedPhotoPreview(e.target?.result as string)
                            setCurrentPhotoIndex(idx)
                          }
                          reader.readAsDataURL(file)
                        }}
                        className="p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors text-xs font-medium flex items-center justify-center min-h-[40px]"
                      >
                        📷 {idx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFiles([])
                      if (photoInputRef.current) photoInputRef.current.value = ''
                    }}
                    className="text-xs text-red-400 hover:text-red-200"
                  >
                    Limpiar todas
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Documento del reporte (PDF / XML) <span className="text-yellow-500 text-xs">(Opcional)</span>
              </label>
              <div className="relative">
                <input
                  ref={reportInputRef}
                  type="file"
                  multiple
                  accept=".xml,.pdf,application/xml,application/pdf"
                  onChange={(event) => setReportFiles(Array.from(event.target.files || []))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={cn(
                  "border-2 border-dashed rounded-xl px-4 py-6 text-center transition-all",
                  reportFiles.length > 0
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-surface-700 bg-surface-800 hover:border-surface-600"
                )}>
                  <FileText className="w-6 h-6 text-surface-400 mx-auto mb-2" />
                  {reportFiles.length > 0 ? (
                    <p className="text-sm text-emerald-300 font-medium">
                      {reportFiles.length} archivo{reportFiles.length > 1 ? 's' : ''} listo{reportFiles.length > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-surface-400">Arrastra aquí o haz clic para subir el reporte</p>
                      <p className="text-xs text-surface-500 mt-1">Opcional: PDFs firmados o XML exportados por el software de borrado</p>
                    </>
                  )}
                </div>
              </div>
              {reportFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-surface-400">
                  {reportFiles.map((file) => (
                    <span key={`${file.name}-${file.lastModified}`} className="px-3 py-1 bg-surface-800 rounded-full border border-surface-700">
                      {file.name}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setReportFiles([])
                      if (reportInputRef.current) reportInputRef.current.value = ''
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-200"
                  >
                    Limpiar
                  </button>
                </div>
              )}
              <p className="text-xs text-surface-500">
                El documento debe reflejar el ID que estás registrando arriba y puede ser PDF o XML.
              </p>
            </div>

            {(asset.photoEvidenceCount > 0 || asset.xmlEvidenceCount > 0 || asset.pdfEvidenceCount > 0) && (
              <div className="px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-xs text-surface-400">
                Evidencia cargada previamente: {asset.photoEvidenceCount} foto{asset.photoEvidenceCount === 1 ? '' : 's'} · {asset.xmlEvidenceCount} XML{asset.xmlEvidenceCount === 1 ? '' : 's'} · {asset.pdfEvidenceCount} PDF{asset.pdfEvidenceCount === 1 ? '' : 's'}
              </div>
            )}
          </div>

          {/* Resultado */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-surface-300">
              Resultado del Borrado
            </label>
            <div className="flex gap-3">
              {wipeResultOptions.map((option) => {
                const Icon = option.icon
                const isSelected = result === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setResult(option.value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                      isSelected ? option.bg : "bg-surface-800 border-surface-700 hover:border-surface-600"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isSelected ? option.color : "text-surface-500")} />
                    <span className={cn("font-medium", isSelected ? option.color : "text-surface-400")}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {result === 'failed' && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                El activo volverá a estado &quot;pendiente&quot; para reintento o destrucción física
              </p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-300">
              Notas / Observaciones
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sectores defectuosos, método específico utilizado, observaciones..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white placeholder-surface-500 resize-none
                       focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending || isSuccess}
              className="px-5 py-2.5 text-surface-300 hover:text-white hover:bg-surface-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || isSuccess}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 
                       text-white font-semibold rounded-xl transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Certificando...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  ¡Certificado!
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Certificar Borrado
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de previsualización de fotos */}
      {selectedPhotoPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedPhotoPreview(null)}
          />
          <div className="relative bg-surface-900 border border-surface-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-surface-800 border-b border-surface-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Foto {currentPhotoIndex + 1} de {photoFiles.length}
              </h3>
              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagen */}
            <div className="bg-black p-6 flex items-center justify-center min-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhotoPreview}
                alt={`Foto ${currentPhotoIndex + 1}`}
                className="max-w-full max-h-[calc(80vh-200px)] object-contain rounded-lg"
              />
            </div>

            {/* Info y navegación */}
            <div className="bg-surface-800 border-t border-surface-700 px-6 py-4 space-y-4">
              {/* Info del archivo */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500">Nombre:</p>
                  <p className="text-white font-mono">{photoFiles[currentPhotoIndex]?.name}</p>
                </div>
                <div>
                  <p className="text-surface-500">Tamaño:</p>
                  <p className="text-white">
                    {photoFiles[currentPhotoIndex] &&
                      `${(photoFiles[currentPhotoIndex].size / 1024).toFixed(2)} KB`
                    }
                  </p>
                </div>
              </div>

              {/* Navegación */}
              {photoFiles.length > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      const newIndex = currentPhotoIndex === 0 ? photoFiles.length - 1 : currentPhotoIndex - 1
                      setCurrentPhotoIndex(newIndex)
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        setSelectedPhotoPreview(e.target?.result as string)
                      }
                      reader.readAsDataURL(photoFiles[newIndex])
                    }}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors text-sm"
                  >
                    ← Anterior
                  </button>
                  <span className="text-surface-400 text-sm">
                    {currentPhotoIndex + 1} / {photoFiles.length}
                  </span>
                  <button
                    onClick={() => {
                      const newIndex = currentPhotoIndex === photoFiles.length - 1 ? 0 : currentPhotoIndex + 1
                      setCurrentPhotoIndex(newIndex)
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        setSelectedPhotoPreview(e.target?.result as string)
                      }
                      reader.readAsDataURL(photoFiles[newIndex])
                    }}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
