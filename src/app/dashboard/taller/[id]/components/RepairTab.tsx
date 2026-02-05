'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wrench,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  AlertTriangle,
  ClipboardCheck,
  RefreshCw,
  ArrowLeftRight,
  Smartphone,
  ScanLine,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type WorkOrder } from '../../constants'
import { completeRepair, registerSeedstock } from '../../actions'
import { RequestPartModal } from './RequestPartModal'

interface RepairTabProps {
  workOrder: WorkOrder
  readOnly?: boolean
}

export function RepairTab({ workOrder }: RepairTabProps) {
  const router = useRouter()
  
  const [resolution, setResolution] = useState(workOrder.resolution || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estados para Seedstock
  const [showSeedstockForm, setShowSeedstockForm] = useState(false)
  const [originalImei, setOriginalImei] = useState(workOrder.original_imei || workOrder.asset?.serial_number || '')
  const [newImei, setNewImei] = useState('')
  const [originalSerial, setOriginalSerial] = useState(workOrder.original_serial || '')
  const [newSerial, setNewSerial] = useState('')
  const [seedstockNotes, setSeedstockNotes] = useState('')

  // Estado para modal de solicitud de piezas
  const [showRequestPartModal, setShowRequestPartModal] = useState(false)

  // Verificar si la orden está en estado de reparación
  const canRepair = workOrder.status === 'in_progress' || workOrder.status === 'waiting_parts'
  const isWaitingParts = workOrder.status === 'waiting_parts'
  const isRepairComplete = workOrder.status === 'qc_pending' || 
                          workOrder.status === 'qc_passed' || 
                          workOrder.status === 'completed'

  // Completar reparación
  const handleCompleteRepair = async () => {
    if (!resolution.trim()) {
      setError('Describe la reparación realizada')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await completeRepair(workOrder.id, resolution)

    if (result.success) {
      setSuccess('Reparación completada. El equipo pasa a Control de Calidad.')
      router.refresh()
    } else {
      setError(result.error || 'Error al completar reparación')
    }

    setIsLoading(false)
  }

  // Registrar Seedstock (Cambio de Unidad)
  const handleSeedstock = async () => {
    if (!newImei.trim()) {
      setError('Ingresa el IMEI del nuevo equipo')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await registerSeedstock(workOrder.id, {
      originalImei: originalImei,
      newImei: newImei,
      originalSerial: originalSerial,
      newSerial: newSerial,
      notes: seedstockNotes
    })

    if (result.success) {
      setSuccess('Cambio de unidad registrado. El equipo pasa a Control de Calidad.')
      setShowSeedstockForm(false)
      router.refresh()
    } else {
      setError(result.error || 'Error al registrar seedstock')
    }

    setIsLoading(false)
  }

  // =====================================================
  // NO EN ESTADO DE REPARACIÓN
  // =====================================================
  
  if (!canRepair && !isRepairComplete) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-amber-500/50 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-surface-400">Diagnóstico Pendiente</h3>
        <p className="text-surface-500 mt-2">
          Complete el diagnóstico en la pestaña anterior para habilitar la reparación.
        </p>
      </div>
    )
  }

  // =====================================================
  // REPARACIÓN COMPLETADA
  // =====================================================

  if (isRepairComplete) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-emerald-400 font-semibold">Reparación Completada</p>
            <p className="text-surface-400 text-sm">
              El equipo ha sido reparado y está en Control de Calidad.
            </p>
          </div>
        </div>

        {/* Resumen de reparación */}
        <div className="bg-surface-800/50 rounded-xl p-4">
          <p className="text-surface-500 text-sm mb-2">Resolución / Trabajo Realizado</p>
          <p className="text-white">{workOrder.resolution || 'Sin descripción'}</p>
        </div>

        {/* Info de seedstock si aplica */}
        {workOrder.seedstock_exchange && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
              <p className="text-indigo-400 font-semibold">Cambio de Unidad (Seedstock)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-surface-500 text-xs">IMEI Original</p>
                <p className="text-white font-mono">{workOrder.original_imei || 'N/A'}</p>
              </div>
              <div>
                <p className="text-surface-500 text-xs">IMEI Nuevo</p>
                <p className="text-emerald-400 font-mono">{workOrder.new_imei || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // =====================================================
  // FORMULARIO DE REPARACIÓN
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400">{success}</p>
        </div>
      )}

      {/* Info del diagnóstico */}
      <div className="bg-surface-800/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-5 h-5 text-amber-400" />
          <p className="text-amber-400 font-semibold">En Reparación</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-surface-500 text-xs">Tipo de Falla</p>
            <p className="text-white">{workOrder.failure_type || 'No especificada'}</p>
          </div>
          <div>
            <p className="text-surface-500 text-xs">Garantía</p>
            <p className={cn(
              "font-medium",
              workOrder.warranty_status === 'in_warranty' ? 'text-emerald-400' : 'text-amber-400'
            )}>
              {workOrder.warranty_status === 'in_warranty' ? 'En Garantía' : 'Fuera de Garantía'}
            </p>
          </div>
        </div>
        {workOrder.diagnosis && (
          <div className="mt-4 pt-4 border-t border-surface-700">
            <p className="text-surface-500 text-xs">Diagnóstico</p>
            <p className="text-surface-300 text-sm mt-1">{workOrder.diagnosis}</p>
          </div>
        )}
      </div>

      {/* Solicitar piezas */}
      <div className={cn(
        "p-4 rounded-xl border",
        isWaitingParts 
          ? "bg-amber-500/10 border-amber-500/20" 
          : "bg-purple-500/10 border-purple-500/20"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isWaitingParts ? (
              <Clock className="w-5 h-5 text-amber-400" />
            ) : (
              <Package className="w-5 h-5 text-purple-400" />
            )}
            <div>
              <p className={cn(
                "font-semibold",
                isWaitingParts ? "text-amber-400" : "text-purple-400"
              )}>
                {isWaitingParts ? 'Esperando Piezas de Bodega' : 'Solicitud de Piezas'}
              </p>
              <p className="text-surface-400 text-sm">
                {isWaitingParts 
                  ? 'Se ha enviado una solicitud. Esperando despacho de bodega.' 
                  : 'Si necesitas piezas, solicítalas a bodega.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRequestPartModal(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              isWaitingParts
                ? "bg-amber-600/20 hover:bg-amber-600/30 text-amber-400"
                : "bg-purple-600/20 hover:bg-purple-600/30 text-purple-400"
            )}
          >
            <span className="p-1 rounded-full border border-current">
              <Plus className="w-4 h-4" />
            </span>
            {isWaitingParts ? 'Agregar Solicitud' : 'Solicitar Pieza'}
          </button>
        </div>
      </div>

      {/* Modal de Solicitud de Pieza */}
      <RequestPartModal
        isOpen={showRequestPartModal}
        onClose={() => setShowRequestPartModal(false)}
        workOrderId={workOrder.id}
        workOrderNumber={workOrder.work_order_number}
      />

      {/* Seedstock / Cambio de Unidad */}
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-indigo-400 font-semibold">Cambio de Unidad (Seedstock)</p>
              <p className="text-surface-400 text-sm">
                Si el equipo requiere reemplazo completo, registra el cambio aquí.
              </p>
            </div>
          </div>
          {!showSeedstockForm && !workOrder.seedstock_exchange && (
            <button
              onClick={() => setShowSeedstockForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 
                       text-indigo-400 text-sm font-medium rounded-lg transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Registrar Cambio
            </button>
          )}
          {workOrder.seedstock_exchange && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 
                           text-emerald-400 text-sm font-medium rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Cambio Registrado
            </span>
          )}
        </div>

        {/* Formulario de Seedstock */}
        {showSeedstockForm && (
          <div className="mt-4 pt-4 border-t border-indigo-500/20 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Equipo Original */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Equipo Original (Dañado)
                </h4>
                <div>
                  <label className="block text-surface-500 text-xs mb-1">IMEI Original</label>
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input
                      type="text"
                      value={originalImei}
                      onChange={(e) => setOriginalImei(e.target.value)}
                      placeholder="Escanear IMEI..."
                      className="w-full pl-10 pr-3 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                               text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-surface-500 text-xs mb-1">Serial Original</label>
                  <input
                    type="text"
                    value={originalSerial}
                    onChange={(e) => setOriginalSerial(e.target.value)}
                    placeholder="Serial del equipo original..."
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                             text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Equipo Nuevo */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Equipo Nuevo (Reemplazo)
                </h4>
                <div>
                  <label className="block text-surface-500 text-xs mb-1">
                    IMEI Nuevo <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      value={newImei}
                      onChange={(e) => setNewImei(e.target.value)}
                      placeholder="Escanear IMEI del equipo nuevo..."
                      className="w-full pl-10 pr-3 py-2 bg-surface-800 border border-emerald-500/50 rounded-lg 
                               text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-surface-500 text-xs mb-1">Serial Nuevo</label>
                  <input
                    type="text"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    placeholder="Serial del equipo nuevo..."
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                             text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-surface-500 text-xs mb-1">Notas del Cambio</label>
              <textarea
                value={seedstockNotes}
                onChange={(e) => setSeedstockNotes(e.target.value)}
                placeholder="Motivo del cambio, observaciones..."
                rows={2}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg 
                         text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSeedstockForm(false)}
                className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSeedstock}
                disabled={isLoading || !newImei.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                         bg-indigo-600 hover:bg-indigo-500 text-white font-semibold 
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Confirmar Cambio de Unidad
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resolución */}
      <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
        <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-4">
          <ClipboardCheck className="w-5 h-5" />
          Registrar Reparación
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-surface-400 text-sm mb-2">
              Trabajo Realizado / Resolución <span className="text-red-400">*</span>
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe detalladamente el trabajo realizado, piezas reemplazadas, pruebas realizadas..."
              rows={5}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white placeholder-surface-500 focus:outline-none focus:border-amber-500
                       resize-none"
            />
          </div>

          <button
            onClick={handleCompleteRepair}
            disabled={isLoading || !resolution.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                     bg-amber-600 hover:bg-amber-500 text-white font-semibold 
                     rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Completar Reparación - Enviar a QC
          </button>
        </div>
      </div>
    </div>
  )
}

