'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Package,
  ArrowRightLeft,
  ScanLine,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { type PartRequestWithDetails, processDispatch } from '../actions'

interface DispatchModalProps {
  isOpen: boolean
  onClose: () => void
  request: PartRequestWithDetails
}

export function DispatchModal({ isOpen, onClose, request }: DispatchModalProps) {
  const router = useRouter()

  // Campo OBLIGATORIO: SKU de la pieza dañada
  const [returnedSku, setReturnedSku] = useState('')
  const [returnedCondition, setReturnedCondition] = useState('defective')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Procesar el intercambio
  const handleConfirmDispatch = async () => {
    // Validación: SKU de retorno es OBLIGATORIO
    if (!returnedSku.trim()) {
      setError('Debes escanear/escribir el SKU de la pieza dañada que recibes')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await processDispatch({
      partRequestId: request.id,
      workOrderId: request.work_order_id,
      partSku: request.part_sku,
      returnedPartSku: returnedSku.trim(),
      returnedPartCondition: returnedCondition
    })

    if (result.success) {
      router.refresh()
      handleClose()
    } else {
      setError(result.error || 'Error al procesar despacho')
    }

    setIsLoading(false)
  }

  const handleClose = () => {
    setReturnedSku('')
    setReturnedCondition('defective')
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
      <div className="relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-3xl 
                    w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
              <ArrowRightLeft className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Confirmar Intercambio</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">
                Orden: <span className="text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">{request.work_order?.work_order_number}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 
                     rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/10 border border-red-300 dark:border-red-800 rounded-2xl 
                          flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-800 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-300 text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Pieza a ENTREGAR (Sale del stock) */}
          <div className="p-5 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <p className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-[0.2em]">
                Pieza Nueva a Entregar
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                <Package className="w-5 h-5 text-emerald-800 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-extrabold text-lg leading-tight">
                  {request.part_name || request.part_sku}
                </p>
                <p className="text-emerald-800 dark:text-emerald-400 font-mono text-sm font-bold">{request.part_sku}</p>
              </div>
            </div>
          </div>

          {/* Flecha de intercambio */}
          <div className="flex justify-center -my-3 relative z-10">
            <div className="p-2.5 bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-full shadow-md">
              <ArrowRightLeft className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>

          {/* Pieza DAÑADA a RECIBIR (Entra a bodega mala) - OBLIGATORIO */}
          <div className="p-5 bg-amber-50 dark:bg-amber-500/5 border border-amber-300 dark:border-amber-500/30 rounded-2xl shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <p className="text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-[0.2em]">
                Pieza Dañada a Recibir <span className="text-red-600 font-bold">*</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-400 text-xs font-bold mb-2 uppercase tracking-tight">
                  Escanear o Escribir SKU
                </label>
                <div className="relative">
                  <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={returnedSku}
                    onChange={(e) => setReturnedSku(e.target.value)}
                    placeholder="Escanear SKU pieza dañada..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border-2 border-amber-200 dark:border-amber-800/40 
                             rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 font-mono font-bold
                             focus:outline-none focus:border-amber-500 transition-all shadow-sm"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-400 text-xs font-bold mb-2 uppercase tracking-tight">
                  Condición de Retorno
                </label>
                <select
                  value={returnedCondition}
                  onChange={(e) => setReturnedCondition(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                           rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold transition-all shadow-sm"
                >
                  <option value="defective">Defectuoso (Entra a Bodega Defectos)</option>
                  <option value="damaged">Dañado (Daño Externo)</option>
                  <option value="water_damage">Daño por Agua</option>
                  <option value="broken">Roto/Quebrado</option>
                  <option value="for_parts">Solo para partes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Info del técnico */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-gray-500 dark:text-gray-500 text-xs font-bold uppercase tracking-wider">Solicitado por</p>
            <p className="text-gray-900 dark:text-gray-200 font-black text-sm">
              {request.technician?.full_name || 'Técnico no especificado'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#151a24]">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmDispatch}
            disabled={isLoading || !returnedSku.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-3.5 bg-indigo-600 hover:bg-indigo-500 
                     text-white font-black uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-indigo-500/20 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-5 h-5" />
            )}
            Procesar Despacho
          </button>
        </div>
      </div>
    </div>
  )
}

