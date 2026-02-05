import React from 'react'
import { useRouter } from 'next/navigation'
import { TicketData } from '../types/modal'

// Ejemplo de componente de tabla con integración del modal
export const TicketTableWithModal: React.FC = () => {
  const router = useRouter()

  // Datos de ejemplo
  const tickets: TicketData[] = [
    {
      id: 'TK-2026-00005',
      client: 'Empresa ABC S.A.',
      description: 'Recolección de equipos de cómputo',
      status: 'Pendiente',
      date: '2026-01-15',
      receivedUnits: 0,
      totalUnits: 5,
      items: [
        {
          id: '1',
          brandName: 'Dell',
          modelName: 'OptiPlex 7090',
          productTypeName: 'Desktop',
          expectedQuantity: 3,
          receivedQuantity: 0
        },
        {
          id: '2',
          brandName: 'HP',
          modelName: 'EliteBook 840 G8',
          productTypeName: 'Laptop',
          expectedQuantity: 2,
          receivedQuantity: 0
        }
      ]
    },
    {
      id: 'TK-2026-00006',
      client: 'Corporación XYZ',
      description: 'DATA WIPE - Servidores',
      status: 'En Progreso',
      date: '2026-01-16',
      receivedUnits: 2,
      totalUnits: 4,
      items: [
        {
          id: '3',
          brandName: 'Dell',
          modelName: 'PowerEdge R740',
          productTypeName: 'Server',
          expectedQuantity: 2,
          receivedQuantity: 1
        },
        {
          id: '4',
          brandName: 'HPE',
          modelName: 'ProLiant DL380',
          productTypeName: 'Server',
          expectedQuantity: 2,
          receivedQuantity: 1
        }
      ]
    }
  ]

  const handleStartLoading = (ticket: TicketData) => {
    console.log('Iniciando carga para ticket:', ticket.id)
    // Aquí iría la lógica para iniciar la carga de equipos
    // Por ejemplo: navigate(`/logistica/${ticket.id}/loading`)
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'Pendiente': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'En Progreso': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Completado': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${colors[status as keyof typeof colors] || colors['Pendiente']}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gestión de Tickets</h1>
        <div className="text-sm text-gray-400">
          {tickets.length} tickets encontrados
        </div>
      </div>

      {/* Tabla de tickets */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ticket ID</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unidades</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <span className="text-xs font-mono text-emerald-400">{ticket.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{ticket.client}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 truncate max-w-xs" title={ticket.description}>
                      {ticket.description}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-white">
                      {ticket.receivedUnits}/{ticket.totalUnits}
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round((ticket.receivedUnits / ticket.totalUnits) * 100)}% completado
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{ticket.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/logistica/${ticket.id}?mode=loading`)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                      >
                        Gestionar
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de gestión de tickets */}
    </div>
  )
}

export default TicketTableWithModal
