'use client'

import { useState, useEffect } from 'react'
import { X, Truck, FileText, Check, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'

type Client = {
    id: string
    commercial_name: string
}

type DestructionDispatchModalProps = {
    isOpen: boolean
    onClose: () => void
    selectedAssetIds: string[]
    onConfirm: () => void
    selectedAssets: {
        manufacturer: string | null
        model: string | null
        asset_type: string | null
        serial_number: string | null
    }[]
}

export default function DestructionDispatchModal({
    isOpen,
    onClose,
    selectedAssetIds,
    onConfirm,
    selectedAssets
}: DestructionDispatchModalProps) {
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClient, setSelectedClient] = useState('')
    const [driverName, setDriverName] = useState('')
    const [vehiclePlate, setVehiclePlate] = useState('')
    const [totalWeight, setTotalWeight] = useState('')
    const [generateCertificate, setGenerateCertificate] = useState(true)
    const [loading, setLoading] = useState(false)
    const [fetchingClients, setFetchingClients] = useState(true)
    const [dispatchResult, setDispatchResult] = useState<{ id: string, code: string, count: number } | null>(null)
    const [errorMessage, setErrorMessage] = useState('')

    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        if (isOpen) {
            setDispatchResult(null)
            setTotalWeight('')
            setDriverName('')
            setVehiclePlate('')
            setSelectedClient('')
            const fetchClients = async () => {
                setFetchingClients(true)
                const { data, error } = await supabase
                    .from('crm_entities')
                    .select('id, commercial_name')
                    .eq('entity_type', 'client')
                    .eq('is_active', true)
                    .order('commercial_name')

                if (data) setClients(data)
                setFetchingClients(false)
            }
            fetchClients()
        }
    }, [isOpen, supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedClient || !driverName || !vehiclePlate || !totalWeight) {
            toast.error('Campos incompletos', 'Por favor completa todos los campos requeridos para continuar 😊')
            return
        }

        const weight = parseFloat(totalWeight)
        if (isNaN(weight) || weight <= 0) {
            toast.warning('Peso inválido', 'El peso debe ser mayor a 0 para generar la salida ⚖️')
            return
        }

        setErrorMessage('')
        setLoading(true)
        try {
            const response = await fetch('/api/inventario/bodega/dispatch-destruction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetIds: selectedAssetIds,
                    clientId: selectedClient,
                    driverName,
                    vehiclePlate,
                    totalWeight: weight,
                    generateCertificate
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Error al procesar la salida')
            }

            setDispatchResult({
                id: result.dispatch_id,
                code: result.dispatch_code,
                count: result.count
            })
            // Don't close immediately. Show success view.
        } catch (error: any) {
            console.error(error)
            setErrorMessage(error.message || 'Error desconocido')
            toast.error('Ocurrió un error', `No pudimos procesar la salida: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleFinish = () => {
        onConfirm()
        window.location.reload()
    }

    if (!isOpen) return null

    // SUCCESS VIEW
    if (dispatchResult) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-lg bg-[#1a1b2e] border border-green-500/30 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300 text-center">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                        <Check className="w-10 h-10 text-green-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">¡Salida Exitosa!</h2>
                    <p className="text-gray-400 mb-6">
                        Se ha generado correctamente el despacho y los equipos han sido procesados.
                    </p>

                    <div className="bg-[#151624] rounded-xl p-4 mb-8 border border-gray-700">
                        <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">Código de Despacho</p>
                        <p className="text-3xl font-mono font-bold text-green-400">{dispatchResult.code}</p>
                    </div>

                    <div className="space-y-3">
                        <a
                            href={`/api/inventario/bodega/dispatch-pdf?dispatchId=${dispatchResult.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 w-full flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Download className="w-5 h-5" />
                            Descargar Documento
                        </a>

                        <button
                            onClick={handleFinish}
                            className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/20 w-full hover:scale-105 active:scale-95"
                        >
                            Aceptar y Finalizar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#1a1b2e] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 bg-[#151624] border-b border-indigo-500/20 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Truck className="w-6 h-6 text-purple-400" />
                        Salida de Bodega de Destrucción
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {errorMessage && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                            <div className="p-1 bg-red-500/20 rounded-full">
                                <X className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-400">Error al procesar</h4>
                                <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
                            </div>
                        </div>
                    )}


                    {/* Resumen */}
                    <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-indigo-300 font-medium">Equipos Seleccionados</p>
                            <p className="text-2xl font-bold text-white font-mono">{selectedAssetIds.length}</p>
                        </div>
                        <div className="h-10 w-10 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
                            <Check className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>

                    <div className="grid gap-6">
                        {/* Destino (Read Only) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Destino</label>
                            <div className="w-full bg-[#151624] border border-gray-700 rounded-lg px-4 py-3 text-gray-300 font-medium cursor-not-allowed flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Almacén de Destrucción / Scraps
                            </div>
                        </div>

                        {/* Cliente */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Cliente / Proyecto</label>
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="w-full bg-[#24263a] border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                disabled={fetchingClients}
                            >
                                <option value="">Seleccione un cliente...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.commercial_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Transporte */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nombre del Chofer</label>
                                <input
                                    type="text"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    placeholder="Ej. Juan Pérez"
                                    className="w-full bg-[#24263a] border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Placa del Vehículo</label>
                                <input
                                    type="text"
                                    value={vehiclePlate}
                                    onChange={(e) => setVehiclePlate(e.target.value)}
                                    placeholder="Ej. P-123XYZ"
                                    className="w-full bg-[#24263a] border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-mono"
                                />
                            </div>
                        </div>

                        {/* Certificado Toggle */}
                        <div className="flex items-center justify-between bg-[#24263a] p-4 rounded-xl border border-gray-700/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Emitir Certificado de Destrucción</p>
                                    <p className="text-xs text-gray-400">Generar documento PDF automáticamente</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={generateCertificate}
                                    onChange={(e) => setGenerateCertificate(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {/* Peso Total a Destruir */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Peso Total a Destruir (Lb)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={totalWeight}
                                onChange={(e) => setTotalWeight(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-[#24263a] border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-mono"
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Truck className="w-4 h-4" />
                                    Confirmar Salida
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tabla Resumen de Equipos */}
                    <div className="border border-gray-700 rounded-xl overflow-hidden bg-[#151624] mt-4">
                        <div className="bg-[#1a1b2e] px-4 py-2 border-b border-gray-700">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Detalle de Equipos</h3>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-[#1a1b2e] text-xs uppercase text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Marca</th>
                                        <th className="px-4 py-2 font-medium">Modelo</th>
                                        <th className="px-4 py-2 font-medium">Tipo</th>
                                        <th className="px-4 py-2 font-medium">Serie</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {selectedAssets.map((asset, idx) => (
                                        <tr key={idx} className="hover:bg-[#24263a] transition-colors">
                                            <td className="px-4 py-2">{asset.manufacturer || '-'}</td>
                                            <td className="px-4 py-2">{asset.model || '-'}</td>
                                            <td className="px-4 py-2">{asset.asset_type || '-'}</td>
                                            <td className="px-4 py-2 font-mono text-purple-400">{asset.serial_number || 'S/N'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
