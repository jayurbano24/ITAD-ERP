import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Calculator
} from 'lucide-react'
import { getBatchesForSettlement, getSettlements, getFinancialSummary } from './actions'
import { BatchesForSettlementTable } from './components/BatchesForSettlementTable'
import { SettlementsTable } from './components/SettlementsTable'

export const dynamic = 'force-dynamic'

export default async function FinanzasPage() {
  const [batchesResult, settlementsResult, summary] = await Promise.all([
    getBatchesForSettlement(),
    getSettlements(),
    getFinancialSummary()
  ])

  const batches = batchesResult.data || []
  const settlements = settlementsResult.data || []

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-surface-950 min-h-screen transition-colors">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          Finanzas
        </h1>
        <p className="text-gray-600 dark:text-surface-400 mt-1">
          Liquidación de Lotes • Estado de Resultados • P&L
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ingresos Totales */}
        <div className="bg-emerald-50 dark:bg-emerald-500/15 
                      border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 shadow-sm dark:shadow-none transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-emerald-700 dark:text-emerald-400/80 text-sm font-medium">Ingresos Totales</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalRevenue)}</p>
          <p className="text-emerald-600/60 dark:text-emerald-400/50 text-sm mt-1">
            {summary.settlementCount} liquidaciones
          </p>
        </div>

        {/* Gastos Totales */}
        <div className="bg-red-50 dark:bg-red-500/15 
                      border border-red-200 dark:border-red-500/30 rounded-2xl p-6 shadow-sm dark:shadow-none transition-all hover:border-red-300 dark:hover:border-red-500/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-red-700 dark:text-red-400/80 text-sm font-medium">Gastos Totales</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalExpenses)}</p>
          <p className="text-red-600/60 dark:text-red-400/50 text-sm mt-1">
            Operativos + Adquisición
          </p>
        </div>

        {/* Utilidad Neta */}
        <div className={`rounded-2xl p-6 border shadow-sm dark:shadow-none transition-all ${summary.totalProfit >= 0
            ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 hover:border-blue-300 dark:hover:border-blue-500/40'
            : 'bg-orange-50 dark:bg-orange-500/15 border-orange-200 dark:border-orange-500/30 hover:border-orange-300 dark:hover:border-orange-500/40'
          }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${summary.totalProfit >= 0 ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'}`}>
              <PieChart className={`w-5 h-5 ${summary.totalProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <span className={`text-sm font-medium ${summary.totalProfit >= 0 ? 'text-blue-700 dark:text-blue-400/80' : 'text-orange-700 dark:text-orange-400/80'}`}>
              Utilidad Neta
            </span>
          </div>
          <p className={`text-3xl font-bold ${summary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(summary.totalProfit)}
          </p>
          <p className={`text-sm mt-1 ${summary.totalProfit >= 0 ? 'text-blue-600/60 dark:text-blue-400/50' : 'text-orange-600/60 dark:text-orange-400/50'}`}>
            {summary.avgMargin}% margen promedio
          </p>
        </div>

        {/* Ventas del Mes */}
        <div className="bg-purple-50 dark:bg-purple-500/15 
                      border border-purple-200 dark:border-purple-500/30 rounded-2xl p-6 shadow-sm dark:shadow-none transition-all hover:border-purple-300 dark:hover:border-purple-500/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
              <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-purple-700 dark:text-purple-400/80 text-sm font-medium">Ventas del Mes</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.monthRevenue)}</p>
          <p className="text-purple-600/60 dark:text-purple-400/50 text-sm mt-1">
            {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Lotes para Liquidar */}
      <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="p-4 border-b border-gray-100 dark:border-surface-800 flex items-center gap-3">
          <FileText className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lotes para Liquidar</h2>
          <span className="ml-auto text-gray-500 dark:text-surface-400 text-sm">
            {batches.length} lotes disponibles
          </span>
        </div>
        <BatchesForSettlementTable batches={batches} />
      </div>

      {/* Liquidaciones Recientes */}
      {settlements.length > 0 && (
        <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="p-4 border-b border-gray-100 dark:border-surface-800 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Liquidaciones Recientes</h2>
          </div>
          <SettlementsTable settlements={settlements} />
        </div>
      )}
    </div>
  )
}

