import React, { useState, useEffect } from 'react'
import { FileText, X, Save } from 'lucide-react'

interface ManifestModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: { manifestNumber: string; notes: string }) => void
    boxCount: number
    defaultManifestNumber?: string
}

export const ManifestModal: React.FC<ManifestModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    boxCount,
    defaultManifestNumber = ''
}) => {
    const [manifestNumber, setManifestNumber] = useState(defaultManifestNumber)
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (isOpen && defaultManifestNumber) {
            setManifestNumber(defaultManifestNumber)
        } else if (isOpen) {
            // Generate a default one if empty
            const date = new Date()
            const code = `MAN-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`
            setManifestNumber(code)
        }
    }, [isOpen, defaultManifestNumber])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#14161b] border border-[#2a2d36] rounded-[2.5rem] w-full max-w-lg p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">Generar Manifiesto</h3>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                {boxCount} {boxCount === 1 ? 'caja' : 'cajas'} para procesar
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                            Número de Manifiesto
                        </label>
                        <input
                            type="text"
                            value={manifestNumber}
                            onChange={(e) => setManifestNumber(e.target.value)}
                            className="w-full bg-[#1b1e24] border border-[#2a2d36] rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                            placeholder="MAN-2024..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                            Notas / Observaciones
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-[#1b1e24] border border-[#2a2d36] rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none"
                            placeholder="Comentarios adicionales para el manifiesto..."
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm({ manifestNumber, notes })}
                        disabled={!manifestNumber.trim()}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <Save size={18} />
                        Guardar y Generar PDF
                    </button>
                </div>
            </div>
        </div>
    )
}
