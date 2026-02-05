import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react'
import { getPendingPartRequests, getDispatchStats } from './actions'
import { PartRequestsTable } from './components/PartRequestsTable'

export const dynamic = 'force-dynamic'

export default async function SolicitudesPage() {
  // Fetch data en paralelo
  const [requestsResult, stats] = await Promise.all([
    getPendingPartRequests(),
    getDispatchStats()
  ])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-purple-500" />
          Solicitudes de Piezas
        </h1>
        <p className="text-surface-400 mt-1">
          Procesa las solicitudes de repuestos enviadas por el taller
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.pendingRequests}</p>
              <p className="text-sm text-surface-400">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.dispatchedToday}</p>
              <p className="text-sm text-surface-400">Despachados Hoy</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.lowStockAlerts}</p>
              <p className="text-sm text-surface-400">Stock Bajo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {requestsResult.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">
            Error al cargar solicitudes: {requestsResult.error}
          </p>
        </div>
      )}

      {/* Tabla de Solicitudes */}
      <PartRequestsTable requests={requestsResult.data} />
    </div>
  )
}
