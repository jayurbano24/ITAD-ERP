'use client'

import Link from 'next/link'
import {
  Package,
  BarChart3,
  CheckCircle,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type BatchForSettlement } from '../actions'
import { QuickEditButton } from './QuickEditButton'

interface BatchesForSettlementTableProps {
  batches: BatchForSettlement[]
}

export function BatchesForSettlementTable({ batches }: BatchesForSettlementTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value)
  }

  if (batches.length === 0) {
    return (
      <div className="p-12 text-center">
        <Package className="w-12 h-12 text-gray-300 dark:text-surface-700 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-surface-400">No hay lotes disponibles para liquidar</p>
        <p className="text-gray-400 dark:text-surface-500 text-sm mt-1">Los lotes aparecerán aquí cuando tengan activos</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-surface-850 border-b border-gray-100 dark:border-surface-700">
              <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
                Lote
              </th>
              <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
                Unidades
              </th>
              <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
                Avance
              </th>
              <th className="text-right px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
                Costo
              </th>
              <th className="text-right px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
                Ventas
              </th>
              <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
                Estado
              </th>
              <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
            {batches.map((batch) => (
              <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors">
                {/* Lote */}
                <td className="px-6 py-4">
                  <p className="text-gray-900 dark:text-white font-mono font-semibold">{batch.internal_batch_id}</p>
                  <p className="text-gray-500 dark:text-surface-500 text-sm">{batch.client_reference || 'Sin referencia'}</p>
                </td>

                {/* Unidades */}
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-gray-700 dark:text-white font-medium">{batch.total_assets} total</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{batch.sold_count} vendidos</span>
                    {batch.pending_count > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{batch.pending_count} pend.</span>
                    )}
                  </div>
                </td>

                {/* Avance */}
                <td className="px-6 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-24 h-2 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          batch.completion_pct >= 80 ? "bg-emerald-500" :
                            batch.completion_pct >= 50 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${batch.completion_pct}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-bold",
                      batch.completion_pct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                        batch.completion_pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {batch.completion_pct}%
                    </span>
                  </div>
                </td>

                {/* Costo */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-gray-700 dark:text-surface-300 tabular-nums">{formatCurrency(batch.total_cost)}</span>
                    <QuickEditButton
                      batchId={batch.id}
                      currentAmount={batch.total_cost}
                      type="cost"
                    />
                  </div>
                </td>

                {/* Ventas */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">{formatCurrency(batch.total_sales)}</span>
                    <QuickEditButton
                      batchId={batch.id}
                      currentAmount={batch.total_sales}
                      type="revenue"
                    />
                  </div>
                </td>

                {/* Estado Liquidación */}
                <td className="px-6 py-4 text-center">
                  {batch.has_settlement ? (
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold",
                      batch.settlement_status === 'finalized'
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                        : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                    )}>
                      {batch.settlement_status === 'finalized' ? '✓ Liquidado' : 'Borrador'}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-surface-500 text-sm">Sin liquidar</span>
                  )}
                </td>

                {/* Acción */}
                <td className="px-6 py-4 text-center">
                  {batch.has_settlement && batch.settlement_status === 'finalized' ? (
                    <span className="flex items-center justify-center gap-2 px-4 py-2 
                                   bg-gray-100 dark:bg-surface-700 text-gray-400 dark:text-surface-400 rounded-lg text-sm mx-auto w-fit font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Liquidado
                    </span>
                  ) : (
                    <Link
                      href={`/dashboard/finanzas/lote/${batch.id}`}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                               font-semibold text-sm transition-all mx-auto w-fit
                               bg-brand-600 hover:bg-brand-500 text-white shadow-sm hover:shadow-md"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Ver Rentabilidad
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

