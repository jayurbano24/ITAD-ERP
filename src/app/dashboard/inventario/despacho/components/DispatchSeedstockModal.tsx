'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  RefreshCw,
  ScanLine,
  ArrowRight,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Smartphone,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type PendingDispatchOrder,
  type SeedstockItem,
  getAvailableSeedstock,
  dispatchSeedstock
} from '../actions'

interface DispatchSeedstockModalProps {
  isOpen: boolean
  onClose: () => void
  order: PendingDispatchOrder
}

export function DispatchSeedstockModal({ isOpen, onClose, order }: DispatchSeedstockModalProps) {
  const router = useRouter()

  // Estados
  const [availableSeedstock, setAvailableSeedstock] = useState<SeedstockItem[]>([])
  const [filteredSeedstock, setFilteredSeedstock] = useState<SeedstockItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingSeedstock, setIsLoadingSeedstock] = useState(true)

  // Seedstock seleccionado
  const [selectedSeedstock, setSelectedSeedstock] = useState<SeedstockItem | null>(null)
  const [scannedImei, setScannedImei] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const loadSeedstock = useCallback(async () => {
    setIsLoadingSeedstock(true)

    // Filtrar por marca/modelo del activo si está disponible
    const brand = order.asset?.manufacturer
    const model = order.asset?.model

    const { data } = await getAvailableSeedstock(brand || undefined, model || undefined)
    setAvailableSeedstock(data)
    setFilteredSeedstock(data)
    setIsLoadingSeedstock(false)
  }, [order.asset?.manufacturer, order.asset?.model])

  // Cargar seedstock disponible
  useEffect(() => {
    if (isOpen) {
      loadSeedstock()
    }
  }, [isOpen, loadSeedstock])

  // Filtrar seedstock
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSeedstock(availableSeedstock)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = availableSeedstock.filter(item =>
      item.imei?.toLowerCase().includes(query) ||
      item.serial_number?.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      item.model.toLowerCase().includes(query)
    )
    setFilteredSeedstock(filtered)
  }, [searchQuery, availableSeedstock])

  // Seleccionar seedstock
  const handleSelectSeedstock = (item: SeedstockItem) => {
    setSelectedSeedstock(item)
    setScannedImei(item.imei || '')
  }

  // Despachar
  const handleDispatch = async () => {
    if (!selectedSeedstock) {
      setError('Selecciona una unidad de seedstock')
      return
    }

    if (!scannedImei) {
      setError('El IMEI es obligatorio')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await dispatchSeedstock({
      workOrderId: order.id,
      seedstockId: selectedSeedstock.id,
      newImei: scannedImei
    })

    if (result.success) {
      router.refresh()
      onClose()
    } else {
      setError(result.error || 'Error al despachar')
    }

    setIsLoading(false)
  }

  // Reset al cerrar
  const handleClose = () => {
    setSelectedSeedstock(null)
    setScannedImei('')
    setSearchQuery('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-900 border border-surface-700 rounded-2xl 
                    w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <RefreshCw className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Despacho de Seedstock</h2>
              <p className="text-surface-400 text-sm">
                Orden: {order.work_order_number} • Cambio de Unidad
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 
                     rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl 
                          flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Info del equipo original */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-red-400" />
                <p className="text-red-400 font-semibold">Equipo Dañado (Original)</p>
              </div>
              <p className="text-white font-medium">
                {order.asset?.manufacturer} {order.asset?.model}
              </p>
              <p className="text-surface-400 text-sm">
                Tag: {order.asset?.internal_tag}
              </p>
              {order.original_imei && (
                <p className="text-surface-400 text-sm font-mono mt-1">
                  IMEI: {order.original_imei}
                </p>
              )}
            </div>

            {selectedSeedstock ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <p className="text-emerald-400 font-semibold">Unidad de Reemplazo</p>
                </div>
                <p className="text-white font-medium">
                  {selectedSeedstock.brand} {selectedSeedstock.model}
                </p>
                <p className="text-surface-400 text-sm">
                  {selectedSeedstock.color} • {selectedSeedstock.storage_capacity}
                </p>
                <p className="text-emerald-400 text-sm font-mono mt-1">
                  IMEI: {selectedSeedstock.imei}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-surface-800/50 border border-surface-700 border-dashed rounded-xl 
                            flex items-center justify-center">
                <div className="text-center">
                  <ArrowLeftRight className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-surface-500 text-sm">Selecciona unidad de reemplazo</p>
                </div>
              </div>
            )}
          </div>

          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por IMEI, serial, marca o modelo..."
              className="w-full pl-12 pr-4 py-3 bg-surface-800 border border-surface-700 
                       rounded-xl text-white placeholder-surface-500
                       focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Lista de seedstock disponible */}
          <div>
            <p className="text-surface-400 text-sm mb-3">
              Unidades disponibles ({filteredSeedstock.length})
            </p>

            {isLoadingSeedstock ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : filteredSeedstock.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                <p className="text-surface-400">No hay unidades disponibles</p>
                <p className="text-surface-500 text-sm">
                  {searchQuery ? 'Intenta con otra búsqueda' : 'No hay seedstock que coincida'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {filteredSeedstock.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSeedstock(item)}
                    className={cn(
                      "p-4 rounded-xl text-left transition-all border-2",
                      selectedSeedstock?.id === item.id
                        ? "bg-indigo-500/10 border-indigo-500"
                        : "bg-surface-800/50 border-surface-700 hover:border-indigo-500/50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold">
                          {item.brand} {item.model}
                        </p>
                        <p className="text-surface-400 text-sm">
                          {item.color} • {item.storage_capacity}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        item.condition === 'new'
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      )}>
                        {item.condition === 'new' ? 'Nuevo' :
                          item.condition === 'refurbished' ? 'Reacond.' : 'Open Box'}
                      </span>
                    </div>
                    <p className="text-indigo-400 text-sm font-mono">
                      IMEI: {item.imei}
                    </p>
                    <p className="text-surface-500 text-xs mt-1">
                      📍 {item.warehouse_location}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Confirmación de IMEI */}
          {selectedSeedstock && (
            <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <label className="block text-indigo-400 font-semibold mb-2">
                Confirmar IMEI del equipo a entregar
              </label>
              <div className="relative">
                <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <input
                  type="text"
                  value={scannedImei}
                  onChange={(e) => setScannedImei(e.target.value)}
                  placeholder="Escanear o verificar IMEI..."
                  className="w-full pl-12 pr-4 py-3 bg-surface-800 border border-indigo-500/50 
                           rounded-xl text-white placeholder-surface-500 font-mono
                           focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-surface-400 text-xs mt-2">
                Escanee el IMEI físico del equipo para confirmar que coincide con el registro
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-surface-800 bg-surface-850">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleDispatch}
            disabled={isLoading || !selectedSeedstock || !scannedImei}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 
                     text-white font-semibold rounded-xl transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Confirmar Cambio de Unidad
          </button>
        </div>
      </div>
    </div>
  )
}

