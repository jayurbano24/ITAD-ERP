'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  Camera,
  Loader2,
  DollarSign,
  FileWarning,
  ThumbsUp,
  ThumbsDown,
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  updateDiagnosis,
  sendQuote,
  handleQuoteResponse,
  markAsIrreparable
} from '../../actions'
import { type WorkOrder, FAILURE_TYPES } from '../../constants'

interface DiagnosisTabProps {
  workOrder: WorkOrder
  readOnly?: boolean
}

type WarrantyStatus = 'pending' | 'in_warranty' | 'out_of_warranty' | 'irreparable'

export function DiagnosisTab({ workOrder }: DiagnosisTabProps) {
  const router = useRouter()
  
  // Estado del flujo
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus>(
    workOrder.is_irreparable ? 'irreparable' :
    workOrder.warranty_status === 'in_warranty' ? 'in_warranty' :
    workOrder.warranty_status === 'out_of_warranty' ? 'out_of_warranty' :
    'pending'
  )
  
  // Estados del formulario
  const [selectedFailure, setSelectedFailure] = useState(workOrder.failure_type || '')
  const [diagnosis, setDiagnosis] = useState(workOrder.diagnosis || '')
  const [partsCost, setPartsCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [irreparableReason, setIrreparableReason] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Verificar si ya se procesó el diagnóstico
  const isDiagnosisComplete = workOrder.warranty_status && 
    workOrder.warranty_status !== 'pending_validation' &&
    workOrder.status !== 'open'

  // =====================================================
  // HANDLERS
  // =====================================================

  // Aprobar diagnóstico (EN GARANTÍA)
  const handleApproveDiagnosis = async () => {
    if (!selectedFailure) {
      setError('Selecciona el tipo de falla')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await updateDiagnosis(workOrder.id, {
      warrantyStatus: 'in_warranty',
      failureType: selectedFailure,
      failureCategory: FAILURE_TYPES.find(f => f.value === selectedFailure)?.category,
      diagnosis,
    })

    if (result.success) {
      setSuccess('Diagnóstico aprobado. El equipo pasa a reparación.')
      router.refresh()
    } else {
      setError(result.error || 'Error al aprobar diagnóstico')
    }

    setIsLoading(false)
  }

  // Enviar cotización (FUERA DE GARANTÍA)
  const handleSendQuote = async () => {
    if (!partsCost && !laborCost) {
      setError('Ingresa al menos un costo')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await sendQuote(workOrder.id, {
      partsCost: parseFloat(partsCost) || 0,
      laborCost: parseFloat(laborCost) || 0,
      notes: quoteNotes,
    })

    if (result.success) {
      setSuccess('Cotización enviada al cliente.')
      router.refresh()
    } else {
      setError(result.error || 'Error al enviar cotización')
    }

    setIsLoading(false)
  }

  // Responder cotización (SIMULACIÓN)
  const handleQuoteResponseClick = async (approved: boolean) => {
    setIsLoading(true)
    setError(null)

    const result = await handleQuoteResponse(workOrder.id, approved)

    if (result.success) {
      setSuccess(approved 
        ? 'Cliente aprobó. El equipo pasa a reparación.' 
        : 'Cliente rechazó. Preparando para devolución.'
      )
      router.refresh()
    } else {
      setError(result.error || 'Error al procesar respuesta')
    }

    setIsLoading(false)
  }

  // Marcar como irreparable
  const handleMarkIrreparable = async () => {
    if (!irreparableReason) {
      setError('Indica el motivo de irreparabilidad')
      return
    }
    if (!evidenceFile) {
      setError('La evidencia fotográfica es obligatoria')
      return
    }

    setIsLoading(true)
    setError(null)

    // TODO: Subir archivo a Supabase Storage
    const result = await markAsIrreparable(workOrder.id, {
      reason: irreparableReason,
      evidenceUrl: 'pending_upload', // Placeholder
    })

    if (result.success) {
      setSuccess('Equipo marcado como irreparable. Preparando para devolución.')
      router.refresh()
    } else {
      setError(result.error || 'Error al marcar como irreparable')
    }

    setIsLoading(false)
  }

  // =====================================================
  // RENDER: DIAGNÓSTICO COMPLETADO
  // =====================================================

  if (isDiagnosisComplete) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-emerald-400 font-semibold">Diagnóstico Completado</p>
            <p className="text-surface-400 text-sm">
              {workOrder.warranty_status === 'in_warranty' 
                ? 'Equipo en garantía - Aprobado para reparación'
                : workOrder.is_irreparable
                  ? 'Equipo marcado como irreparable'
                  : 'Fuera de garantía - Cotización enviada'}
            </p>
          </div>
        </div>

        {/* Resumen del diagnóstico */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-800/50 rounded-xl p-4">
            <p className="text-surface-500 text-sm">Estado de Garantía</p>
            <p className="text-white font-medium mt-1">
              {workOrder.warranty_status === 'in_warranty' ? 'En Garantía' : 'Fuera de Garantía'}
            </p>
          </div>
          {workOrder.failure_type && (
            <div className="bg-surface-800/50 rounded-xl p-4">
              <p className="text-surface-500 text-sm">Tipo de Falla</p>
              <p className="text-white font-medium mt-1">
                {FAILURE_TYPES.find(f => f.value === workOrder.failure_type)?.label || workOrder.failure_type}
              </p>
            </div>
          )}
          {workOrder.quote_amount && (
            <div className="bg-surface-800/50 rounded-xl p-4">
              <p className="text-surface-500 text-sm">Monto Cotizado</p>
              <p className="text-white font-medium mt-1">Q{workOrder.quote_amount.toFixed(2)}</p>
            </div>
          )}
          {workOrder.quote_status && (
            <div className="bg-surface-800/50 rounded-xl p-4">
              <p className="text-surface-500 text-sm">Estado Cotización</p>
              <p className={cn(
                "font-medium mt-1",
                workOrder.quote_status === 'approved' ? 'text-emerald-400' :
                workOrder.quote_status === 'rejected' ? 'text-red-400' :
                workOrder.quote_status === 'pending' ? 'text-amber-400' : 'text-surface-400'
              )}>
                {workOrder.quote_status === 'approved' ? 'Aprobada' :
                 workOrder.quote_status === 'rejected' ? 'Rechazada' :
                 workOrder.quote_status === 'pending' ? 'Pendiente' : 'No Requerida'}
              </p>
            </div>
          )}
        </div>

        {/* Botones de simulación para cotización pendiente */}
        {workOrder.quote_status === 'pending' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-amber-400 font-semibold mb-4">
              ⚡ Simulación: Respuesta del Cliente
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleQuoteResponseClick(true)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                         bg-emerald-600 hover:bg-emerald-500 text-white font-semibold 
                         rounded-xl transition-colors disabled:opacity-50"
              >
                <ThumbsUp className="w-5 h-5" />
                Cliente Aprueba
              </button>
              <button
                onClick={() => handleQuoteResponseClick(false)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                         bg-red-600 hover:bg-red-500 text-white font-semibold 
                         rounded-xl transition-colors disabled:opacity-50"
              >
                <ThumbsDown className="w-5 h-5" />
                Cliente Rechaza
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // =====================================================
  // RENDER: FORMULARIO DE DIAGNÓSTICO
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

      {/* Paso 1: Validación de Garantía */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-7 h-7 bg-amber-500 text-surface-900 rounded-full flex items-center justify-center text-sm font-bold">1</span>
          Validación de Garantía
        </h3>
        <p className="text-surface-400 text-sm">
          Revisa los sellos de garantía, indicadores de humedad y estado físico del equipo.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {/* En Garantía */}
          <button
            onClick={() => setWarrantyStatus('in_warranty')}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              warrantyStatus === 'in_warranty'
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-surface-800/50 border-surface-700 text-surface-400 hover:border-surface-600"
            )}
          >
            <ShieldCheck className="w-8 h-8 mb-2" />
            <p className="font-semibold text-white">En Garantía</p>
            <p className="text-sm mt-1">Sellos intactos, sin daño físico ni líquidos</p>
          </button>

          {/* Fuera de Garantía */}
          <button
            onClick={() => setWarrantyStatus('out_of_warranty')}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              warrantyStatus === 'out_of_warranty'
                ? "bg-amber-500/10 border-amber-500 text-amber-400"
                : "bg-surface-800/50 border-surface-700 text-surface-400 hover:border-surface-600"
            )}
          >
            <ShieldX className="w-8 h-8 mb-2" />
            <p className="font-semibold text-white">Fuera de Garantía</p>
            <p className="text-sm mt-1">Sello roto, daño físico o por líquidos</p>
          </button>

          {/* Irreparable */}
          <button
            onClick={() => setWarrantyStatus('irreparable')}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              warrantyStatus === 'irreparable'
                ? "bg-red-500/10 border-red-500 text-red-400"
                : "bg-surface-800/50 border-surface-700 text-surface-400 hover:border-surface-600"
            )}
          >
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="font-semibold text-white">Irreparable</p>
            <p className="text-sm mt-1">Daño catastrófico, sin solución viable</p>
          </button>
        </div>
      </div>

      {/* =====================================================
          FLUJO A: EN GARANTÍA
          ===================================================== */}
      {warrantyStatus === 'in_warranty' && (
        <div className="space-y-4 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
          <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Equipo en Garantía
          </h3>

          {/* Falla Tabulada */}
          <div>
            <label className="block text-surface-400 text-sm mb-2">
              Tipo de Falla <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedFailure}
              onChange={(e) => setSelectedFailure(e.target.value)}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecciona la falla...</option>
              {FAILURE_TYPES.map((failure) => (
                <option key={failure.value} value={failure.value}>
                  {failure.label}
                </option>
              ))}
            </select>
          </div>

          {/* Diagnóstico */}
          <div>
            <label className="block text-surface-400 text-sm mb-2">
              Diagnóstico Detallado (Opcional)
            </label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Describe el diagnóstico técnico..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white placeholder-surface-500 focus:outline-none focus:border-emerald-500
                       resize-none"
            />
          </div>

          {/* Botón Aprobar */}
          <button
            onClick={handleApproveDiagnosis}
            disabled={isLoading || !selectedFailure}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                     bg-emerald-600 hover:bg-emerald-500 text-white font-semibold 
                     rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wrench className="w-5 h-5" />
            )}
            Aprobar Diagnóstico - Iniciar Reparación
          </button>
        </div>
      )}

      {/* =====================================================
          FLUJO B: FUERA DE GARANTÍA (COTIZACIÓN)
          ===================================================== */}
      {warrantyStatus === 'out_of_warranty' && (
        <div className="space-y-4 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cotización - Fuera de Garantía
          </h3>
          <p className="text-surface-400 text-sm">
            El cliente debe aprobar la cotización antes de proceder con la reparación.
          </p>

          {/* Falla Tabulada */}
          <div>
            <label className="block text-surface-400 text-sm mb-2">
              Tipo de Falla <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedFailure}
              onChange={(e) => setSelectedFailure(e.target.value)}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Selecciona la falla...</option>
              {FAILURE_TYPES.map((failure) => (
                <option key={failure.value} value={failure.value}>
                  {failure.label}
                </option>
              ))}
            </select>
          </div>

          {/* Costos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-surface-400 text-sm mb-2">
                Costo de Piezas (Q)
              </label>
              <input
                type="number"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                         text-white placeholder-surface-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-surface-400 text-sm mb-2">
                Mano de Obra (Q)
              </label>
              <input
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                         text-white placeholder-surface-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Total */}
          {(partsCost || laborCost) && (
            <div className="p-4 bg-surface-800/50 rounded-xl flex items-center justify-between">
              <span className="text-surface-400">Total Cotización:</span>
              <span className="text-2xl font-bold text-amber-400">
                Q{((parseFloat(partsCost) || 0) + (parseFloat(laborCost) || 0)).toFixed(2)}
              </span>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-surface-400 text-sm mb-2">
              Notas para el Cliente (Opcional)
            </label>
            <textarea
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Ej: El tiempo estimado de reparación es de 3-5 días hábiles..."
              rows={2}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white placeholder-surface-500 focus:outline-none focus:border-amber-500
                       resize-none"
            />
          </div>

          {/* Botón Enviar */}
          <button
            onClick={handleSendQuote}
            disabled={isLoading || (!partsCost && !laborCost)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                     bg-amber-600 hover:bg-amber-500 text-white font-semibold 
                     rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Enviar Cotización al Cliente
          </button>
        </div>
      )}

      {/* =====================================================
          FLUJO C: IRREPARABLE
          ===================================================== */}
      {warrantyStatus === 'irreparable' && (
        <div className="space-y-4 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <FileWarning className="w-5 h-5" />
            Marcar como Irreparable
          </h3>
          <p className="text-surface-400 text-sm">
            El equipo no puede ser reparado y será devuelto al cliente.
            <span className="text-red-400 font-medium"> La evidencia fotográfica es obligatoria.</span>
          </p>

          {/* Motivo */}
          <div>
            <label className="block text-surface-400 text-sm mb-2">
              Motivo de Irreparabilidad <span className="text-red-400">*</span>
            </label>
            <select
              value={irreparableReason}
              onChange={(e) => setIrreparableReason(e.target.value)}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                       text-white focus:outline-none focus:border-red-500"
            >
              <option value="">Selecciona el motivo...</option>
              <option value="water_damage_severe">Daño por líquidos severo</option>
              <option value="board_damage">Placa base dañada irremediablemente</option>
              <option value="physical_damage_severe">Daño físico severo</option>
              <option value="parts_unavailable">Piezas no disponibles (modelo descontinuado)</option>
              <option value="cost_exceeds_value">Costo de reparación excede valor del equipo</option>
              <option value="customer_decision">Decisión del cliente</option>
              <option value="other">Otro motivo</option>
            </select>
          </div>

          {/* Evidencia */}
          <div>
            <label className="block text-surface-400 text-sm mb-2">
              Evidencia Fotográfica <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                className="hidden"
                id="evidence-upload"
              />
              <label
                htmlFor="evidence-upload"
                className={cn(
                  "flex items-center justify-center gap-3 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                  evidenceFile 
                    ? "border-emerald-500 bg-emerald-500/10" 
                    : "border-surface-600 hover:border-surface-500 bg-surface-800/50"
                )}
              >
                {evidenceFile ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">{evidenceFile.name}</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-surface-400" />
                    <span className="text-surface-400">Haz clic para subir foto de evidencia</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Botón Marcar Irreparable */}
          <button
            onClick={handleMarkIrreparable}
            disabled={isLoading || !irreparableReason || !evidenceFile}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                     bg-red-600 hover:bg-red-500 text-white font-semibold 
                     rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            Marcar como Irreparable - Preparar Devolución
          </button>
        </div>
      )}
    </div>
  )
}

