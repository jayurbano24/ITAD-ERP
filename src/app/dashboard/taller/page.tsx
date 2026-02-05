import { TallerHeader } from './components/TallerHeader'
import TallerStageDashboard from './components/TallerStageDashboard'
import { getWorkOrders } from './actions'

export default async function TallerPage() {
  const { data: workOrders, error } = await getWorkOrders()

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors">
      <TallerHeader />
      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          Error al cargar órdenes: {error}
        </div>
      ) : (
        <TallerStageDashboard workOrders={workOrders} />
      )}
    </div>
  )
}

