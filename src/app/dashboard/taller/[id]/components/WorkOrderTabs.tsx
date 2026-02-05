'use client'

import { useState, useEffect } from 'react'
import { 
  Stethoscope, 
  Wrench, 
  ClipboardCheck, 
  History,
  CheckCircle,
  Lock,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type WorkOrderDetail } from '../../actions'
import { DiagnosisTab } from './DiagnosisTab'
import { RepairTab } from './RepairTab'
import { QCTab } from './QCTab'
import { HistoryTab } from './HistoryTab'

interface WorkOrderTabsProps {
  workOrder: WorkOrderDetail
}

type TabId = 'diagnosis' | 'repair' | 'qc' | 'history'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
  shortLabel: string
}

const tabs: Tab[] = [
  { id: 'diagnosis', label: 'Diagnóstico', shortLabel: 'Diag', icon: Stethoscope },
  { id: 'repair', label: 'Reparación', shortLabel: 'Rep', icon: Wrench },
  { id: 'qc', label: 'Control de Calidad', shortLabel: 'QC', icon: ClipboardCheck },
  { id: 'history', label: 'Historial', shortLabel: 'Hist', icon: History },
]

export function WorkOrderTabs({ workOrder }: WorkOrderTabsProps) {
  // Determinar tab activo inicial basado en el estado
  const getInitialTab = (): TabId => {
    switch (workOrder.status) {
      case 'open':
        return 'diagnosis'
      case 'in_progress':
      case 'waiting_parts':
        return 'repair'
      case 'qc_pending':
      case 'qc_passed':
      case 'qc_failed':
        return 'qc'
      case 'completed':
      case 'ready_to_ship':
        return 'history'
      default:
        return 'diagnosis'
    }
  }

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab())

  // =====================================================
  // LÓGICA DE ESTADO DE TABS
  // =====================================================

  const getTabState = (tabId: TabId): {
    status: 'locked' | 'active' | 'completed' | 'readonly'
    tooltip: string
  } => {
    const isDiagnosisCompleted = workOrder.warranty_status !== null && 
                                  workOrder.warranty_status !== 'pending_validation'
    
    const isRepairCompleted = workOrder.status === 'qc_pending' || 
                               workOrder.status === 'qc_passed' ||
                               workOrder.status === 'qc_failed' ||
                               workOrder.status === 'completed' ||
                               workOrder.status === 'ready_to_ship'
    
    const isQCCompleted = workOrder.status === 'qc_passed' || 
                          workOrder.status === 'completed'
    
    const isOrderClosed = workOrder.status === 'completed' || 
                          workOrder.status === 'ready_to_ship' ||
                          workOrder.is_irreparable ||
                          workOrder.quote_status === 'rejected'

    switch (tabId) {
      case 'diagnosis':
        if (isDiagnosisCompleted && !isOrderClosed) {
          return { status: 'readonly', tooltip: 'Diagnóstico completado (solo lectura)' }
        }
        if (isDiagnosisCompleted) {
          return { status: 'completed', tooltip: 'Diagnóstico completado' }
        }
        return { status: 'active', tooltip: 'Realizar diagnóstico' }

      case 'repair':
        if (!isDiagnosisCompleted) {
          return { status: 'locked', tooltip: 'Complete el diagnóstico primero' }
        }
        if (isRepairCompleted) {
          return { status: 'completed', tooltip: 'Reparación completada' }
        }
        if (workOrder.status === 'waiting_quote') {
          return { status: 'locked', tooltip: 'Esperando aprobación de cotización' }
        }
        return { status: 'active', tooltip: 'En reparación' }

      case 'qc':
        if (!isRepairCompleted && workOrder.status !== 'qc_pending') {
          return { status: 'locked', tooltip: 'Complete la reparación primero' }
        }
        if (isQCCompleted) {
          return { status: 'completed', tooltip: 'QC completado' }
        }
        return { status: 'active', tooltip: 'Realizar control de calidad' }

      case 'history':
        return { status: 'active', tooltip: 'Ver historial completo' }

      default:
        return { status: 'active', tooltip: '' }
    }
  }

  // Manejar click en tab
  const handleTabClick = (tabId: TabId) => {
    const state = getTabState(tabId)
    if (state.status !== 'locked') {
      setActiveTab(tabId)
    }
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
      {/* TAB HEADERS */}
      <div className="flex border-b border-surface-700 bg-surface-850">
        {tabs.map((tab, index) => {
          const Icon = tab.icon
          const state = getTabState(tab.id)
          const isActive = activeTab === tab.id
          const isLocked = state.status === 'locked'
          const isCompleted = state.status === 'completed'

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={isLocked}
              title={state.tooltip}
              className={cn(
                "flex-1 relative py-4 px-4 transition-all duration-200 group",
                isActive 
                  ? "bg-surface-800" 
                  : isLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-surface-800/50",
                index < tabs.length - 1 && "border-r border-surface-700/50"
              )}
            >
              {/* Número de Paso */}
              <div className="flex items-center justify-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  isCompleted 
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isActive 
                      ? "bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30"
                      : isLocked
                        ? "bg-surface-700 text-surface-500"
                        : "bg-surface-700 text-surface-400 group-hover:bg-surface-600"
                )}>
                  {isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="text-left">
                  <span className={cn(
                    "font-semibold text-sm block",
                    isActive 
                      ? "text-white" 
                      : isLocked 
                        ? "text-surface-600"
                        : "text-surface-400 group-hover:text-white"
                  )}>
                    {tab.label}
                  </span>
                  <span className={cn(
                    "text-xs",
                    isCompleted 
                      ? "text-emerald-500"
                      : isActive 
                        ? "text-amber-500"
                        : "text-surface-600"
                  )}>
                    {isCompleted ? '✓ Completado' : isLocked ? '🔒 Bloqueado' : state.status === 'readonly' ? '👁 Solo lectura' : ''}
                  </span>
                </div>
              </div>

              {/* Indicador Activo */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="h-1 bg-surface-800 flex">
        {tabs.map((tab) => {
          const state = getTabState(tab.id)
          return (
            <div 
              key={tab.id}
              className={cn(
                "flex-1 transition-all duration-500",
                state.status === 'completed' 
                  ? "bg-emerald-500"
                  : state.status === 'active' || state.status === 'readonly'
                    ? "bg-amber-500/50"
                    : "bg-transparent"
              )}
            />
          )
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="p-6">
        {activeTab === 'diagnosis' && (
          <DiagnosisTab 
            workOrder={workOrder} 
            readOnly={getTabState('diagnosis').status === 'readonly' || 
                      getTabState('diagnosis').status === 'completed'}
          />
        )}
        
        {activeTab === 'repair' && (
          <RepairTab 
            workOrder={workOrder}
            readOnly={getTabState('repair').status === 'completed'}
          />
        )}

        {activeTab === 'qc' && (
          <QCTab 
            workOrder={workOrder}
            readOnly={getTabState('qc').status === 'completed'}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab workOrder={workOrder} />
        )}
      </div>
    </div>
  )
}
