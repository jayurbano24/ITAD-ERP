'use client'

import { useState } from 'react'
import { Download, X, FileSpreadsheet } from 'lucide-react'

type Warehouse = {
    id: string
    code: string
    name: string
}

type Props = {
    warehouses: Warehouse[]
    currentFilters: {
        grade?: string
        search?: string
        warehouse?: string
    }
}

export default function ExcelExportButton({ warehouses, currentFilters }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedWarehouse, setSelectedWarehouse] = useState(currentFilters.warehouse || '')

    const handleDownload = () => {
        const params = new URLSearchParams()
        if (currentFilters.grade) params.set('grade', currentFilters.grade)
        if (currentFilters.search) params.set('search', currentFilters.search)
        if (selectedWarehouse) params.set('warehouse', selectedWarehouse)

        const url = `/dashboard/inventario/bodega/api/excel?${params.toString()}`
        window.open(url, '_blank')
        setIsOpen(false)
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-900 dark:border-surface-800 bg-gray-900 dark:bg-surface-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-gray-900/20 dark:shadow-black/40 transition-all hover:opacity-90 dark:hover:border-indigo-300"
            >
                <Download className="w-4 h-4" />
                Reporte Excel
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                Exportar Inventario
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-surface-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-surface-400 mb-2">
                                    Seleccionar Bodega
                                </label>
                                <select
                                    value={selectedWarehouse}
                                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                                >
                                    <option value="">Todas las bodegas</option>
                                    {warehouses.map(w => (
                                        <option key={w.code} value={w.code}>{w.name} ({w.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
                                <p className="text-xs text-blue-200">
                                    Se exportará el inventario filtrado por:
                                    {currentFilters.grade ? <span className="block">• Grado: {currentFilters.grade}</span> : null}
                                    {currentFilters.search ? <span className="block">• Búsqueda: &quot;{currentFilters.search}&quot;</span> : null}
                                    {!currentFilters.grade && !currentFilters.search && <span className="block">• Sin filtros adicionales</span>}
                                </p>
                            </div>

                            <button
                                onClick={handleDownload}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mt-4"
                            >
                                <Download className="w-4 h-4" />
                                Descargar Reporte
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
