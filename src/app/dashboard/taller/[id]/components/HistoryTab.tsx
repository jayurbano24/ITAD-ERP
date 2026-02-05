'use client'

import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  Package, 
  FileText,
  ShieldCheck,
  RotateCcw,
  Truck,
  DollarSign,
  ClipboardCheck,
  PlayCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type WorkOrderDetail } from '../../actions'

interface HistoryTabProps {
  workOrder: WorkOrderDetail
}

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

export function HistoryTab({ workOrder }: HistoryTabProps) {
  // Construir timeline basado en los datos de la orden
  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = []
    
    // 1. Orden creada
    events.push({
      id: 'created',
      date: workOrder.created_at,
      title: 'Orden de trabajo creada',
      description: `Problema reportado: ${workOrder.reported_issue || 'Sin especificar'}`,
      icon: PlayCircle,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20'
    })

    // 2. Diagnóstico completado
    if (workOrder.warranty_status && workOrder.warranty_status !== 'pending_validation') {
      const diagDate = workOrder.started_at || workOrder.updated_at
      events.push({
        id: 'diagnosis',
        date: diagDate,
        title: 'Diagnóstico completado',
        description: workOrder.warranty_status === 'in_warranty' 
          ? `✓ En garantía - Falla: ${workOrder.failure_type || 'No especificada'}`
          : `⚠ Fuera de garantía - ${workOrder.diagnosis || 'Sin diagnóstico'}`,
        icon: workOrder.warranty_status === 'in_warranty' ? ShieldCheck : AlertTriangle,
        iconColor: workOrder.warranty_status === 'in_warranty' ? 'text-emerald-400' : 'text-amber-400',
        iconBg: workOrder.warranty_status === 'in_warranty' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
      })
    }

    // 3. Cotización enviada
    if (workOrder.quote_amount && workOrder.quote_amount > 0) {
      events.push({
        id: 'quote-sent',
        date: workOrder.updated_at,
        title: 'Cotización enviada',
        description: `Monto: Q${workOrder.quote_amount.toFixed(2)} - ${workOrder.quote_notes || 'Sin notas'}`,
        icon: DollarSign,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-500/20'
      })
    }

    // 4. Cotización aprobada/rechazada
    if (workOrder.quote_status === 'approved' && workOrder.quote_approved_at) {
      events.push({
        id: 'quote-approved',
        date: workOrder.quote_approved_at,
        title: 'Cotización aprobada por el cliente',
        description: 'Se procede con la reparación',
        icon: CheckCircle,
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-500/20'
      })
    } else if (workOrder.quote_status === 'rejected') {
      events.push({
        id: 'quote-rejected',
        date: workOrder.updated_at,
        title: 'Cotización rechazada',
        description: 'Cliente decidió no proceder con la reparación',
        icon: XCircle,
        iconColor: 'text-red-400',
        iconBg: 'bg-red-500/20'
      })
    }

    // 5. Inicio de reparación
    if (workOrder.started_at && workOrder.status !== 'open') {
      const alreadyHasDiag = events.some(e => e.id === 'diagnosis')
      if (!alreadyHasDiag || workOrder.warranty_status === 'in_warranty') {
        events.push({
          id: 'repair-started',
          date: workOrder.started_at,
          title: 'Reparación iniciada',
          description: `Técnico: ${workOrder.technician?.full_name || 'Sin asignar'}`,
          icon: Wrench,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/20'
        })
      }
    }

    // 6. Solicitudes de piezas
    if (workOrder.part_requests && workOrder.part_requests.length > 0) {
      workOrder.part_requests.forEach((pr, idx) => {
        events.push({
          id: `part-request-${idx}`,
          date: pr.created_at,
          title: `Pieza solicitada: ${pr.part_name || pr.part_sku}`,
          description: pr.status === 'dispensed' 
            ? '✓ Despachada'
            : pr.status === 'pending'
              ? '⏳ Pendiente de despacho'
              : pr.status,
          icon: Package,
          iconColor: pr.status === 'dispensed' ? 'text-emerald-400' : 'text-purple-400',
          iconBg: pr.status === 'dispensed' ? 'bg-emerald-500/20' : 'bg-purple-500/20'
        })
      })
    }

    // 7. Seedstock
    if (workOrder.seedstock_exchange && workOrder.seedstock_date) {
      events.push({
        id: 'seedstock',
        date: workOrder.seedstock_date,
        title: 'Cambio de unidad (Seedstock)',
        description: `IMEI Original: ${workOrder.original_imei} → Nuevo: ${workOrder.new_imei}`,
        icon: RotateCcw,
        iconColor: 'text-cyan-400',
        iconBg: 'bg-cyan-500/20'
      })
    }

    // 8. Irreparable
    if (workOrder.is_irreparable && workOrder.irreparable_marked_at) {
      events.push({
        id: 'irreparable',
        date: workOrder.irreparable_marked_at,
        title: 'Marcado como irreparable',
        description: workOrder.irreparable_reason || 'Sin razón especificada',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        iconBg: 'bg-red-500/20'
      })
    }

    // 9. QC realizado
    if (workOrder.qc_performed_at) {
      events.push({
        id: 'qc',
        date: workOrder.qc_performed_at,
        title: workOrder.qc_passed ? 'QC Aprobado' : 'QC Fallido',
        description: workOrder.qc_passed 
          ? 'Todas las pruebas pasaron exitosamente'
          : 'Algunas pruebas fallaron - Requiere revisión',
        icon: ClipboardCheck,
        iconColor: workOrder.qc_passed ? 'text-emerald-400' : 'text-red-400',
        iconBg: workOrder.qc_passed ? 'bg-emerald-500/20' : 'bg-red-500/20'
      })
    }

    // 10. Orden completada
    if (workOrder.completed_at) {
      events.push({
        id: 'completed',
        date: workOrder.completed_at,
        title: 'Orden completada',
        description: workOrder.resolution || 'Sin resolución especificada',
        icon: CheckCircle,
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-500/20'
      })
    }

    // 11. Listo para entrega
    if (workOrder.status === 'ready_to_ship') {
      events.push({
        id: 'ready-to-ship',
        date: workOrder.updated_at,
        title: 'Listo para entrega al cliente',
        description: workOrder.is_irreparable 
          ? 'Equipo irreparable - Devolución'
          : workOrder.quote_status === 'rejected'
            ? 'Cotización rechazada - Devolución'
            : 'Equipo listo para recoger',
        icon: Truck,
        iconColor: 'text-teal-400',
        iconBg: 'bg-teal-500/20'
      })
    }

    // Ordenar por fecha
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const timeline = buildTimeline()

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Clock className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Historial de la Orden</h2>
          <p className="text-surface-400 text-sm">
            Timeline completo de eventos • {timeline.length} eventos registrados
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-surface-700 via-surface-700 to-transparent" />

        <div className="space-y-6">
          {timeline.map((event, index) => {
            const Icon = event.icon
            const { date, time } = formatDateTime(event.date)
            const isLast = index === timeline.length - 1

            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Icono */}
                <div className={cn(
                  "relative z-10 w-12 h-12 rounded-xl flex items-center justify-center border",
                  event.iconBg,
                  isLast ? "ring-2 ring-offset-2 ring-offset-surface-900" : "",
                  isLast ? "ring-emerald-500/30" : ""
                )}>
                  <Icon className={cn("w-5 h-5", event.iconColor)} />
                </div>

                {/* Contenido */}
                <div className={cn(
                  "flex-1 bg-surface-800/50 border border-surface-700/50 rounded-xl p-4",
                  isLast && "border-emerald-500/30 bg-emerald-500/5"
                )}>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-white font-semibold">{event.title}</h3>
                    <div className="text-right">
                      <span className="text-surface-400 text-xs block">{date}</span>
                      <span className="text-surface-500 text-xs">{time}</span>
                    </div>
                  </div>
                  <p className="text-surface-400 text-sm">{event.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Estado Actual */}
      <div className="mt-8 p-4 bg-surface-800/50 border border-surface-700 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-surface-500 text-xs uppercase tracking-wider">Estado Actual</span>
            <p className="text-white font-bold text-lg mt-1 capitalize">
              {workOrder.status.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-surface-500 text-xs uppercase tracking-wider">Última actualización</span>
            <p className="text-surface-300 text-sm mt-1">
              {formatDateTime(workOrder.updated_at).date} a las {formatDateTime(workOrder.updated_at).time}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

