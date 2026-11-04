import { TallerHeader } from './components/TallerHeader'
import TallerStageDashboard from './components/TallerStageDashboard'
import { getWorkOrders } from './actions'

export default async function TallerPage() {
  const { data: workOrders, error } = await getWorkOrders()

  return (
    <div className="p-3 md:p-4 space-y-3 min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors">
      <TallerHeader />
      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
          Error al cargar órdenes: {error}
        </div>
      ) : (
        <TallerStageDashboard workOrders={workOrders} />
      )}
    </div>
  )
}

