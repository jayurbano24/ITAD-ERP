import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getWorkOrderById } from '../actions'
import { WorkOrderTabs } from './components/WorkOrderTabs'
import { WorkOrderHeader } from './components/WorkOrderHeader'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WorkOrderDetailPage({ params }: Props) {
  const { id } = await params
  const { data: workOrder, error } = await getWorkOrderById(id)

  if (error || !workOrder) {
    notFound()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Botón Volver */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/taller"
          className="p-2 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-surface-400" />
        </Link>
        <span className="text-surface-500 text-sm">Volver al listado</span>
      </div>

      {/* Header Profesional */}
      <WorkOrderHeader workOrder={workOrder} />

      {/* Tabs de Flujo de Trabajo */}
      <WorkOrderTabs workOrder={workOrder} />
    </div>
  )
}
