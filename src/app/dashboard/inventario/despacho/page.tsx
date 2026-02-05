import { 
  Package, 
  RefreshCw, 
  AlertTriangle, 
  TrendingDown,
  CheckCircle,
  Clock
} from 'lucide-react'
import { 
  getOrdersWaitingParts, 
  getOrdersWaitingSeedstock,
  getDispatchStats 
} from './actions'
import { DispatchTabs } from './components/DispatchTabs'

export default async function DespachoPage() {
  // Fetch data en paralelo
  const [partsResult, seedstockResult, stats] = await Promise.all([
    getOrdersWaitingParts(),
    getOrdersWaitingSeedstock(),
    getDispatchStats()
  ])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Package className="w-8 h-8 text-indigo-500" />
          Centro de Despacho
        </h1>
        <p className="text-surface-400 mt-1">
          Gestión de despachos de repuestos y unidades seedstock para taller
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.waitingParts}</p>
              <p className="text-sm text-surface-400">Esperando Piezas</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.waitingSeedstock}</p>
              <p className="text-sm text-surface-400">Esperando Seedstock</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.lowStock}</p>
              <p className="text-sm text-surface-400">Stock Bajo</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.dispatchedToday}</p>
              <p className="text-sm text-surface-400">Despachados Hoy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Errores */}
      {(partsResult.error || seedstockResult.error) && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">
            Error al cargar datos: {partsResult.error || seedstockResult.error}
          </p>
        </div>
      )}

      {/* Tabs Component (Client) */}
      <DispatchTabs 
        ordersWaitingParts={partsResult.data}
        ordersWaitingSeedstock={seedstockResult.data}
      />
    </div>
  )
}

