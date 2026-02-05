'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Wrench,
  Search,
  Laptop,
  Smartphone,
  Monitor,
  Server,
  Package,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createWorkOrder } from '../actions'

// Mapeo de iconos por tipo
const assetTypeIcons: Record<string, React.ElementType> = {
  laptop: Laptop,
  desktop: Monitor,
  smartphone: Smartphone,
  tablet: Smartphone,
  server: Server,
  other: Package,
}

interface Asset {
  id: string
  internal_tag: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string
  status: string
  batch_code?: string | null
  client_name?: string | null
}

interface NewWorkOrderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewWorkOrderModal({ isOpen, onClose }: NewWorkOrderModalProps) {
  const router = useRouter()

  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [reportedIssue, setReportedIssue] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cargar activos disponibles
  useEffect(() => {
    if (isOpen) {
      loadAssets()
    }
  }, [isOpen])

  const loadAssets = async () => {
    setIsLoadingAssets(true)
    try {
      const response = await fetch('/api/assets/available')
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
        setFilteredAssets(data)
      }
    } catch (err) {
      console.error('Error loading assets:', err)
      // Fallback: cargar desde la página
      setAssets([])
      setFilteredAssets([])
    }
    setIsLoadingAssets(false)
  }

  // Filtrar activos
  useEffect(() => {
    if (!searchQuery) {
      setFilteredAssets(assets)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = assets.filter((asset) => {
      const batchCode = asset.batch_code?.toLowerCase() ?? ''
      const clientName = asset.client_name?.toLowerCase() ?? ''
      return (
        asset.internal_tag?.toLowerCase().includes(query) ||
        asset.serial_number?.toLowerCase().includes(query) ||
        asset.manufacturer?.toLowerCase().includes(query) ||
        asset.model?.toLowerCase().includes(query) ||
        batchCode.includes(query) ||
        clientName.includes(query)
      )
    })
    setFilteredAssets(filtered)
  }, [searchQuery, assets])

  // Crear orden
  const handleCreate = async () => {
    if (!selectedAsset) {
      setError('Selecciona un activo')
      return
    }

    if (!reportedIssue.trim()) {
      setError('Describe el problema reportado')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await createWorkOrder(selectedAsset.id, reportedIssue)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        // Mantener al usuario en el tablero (diseño del listado /dashboard/taller)
        // En vez de enviar al detalle (/dashboard/taller/[id]) que tiene otro diseño.
        router.replace('/dashboard/taller')
        router.refresh()
        onClose()
      }, 1000)
    } else {
      setError(result.error || 'Error al crear la orden')
    }

    setIsLoading(false)
  }

  // Reset al cerrar
  const handleClose = () => {
    setSelectedAsset(null)
    setReportedIssue('')
    setSearchQuery('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-[2.5rem] 
                    w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-surface-800">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 rounded-[1.5rem] shadow-lg shadow-amber-500/10">
              <Wrench className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Nueva Orden</h2>
              <p className="text-gray-400 dark:text-surface-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
                Selecciona un activo para reparación
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-3 bg-gray-50 dark:bg-surface-950 text-gray-400 hover:text-gray-900 dark:hover:text-white 
                     rounded-2xl transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] space-y-8">
          {/* Success */}
          {success && (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-3xl 
                          flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
              <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-emerald-900 dark:text-emerald-400 font-black uppercase text-xs tracking-widest">¡Éxito!</p>
                <p className="text-emerald-600 dark:text-surface-400 text-sm font-bold">Orden creada. Redirigiendo...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-3xl 
                          flex items-center gap-4 animate-in shake duration-500">
              <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <p className="text-rose-900 dark:text-rose-400 font-bold text-sm tracking-tight">{error}</p>
            </div>
          )}

          {!success && (
            <>
              {/* Buscador de activos */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-surface-500 ml-1">
                  Buscar Activo
                </label>
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tag, serial, marca o modelo..."
                    className="w-full pl-16 pr-6 py-5 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 
                             rounded-[2rem] text-gray-900 dark:text-white font-bold placeholder-gray-400 dark:placeholder-surface-600
                             focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner"
                  />
                </div>
              </div>

              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-surface-500 ml-1">
                Resultados <span className="text-amber-500">({filteredAssets.length})</span>
              </label>

              {isLoadingAssets ? (
                <div className="flex items-center justify-center py-12 bg-gray-50 dark:bg-surface-950 rounded-[2.5rem] shadow-inner">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-surface-950 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-surface-800 shadow-inner">
                  <div className="p-5 bg-white dark:bg-surface-900 rounded-[2rem] inline-block shadow-lg mb-6">
                    <Package className="w-12 h-12 text-gray-300 dark:text-surface-700 mx-auto" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-black text-sm uppercase tracking-widest">No hay activos disponibles</p>
                  <p className="text-gray-400 dark:text-surface-500 text-[10px] font-bold uppercase tracking-widest mt-2 px-12 leading-relaxed">
                    Primero registra activos en Bodega de Recepción
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar p-1">
                  {filteredAssets.slice(0, 50).map((asset) => {
                    const AssetIcon = assetTypeIcons[asset.asset_type] || Package
                    const isSelected = selectedAsset?.id === asset.id

                    return (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={cn(
                          "p-6 rounded-[2rem] text-left transition-all border-2 relative overflow-hidden group",
                          isSelected
                            ? "bg-white dark:bg-surface-900 border-amber-500 shadow-xl shadow-amber-500/10 ring-4 ring-amber-500/5"
                            : "bg-gray-50 dark:bg-surface-950 border-gray-100 dark:border-surface-800 hover:border-gray-300 dark:hover:border-surface-700 shadow-sm"
                        )}
                      >
                        {isSelected && <div className="absolute top-0 right-0 p-2 bg-amber-500 text-white rounded-bl-2xl">
                          <CheckCircle className="w-3 h-3" />
                        </div>}
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-3 rounded-2xl transition-all shadow-md group-hover:scale-110",
                            isSelected ? "bg-amber-500 text-white" : "bg-white dark:bg-surface-900 text-gray-400 dark:text-surface-600 border border-gray-100 dark:border-surface-800"
                          )}>
                            <AssetIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-black text-sm uppercase tracking-tight truncate",
                              isSelected ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-surface-200"
                            )}>
                              {asset.internal_tag}
                            </p>
                            <p className="text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-wide truncate mt-0.5">
                              {asset.manufacturer} {asset.model}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-surface-800 text-gray-500 dark:text-surface-500 text-[8px] font-black rounded uppercase tracking-tighter">
                                {asset.batch_code ? `LOT-${asset.batch_code}` : 'CLIENT'}
                              </span>
                              <span className="text-gray-300 dark:text-surface-800 text-[9px]">|</span>
                              <span className="text-[10px] font-mono font-black text-gray-400 dark:text-surface-600 truncate">
                                {asset.serial_number || 'S/N'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Activo seleccionado (Confirmación visual) */}
              {selectedAsset && (
                <div className="p-8 bg-amber-500/5 dark:bg-amber-500/10 border-2 border-amber-500/20 rounded-[2.5rem] shadow-xl shadow-amber-500/5 animate-in zoom-in-95 duration-500 flex items-center gap-6">
                  <div className="p-5 bg-amber-500 text-white rounded-[1.5rem] shadow-xl shadow-amber-500/20">
                    <Wrench className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600 dark:text-amber-400 leading-none mb-2">Seleccionado</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none mb-1">
                      {selectedAsset.internal_tag}
                    </p>
                    <p className="text-gray-500 dark:text-surface-400 text-sm font-bold uppercase tracking-widest leading-none">
                      {selectedAsset.manufacturer} {selectedAsset.model}
                    </p>
                  </div>
                </div>
              )}

              {/* Problema reportado */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-surface-500 ml-1">
                  Problema Reportado
                </label>
                <textarea
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  placeholder="Describe detalladamente el problema reportado..."
                  rows={4}
                  className="w-full px-8 py-6 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-[2.5rem] 
                               text-gray-900 dark:text-white font-bold placeholder-gray-400 dark:placeholder-surface-600 focus:outline-none focus:border-amber-500
                               dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-between p-8 border-t border-gray-50 dark:border-surface-800 bg-gray-50/50 dark:bg-surface-950/50 backdrop-blur-sm">
            <button
              onClick={handleClose}
              className="px-8 py-4 text-gray-400 dark:text-surface-500 hover:text-gray-900 dark:hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
            >
              Cancelar
            </button>

            <button
              onClick={handleCreate}
              disabled={isLoading || !selectedAsset || !reportedIssue.trim()}
              className="flex items-center gap-3 px-10 py-5 bg-amber-600 hover:bg-amber-500 
                       text-white text-xs font-black uppercase tracking-widest rounded-[2rem] transition-all shadow-2xl shadow-amber-500/30
                       disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              )}
              Crear Orden de Trabajo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

