'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Smartphone,
  Camera,
  Wifi,
  Battery,
  Volume2,
  Mic,
  Monitor,
  Fingerprint,
  Navigation,
  Bluetooth,
  Zap,
  RotateCcw,
  Stethoscope,
  Wrench,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  FileText
} from 'lucide-react'
import { FAILURE_TYPES } from '../../constants'
import { cn } from '@/lib/utils'
import { type WorkOrder } from '../../constants'
import { saveMmiTest, finalizeWorkOrder } from '../../actions'

interface QCTabProps {
  workOrder: WorkOrder
  readOnly?: boolean
}

// Pruebas MMI estándar
const MMI_TESTS = [
  { id: 'display', label: 'Pantalla/Display', icon: Monitor, category: 'visual' },
  { id: 'touch', label: 'Touch/Táctil', icon: Fingerprint, category: 'input' },
  { id: 'camera_front', label: 'Cámara Frontal', icon: Camera, category: 'camera' },
  { id: 'camera_back', label: 'Cámara Trasera', icon: Camera, category: 'camera' },
  { id: 'speaker', label: 'Altavoz', icon: Volume2, category: 'audio' },
  { id: 'microphone', label: 'Micrófono', icon: Mic, category: 'audio' },
  { id: 'wifi', label: 'WiFi', icon: Wifi, category: 'connectivity' },
  { id: 'bluetooth', label: 'Bluetooth', icon: Bluetooth, category: 'connectivity' },
  { id: 'battery', label: 'Batería', icon: Battery, category: 'power' },
  { id: 'charging', label: 'Carga', icon: Zap, category: 'power' },
  { id: 'gps', label: 'GPS', icon: Navigation, category: 'sensors' },
  { id: 'buttons', label: 'Botones Físicos', icon: Smartphone, category: 'physical' },
]

