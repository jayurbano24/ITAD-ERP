'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Clock, Truck, Layers, CheckCircle2, Edit2, Trash2, Package } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatsCard } from '@/components/ui/StatsCard'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/utils'
import type { TicketItem as LogisticaTicketItem } from '../types'

export type LogisticsStatus = 'Pendiente' | 'En Proceso' | 'Recibido Parcial' | 'Completado' | 'in_progress' | 'completed'

export interface LogisticsTicketRow {
  id: string
  client: string
  status: LogisticsStatus
  totalUnits: number
  receivedUnits: number
  date: string
  location: string
  description: string
  completedBy?: string
  collectorName?: string
  completedAt?: string | null
  items?: LogisticaTicketItem[]
}

const statusVariantMap: Record<LogisticsStatus, any> = {
  'Pendiente': 'pendiente',
  'En Proceso': 'en-proceso',
  'in_progress': 'en-proceso',
  'Recibido Parcial': 'itad-services',
  'Completado': 'completado',
  'completed': 'completado'
}

const getProgressRatio = (ticket: LogisticsTicketRow) => {
  if (!ticket.totalUnits) return 0
  return Math.min((ticket.receivedUnits / ticket.totalUnits) * 100, 100)
}

const formatDate = (ticket: LogisticsTicketRow) => {
  if (ticket.completedAt) {
    try {
      let dateStr = String(ticket.completedAt).trim();
      if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return ticket.date || 'No disponible';
      if (dateStr.length <= 10) dateStr = dateStr + 'T00:00:00';
      if (!dateStr.includes('T') && dateStr.includes(' ')) dateStr = dateStr.replace(' ', 'T');
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return ticket.date || 'No disponible';

      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return ticket.date || 'No disponible';
    }
  }
  return ticket.date || 'No disponible';
}

const LogisticsDashboard: React.FC<{ tickets: LogisticsTicketRow[] }> = ({ tickets }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reopeningId, setReopeningId] = useState<string | null>(null)
  const router = useRouter()

  const filteredTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.client.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, tickets]
  )

  const kpis = useMemo(
    () => ({
      pendientes: tickets.filter((ticket) => ticket.status === 'Pendiente').length,
      enProceso: tickets.filter((ticket) => ticket.status === 'En Proceso').length,
      recibidos: tickets.filter((ticket) => ticket.status === 'Recibido Parcial').length,
      completados: tickets.filter((ticket) => ticket.status === 'Completado').length
    }),
    [tickets]
  )

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ticket? Esta acción no se puede deshacer.')) return
    setDeletingId(ticketId)
    try {
      const response = await fetch(`/api/logistica/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) router.refresh()
      else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al eliminar el ticket')
      }
    } catch (error) {
      alert(`Error al eliminar el ticket: ${error instanceof Error ? error.message : 'Error de conexión'}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleReopenTicket = async (ticketId: string) => {
    if (!confirm('¿Reabrir logística de este ticket?')) return
    setReopeningId(ticketId)
    try {
      const response = await fetch(`/api/logistica/tickets/${ticketId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No fue posible reabrir la logística')
      }
      router.refresh()
    } catch (error) {
      alert(`Error al reabrir la logística: ${error instanceof Error ? error.message : 'Error de conexión'}`)
    } finally {
      setReopeningId(null)
    }
  }

  const columns = [
    {
      header: 'Ticket',
      key: 'id',
      render: (row: LogisticsTicketRow) => <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">{row.id}</span>
    },
    {
      header: 'Cliente',
      key: 'client',
      render: (row: LogisticsTicketRow) => <Text variant="body">{row.client}</Text>
    },
    {
      header: 'Completado por',
      key: 'completedBy',
      render: (row: LogisticsTicketRow) => <Text variant="secondary">{row.completedBy && row.completedBy !== '' ? row.completedBy : 'Desconocido'}</Text>
    },
    {
      header: 'Recolectado por',
      key: 'collectorName',
      render: (row: LogisticsTicketRow) => <Text variant="secondary">{row.collectorName || 'Desconocido'}</Text>
    },
    {
      header: 'Estado',
      key: 'status',
      render: (row: LogisticsTicketRow) => <Badge variant={statusVariantMap[row.status]}>{row.status}</Badge>
    },
    {
      header: 'Unidades',
      key: 'units',
      className: 'text-center',
      render: (row: LogisticsTicketRow) => (
        <div className="flex flex-col items-center gap-1">
          <Text variant="label" className="text-gray-700 dark:text-gray-300">
            {row.receivedUnits} / {row.totalUnits}
          </Text>
          <div className="w-20 bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                row.status === 'Completado' ? 'bg-emerald-500' : 'bg-brand-500'
              )}
              style={{ width: `${getProgressRatio(row)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      header: 'Cierre',
      key: 'date',
      render: (row: LogisticsTicketRow) => <Text variant="tertiary" className="font-medium">{formatDate(row)}</Text>
    },
    {
      header: 'Acciones',
      key: 'actions',
      className: 'text-right',
      render: (row: LogisticsTicketRow) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === 'Completado' ? (
            <div className="flex items-center gap-2">
              <Badge variant="completado" size="sm">✓ Finalizado</Badge>
              <button
                onClick={() => handleReopenTicket(row.id)}
                disabled={reopeningId === row.id}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                Reabrir
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => router.push(`/dashboard/logistica/${row.id}`)}
                className="p-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                title="Editar ticket"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteTicket(row.id)}
                disabled={deletingId === row.id}
                className="p-2 text-gray-900 dark:text-gray-100 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50"
                title="Eliminar ticket"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => router.push(`/dashboard/logistica/${row.id}?mode=loading`)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-lg shadow-brand-500/20"
              >
                Gestionar
              </button>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors">
      <PageHeader
        icon={Package}
        title="Logística"
        subtitle="Gestión de ingreso y clasificación de lotes"
        actions={
          <div className="w-full md:w-80">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ticket o cliente..."
            />
          </div>
        }
      />

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard label="Pendientes" value={kpis.pendientes} icon={Clock} color="orange" />
          <StatsCard label="En Proceso" value={kpis.enProceso} icon={Truck} color="blue" />
          <StatsCard label="Recibidos Parcial" value={kpis.recibidos} icon={Layers} color="purple" />
          <StatsCard label="Completados" value={kpis.completados} icon={CheckCircle2} color="green" />
        </div>

        <DataTable
          columns={columns}
          data={filteredTickets}
        />
      </div>

    </div>
  )
}

export default LogisticsDashboard
