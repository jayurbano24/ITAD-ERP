'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Package,
  CheckCircle,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PartRequestWithDetails } from '../actions'
import { DispatchModal } from './DispatchModal'

interface PartRequestsTableProps {
  requests: PartRequestWithDetails[]
}

export function PartRequestsTable({ requests }: PartRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<PartRequestWithDetails | null>(null)

  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-3xl p-16 text-center shadow-sm dark:shadow-none transition-colors duration-300">
        <div className="p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-500/20">
          <CheckCircle className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Sin solicitudes pendientes</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-3 font-semibold text-lg">
          Todas las solicitudes han sido procesadas correctamente.
        </p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0f1419] text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-6 py-5">Ticket / Orden</th>
                <th className="text-left px-6 py-5">Técnico</th>
                <th className="text-left px-6 py-5">Pieza Solicitada</th>
                <th className="text-left px-6 py-5">Fecha</th>
                <th className="text-left px-6 py-5">Stock</th>
                <th className="text-right px-6 py-5">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {requests.map((request) => {
                const hasStock = request.stock_available > 0
                const warehouseFromNotes = request.notes?.match(/Bodega:\s*([^|]+)/i)?.[1]?.trim() || null

                return (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-[#242936] transition-colors group">
                    {/* Ticket ID - Link al taller */}
                    <td className="px-6 py-5">
                      <Link
                        href={`/dashboard/taller/${request.work_order_id}`}
                        className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 hover:text-indigo-500 
                                 font-mono text-xs font-bold transition-colors"
                      >
                        {request.work_order?.work_order_number}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>

                    {/* Técnico */}
                    <td className="px-6 py-5">
                      <span className="text-gray-900 dark:text-gray-200 font-bold">
                        {request.technician?.full_name || 'N/A'}
                      </span>
                    </td>

                    {/* Pieza (Nombre / SKU) */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2.5 rounded-2xl border transition-all",
                          hasStock
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400"
                        )}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-extrabold">
                            {request.part_name || request.part_sku}
                          </p>
                          <p className="text-gray-500 dark:text-gray-500 text-[10px] font-mono font-bold uppercase tracking-wider">
                            {request.part_sku}
                          </p>
                          {warehouseFromNotes && (
                            <span className="inline-flex mt-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/40 uppercase tracking-widest">
                              {warehouseFromNotes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="px-6 py-5">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        {formatDate(request.created_at)}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-5">
                      <span className={cn(
                        "inline-flex items-center px-4 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all",
                        hasStock
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                          : "bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/40"
                      )}>
                        {hasStock ? `${request.stock_available} DISPONIBLE` : 'SIN STOCK'}
                      </span>
                    </td>

                    {/* Botón de Acción */}
                    <td className="px-6 py-5 text-right">
                      {hasStock ? (
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 
                                   text-white text-xs font-black uppercase tracking-widest rounded-2xl 
                                   shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          Despachar
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 
                                       bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-bold rounded-2xl border border-gray-200 dark:border-gray-700">
                          <AlertTriangle className="w-4 h-4" />
                          AGOTADO
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Despacho */}
      {selectedRequest && (
        <DispatchModal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
        />
      )}
    </>
  )
}
