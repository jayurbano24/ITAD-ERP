import Link from 'next/link'
import { 
  Package, 
  Truck, 
  DollarSign, 
  FileCheck,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { getClientDashboardStats, getClientRecentTickets } from './actions'

export const dynamic = 'force-dynamic'

export default async function PortalDashboardPage() {
  const [stats, recentTickets] = await Promise.all([
    getClientDashboardStats(),
    getClientRecentTickets(5)
  ])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Abierto
          </span>
        )
      case 'assigned':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">
            <Loader2 className="w-3 h-3" />
            Asignado
          </span>
        )
      case 'in_progress':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            En Proceso
          </span>
        )
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Completado
          </span>
        )
      case 'cancelled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Cancelado
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
            {status}
          </span>
        )
    }
  }

  const getTicketTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'recoleccion': 'Recolección',
      'reparacion': 'Reparación',
      'servicio': 'Servicio',
      'consulta': 'Consulta'
    }
    return types[type] || type
  }

  return (
    <div className="p-8 space-y-8">
      {/* KPIs */}
      <section className="grid grid-cols-4 gap-6">
        {/* Equipos Procesados */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Procesados este mes</p>
              <p className="text-2xl font-bold text-slate-800">{stats.processedThisMonth}</p>
            </div>
          </div>
        </div>

        {/* Recolecciones Pendientes */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Truck className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Recolecciones Pendientes</p>
              <p className="text-2xl font-bold text-slate-800">{stats.pendingPickups}</p>
            </div>
          </div>
        </div>

        {/* Total Activos */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Activos</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalAssets}</p>
            </div>
          </div>
        </div>

        {/* Certificados Disponibles */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <FileCheck className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Certificados Disponibles</p>
              <p className="text-2xl font-bold text-slate-800">{stats.certificatesAvailable}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Acciones Rápidas */}
      <section className="grid grid-cols-3 gap-6">
        <Link 
          href="/portal/solicitud"
          className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 
                   text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30
                   transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <Truck className="w-8 h-8 mb-3 opacity-90" />
              <h3 className="text-lg font-semibold mb-1">Solicitar Recolección</h3>
              <p className="text-blue-100 text-sm">Agenda una recolección de equipos</p>
            </div>
            <ArrowRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link 
          href="/portal/activos"
          className="group bg-white rounded-2xl p-6 border border-slate-200 
                   hover:border-blue-300 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <Package className="w-8 h-8 mb-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Ver Mis Activos</h3>
              <p className="text-slate-500 text-sm">Consulta el estado de tus equipos</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link 
          href="/portal/certificados"
          className="group bg-white rounded-2xl p-6 border border-slate-200 
                   hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <FileCheck className="w-8 h-8 mb-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Mis Certificados</h3>
              <p className="text-slate-500 text-sm">Descarga certificados de borrado</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </section>

      {/* Tickets Recientes */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Tickets Recientes</h2>
          <Link 
            href="/portal/tickets"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTickets.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Ticket
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Tipo
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Descripción
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Estado
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-semibold text-slate-700">
                      {ticket.readable_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600">
                      {getTicketTypeLabel(ticket.ticket_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600 truncate max-w-xs">{ticket.title}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 text-sm">
                    {new Date(ticket.created_at).toLocaleDateString('es-GT', {
                      day: '2-digit',
                      month: 'short'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay tickets recientes</p>
            <Link 
              href="/portal/solicitud"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-500 text-white 
                       rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <Truck className="w-4 h-4" />
              Crear primera solicitud
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

