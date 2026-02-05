'use client'

import Link from 'next/link'
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Settlement } from '../actions'

interface SettlementsTableProps {
  settlements: Settlement[]
}

export function SettlementsTable({ settlements }: SettlementsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalized':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] uppercase font-bold tracking-wider border border-emerald-200 dark:border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            Finalizada
          </span>
        )
      case 'paid':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full text-[10px] uppercase font-bold tracking-wider border border-blue-200 dark:border-blue-500/30">
            <DollarSign className="w-3.5 h-3.5" />
            Pagada
          </span>
        )
      case 'cancelled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full text-[10px] uppercase font-bold tracking-wider border border-red-200 dark:border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Cancelada
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-[10px] uppercase font-bold tracking-wider border border-amber-200 dark:border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Borrador
          </span>
        )
    }
  }

  if (settlements.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 dark:text-surface-700 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-surface-400 font-medium">No hay liquidaciones registradas</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-surface-850 border-b border-gray-100 dark:border-surface-700">
            <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              # Liquidación
            </th>
            <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Lote
            </th>
            <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Unidades
            </th>
            <th className="text-right px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Ingresos
            </th>
            <th className="text-right px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Gastos
            </th>
            <th className="text-right px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Utilidad
            </th>
            <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Estado
            </th>
            <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Fecha
            </th>
            <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-semibold uppercase">
              Acción
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
          {settlements.map((settlement) => (
            <tr key={settlement.id} className="hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors">
              {/* Número */}
              <td className="px-6 py-4">
                <span className="text-gray-900 dark:text-white font-mono font-bold tracking-tight">{settlement.settlement_number}</span>
              </td>

              {/* Lote */}
              <td className="px-6 py-4">
                <span className="text-gray-600 dark:text-surface-300 font-medium">{settlement.batch?.internal_batch_id || 'N/A'}</span>
              </td>

              {/* Unidades */}
              <td className="px-6 py-4 text-center">
                <span className="text-gray-700 dark:text-surface-300 font-medium">{settlement.total_units}</span>
                <span className="text-emerald-600 dark:text-emerald-400 ml-2 text-sm">({settlement.units_sold} vendidos)</span>
              </td>

              {/* Ingresos */}
              <td className="px-6 py-4 text-right">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">{formatCurrency(settlement.gross_revenue)}</span>
              </td>

              {/* Gastos */}
              <td className="px-6 py-4 text-right">
                <span className="text-red-600 dark:text-red-400 font-medium tabular-nums">{formatCurrency(settlement.total_expenses)}</span>
              </td>

              {/* Utilidad */}
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className={cn(
                    "font-bold tabular-nums",
                    settlement.net_profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {formatCurrency(settlement.net_profit)}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                    settlement.profit_margin_pct >= 15 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                      settlement.profit_margin_pct >= 5 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" :
                        "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                  )}>
                    {settlement.profit_margin_pct}%
                  </span>
                </div>
              </td>

              {/* Estado */}
              <td className="px-6 py-4 text-center">
                {getStatusBadge(settlement.status)}
              </td>

              {/* Fecha */}
              <td className="px-6 py-4 text-center text-gray-500 dark:text-surface-400 text-sm">
                {formatDate(settlement.created_at)}
              </td>

              {/* Acción */}
              <td className="px-6 py-4 text-center">
                <Link
                  href={`/dashboard/finanzas/${settlement.id}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 
                           bg-gray-100 dark:bg-surface-800 hover:bg-gray-200 dark:hover:bg-surface-700 text-gray-900 dark:text-white 
                           rounded-lg transition-colors text-sm font-medium border border-gray-200 dark:border-surface-700"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

