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
  Download,
  Calculator,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateLotPnL } from '../../actions'
import { EditExpenseButton } from './components/EditExpenseButton'
import { SaveSettlementButton } from './components/SaveSettlementButton'
import { ExportPDFButton } from './components/ExportPDFButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LotPnLPage({ params }: PageProps) {
  const { id } = await params
  const { data: pnl, error } = await calculateLotPnL(id)

  if (error || !pnl) {
    notFound()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value || 0)
  }

  const safeMargin = isNaN(pnl.profit_margin_pct) || pnl.profit_margin_pct === null || pnl.profit_margin_pct === undefined ? 0 : pnl.profit_margin_pct

  const maxValue = Math.max(pnl.gross_revenue, pnl.acquisition_cost + pnl.total_expenses)
  const getHeight = (value: number) => Math.max((value / maxValue) * 180, 10)
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finanzas" className="p-2 hover:bg-surface-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-surface-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-amber-400" />
              Rentabilidad del Lote
            </h1>
            <p className="text-surface-400">Lote {pnl.batch_number} • Análisis P&L en Tiempo Real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportPDFButton pnl={pnl} />
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 text-center">
          <Package className="w-5 h-5 text-surface-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{pnl.total_units}</p>
          <p className="text-surface-500 text-xs">Total Unidades</p>
        </div>
        <div className="bg-surface-900 border border-emerald-500/30 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-emerald-400">{pnl.units_sold}</p>
          <p className="text-surface-500 text-xs">Vendidos ({pnl.sell_through_pct}%)</p>
        </div>
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 text-center">
          <DollarSign className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-surface-300">{formatCurrency(pnl.gross_revenue)}</p>
          <p className="text-surface-500 text-xs">Ventas Totales</p>
        </div>
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 text-center">
          <Package className="w-5 h-5 text-surface-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-surface-300">{formatCurrency(pnl.avg_cost_per_unit)}</p>
          <p className="text-surface-500 text-xs">Costo Prom. por Unidad</p>
        </div>
        <div className={cn(
          "rounded-xl p-4 text-center border",
          safeMargin >= 15 ? "bg-surface-900 border-emerald-500/30" :
          safeMargin >= 0 ? "bg-surface-900 border-amber-500/30" :
          "bg-surface-900 border-red-500/30"
        )}>
          <Calculator className={cn(
            "w-5 h-5 mx-auto mb-2",
            safeMargin >= 15 ? "text-emerald-400" :
            safeMargin >= 0 ? "text-amber-400" : "text-red-400"
          )} />
          <p className={cn(
            "text-2xl font-bold",
            safeMargin >= 15 ? "text-emerald-400" :
            safeMargin >= 0 ? "text-amber-400" : "text-red-400"
          )}>
            {safeMargin}%
          </p>
          <p className="text-surface-500 text-xs">Margen</p>
        </div>
      </div>

      {/* Gráfico de Cascada (Waterfall Chart) */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          Flujo Financiero (Waterfall)
        </h2>
        
        <div className="flex items-end justify-between gap-3 h-64 px-4">
          {/* Ventas */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg shadow-lg shadow-emerald-500/20 transition-all"
              style={{ height: getHeight(pnl.gross_revenue) }}
            />
            <div className="mt-3 text-center">
              <p className="text-emerald-400 font-bold">{formatCurrency(pnl.gross_revenue)}</p>
              <p className="text-surface-500 text-xs">Ventas</p>
            </div>
          </div>

          {/* Costo Adquisición */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-red-700 to-red-500 rounded-t-lg shadow-lg shadow-red-500/20 transition-all"
              style={{ height: getHeight(pnl.acquisition_cost) }}
            />
            <div className="mt-3 text-center">
              <p className="text-red-400 font-bold">-{formatCurrency(pnl.acquisition_cost)}</p>
              <p className="text-surface-500 text-xs">Costo Lote</p>
            </div>
          </div>

          {/* Logística */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg shadow-lg shadow-orange-500/20 transition-all"
              style={{ height: getHeight(pnl.logistics_cost) }}
            />
            <div className="mt-3 text-center">
              <p className="text-orange-400 font-bold">-{formatCurrency(pnl.logistics_cost)}</p>
              <p className="text-surface-500 text-xs">Logística</p>
            </div>
          </div>

          {/* Repuestos */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg shadow-lg shadow-amber-500/20 transition-all"
              style={{ height: getHeight(pnl.parts_cost) }}
            />
            <div className="mt-3 text-center">
              <p className="text-amber-400 font-bold">-{formatCurrency(pnl.parts_cost)}</p>
              <p className="text-surface-500 text-xs">Repuestos</p>
            </div>
          </div>

          {/* Mano de Obra */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg shadow-lg shadow-yellow-500/20 transition-all"
              style={{ height: getHeight(pnl.labor_cost) }}
            />
            <div className="mt-3 text-center">
              <p className="text-yellow-400 font-bold">-{formatCurrency(pnl.labor_cost)}</p>
              <p className="text-surface-500 text-xs">Mano de Obra</p>
            </div>
          </div>

          {/* Borrado */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg shadow-lg shadow-purple-500/20 transition-all"
              style={{ height: getHeight(pnl.data_wipe_cost) }}
            />
            <div className="mt-3 text-center">
              <p className="text-purple-400 font-bold">-{formatCurrency(pnl.data_wipe_cost)}</p>
              <p className="text-surface-500 text-xs">Borrado</p>
            </div>
          </div>

          {/* Marketing */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-pink-600 to-pink-400 rounded-t-lg shadow-lg shadow-pink-500/20 transition-all"
              style={{ height: getHeight(pnl.marketing_cost) }}
            />
            <div className="mt-3 text-center">
              <p className="text-pink-400 font-bold">-{formatCurrency(pnl.marketing_cost)}</p>
              <p className="text-surface-500 text-xs">Marketing</p>
            </div>
          </div>

          {/* Separador visual */}
          <div className="w-px h-48 bg-surface-700 mx-2" />

          {/* Ganancia Neta */}
          <div className="flex-1 flex flex-col items-center">
            <div 
              className={cn(
                "w-full rounded-t-lg shadow-lg transition-all",
                pnl.operating_profit >= 0 
                  ? "bg-gradient-to-t from-blue-600 to-blue-400 shadow-blue-500/20"
                  : "bg-gradient-to-t from-red-800 to-red-600 shadow-red-500/20"
              )}
              style={{ height: getHeight(Math.abs(pnl.operating_profit)) }}
            />
            <div className="mt-3 text-center">
              <p className={cn(
                "font-bold text-lg",
                pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400"
              )}>
                {formatCurrency(pnl.operating_profit)}
              </p>
              <p className="text-surface-500 text-xs font-semibold">GANANCIA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Desglose */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-surface-800 bg-surface-850">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Estado de Resultados Detallado
          </h2>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left px-6 py-4 text-surface-400 text-xs font-semibold uppercase">
                Concepto
              </th>
              <th className="text-right px-6 py-4 text-surface-400 text-xs font-semibold uppercase">
                Monto
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {/* Ingresos */}
            <tr className="bg-emerald-500/5">
              <td className="px-6 py-4 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">(+) VENTAS TOTALES</span>
              </td>
              <td className="px-6 py-4 text-right text-emerald-400 font-bold text-lg">
                {formatCurrency(pnl.gross_revenue)}
              </td>
            </tr>

            {/* Costos */}
            <tr className="bg-red-500/5">
              <td className="px-6 py-4 flex items-center gap-3">
                <Package className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold">(-) Costo de Adquisición</span>
                <span className="ml-3">
                  <EditExpenseButton 
                    batchId={pnl.batch_id} 
                    type="acquisition" 
                    currentAmount={pnl.acquisition_cost} 
                    label="Editar"
                  />
                </span>
              </td>
              <td className="px-6 py-4 text-right text-red-400 font-bold">
                -{formatCurrency(pnl.acquisition_cost)}
              </td>
            </tr>

            <tr>
              <td className="px-6 py-3 pl-12 flex items-center gap-2 text-surface-400">
                <Truck className="w-4 h-4" />
                (-) Logística / Flete
                <span className="ml-3">
                  <EditExpenseButton 
                    batchId={pnl.batch_id} 
                    type="logistics" 
                    currentAmount={pnl.logistics_cost} 
                    label="Editar"
                  />
                </span>
              </td>
              <td className="px-6 py-3 text-right text-red-400">
                -{formatCurrency(pnl.logistics_cost)}
              </td>
            </tr>

            <tr>
              <td className="px-6 py-3 pl-12 flex items-center gap-2 text-surface-400">
                <Wrench className="w-4 h-4" />
                (-) Costo Repuestos
                <span className="ml-3">
                  <EditExpenseButton 
                    batchId={pnl.batch_id} 
                    type="parts" 
                    currentAmount={pnl.parts_cost} 
                    label="Editar"
                  />
                </span>
              </td>
              <td className="px-6 py-3 text-right text-red-400">
                -{formatCurrency(pnl.parts_cost)}
              </td>
            </tr>

            <tr>
              <td className="px-6 py-3 pl-12 flex items-center gap-2 text-surface-400">
                <Wrench className="w-4 h-4" />
                (-) Mano de Obra
                <span className="ml-3">
                  <EditExpenseButton 
                    batchId={pnl.batch_id} 
                    type="labor" 
                    currentAmount={pnl.labor_cost} 
                    label="Editar"
                  />
                </span>
              </td>
              <td className="px-6 py-3 text-right text-red-400">
                -{formatCurrency(pnl.labor_cost)}
              </td>
            </tr>

            <tr>
              <td className="px-6 py-3 pl-12 flex items-center gap-2 text-surface-400">
                <HardDrive className="w-4 h-4" />
                (-) Borrado de Datos
                <span className="ml-3">
                  <EditExpenseButton 
                    batchId={pnl.batch_id} 
                    type="data_wipe" 
                    currentAmount={pnl.data_wipe_cost} 
                    label="Editar"
                  />
                </span>
              </td>
              <td className="px-6 py-3 text-right text-red-400">
                -{formatCurrency(pnl.data_wipe_cost)}
              </td>
            </tr>

            <tr>
              <td className="px-6 py-3 pl-12 flex items-center gap-2 text-surface-400">
                <DollarSign className="w-4 h-4" />
                (-) Inversión en Marketing
                <span className="ml-3">
                  <EditExpenseButton 
                    batchId={pnl.batch_id} 
                    type="marketing" 
                    currentAmount={pnl.marketing_cost} 
                    label="Editar"
                  />
                </span>
              </td>
              <td className="px-6 py-3 text-right text-red-400">
                -{formatCurrency(pnl.marketing_cost)}
              </td>
            </tr>

            {pnl.other_costs > 0 && (
              <tr>
                <td className="px-6 py-3 pl-12 flex items-center gap-2 text-surface-400">
                  <DollarSign className="w-4 h-4" />
                  (-) Otros Gastos
                  <span className="ml-3">
                    <EditExpenseButton 
                      batchId={pnl.batch_id} 
                      type="other" 
                      currentAmount={pnl.other_costs} 
                      label="Editar"
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-red-400">
                  -{formatCurrency(pnl.other_costs)}
                </td>
              </tr>
            )}

            {/* Resultado Final */}
            <tr className={cn(
              "font-bold text-lg",
              pnl.operating_profit >= 0 ? "bg-blue-500/10" : "bg-red-500/10"
            )}>
              <td className="px-6 py-5 flex items-center gap-3">
                <DollarSign className={cn(
                  "w-6 h-6",
                  pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400"
                )} />
                <span className={pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400"}>
                  (=) GANANCIA NETA
                </span>
                <span className={cn(
                  "ml-2 px-2 py-1 rounded text-sm",
                  pnl.profit_margin_pct >= 20 ? "bg-emerald-500/20 text-emerald-400" :
                  pnl.profit_margin_pct >= 10 ? "bg-amber-500/20 text-amber-400" :
                  pnl.profit_margin_pct >= 0 ? "bg-blue-500/20 text-blue-400" :
                  "bg-red-500/20 text-red-400"
                )}>
                  {pnl.profit_margin_pct}% margen
                </span>
              </td>
              <td className={cn(
                "px-6 py-5 text-right text-2xl",
                pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400"
              )}>
                {formatCurrency(pnl.operating_profit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

