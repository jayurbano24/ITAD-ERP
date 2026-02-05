'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Package,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { requestPart, searchParts } from '../../actions'

interface RequestPartModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  workOrderNumber: string
}

interface PartCatalogItem {
  id: string
  sku: string
  name: string
  category: string
  stock_quantity: number
  location: string | null
}

export function RequestPartModal({ isOpen, onClose, workOrderId, workOrderNumber }: RequestPartModalProps) {
  const router = useRouter()
  
  // Estados
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PartCatalogItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPart, setSelectedPart] = useState<PartCatalogItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Buscar piezas
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const result = await searchParts(searchQuery)
      setSearchResults(result.data || [])
      setIsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  // Seleccionar pieza
  const handleSelectPart = (part: PartCatalogItem) => {
    setSelectedPart(part)
    setSearchQuery('')
    setSearchResults([])
    setError(null)
  }

  // Enviar solicitud
  const handleSubmit = async () => {
    const sku = selectedPart?.sku
    const name = selectedPart?.name

    if (!sku?.trim()) {
      setError('Selecciona una pieza')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await requestPart(workOrderId, {
      partSku: sku,
      partName: name || sku,
      quantity,
      notes: notes || undefined
    })

    if (result.success) {
      setSuccess('Solicitud enviada correctamente')
      setTimeout(() => {
        router.refresh()
        handleClose()
      }, 1500)
    } else {
      setError(result.error || 'Error al enviar solicitud')
    }

    setIsLoading(false)
  }

  // Reset al cerrar
  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedPart(null)
    setQuantity(1)
    setNotes('')
    setError(null)
    setSuccess(null)
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
                    w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Package className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Solicitar Pieza</h2>
              <p className="text-surface-400 text-sm">
                Orden: {workOrderNumber}
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
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl 
                          flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl 
                          flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-400">{success}</p>
            </div>
          )}

          {/* Búsqueda */}
          {!selectedPart && (
            <>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por SKU o nombre de pieza..."
                  className="w-full pl-12 pr-4 py-3 bg-surface-800 border border-surface-700 
                           rounded-xl text-white placeholder-surface-500
                           focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 
                                    text-purple-400 animate-spin" />
                )}
              </div>

              {/* Resultados de búsqueda */}
              {searchResults.length > 0 && (
                <div className="border border-surface-700 rounded-xl overflow-hidden">
                  {searchResults.map((part) => (
                    <button
                      key={part.id}
                      onClick={() => handleSelectPart(part)}
                      className="w-full flex items-center justify-between p-4 hover:bg-surface-800 
                               transition-colors border-b border-surface-700 last:border-b-0"
                    >
                      <div className="text-left">
                        <p className="text-white font-medium">{part.name}</p>
                        <p className="text-surface-400 text-sm font-mono">{part.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          part.stock_quantity > 5 ? "text-emerald-400" : 
                          part.stock_quantity > 0 ? "text-amber-400" : "text-red-400"
                        )}>
                          Stock: {part.stock_quantity}
                        </p>
                        <p className="text-surface-500 text-xs">{part.location || 'N/A'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pieza seleccionada */}
          {selectedPart && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-purple-400 font-semibold">{selectedPart.name}</p>
                    <p className="text-surface-400 text-sm font-mono">{selectedPart.sku}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPart(null)}
                  className="text-surface-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-purple-500/20">
                <span className={cn(
                  "text-sm font-medium",
                  selectedPart.stock_quantity > 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  Stock: {selectedPart.stock_quantity}
                </span>
                <span className="text-surface-500 text-sm">
                  Ubicación: {selectedPart.location || 'N/A'}
                </span>
              </div>
            </div>
          )}

          {/* Cantidad y notas (solo si hay pieza seleccionada) */}
          {selectedPart && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-surface-400 text-sm mb-2">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-surface-800 border border-surface-700 
                             rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-surface-400 text-sm mb-2">
                    Stock Disponible
                  </label>
                  <div className="px-4 py-3 bg-surface-800/50 border border-surface-700 
                                rounded-xl text-surface-400">
                    {selectedPart ? (
                      <span className={cn(
                        "font-semibold",
                        selectedPart.stock_quantity > 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {selectedPart.stock_quantity} unidades
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-surface-400 text-sm mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Información adicional para bodega..."
                  rows={2}
                  className="w-full px-4 py-3 bg-surface-800 border border-surface-700 
                           rounded-xl text-white placeholder-surface-500
                           focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-800 bg-surface-850">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedPart || !!success}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 
                     text-white font-semibold rounded-xl transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Package className="w-5 h-5" />
            )}
            Enviar Solicitud
          </button>
        </div>
      </div>
    </div>
  )
}

