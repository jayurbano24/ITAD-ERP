'use client'

import { useMemo, useState } from 'react'
import { 
  Package, 
  RefreshCw, 
  Wrench,
  Clock,
  AlertTriangle,
  Smartphone,
  Laptop,
  Monitor,
  Server,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PendingDispatchOrder } from '../actions'
import { DispatchPartModal } from './DispatchPartModal'
import { DispatchSeedstockModal } from './DispatchSeedstockModal'

// Mapeo de iconos por tipo
const assetTypeIcons: Record<string, React.ElementType> = {
  laptop: Laptop,
  desktop: Monitor,
  smartphone: Smartphone,
  tablet: Smartphone,
  server: Server,
  other: Package,
}

interface DispatchTabsProps {
  ordersWaitingParts: PendingDispatchOrder[]
  ordersWaitingSeedstock: PendingDispatchOrder[]
}

const PENDING_PART_REQUEST_STATUSES = new Set(['pending', 'waiting'])

const hasPendingPartRequests = (order: PendingDispatchOrder) => {
  return (order.part_requests ?? []).some((request) => {
    const status = (request.status ?? 'pending').toLowerCase()
    return PENDING_PART_REQUEST_STATUSES.has(status)
  })
}

export function DispatchTabs({ ordersWaitingParts, ordersWaitingSeedstock }: DispatchTabsProps) {
  const [activeTab, setActiveTab] = useState<'parts' | 'seedstock'>('parts')
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<PendingDispatchOrder | null>(null)
  const [isPartModalOpen, setIsPartModalOpen] = useState(false)
  const [isSeedstockModalOpen, setIsSeedstockModalOpen] = useState(false)

  const handleDispatchPart = (order: PendingDispatchOrder) => {
    setSelectedOrder(null)
    setIsPartModalOpen(false)
    // force a clean state before opening so the modal always renders with the latest order
    setTimeout(() => {
      setSelectedOrder(order)
      setIsPartModalOpen(true)
    }, 0)
  }

  const handleDispatchSeedstock = (order: PendingDispatchOrder) => {
    setSelectedOrder(null)
    setIsSeedstockModalOpen(false)
    setTimeout(() => {
      setSelectedOrder(order)
      setIsSeedstockModalOpen(true)
    }, 0)
  }

  const handleCloseModals = () => {
    setIsPartModalOpen(false)
    setIsSeedstockModalOpen(false)
    setSelectedOrder(null)
  }

  const pendingPartOrders = useMemo(
    () => ordersWaitingParts.filter(hasPendingPartRequests),
    [ordersWaitingParts]
  )

  return (
    <>
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-surface-800">
          <button
            onClick={() => setActiveTab('parts')}
            className={cn(
              "flex-1 flex items-center justify-center gap-3 py-4 px-6 transition-all relative",
              activeTab === 'parts'
                ? "bg-surface-800 text-white"
                : "text-surface-400 hover:text-white hover:bg-surface-850"
            )}
          >
            <Package className={cn(
              "w-5 h-5",
              activeTab === 'parts' ? "text-amber-400" : ""
            )} />
            <span className="font-semibold">Despacho de Repuestos</span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium",
              activeTab === 'parts' 
                ? "bg-amber-500/20 text-amber-400"
                  : "bg-surface-700 text-surface-400"
            )}>
                {pendingPartOrders.length}
            </span>
            {activeTab === 'parts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('seedstock')}
            className={cn(
              "flex-1 flex items-center justify-center gap-3 py-4 px-6 transition-all relative",
              activeTab === 'seedstock'
                ? "bg-surface-800 text-white"
                : "text-surface-400 hover:text-white hover:bg-surface-850"
            )}
          >
            <RefreshCw className={cn(
              "w-5 h-5",
              activeTab === 'seedstock' ? "text-indigo-400" : ""
            )} />
            <span className="font-semibold">Despacho Seedstock</span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium",
              activeTab === 'seedstock' 
                ? "bg-indigo-500/20 text-indigo-400"
                : "bg-surface-700 text-surface-400"
            )}>
              {ordersWaitingSeedstock.length}
            </span>
            {activeTab === 'seedstock' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* ===== PESTAÑA 1: REPUESTOS ===== */}
          {activeTab === 'parts' && (
            <div>
              {pendingPartOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-surface-700 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-surface-400">Sin órdenes pendientes</h3>
                  <p className="text-surface-500 mt-2">
                    No hay órdenes esperando piezas en este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Nota */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-amber-400 font-semibold">Despacho rápido</p>
                      <p className="text-surface-400 text-sm mt-1">
                        Para despachar, escanea/escribe el <span className="font-mono text-surface-200">SKU</span> solicitado y confirma.
                      </p>
                    </div>
                  </div>

                  {/* Lista de órdenes */}
                  <div className="space-y-3">
                    {pendingPartOrders.map((order) => {
                      const AssetIcon = order.asset 
                        ? assetTypeIcons[order.asset.asset_type] || Package 
                        : Package
                      
                      return (
                        <div 
                          key={order.id}
                          className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 
                                   hover:border-amber-500/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-amber-500/10 rounded-xl">
                                <AssetIcon className="w-6 h-6 text-amber-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <p className="font-mono text-white font-semibold">
                                    {order.work_order_number}
                                  </p>
                                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 
                                                 text-xs font-medium rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Esperando Piezas
                                  </span>
                                </div>
                                <p className="text-surface-400 text-sm mt-1">
                                  {order.asset?.internal_tag} • {order.asset?.manufacturer} {order.asset?.model}
                                </p>
                                {order.failure_type && (
                                  <p className="text-surface-500 text-xs mt-1">
                                    Falla: {order.failure_type}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Piezas solicitadas */}
                              {order.part_requests && order.part_requests.length > 0 && (
                                <div className="text-right">
                                  <p className="text-surface-500 text-xs">Piezas solicitadas</p>
                                  <p className="text-white font-medium">
                                    {order.part_requests.map(pr => pr.part_sku).join(', ')}
                                  </p>
                                </div>
                              )}

                              <button
                                onClick={() => handleDispatchPart(order)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 
                                         text-white font-semibold rounded-xl transition-colors"
                              >
                                <Wrench className="w-4 h-4" />
                                Despachar
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== PESTAÑA 2: SEEDSTOCK ===== */}
          {activeTab === 'seedstock' && (
            <div>
              {ordersWaitingSeedstock.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-16 h-16 text-surface-700 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-surface-400">Sin órdenes de seedstock</h3>
                  <p className="text-surface-500 mt-2">
                    No hay órdenes esperando cambio de unidad en este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Info de trazabilidad */}
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-indigo-400 font-semibold">Trazabilidad de IMEI</p>
                      <p className="text-surface-400 text-sm mt-1">
                        Se registrará el IMEI original y el nuevo IMEI de la unidad de reemplazo para mantener la trazabilidad completa.
                      </p>
                    </div>
                  </div>

                  {/* Lista de órdenes */}
                  <div className="space-y-3">
                    {ordersWaitingSeedstock.map((order) => {
                      const AssetIcon = order.asset 
                        ? assetTypeIcons[order.asset.asset_type] || Package 
                        : Package
                      
                      return (
                        <div 
                          key={order.id}
                          className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 
                                   hover:border-indigo-500/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-indigo-500/10 rounded-xl">
                                <AssetIcon className="w-6 h-6 text-indigo-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <p className="font-mono text-white font-semibold">
                                    {order.work_order_number}
                                  </p>
                                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 
                                                 text-xs font-medium rounded-full flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    Esperando Seedstock
                                  </span>
                                </div>
                                <p className="text-surface-400 text-sm mt-1">
                                  {order.asset?.internal_tag} • {order.asset?.manufacturer} {order.asset?.model}
                                </p>
                                {order.original_imei && (
                                  <p className="text-surface-500 text-xs mt-1 font-mono">
                                    IMEI Original: {order.original_imei}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Info del equipo */}
                              <div className="text-right">
                                <p className="text-surface-500 text-xs">Buscar reemplazo para</p>
                                <p className="text-white font-medium">
                                  {order.asset?.manufacturer} {order.asset?.model}
                                </p>
                              </div>

                              <button
                                onClick={() => handleDispatchSeedstock(order)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 
                                         text-white font-semibold rounded-xl transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Asignar Seedstock
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {selectedOrder && (
        <>
          <DispatchPartModal
            isOpen={isPartModalOpen}
            onClose={handleCloseModals}
            order={selectedOrder}
          />
          <DispatchSeedstockModal
            isOpen={isSeedstockModalOpen}
            onClose={handleCloseModals}
            order={selectedOrder}
          />
        </>
      )}
    </>
  )
}

