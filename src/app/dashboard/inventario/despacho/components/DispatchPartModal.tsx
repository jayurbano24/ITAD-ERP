'use client'

import { useState, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Package,
  AlertTriangle,
  Loader2,
  Search,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type PendingDispatchOrder,
  type PartCatalogItem,
  getPartsWithStock,
  searchPartBySku,
  dispatchPartSimple,
  cancelPartRequest
} from '../actions'

interface DispatchPartModalProps {
  isOpen: boolean
  onClose: () => void
  order: PendingDispatchOrder
}

const deriveWarehouseLabel = (location?: string | null) => {
  if (!location) return 'Good Warehouse'
  const normalized = location.toLowerCase()
  if (normalized.includes('harvest')) return 'Harvesting Warehouse'
  if (normalized.includes('good')) return 'Good Warehouse'
  return location
}

export function DispatchPartModal({ isOpen, onClose, order }: DispatchPartModalProps) {
  const router = useRouter()

  const normalizeSku = useCallback((value?: string) =>
    value ? value.replace(/[^a-z0-9]/gi, '').toLowerCase() : '', [])

  // Estados
  const [availableParts, setAvailableParts] = useState<PartCatalogItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PartCatalogItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPart, setSelectedPart] = useState<PartCatalogItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pendingRequests = useMemo(() => {
    const requests = order.part_requests ?? []
    // treat anything not fully dispatched/installed as pending for this simplified flow
    return requests.filter((r) => (r.status ?? '').toLowerCase() === 'pending' || (r.status ?? '').toLowerCase() === 'waiting')
  }, [order.part_requests])

  const requestedSkusNormalized = useMemo(() => {
    return new Set(pendingRequests.map((r) => normalizeSku(r.part_sku)))
  }, [pendingRequests, normalizeSku])


  const loadAvailableParts = useCallback(async () => {
    const { data } = await getPartsWithStock()
    if (requestedSkusNormalized.size > 0) {
      setAvailableParts(data.filter((part) => requestedSkusNormalized.has(normalizeSku(part.sku))))
      return
    }
    setAvailableParts(data)
  }, [normalizeSku, requestedSkusNormalized])

  // Cargar piezas disponibles
  useEffect(() => {
    if (isOpen) {
      loadAvailableParts()
    }
  }, [isOpen, loadAvailableParts])

  // Buscar piezas
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const { data } = await searchPartBySku(query)
    const filtered = requestedSkusNormalized.size > 0
      ? data.filter((part) => requestedSkusNormalized.has(normalizeSku(part.sku)))
      : data
    setSearchResults(filtered)
    setIsSearching(false)
  }

  const skuInput = searchQuery

  // Seleccionar pieza
  const handleSelectPart = useCallback((part: PartCatalogItem) => {
    setSelectedPart(part)
    setSearchQuery('')
    setSearchResults([])
  }, [])

  useEffect(() => {
    const normalizedQuery = normalizeSku(searchQuery)
    if (!normalizedQuery) return
    const sources = [...searchResults, ...availableParts]
    const match = sources.find((part) => normalizeSku(part.sku) === normalizedQuery)
    if (match) {
      const alreadySelected = selectedPart && normalizeSku(selectedPart.sku) === normalizedQuery
      if (!alreadySelected) {
        handleSelectPart(match)
      }
    }
  }, [searchQuery, searchResults, availableParts, selectedPart, handleSelectPart, normalizeSku])

  const canDispatch = useMemo(() => {
    if (selectedPart) return true
    const normalizedQuery = normalizeSku(skuInput)
    if (!normalizedQuery) return false
    // Must be part of the request for this order
    if (requestedSkusNormalized.size > 0 && !requestedSkusNormalized.has(normalizedQuery)) return false
    return availableParts.some((part) => normalizeSku(part.sku) === normalizedQuery)
  }, [selectedPart, availableParts, skuInput, normalizeSku, requestedSkusNormalized])

  // Despachar
  const handleDispatch = useCallback(async () => {
    if (isLoading) return
    let partToDispatch = selectedPart
    if (!partToDispatch) {
      const normalizedQuery = normalizeSku(skuInput)
      if (!normalizedQuery) {
        setError('Ingresa el SKU para confirmar el despacho')
        return
      }
      partToDispatch = availableParts.find((part) => normalizeSku(part.sku) === normalizedQuery) || null
    }

    if (!partToDispatch) {
      setError('No se encontró el SKU en inventario')
      return
    }

    // Validate that scanned SKU belongs to this order's pending requests
    const normalizedSku = normalizeSku(partToDispatch.sku)
    if (requestedSkusNormalized.size > 0 && !requestedSkusNormalized.has(normalizedSku)) {
      setError('El SKU escaneado no pertenece a las piezas solicitadas para esta orden')
      return
    }

    if (partToDispatch.stock_quantity < 1) {
      setError('Sin stock disponible para ese SKU')
      return
    }

    setIsLoading(true)
    setError(null)

    // Find matching part request
    const matchingRequest = pendingRequests.find((pr) => normalizeSku(pr.part_sku) === normalizedSku) || null
    const partRequestId = matchingRequest?.id

    if (!partRequestId) {
      setError('No se encontró una solicitud pendiente para ese SKU en esta orden')
      setIsLoading(false)
      return
    }

    const result = await dispatchPartSimple({
      workOrderId: order.id,
      partRequestId,
      partSku: partToDispatch.sku,
      sourceWarehouse: deriveWarehouseLabel(partToDispatch.location)
    })

    if (result.success) {
      router.refresh()
      onClose()
    } else {
      setError(result.error || 'Error al despachar')
    }

    setIsLoading(false)
  }, [availableParts, isLoading, normalizeSku, onClose, order.id, pendingRequests, router, selectedPart, skuInput, requestedSkusNormalized])

  const handleCancelPartRequest = useCallback(async () => {
    const partRequestId = order.part_requests?.[0]?.id
    if (!partRequestId) {
      setError('No hay solicitud de pieza para eliminar')
      return
    }

    setIsCanceling(true)
    setError(null)

    try {
      const result = await cancelPartRequest({
        workOrderId: order.id,
        partRequestId
      })

      if (result.success) {
        router.refresh()
        onClose()
      } else {
        setError(result.error || 'Error cancelando solicitud')
      }
    } finally {
      setIsCanceling(false)
    }
  }, [onClose, order.id, order.part_requests, router])

  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    if (isLoading || !canDispatch) return
    event.preventDefault()
    void handleDispatch()
  }, [canDispatch, handleDispatch, isLoading])

  // Reset al cerrar
  const handleClose = () => {
    setSelectedPart(null)
    setSearchQuery('')
    setSearchResults([])
    setError(null)
    onClose()
  }

  const currentWarehouseLabel = deriveWarehouseLabel(selectedPart?.location)

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
                    w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Package className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Despacho de Repuesto</h2>
              <p className="text-surface-400 text-sm">
                Orden: {order.work_order_number}
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] space-y-5">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="rounded-2xl border border-surface-800 bg-surface-900/60 p-4">
            <p className="text-surface-500 text-sm">Equipo a reparar</p>
            <p className="text-white font-semibold">
              {order.asset?.internal_tag} - {order.asset?.manufacturer} {order.asset?.model}
            </p>
            {order.failure_type && (
              <p className="text-amber-400 text-sm mt-1">Falla: {order.failure_type}</p>
            )}
          </div>

          {pendingRequests.length > 0 && (
            <div className="rounded-2xl border border-surface-800 bg-surface-900/60 p-4">
              <p className="text-surface-500 text-sm mb-2">Piezas solicitadas</p>
              <div className="flex flex-wrap gap-2">
                {pendingRequests.map((pr) => (
                  <span
                    key={pr.id}
                    className="inline-flex items-center gap-2 rounded-full border border-surface-700 bg-surface-950 px-3 py-1 text-xs text-surface-200"
                  >
                    <span className="font-mono text-emerald-400">{pr.part_sku}</span>
                    <span className="text-surface-400">× {pr.quantity}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Escanear o escribir SKU solicitado..."
                className="w-full pl-12 pr-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 font-mono focus:outline-none focus:border-amber-500"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400 animate-spin" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border border-surface-700 rounded-xl overflow-hidden">
                {searchResults.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => handleSelectPart(part)}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-800 transition-colors border-b border-surface-700 last:border-b-0"
                  >
                    <div className="text-left">
                      <p className="text-white font-medium">{part.name}</p>
                      <p className="text-surface-400 text-sm font-mono">{part.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold",
                        part.stock_quantity > 5 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        Stock: {part.stock_quantity}
                      </p>
                      <p className="text-surface-500 text-xs">{part.location}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {requestedSkusNormalized.size > 0 && searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-surface-500 text-sm">
                No hay coincidencias. Verifica que el SKU pertenezca a la lista de piezas solicitadas.
              </p>
            )}

            {searchQuery.length < 2 && (
              <>
                <p className="text-surface-500 text-sm">O selecciona de la lista:</p>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {availableParts.slice(0, 10).map((part) => (
                    <button
                      key={part.id}
                      onClick={() => handleSelectPart(part)}
                      className="p-3 bg-surface-800/50 border border-surface-700 rounded-xl text-left hover:border-amber-500/50 transition-all"
                    >
                      <p className="text-white font-medium text-sm truncate">{part.name}</p>
                      <p className="text-surface-400 text-xs font-mono">{part.sku}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={cn(
                          "text-xs font-medium",
                          part.stock_quantity > 5 ? "text-emerald-400" : "text-amber-400"
                        )}>
                          Stock: {part.stock_quantity}
                        </span>
                        <span className="text-surface-500 text-xs">{part.location}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {selectedPart && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-emerald-300 text-xs uppercase tracking-[0.4em]">Pieza seleccionada</p>
                  <p className="text-white font-semibold text-lg">{selectedPart.name}</p>
                  <p className="text-emerald-400 font-mono text-sm">{selectedPart.sku}</p>
                </div>
                <button
                  onClick={() => setSelectedPart(null)}
                  className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-surface-400 text-sm">
                <span className="px-3 py-1 rounded-full bg-surface-800">Ubicación: {selectedPart.location ?? 'Good Warehouse'}</span>
                <span className="px-3 py-1 rounded-full bg-surface-800">Stock: {selectedPart.stock_quantity}</span>
                <span className="px-3 py-1 rounded-full bg-surface-800">Categoría: {selectedPart.category}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-surface-400">
            <span>
              Despachando desde: <strong className="text-white">{currentWarehouseLabel}</strong>
            </span>
            <span className="px-3 py-1 rounded-full bg-surface-800">Pieza solicitada: {order.part_requests?.[0]?.part_name ?? 'N/A'}</span>
            <span className="px-3 py-1 rounded-full bg-surface-800">Estado orden: {order.status}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-surface-800 bg-surface-850">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleCancelPartRequest}
              disabled={isCanceling}
              className="flex items-center gap-2 px-4 py-2 text-rose-300 border border-rose-500/30 rounded-xl transition-colors
                         hover:border-rose-400/60 hover:text-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCanceling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Eliminar solicitud
            </button>
          </div>

          <button
            onClick={handleDispatch}
            disabled={isLoading || !canDispatch}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 
                       text-white font-semibold rounded-xl transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Package className="w-5 h-5" />
            )}
            Confirmar Despacho
          </button>
        </div>
      </div>
    </div>
  )
}

