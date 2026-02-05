import { Suspense } from 'react'
import { FileText, Loader2, ClipboardCheck, Clock, CheckCircle2 } from 'lucide-react'
import { getTickets } from './actions'
import { getClients } from '../clientes/actions'
import { getCatalogItems } from '../configuracion/usuarios/actions'
import TicketsTable from './components/TicketsTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatsCard } from '@/components/ui/StatsCard'

/**
 * Página de Tickets de Operaciones (Service Desk)
 * Gestión de órdenes de trabajo y servicios
 */
export default async function TicketsPage() {
  const [ticketsResult, clientsResult, serviceTypes, brands, models, productTypes] = await Promise.all([
    getTickets(),
    getClients(),
    getCatalogItems('catalog_service_types'),
    getCatalogItems('catalog_brands'),
    getCatalogItems('catalog_models'),
    getCatalogItems('catalog_product_types')
  ])

  const tickets = ticketsResult.data || []
  const clients = clientsResult.data || []

  const inProgressStatuses = ['open', 'assigned', 'confirmed', 'in_progress']

  const stats = {
    total: tickets.length,
    draft: tickets.filter(t => t.status === 'draft').length,
    inProgress: tickets.filter(t => inProgressStatuses.includes(t.status)).length,
    completed: tickets.filter(t => t.status === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors">
      <PageHeader
        icon={FileText}
        title="Tickets de Operaciones"
        subtitle="Gestión de órdenes de trabajo y servicios"
        actions={
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">Sincronizado</p>
              <p className="text-xs font-medium text-gray-500 dark:text-surface-400">Total: {stats.total} tickets</p>
            </div>
          </div>
        }
      />

      <main className="p-8 space-y-8 max-w-[1600px] mx-auto">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total" value={stats.total} icon={FileText} color="blue" />
          <StatsCard label="Borrador" value={stats.draft} icon={ClipboardCheck} color="amber" />
          <StatsCard label="En Proceso" value={stats.inProgress} icon={Clock} color="cyan" />
          <StatsCard label="Completados" value={stats.completed} icon={CheckCircle2} color="green" />
        </div>

        <Suspense fallback={<LoadingState />}>
          <TicketsTable
            initialTickets={tickets}
            clients={clients}
            serviceTypes={serviceTypes}
            brands={brands}
            models={models}
            productTypes={productTypes}
          />
        </Suspense>
      </main>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  )
}

