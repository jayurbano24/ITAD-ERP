'use client'

import { useState, useRef } from 'react'
import { X, Upload, Trash2, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'

type DestructionModalProps = {
    isOpen: boolean
    onClose: () => void
    selectedAssets: any[]
    onSuccess: () => void
}

export default function DestructionModal({ isOpen, onClose, selectedAssets, onSuccess }: DestructionModalProps) {
    const [photos, setPhotos] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [totalWeight, setTotalWeight] = useState('')
    const [step, setStep] = useState<'upload' | 'confirm' | 'success'>('upload')
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPhotos(prev => [...prev, ...Array.from(e.target.files!)])
        }
    }

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index))
    }

    const handleProcess = async () => {
        // Validate total weight
        if (!totalWeight || parseFloat(totalWeight) <= 0) {
            return alert('Debes ingresar el peso total (Lb) válido para el lote a destruir')
        }

        if (photos.length === 0) return alert('Debes cargar al menos una foto de evidencia')

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('assetIds', JSON.stringify(selectedAssets.map(a => a.id)))
            formData.append('totalWeight', totalWeight)
            photos.forEach(photo => {
                formData.append('photos', photo)
            })

            const response = await fetch('/api/inventario/bodega/process-destruction', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('Error al procesar la destrucción')
            }

            setStep('success')
        } catch (error) {
            console.error(error)
            alert('Ocurrió un error al procesar la destrucción')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-rose-950/30 border-b border-rose-900/20 p-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/20 rounded-xl">
                            <Trash2 className="w-8 h-8 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Procesar Destrucción</h3>
                            <p className="text-rose-200/70 text-sm mt-1">
                                {selectedAssets.length} equipos seleccionados para destrucción certificada
                            </p>
                        </div>
                    </div>
                    {!loading && step !== 'success' && (
                        <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'upload' && (
                        <div className="space-y-6">

                            <div className="bg-surface-950 rounded-xl p-4 border border-surface-800 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-surface-400 mb-2">Peso Total a Destruir (Lb)</label>
                                    <input
                                        type="number"
                                        min="0.1"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={totalWeight}
                                        onChange={(e) => setTotalWeight(e.target.value)}
                                        className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white focus:border-rose-500 outline-none font-mono text-lg"
                                    />
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wide">Equipos ({selectedAssets.length})</h4>
                                    <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                                        {selectedAssets.map(asset => (
                                            <div key={asset.id} className="flex justify-between items-center text-sm p-3 bg-surface-900 rounded-lg border border-surface-800/50">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-white text-xs">{asset.serial_number}</span>
                                                    <span className="text-surface-400 text-[10px]">{asset.model}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wide">Evidencia Fotográfica</h4>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-surface-700 hover:border-indigo-500 hover:bg-surface-800/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                                >
                                    <Upload className="w-10 h-10 text-surface-500 group-hover:text-indigo-400 mb-3 transition-colors" />
                                    <p className="text-surface-300 font-medium">Click para cargar fotos</p>
                                    <p className="text-surface-500 text-xs mt-1">Soporta JPG, PNG (Max 5MB)</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>

                                {photos.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                        {photos.map((photo, idx) => (
                                            <div key={idx} className="relative group bg-surface-950 rounded-lg p-2 border border-surface-800">
                                                <div className="aspect-square bg-surface-900 rounded flex items-center justify-center overflow-hidden mb-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={URL.createObjectURL(photo)}
                                                        alt="preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-surface-400 truncate">{photo.name}</p>
                                                <button
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <p className="text-sm text-amber-200/80">
                                    Esta acción es irreversible. Se generará un certificado de destrucción y los equipos marcados se descontarán del inventario activo.
                                </p>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleProcess}
                                    disabled={photos.length === 0 || loading}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {loading ? 'Procesando...' : (
                                        <>
                                            <Trash2 className="w-5 h-5" />
                                            Confirmar Destrucción
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-12 space-y-6">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">¡Proceso Completado!</h3>
                                <p className="text-surface-400">
                                    Se han procesado {selectedAssets.length} equipos correctamente.
                                </p>
                            </div>

                            <div className="flex justify-center gap-4 pt-6">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => {
                                        // Aquí idealmente redirigimos a una página de impresión o descargamos PDF
                                        // Por ahora solo cerramos y reload
                                        window.open(`/api/inventario/bodega/certificate?ids=${selectedAssets.map(a => a.id).join(',')}`, '_blank')
                                        onClose()
                                        onSuccess()
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                                >
                                    <FileText className="w-5 h-5" />
                                    Descargar Certificado
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
