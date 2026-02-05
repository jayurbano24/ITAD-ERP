'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

type BatchItem = {
  serial_number: string
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  received_date: string | null
}

type BatchDetailModalProps = {
  batchId: string
  batchCode: string | null
  onClose: () => void
}

export default function BatchDetailModal({ batchId, batchCode, onClose }: BatchDetailModalProps) {
  const [items, setItems] = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBatchItems = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/inventario/bodega/batch-items?batchId=${encodeURIComponent(batchId)}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar los items del lote')
        }
        
        const data = await response.json()
        setItems(data.items || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    if (batchId) {
      fetchBatchItems()
    }
  }, [batchId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-surface-800 bg-surface-950/95 p-6 space-y-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-surface-950/95 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Detalles del Lote</h2>
            {batchCode && (
              <p className="text-sm text-surface-400 mt-1">Código: <span className="text-indigo-400 font-mono">{batchCode}</span></p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-surface-400" />
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <p className="text-surface-400">Cargando items del lote...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-8">
            <p className="text-surface-400">No hay items en este lote</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              Total de series en el lote: <span className="text-white font-bold">{items.length}</span>
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-900/50">
                  <tr className="border-b border-surface-800">
                    <th className="px-4 py-3 text-left text-surface-300 font-semibold">#</th>
                    <th className="px-4 py-3 text-left text-surface-300 font-semibold">SERIE</th>
                    <th className="px-4 py-3 text-left text-surface-300 font-semibold">MARCA</th>
                    <th className="px-4 py-3 text-left text-surface-300 font-semibold">MODELO</th>
                    <th className="px-4 py-3 text-left text-surface-300 font-semibold">TIPO</th>
                    <th className="px-4 py-3 text-left text-surface-300 font-semibold">FECHA RECEPCIÓN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {items.map((item, index) => (
                    <tr key={item.serial_number} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3 text-surface-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-indigo-400">{item.serial_number}</span>
                      </td>
                      <td className="px-4 py-3 text-surface-300">{item.manufacturer || '-'}</td>
                      <td className="px-4 py-3 text-surface-300">{item.model || '-'}</td>
                      <td className="px-4 py-3 text-surface-300">{item.asset_type || '-'}</td>
                      <td className="px-4 py-3 text-surface-400 text-xs">
                        {item.received_date 
                          ? new Date(item.received_date).toLocaleDateString('es-GT', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 sticky bottom-0 bg-surface-950/95 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