export function QCTab({ workOrder }: QCTabProps) {
  const router = useRouter()
  
  // Estado de las pruebas
  const [tests, setTests] = useState<Record<string, boolean | null>>(() => {
    // Inicializar con valores existentes o null
    const existing = workOrder.mmi_test_out || {}
    const initial: Record<string, boolean | null> = {}
    MMI_TESTS.forEach(test => {
      initial[test.id] = existing[test.id] ?? null
    })
    return initial
  })
  
  const [qcNotes, setQcNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Verificar estados
  const canDoQC = workOrder.status === 'qc_pending'
  const isQCComplete = workOrder.status === 'qc_passed' || workOrder.status === 'qc_failed'
  const isCompleted = workOrder.status === 'completed'

  // Contar pruebas
  const totalTests = MMI_TESTS.length
  const completedTests = Object.values(tests).filter(v => v !== null).length
  const passedTests = Object.values(tests).filter(v => v === true).length
  const failedTests = Object.values(tests).filter(v => v === false).length

  // Todas las pruebas completadas
  const allTestsCompleted = completedTests === totalTests
  const allTestsPassed = passedTests === totalTests

  // Marcar prueba
  const handleTestResult = (testId: string, passed: boolean) => {
    setTests(prev => ({ ...prev, [testId]: passed }))
  }

  // Resetear prueba
  const handleResetTest = (testId: string) => {
    setTests(prev => ({ ...prev, [testId]: null }))
  }

  // Guardar QC
  const handleSaveQC = async () => {
    if (!allTestsCompleted) {
      setError('Completa todas las pruebas antes de guardar')
      return
    }

    setIsLoading(true)
    setError(null)

    // Convertir null a false para guardar
    const testsToSave: Record<string, boolean> = {}
    Object.entries(tests).forEach(([key, value]) => {
      testsToSave[key] = value === true
    })

    const result = await saveMmiTest(workOrder.id, {
      type: 'out',
      tests: testsToSave
    })

    if (result.success) {
      setSuccess(allTestsPassed 
        ? '✅ QC Aprobado - Equipo listo para entrega'
        : '❌ QC Fallido - Requiere revisión adicional'
      )
      router.refresh()
    } else {
      setError(result.error || 'Error al guardar QC')
    }

    setIsLoading(false)
  }

  // Finalizar orden
  const handleFinalize = async () => {
    setIsLoading(true)
    setError(null)

    const result = await finalizeWorkOrder(workOrder.id)

    if (result.success) {
      setSuccess('Orden de trabajo completada exitosamente.')
      router.refresh()
    } else {
      setError(result.error || 'Error al finalizar orden')
    }

    setIsLoading(false)
  }

  // =====================================================
  // NO EN ESTADO DE QC
  // =====================================================

  if (!canDoQC && !isQCComplete && !isCompleted) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-cyan-500/50 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-surface-400">Reparación Pendiente</h3>
        <p className="text-surface-500 mt-2">
          Complete la reparación para habilitar el Control de Calidad.
        </p>
      </div>
    )
  }

  // =====================================================
  // QC COMPLETADO
  // =====================================================

  if (isQCComplete || isCompleted) {
    const passed = workOrder.qc_passed

    return (
      <div className="space-y-6">
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-xl border",
          passed 
            ? "bg-emerald-500/10 border-emerald-500/20" 
            : "bg-red-500/10 border-red-500/20"
        )}>
          {passed ? (
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          ) : (
            <XCircle className="w-6 h-6 text-red-400" />
          )}
          <div>
            <p className={cn("font-semibold", passed ? "text-emerald-400" : "text-red-400")}>
              {passed ? 'Control de Calidad Aprobado' : 'Control de Calidad Fallido'}
            </p>
            <p className="text-surface-400 text-sm">
              {passed 
                ? 'El equipo pasó todas las pruebas y está listo para entrega.'
                : 'El equipo no pasó algunas pruebas. Requiere revisión.'}
            </p>
          </div>
        </div>

        {/* Resumen de pruebas */}
        <div className="grid grid-cols-3 gap-4">
          {MMI_TESTS.map((test) => {
            const TestIcon = test.icon
            const result = workOrder.mmi_test_out?.[test.id]
            
            return (
              <div 
                key={test.id}
                className={cn(
                  "p-3 rounded-xl flex items-center gap-3",
                  result === true ? "bg-emerald-500/10" :
                  result === false ? "bg-red-500/10" : "bg-surface-800/50"
                )}
              >
                <TestIcon className={cn(
                  "w-5 h-5",
                  result === true ? "text-emerald-400" :
                  result === false ? "text-red-400" : "text-surface-500"
                )} />
                <span className={cn(
                  "text-sm",
                  result === true ? "text-emerald-400" :
                  result === false ? "text-red-400" : "text-surface-400"
                )}>
                  {test.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Botón finalizar si pasó QC */}
        {passed && !isCompleted && (
          <button
            onClick={handleFinalize}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                     bg-emerald-600 hover:bg-emerald-500 text-white font-semibold 
                     rounded-xl transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Finalizar Orden de Trabajo
          </button>
        )}

        {isCompleted && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-400 font-semibold text-lg">Orden Completada</p>
            <p className="text-surface-400 text-sm">
              Completada el {workOrder.completed_at 
                ? new Date(workOrder.completed_at).toLocaleDateString('es-GT')
                : 'N/A'}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Obtener etiqueta de falla
  const getFailureLabel = (value: string) => {
    const found = FAILURE_TYPES.find(f => f.value === value)
    return found?.label || value
  }

  // =====================================================
  // FORMULARIO DE QC
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

      {/* =====================================================
          RESUMEN DE DIAGNÓSTICO Y REPARACIÓN
          ===================================================== */}
      <div className="grid grid-cols-2 gap-4">
        {/* Resumen de Diagnóstico */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-700">
            <Stethoscope className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
              Diagnóstico
            </h3>
            <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-surface-500 text-xs">Garantía</span>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded",
                workOrder.warranty_status === 'in_warranty' 
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              )}>
                {workOrder.warranty_status === 'in_warranty' ? 'EN GARANTÍA' : 'FUERA DE GARANTÍA'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-500 text-xs">Tipo de Falla</span>
              <span className="text-white text-sm">
                {workOrder.failure_type ? getFailureLabel(workOrder.failure_type) : 'N/A'}
              </span>
            </div>
            {workOrder.diagnosis && (
              <div className="mt-2 pt-2 border-t border-surface-700">
                <p className="text-surface-500 text-xs mb-1">Diagnóstico Técnico:</p>
                <p className="text-surface-300 text-sm">{workOrder.diagnosis}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de Reparación */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-700">
            <Wrench className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide">
              Reparación
            </h3>
            <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
          </div>
          <div className="space-y-2">
            {workOrder.resolution ? (
              <>
                <p className="text-surface-500 text-xs">Trabajo Realizado:</p>
                <p className="text-white text-sm">{workOrder.resolution}</p>
              </>
            ) : (
              <p className="text-surface-500 text-sm">Sin descripción de reparación</p>
            )}
            
            {/* Info de Seedstock si aplica */}
            {workOrder.seedstock_exchange && (
              <div className="mt-3 pt-3 border-t border-surface-700">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  <span className="text-indigo-400 text-xs font-bold">CAMBIO DE UNIDAD</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-surface-500">IMEI Original:</p>
                    <p className="text-red-400 font-mono">{workOrder.original_imei || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500">IMEI Nuevo:</p>
                    <p className="text-emerald-400 font-mono">{workOrder.new_imei || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-surface-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold">Progreso de Pruebas MMI</p>
          <p className="text-surface-400 text-sm">
            {completedTests} / {totalTests} completadas
          </p>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${(completedTests / totalTests) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="text-emerald-400">✓ {passedTests} pasaron</span>
          <span className="text-red-400">✗ {failedTests} fallaron</span>
          <span className="text-surface-500">{totalTests - completedTests} pendientes</span>
        </div>
      </div>

      {/* Grid de pruebas */}
      <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
          <ClipboardCheck className="w-5 h-5" />
          Pruebas de Control de Calidad
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {MMI_TESTS.map((test) => {
            const TestIcon = test.icon
            const result = tests[test.id]
            
            return (
              <div 
                key={test.id}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  result === true ? "bg-emerald-500/10 border-emerald-500" :
                  result === false ? "bg-red-500/10 border-red-500" :
                  "bg-surface-800/50 border-surface-700"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TestIcon className={cn(
                      "w-5 h-5",
                      result === true ? "text-emerald-400" :
                      result === false ? "text-red-400" : "text-surface-400"
                    )} />
                    <span className="text-white font-medium">{test.label}</span>
                  </div>
                  {result !== null && (
                    <button
                      onClick={() => handleResetTest(test.id)}
                      className="p-1 text-surface-500 hover:text-white transition-colors"
                      title="Resetear"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestResult(test.id, true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-all",
                      result === true 
                        ? "bg-emerald-500 text-white" 
                        : "bg-surface-700 text-surface-400 hover:bg-emerald-500/20 hover:text-emerald-400"
                    )}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Pasó
                  </button>
                  <button
                    onClick={() => handleTestResult(test.id, false)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-all",
                      result === false 
                        ? "bg-red-500 text-white" 
                        : "bg-surface-700 text-surface-400 hover:bg-red-500/20 hover:text-red-400"
                    )}
                  >
                    <XCircle className="w-4 h-4" />
                    Falló
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-surface-400 text-sm mb-2">
          Notas de QC (Opcional)
        </label>
        <textarea
          value={qcNotes}
          onChange={(e) => setQcNotes(e.target.value)}
          placeholder="Observaciones adicionales del control de calidad..."
          rows={3}
          className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl 
                   text-white placeholder-surface-500 focus:outline-none focus:border-cyan-500
                   resize-none"
        />
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSaveQC}
        disabled={isLoading || !allTestsCompleted}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold 
                 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ClipboardCheck className="w-5 h-5" />
        )}
        {allTestsCompleted 
          ? 'Guardar Control de Calidad'
          : `Completa ${totalTests - completedTests} pruebas más`}
      </button>
    </div>
  )
}

