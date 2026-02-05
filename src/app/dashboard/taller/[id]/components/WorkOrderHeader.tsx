/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import {
  Laptop,
  Smartphone,
  Monitor,
  Server,
  Package,
  Calendar,
  Clock,
  Wrench,
  Stethoscope,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Printer,
  FileText,
  Tag,
  Barcode,
  ShieldCheck,
  User,
  RotateCcw,
  Timer,
  Building2,
  MapPin,
  Phone,
  Mail,
  Cpu,
  HardDrive,
  MemoryStick,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type WorkOrderDetail } from '../../actions'

// Mapeo de iconos por tipo de activo
const assetTypeIcons: Record<string, React.ElementType> = {
  laptop: Laptop,
  desktop: Monitor,
  smartphone: Smartphone,
  tablet: Smartphone,
  server: Server,
  other: Package,
}

type StageStatusKey = 'diagnostico' | 'reparacion' | 'qc'

const normalizeStatusValue = (value?: string | null) =>
  value
    ?.trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ') ?? ''

const statusConfig: Record<StageStatusKey, {
  label: string
  badgeTextColor: string
  badgeBgColor: string
  icon: React.ElementType
  actionLabel: string
  actionClass: string
}> = {
  diagnostico: {
    label: 'EN DIAGNÓSTICO',
    badgeTextColor: 'text-amber-400',
    badgeBgColor: 'bg-amber-500/20 border-amber-500/40',
    icon: Stethoscope,
    actionLabel: 'Pasar a Reparación',
    actionClass: 'bg-amber-500 text-white hover:bg-amber-400 focus-visible:ring-amber-400'
  },
  reparacion: {
    label: 'EN REPARACIÓN',
    badgeTextColor: 'text-blue-400',
    badgeBgColor: 'bg-blue-500/20 border-blue-500/40',
    icon: Wrench,
    actionLabel: 'Solicitar QC',
    actionClass: 'bg-blue-500 text-white hover:bg-blue-400 focus-visible:ring-blue-400'
  },
  qc: {
    label: 'EN CONTROL DE CALIDAD',
    badgeTextColor: 'text-emerald-400',
    badgeBgColor: 'bg-emerald-500/20 border-emerald-500/40',
    icon: ClipboardCheck,
    actionLabel: 'Finalizar QC',
    actionClass: 'bg-emerald-500 text-white hover:bg-emerald-400 focus-visible:ring-emerald-400'
  }
}

const STATUS_GROUPS: Record<StageStatusKey, Set<string>> = {
  diagnostico: new Set([
    'open',
    'waiting_quote',
    'quote_rejected',
    'diagnostico',
    'en diagnostico',
    'diagnosing'
  ]),
  reparacion: new Set([
    'in_progress',
    'waiting_parts',
    'waiting_seedstock',
    'quote_approved',
    'en reparacion',
    'reparacion'
  ]),
  qc: new Set([
    'qc_pending',
    'qc_failed',
    'qc_passed',
    'qc pendiente',
    'qc',
    'en qc',
    'en control de calidad',
    'control de calidad'
  ])
}

const getStageStatusKey = (value?: string | null): StageStatusKey => {
  const normalized = normalizeStatusValue(value)
  if (!normalized) return 'diagnostico'
  if (STATUS_GROUPS.diagnostico.has(normalized)) return 'diagnostico'
  if (STATUS_GROUPS.reparacion.has(normalized)) return 'reparacion'
  if (STATUS_GROUPS.qc.has(normalized)) return 'qc'
  if (normalized.includes('qc')) return 'qc'
  if (normalized.includes('repar')) return 'reparacion'
  return 'diagnostico'
}

interface WorkOrderHeaderProps {
  workOrder: WorkOrderDetail
}

