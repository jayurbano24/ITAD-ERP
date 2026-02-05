// Ejemplo de cómo integrar AuditTimeline en la página de detalle de ticket

'use client'

import { useState } from 'react'
import AuditTimeline from '@/components/audit/AuditTimeline'
import { FileText, Package, History } from 'lucide-react'

type TicketDetailPageProps = {
  ticket: {
    id: string
    readable_id: string
    title: string
    status: string
    // ... otros campos
  }
}

export default function TicketDetailPage({ ticket }: TicketDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'history'>('details')

  return (
    <div className="p-6 space-y-6">
      {/* Header del ticket */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{ticket.readable_id}</h1>
          <p className="text-surface-400">{ticket.title}</p>
        </div>
        <div className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-semibold">
          {ticket.status}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-800">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2 transition-colors ${
            activeTab === 'details'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-surface-400 hover:text-white'
          }`}
        >
          <FileText size={18} />
          Detalles
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-4 py-2 transition-colors ${
            activeTab === 'items'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-surface-400 hover:text-white'
          }`}
        >
          <Package size={18} />
          Items
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 transition-colors ${
            activeTab === 'history'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-surface-400 hover:text-white'
          }`}
        >
          <History size={18} />
          Historial de Auditoría
        </button>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'details' && (
        <div className="p-6 bg-surface-900 rounded-xl">
          {/* Detalles del ticket */}
          <p className="text-surface-400">Contenido de detalles...</p>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="p-6 bg-surface-900 rounded-xl">
          {/* Lista de items */}
          <p className="text-surface-400">Contenido de items...</p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="p-6 bg-surface-900 rounded-xl">
          {/* Timeline de auditoría */}
          <AuditTimeline
            entityType="TICKET"
            entityId={ticket.id}
            entityReference={ticket.readable_id}
            module="TICKETS"
            showAddComment={true}
          />
        </div>
      )}
    </div>
  )
}
