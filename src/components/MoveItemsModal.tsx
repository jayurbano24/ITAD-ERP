'use client'

import { useState, useEffect } from 'react'
import { Warehouse, X, ArrowRight, Truck } from 'lucide-react'

type MoveItemsModalProps = {
    isOpen: boolean
    onClose: () => void
    selectedAssets: { id: string; serial_number: string | null }[]
    currentWarehouseCode?: string
    onMoveSuccess: () => void
}

const WAREHOUSES = [
    { code: 'BOD-REC', name: 'Bodega Recepción' },
    { code: 'BOD-REM', name: 'Bodega Remarketing' },
    { code: 'BOD-VAL', name: 'Bodega Valorización' },
    { code: 'BOD-HARV', name: 'Bodega Hardvesting' },
    { code: 'BOD-DES', name: 'Bodega Destrucción' }
]

export default function MoveItemsModal({ isOpen, onClose, selectedAssets, currentWarehouseCode, onMoveSuccess }: MoveItemsModalProps) {
    const [destination, setDestination] = useState('')
    const [reason, setReason] = useState('')
    const [correlative, setCorrelative] = useState('')
    const [fetchingCorrelative, setFetchingCorrelative] = useState(false)
    // Initialize with current date-time in local format for datetime-local input (YYYY-MM-DDThh:mm)
    const [transferDate, setTransferDate] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setFetchingCorrelative(true)
            fetch('/api/inventario/bodega/next-correlative')
                .then(res => res.json())
                .then(data => {
                    if (data.correlative) {
                        setCorrelative(data.correlative)
                    }
                })
                .catch(err => console.error('Error fetching correlative:', err))
                .finally(() => setFetchingCorrelative(false))
        }
    }, [isOpen])

    if (!isOpen) return null

    const availableWarehouses = WAREHOUSES.filter(w => w.code !== currentWarehouseCode)


    const handleMove = async () => {
        if (!destination) return alert('Selecciona una bodega de destino')

        setLoading(true)
        try {
            const response = await fetch('/api/inventario/bodega/move-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetIds: selectedAssets.map(a => a.id),
                    destinationWarehouseCode: destination,
                    reason,
                    correlative,
                    transferDate: transferDate ? new Date(transferDate).toISOString() : undefined
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Error al mover los equipos')
            }

            onMoveSuccess()
            onClose()
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error al realizar el traslado')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 rounded-xl">
                            <Truck className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Traslado de Bodega</h3>
                            <p className="text-surface-400 text-sm">Mover {selectedAssets.length} equipos seleccionados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Lista de Software/Hardware/Series a mover */}
                    <div className="bg-surface-950/50 rounded-xl p-3 border border-surface-800/50 max-h-32 overflow-y-auto">
                        <p className="text-xs font-semibold uppercase text-surface-500 mb-2 sticky top-0 bg-surface-950/50 backdrop-blur-sm -mx-3 -mt-3 p-2 border-b border-surface-800/50">
                            Equipos seleccionados ({selectedAssets.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {selectedAssets.map(asset => (
                                <span key={asset.id} className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
                                    {asset.serial_number || 'S/N'}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-surface-400 mb-2">Bodega Destino</label>
                        <div className="grid grid-cols-1 gap-2">
                            {availableWarehouses.map((wh) => (
                                <label
                                    key={wh.code}
                                    className={`
                    flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                    ${destination === wh.code
                                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                                            : 'bg-surface-950 border-surface-800 text-surface-400 hover:bg-surface-800'
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="destination"
                                            value={wh.code}
                                            checked={destination === wh.code}
                                            onChange={(e) => setDestination(e.target.value)}
                                            className="hidden"
                                        />
                                        <Warehouse className="w-4 h-4" />
                                        <span className="font-medium text-sm">{wh.name}</span>
                                    </div>
                                    {destination === wh.code && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-surface-400 mb-2">
                            Motivo del Traslado (Opcional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-surface-950 border border-surface-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
                            placeholder="Ej. Clasificación finalizada, enviado a destrucción..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-surface-400 mb-2">
                                Correlativo
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={correlative}
                                    readOnly
                                    disabled
                                    className="w-full bg-surface-900 border border-surface-700/50 rounded-xl p-3 text-sm text-surface-400 font-mono cursor-not-allowed focus:outline-none"
                                    placeholder="Generando..."
                                />
                                {fetchingCorrelative && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-surface-400 mb-2">
                                Fecha de Traslado
                            </label>
                            <input
                                type="datetime-local"
                                value={transferDate}
                                onChange={(e) => setTransferDate(e.target.value)}
                                className="w-full bg-surface-950 border border-surface-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>



                    <div className="flex gap-3 mt-6 pt-6 border-t border-surface-800">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleMove}
                            disabled={loading || !destination}
                            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Procesando...' : (
                                <>
                                    <span>Confirmar Traslado</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
