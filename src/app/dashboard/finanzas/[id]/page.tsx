import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Wrench,
  HardDrive,
  DollarSign,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSettlementById, finalizeSettlement } from '../actions'
import { FinalizeButton } from './components/FinalizeButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SettlementDetailPage({ params }: PageProps) {
  const { id } = await params
  const { data: settlement, error } = await getSettlementById(id)

  if (error || !settlement) {
    notFound()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value || 0)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto bg-gray-50 dark:bg-surface-950 min-h-screen transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/finanzas"
            className="p-2 bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-surface-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-amber-500 dark:text-amber-400" />
              Liquidación {settlement.settlement_number}
            </h1>
            <p className="text-gray-500 dark:text-surface-400 mt-1">
              Lote {settlement.batch?.internal_batch_id} • Creada el {formatDate(settlement.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {settlement.status === 'finalized' ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-500/30 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Finalizada
            </span>
          ) : (
            <FinalizeButton settlementId={settlement.id} />
          )}

          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 hover:bg-gray-50 dark:hover:bg-surface-700 
                           text-gray-700 dark:text-white rounded-xl transition-all border border-gray-200 dark:border-surface-700 shadow-sm font-medium">
            <Printer className="w-4 h-4" />
            Imprimir
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 hover:bg-gray-50 dark:hover:bg-surface-700 
                           text-gray-700 dark:text-white rounded-xl transition-all border border-gray-200 dark:border-surface-700 shadow-sm font-medium">
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Información del Lote */}
      <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-400 dark:text-surface-400" />
          Información del Lote
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-gray-500 dark:text-surface-500 text-sm font-medium">Lote</p>
            <p className="text-gray-900 dark:text-white font-mono font-bold text-lg">{settlement.batch?.internal_batch_id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-500 dark:text-surface-500 text-sm font-medium">Referencia Cliente</p>
            <p className="text-gray-700 dark:text-surface-300 font-semibold">{settlement.batch?.client_reference || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-500 dark:text-surface-500 text-sm font-medium">Fecha Recepción</p>
            <p className="text-gray-700 dark:text-surface-300 font-semibold">{formatDate(settlement.batch?.created_at)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-500 dark:text-surface-500 text-sm font-medium">Total Unidades</p>
            <p className="text-gray-900 dark:text-white font-bold text-lg">{settlement.total_units}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-900 border border-emerald-100 dark:border-emerald-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm mb-2 font-bold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            Vendidos
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{settlement.units_sold}</p>
          <p className="text-gray-500 dark:text-surface-500 text-xs mt-1 font-medium italic">
            {settlement.total_units > 0
              ? Math.round((settlement.units_sold / settlement.total_units) * 100)
              : 0}% del lote
          </p>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-emerald-100 dark:border-emerald-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm mb-2 font-bold uppercase tracking-wider">
            <DollarSign className="w-4 h-4" />
            Ingresos
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(settlement.total_revenue)}</p>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-red-100 dark:border-red-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-2 font-bold uppercase tracking-wider">
            <TrendingDown className="w-4 h-4" />
            Gastos Totales
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(settlement.total_expenses + settlement.acquisition_cost)}</p>
        </div>

        <div className={cn(
          "rounded-2xl p-4 border shadow-sm",
          settlement.net_profit >= 0
            ? "bg-white dark:bg-surface-900 border-blue-100 dark:border-blue-500/30"
            : "bg-white dark:bg-surface-900 border-red-100 dark:border-red-500/30"
        )}>
          <div className={cn(
            "flex items-center gap-2 text-sm mb-2 font-bold uppercase tracking-wider",
            settlement.net_profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
          )}>
            <DollarSign className="w-4 h-4" />
            Utilidad Neta
          </div>
          <p className={cn(
            "text-3xl font-bold tabular-nums",
            settlement.net_profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(settlement.net_profit)}
          </p>
          <p className={cn(
            "text-[10px] mt-1 px-2 py-0.5 rounded font-bold uppercase tracking-tighter inline-block shadow-sm",
            settlement.profit_margin_pct >= 15 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40" :
              settlement.profit_margin_pct >= 5 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40" :
                "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/40"
          )}>
            {settlement.profit_margin_pct}% margen
          </p>
        </div>
      </div>

      {/* Estado de Resultados */}
      <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-850">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Estado de Resultados
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-surface-700">
                <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-wider">
                  Concepto
                </th>
                <th className="text-right px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-wider">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-surface-800">
              {/* Inventario Inicial */}
              <tr className="bg-cyan-50/30 dark:bg-cyan-500/5">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Package className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-tight">INVENTARIO INICIAL DEL LOTE</span>
                </td>
                <td className="px-6 py-4 text-right text-cyan-700 dark:text-cyan-400 font-bold text-lg tabular-nums">
                  {formatCurrency(settlement.acquisition_cost)}
                </td>
              </tr>

              {/* Ingresos */}
              <tr className="bg-emerald-50/30 dark:bg-emerald-500/5">
                <td className="px-6 py-4 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-tight">(+) INGRESOS POR VENTAS</span>
                </td>
                <td className="px-6 py-4 text-right text-emerald-700 dark:text-emerald-400 font-bold text-lg tabular-nums">
                  {formatCurrency(settlement.gross_revenue)}
                </td>
              </tr>

              {settlement.scrap_revenue > 0 && (
                <tr className="hover:bg-gray-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4 pl-12 text-gray-600 dark:text-surface-400 font-medium">
                    (+) Ingresos por Scrap
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                    {formatCurrency(settlement.scrap_revenue)}
                  </td>
                </tr>
              )}

              {/* Costo de Adquisición */}
              <tr className="bg-red-50/30 dark:bg-red-500/5">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-400 font-bold uppercase tracking-tight">(-) COSTO DE ADQUISICIÓN</span>
                </td>
                <td className="px-6 py-4 text-right text-red-700 dark:text-red-400 font-bold tabular-nums">
                  -{formatCurrency(settlement.acquisition_cost)}
                </td>
              </tr>

              {/* Gross Profit */}
              <tr className="bg-gray-100 dark:bg-surface-800/50">
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white pl-6 uppercase tracking-tight">
                  (=) UTILIDAD BRUTA
                </td>
                <td className="px-6 py-4 text-right text-gray-900 dark:text-white font-bold text-lg tabular-nums">
                  {formatCurrency(settlement.gross_profit)}
                </td>
              </tr>

              {/* Gastos Operativos */}
              <tr className="bg-orange-50/30 dark:bg-orange-500/5">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-orange-700 dark:text-orange-400 font-bold uppercase tracking-tight">GASTOS OPERATIVOS</span>
                </td>
                <td className="px-6 py-4 text-right text-orange-700 dark:text-orange-400 font-bold tabular-nums">
                  -{formatCurrency(settlement.total_expenses)}
                </td>
              </tr>

              {settlement.logistics_cost > 0 && (
                <tr className="hover:bg-gray-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4 pl-12 flex items-center gap-2 text-gray-600 dark:text-surface-400">
                    <Truck className="w-4 h-4" />
                    Logística / Flete
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-surface-400 tabular-nums">
                    -{formatCurrency(settlement.logistics_cost)}
                  </td>
                </tr>
              )}

              {settlement.parts_cost > 0 && (
                <tr className="hover:bg-gray-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4 pl-12 flex items-center gap-2 text-gray-600 dark:text-surface-400">
                    <Wrench className="w-4 h-4" />
                    Repuestos
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-surface-400 tabular-nums">
                    -{formatCurrency(settlement.parts_cost)}
                  </td>
                </tr>
              )}

              {settlement.labor_cost > 0 && (
                <tr className="hover:bg-gray-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4 pl-12 flex items-center gap-2 text-gray-600 dark:text-surface-400">
                    <Wrench className="w-4 h-4" />
                    Mano de Obra
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-surface-400 tabular-nums">
                    -{formatCurrency(settlement.labor_cost)}
                  </td>
                </tr>
              )}

              {settlement.data_wipe_cost > 0 && (
                <tr className="hover:bg-gray-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4 pl-12 flex items-center gap-2 text-gray-600 dark:text-surface-400">
                    <HardDrive className="w-4 h-4" />
                    Borrado de Datos
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-surface-400 tabular-nums">
                    -{formatCurrency(settlement.data_wipe_cost)}
                  </td>
                </tr>
              )}

              {settlement.storage_cost > 0 && (
                <tr className="hover:bg-gray-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4 pl-12 flex items-center gap-2 text-gray-600 dark:text-surface-400">
                    <Package className="w-4 h-4" />
                    Almacenaje
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-surface-400 tabular-nums">
                    -{formatCurrency(settlement.storage_cost)}
                  </td>
                </tr>
              )}

              {settlement.other_costs > 0 && (
                <tr className="hover:bg-gray-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4 pl-12 flex items-center gap-2 text-gray-600 dark:text-surface-400">
                    <DollarSign className="w-4 h-4" />
                    Otros Gastos
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-surface-400 tabular-nums">
                    -{formatCurrency(settlement.other_costs)}
                  </td>
                </tr>
              )}

              {/* Net Profit */}
              <tr className={cn(
                "font-bold text-lg shadow-sm relative z-10",
                settlement.net_profit >= 0 ? "bg-blue-50/50 dark:bg-blue-500/10" : "bg-red-50/50 dark:bg-red-500/10"
              )}>
                <td className="px-6 py-6 flex items-center gap-3">
                  <DollarSign className={cn(
                    "w-7 h-7",
                    settlement.net_profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                  )} />
                  <span className={cn(
                    "uppercase tracking-tight text-xl font-black",
                    settlement.net_profit >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
                  )}>
                    (=) UTILIDAD NETA
                  </span>
                </td>
                <td className={cn(
                  "px-6 py-6 text-right text-2xl font-black tabular-nums",
                  settlement.net_profit >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
                )}>
                  {formatCurrency(settlement.net_profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {settlement.finalized_at && (
        <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-gray-500 dark:text-surface-400 font-medium">
            <Calendar className="w-5 h-5 text-brand-500" />
            <span>Finalizada el <span className="text-gray-900 dark:text-white">{formatDate(settlement.finalized_at)}</span></span>
            {settlement.finalized_by_user && (
              <>
                <span className="hidden md:inline text-gray-300 dark:text-surface-700">•</span>
                <span>por <span className="text-gray-900 dark:text-white">{settlement.finalized_by_user.full_name}</span></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider text-xs">Documento Oficial</span>
          </div>
        </div>
      )}
    </div>
  )
}