export function WorkOrderHeader({ workOrder }: WorkOrderHeaderProps) {
  const [elapsedTime, setElapsedTime] = useState('')

  const AssetIcon = workOrder.asset
    ? assetTypeIcons[workOrder.asset.asset_type] || Package
    : Package

  const assetStatusValue = workOrder.asset?.status ?? null
  const currentStageKey = getStageStatusKey(assetStatusValue ?? workOrder.status)
  const stageStatus = statusConfig[currentStageKey]
  const StatusIcon = stageStatus.icon

  // Datos del cliente
  const clientName = workOrder.ticket?.client?.commercial_name || 'Cliente no especificado'
  const clientContact = workOrder.ticket?.client?.contact_person
  const clientPhone = workOrder.ticket?.client?.phone
  const clientEmail = workOrder.ticket?.client?.email
  const clientCity = workOrder.ticket?.client?.city

  // Sucursal/Ubicación
  const location = workOrder.asset?.location || 'Taller Central'

  // Ticket original
  const ticketId = workOrder.ticket?.ticket_number
  const ticketTitle = workOrder.ticket?.title
  const ticketDescription = workOrder.ticket?.description

  // Especificaciones del equipo
  const specs = workOrder.asset?.specifications as Record<string, unknown> | null
  const color = specs?.color as string | undefined
  const storage = specs?.storage as string | undefined
  const ram = specs?.ram as string | undefined
  const processor = specs?.processor as string | undefined

  // Calcular tiempo transcurrido (SLA)
  useEffect(() => {
    const calculateElapsed = () => {
      const startDate = workOrder.started_at
        ? new Date(workOrder.started_at)
        : new Date(workOrder.created_at)
      const now = workOrder.completed_at
        ? new Date(workOrder.completed_at)
        : new Date()

      const diff = now.getTime() - startDate.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setElapsedTime(`${days}d ${hours}h`)
      } else if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m`)
      } else {
        setElapsedTime(`${minutes}m`)
      }
    }

    calculateElapsed()
    const interval = setInterval(calculateElapsed, 60000)
    return () => clearInterval(interval)
  }, [workOrder.started_at, workOrder.created_at, workOrder.completed_at])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Pendiente'
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Determinar alertas
  const isReturn = workOrder.is_irreparable || workOrder.quote_status === 'rejected'
  const isWarranty = workOrder.warranty_status === 'in_warranty'
  const hasUnfulfilledParts = workOrder.part_requests?.some(pr => pr.status === 'pending')

  // Imprimir ticket
  const handlePrintTicket = () => {
    const printContent = `
      <html>
        <head>
          <title>Orden ${workOrder.work_order_number}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; letter-spacing: 2px; }
            .order-number { font-size: 20px; margin-top: 10px; font-family: monospace; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .section { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .section-title { font-weight: bold; background: #f5f5f5; padding: 8px; margin: -15px -15px 15px; border-radius: 8px 8px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .label { color: #666; }
            .value { font-weight: 500; }
            .issue { border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin-top: 20px; background: #fef2f2; }
            .issue-title { font-weight: bold; color: #dc2626; margin-bottom: 10px; font-size: 12px; text-transform: uppercase; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; }
            .status-badge { display: inline-block; padding: 4px 12px; background: #fef3c7; border-radius: 20px; font-weight: bold; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ITAD ERP GUATEMALA</div>
            <div class="order-number">${workOrder.work_order_number}</div>
            <div class="status-badge">${stageStatus.label}</div>
          </div>
          
          <div class="grid">
            <div class="section">
              <div class="section-title">📱 Equipo</div>
              <div class="row"><span class="label">Tag:</span><span class="value">${workOrder.asset?.internal_tag || 'N/A'}</span></div>
              <div class="row"><span class="label">Marca:</span><span class="value">${workOrder.asset?.manufacturer || 'N/A'}</span></div>
              <div class="row"><span class="label">Modelo:</span><span class="value">${workOrder.asset?.model || 'N/A'}</span></div>
              <div class="row"><span class="label">Serial:</span><span class="value">${workOrder.asset?.serial_number || 'N/A'}</span></div>
              ${color ? `<div class="row"><span class="label">Color:</span><span class="value">${color}</span></div>` : ''}
            </div>
            
            <div class="section">
              <div class="section-title">👤 Cliente</div>
              <div class="row"><span class="label">Nombre:</span><span class="value">${clientName}</span></div>
              ${clientContact ? `<div class="row"><span class="label">Contacto:</span><span class="value">${clientContact}</span></div>` : ''}
              ${clientPhone ? `<div class="row"><span class="label">Teléfono:</span><span class="value">${clientPhone}</span></div>` : ''}
              ${clientCity ? `<div class="row"><span class="label">Ciudad:</span><span class="value">${clientCity}</span></div>` : ''}
            </div>
          </div>
          
          <div class="grid">
            <div class="section">
              <div class="section-title">📋 Orden</div>
              <div class="row"><span class="label">Garantía:</span><span class="value">${isWarranty ? '✅ EN GARANTÍA' : '⚠️ FUERA'}</span></div>
              <div class="row"><span class="label">Falla:</span><span class="value">${workOrder.failure_type || 'No especificada'}</span></div>
              <div class="row"><span class="label">Técnico:</span><span class="value">${workOrder.technician?.full_name || 'Sin asignar'}</span></div>
              <div class="row"><span class="label">Fecha:</span><span class="value">${formatDate(workOrder.created_at)}</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">📍 Ubicación</div>
              <div class="row"><span class="label">Sucursal:</span><span class="value">${location}</span></div>
              ${ticketId ? `<div class="row"><span class="label">Ticket:</span><span class="value">${ticketId}</span></div>` : ''}
            </div>
          </div>
          
          <div class="issue">
            <div class="issue-title">⚠️ Problema Reportado por el Cliente</div>
            <div>${ticketDescription || workOrder.reported_issue || 'Sin descripción'}</div>
          </div>
          
          ${workOrder.diagnosis ? `
            <div class="section" style="margin-top: 20px;">
              <div class="section-title">🔍 Diagnóstico</div>
              <div>${workOrder.diagnosis}</div>
            </div>
          ` : ''}
          
          <div class="footer">
            Impreso: ${new Date().toLocaleString('es-GT')} | ITAD ERP Guatemala
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleStageAction = () => {
    // Placeholder para conectar con la lógica de transición de etapa cuando exista.
  }

  return (
    <div className="space-y-4">
      {/* ALERTAS (BANNERS) */}
      {isReturn && (
        <div className="bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/40 
                      rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-500/30 rounded-xl">
            <RotateCcw className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-red-400 font-bold text-lg">⚠️ RETORNO AL CLIENTE</h3>
            <p className="text-red-300/80 text-sm">
              {workOrder.is_irreparable
                ? `Irreparable: ${workOrder.irreparable_reason || 'Sin especificar'}`
                : 'Cotización rechazada por el cliente'}
            </p>
          </div>
        </div>
      )}

      {isWarranty && !isReturn && (
        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/40 
                      rounded-xl p-3 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-400 font-semibold">✓ EQUIPO EN GARANTÍA</span>
          {workOrder.warranty_end_date && (
            <span className="text-emerald-400/60 text-sm ml-2">
              (Vence: {new Date(workOrder.warranty_end_date).toLocaleDateString('es-GT')})
            </span>
          )}
        </div>
      )}

      {hasUnfulfilledParts && (
        <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/10 border border-purple-500/40 
                      rounded-xl p-3 flex items-center gap-3">
          <Package className="w-5 h-5 text-purple-400 animate-pulse" />
          <span className="text-purple-400 font-semibold">📦 PIEZAS PENDIENTES DE DESPACHO</span>
        </div>
      )}

      {/* FICHA TÉCNICA PRINCIPAL */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {/* Header con Badge Grande */}
        <div className="bg-gradient-to-r from-surface-850 to-surface-900 border-b border-surface-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Foto/Icono del equipo */}
              <div className="relative">
                {workOrder.asset?.photos && workOrder.asset.photos.length > 0 ? (
                  <img
                    src={workOrder.asset.photos[0]}
                    alt="Equipo"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-surface-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 
                                border-2 border-amber-500/30 flex items-center justify-center">
                    <AssetIcon className="w-10 h-10 text-amber-400" />
                  </div>
                )}
                {/* Badge de tipo */}
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-surface-800 
                               border border-surface-600 rounded text-[10px] font-bold text-surface-300 uppercase">
                  {workOrder.asset?.asset_type || 'N/A'}
                </span>
              </div>

              {/* Info Principal */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white font-mono tracking-wide">
                    {workOrder.work_order_number}
                  </h1>
                  {ticketId && (
                    <span className="px-2 py-0.5 bg-surface-700 rounded text-xs text-surface-400 font-mono">
                      {ticketId}
                    </span>
                  )}
                </div>
                <p className="text-lg text-white font-medium">
                  {workOrder.asset?.manufacturer || 'Sin marca'} {workOrder.asset?.model || 'Sin modelo'}
                  {color && <span className="text-surface-400 ml-2">({color})</span>}
                </p>
                <p className="text-surface-400 text-sm font-mono">
                  {workOrder.asset?.serial_number || 'Sin serial'}
                </p>
              </div>
            </div>

            {/* Badge de Estado GRANDE */}
            <div className="flex flex-col items-end gap-3">
              <div className={cn(
                "px-5 py-3 rounded-xl border-2 flex items-center gap-3",
                stageStatus.badgeBgColor
              )}>
                <StatusIcon className={cn("w-6 h-6", stageStatus.badgeTextColor)} />
                <span className={cn("text-lg font-black tracking-wide", stageStatus.badgeTextColor)}>
                  {stageStatus.label}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePrintTicket}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 
                           text-surface-300 rounded-lg transition-colors border border-surface-700 text-sm"
                  type="button"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={handleStageAction}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900",
                    stageStatus.actionClass
                  )}
                >
                  <StatusIcon className="w-4 h-4" />
                  {stageStatus.actionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Información Densa - 5 COLUMNAS */}
        <div className="grid grid-cols-5 divide-x divide-surface-800">
          {/* COLUMNA 1: Cliente */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Cliente</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-white font-semibold text-sm truncate" title={clientName}>
                  {clientName}
                </p>
                {clientContact && (
                  <p className="text-surface-500 text-xs truncate" title={clientContact}>
                    {clientContact}
                  </p>
                )}
              </div>
              {clientPhone && (
                <div className="flex items-center gap-1.5 text-surface-400 text-xs">
                  <Phone className="w-3 h-3" />
                  <span>{clientPhone}</span>
                </div>
              )}
              {clientCity && (
                <div className="flex items-center gap-1.5 text-surface-400 text-xs">
                  <MapPin className="w-3 h-3" />
                  <span>{clientCity}</span>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 2: Tag & Equipo */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Equipo</span>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-surface-500 uppercase">Tag Interno</span>
                <p className="text-white font-mono font-bold">
                  {workOrder.asset?.internal_tag || 'N/A'}
                </p>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-surface-500">Condición</span>
                <span className="text-surface-300">
                  {workOrder.asset?.condition || 'N/A'}
                </span>
              </div>
              {storage && (
                <div className="flex items-center gap-1.5 text-surface-400 text-xs">
                  <HardDrive className="w-3 h-3" />
                  <span>{storage}</span>
                </div>
              )}
              {ram && (
                <div className="flex items-center gap-1.5 text-surface-400 text-xs">
                  <MemoryStick className="w-3 h-3" />
                  <span>{ram}</span>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 3: Seriales */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Barcode className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Seriales</span>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-surface-500 uppercase">Serial/IMEI</span>
                <p className="text-white font-mono text-sm truncate" title={workOrder.asset?.serial_number || ''}>
                  {workOrder.asset?.serial_number || 'N/A'}
                </p>
              </div>
              {workOrder.seedstock_exchange && (
                <div className="pt-1 border-t border-surface-700">
                  <span className="text-[10px] text-emerald-400 uppercase">IMEI Nuevo</span>
                  <p className="text-emerald-400 font-mono text-sm">
                    {workOrder.new_imei || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 4: Fechas y Sucursal */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Fechas</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-500">Ingreso</span>
                <span className="text-surface-300">
                  {new Date(workOrder.created_at).toLocaleDateString('es-GT')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Inicio</span>
                <span className="text-surface-300">
                  {workOrder.started_at
                    ? new Date(workOrder.started_at).toLocaleDateString('es-GT')
                    : 'Pendiente'}
                </span>
              </div>
              <div className="pt-1 border-t border-surface-700 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-surface-500" />
                <span className="text-surface-300 truncate">{location}</span>
              </div>
            </div>
          </div>

          {/* COLUMNA 5: SLA y Técnico */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">SLA</span>
            </div>
            <div className="space-y-2">
              <div className="text-center">
                <span className="text-[10px] text-surface-500 uppercase block">Tiempo</span>
                <p className={cn(
                  "text-2xl font-black font-mono",
                  elapsedTime.includes('d') && parseInt(elapsedTime) > 3
                    ? 'text-red-400'
                    : elapsedTime.includes('d')
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                )}>
                  {elapsedTime}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-surface-700">
                <User className="w-3 h-3 text-surface-500" />
                <span className="text-surface-300 text-xs truncate">
                  {workOrder.technician?.full_name || 'Sin asignar'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROBLEMA REPORTADO (Texto completo del ticket) */}
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent 
                    border border-red-500/30 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Problema Reportado por el Cliente
              </h3>
              {ticketTitle && ticketTitle !== (ticketDescription || workOrder.reported_issue) && (
                <span className="px-2 py-0.5 bg-surface-800 rounded text-xs text-surface-400">
                  {ticketTitle}
                </span>
              )}
            </div>
            {/* Mostrar descripción completa del ticket si existe, sino el reported_issue */}
            <p className="text-white text-base leading-relaxed">
              {ticketDescription || workOrder.reported_issue || 'Sin descripción del problema'}
            </p>
          </div>
          {workOrder.priority === 'urgent' && (
            <span className="px-3 py-1 bg-red-500/30 text-red-400 text-xs font-black rounded-full animate-pulse">
              🔥 URGENTE
            </span>
          )}
        </div>

        {/* Diagnóstico */}
        {workOrder.diagnosis && (
          <div className="mt-4 pt-4 border-t border-surface-700/50">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Diagnóstico Técnico
              </span>
            </div>
            <p className="text-surface-300 text-sm">
              {workOrder.diagnosis}
            </p>
          </div>
        )}

        {/* Cotización */}
        {workOrder.quote_amount && workOrder.quote_amount > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-700/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                💰 Cotización
              </span>
              <p className="text-surface-400 text-sm mt-1">
                {workOrder.quote_notes || 'Sin detalles'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-amber-400">
                Q{workOrder.quote_amount.toFixed(2)}
              </p>
              <span className={cn(
                "text-xs font-bold px-3 py-1 rounded-full",
                workOrder.quote_status === 'approved' ? "bg-emerald-500/20 text-emerald-400" :
                  workOrder.quote_status === 'rejected' ? "bg-red-500/20 text-red-400" :
                    workOrder.quote_status === 'pending' ? "bg-amber-500/20 text-amber-400" :
                      "bg-surface-700 text-surface-400"
              )}>
                {workOrder.quote_status === 'approved' ? '✓ APROBADA' :
                  workOrder.quote_status === 'rejected' ? '✗ RECHAZADA' :
                    workOrder.quote_status === 'pending' ? '⏳ PENDIENTE' : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
