'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Package,
  DollarSign,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type InventoryItem } from '../actions'

interface InventoryDashboardProps {
  data: InventoryItem[]
}

// Tipo con clasificación ABC calculada
interface ItemWithABC extends InventoryItem {
  abcClass: 'A' | 'B' | 'C'
}

export function InventoryDashboard({ data }: InventoryDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // =====================================================
  // CÁLCULO DE CLASIFICACIÓN ABC (En Frontend)
  // =====================================================
  const dataWithABC: ItemWithABC[] = useMemo(() => {
    // Data ya viene ordenada por total_cost_value DESC
    const totalValue = data.reduce((sum, item) => sum + item.total_cost_value, 0)

    if (totalValue === 0) {
      return data.map(item => ({ ...item, abcClass: 'C' as const }))
    }

    let cumulativeValue = 0

    return data.map(item => {
      cumulativeValue += item.total_cost_value
      const cumulativePct = (cumulativeValue / totalValue) * 100

      // Clase A: Top 80% del valor -> Dorado
      // Clase B: Siguiente 15% (hasta 95%) -> Plateado
      // Clase C: Resto (5%) -> Bronce
      let abcClass: 'A' | 'B' | 'C'
      if (cumulativePct <= 80) {
        abcClass = 'A'
      } else if (cumulativePct <= 95) {
        abcClass = 'B'
      } else {
        abcClass = 'C'
      }

      return { ...item, abcClass }
    })
  }, [data])

  // =====================================================
  // FILTRADO POR BÚSQUEDA
  // =====================================================
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return dataWithABC
    const q = searchQuery.toLowerCase()
    return dataWithABC.filter(item =>
      item.brand.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    )
  }, [dataWithABC, searchQuery])

  // =====================================================
  // CÁLCULO DE KPIs
  // =====================================================
  const kpis = useMemo(() => ({
    totalValue: data.reduce((sum, i) => sum + i.total_cost_value, 0),
    totalUnits: data.reduce((sum, i) => sum + i.total_quantity, 0),
    slowModels: data.filter(i => (i.rotation_days ?? 0) > 60).length
  }), [data])

  // =====================================================
  // HELPERS
  // =====================================================
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value)

  // =====================================================
  // COMPONENTES UI
  // =====================================================

  // Barra de Disponibilidad
  const AvailabilityBar = ({ ready, inProcess }: { ready: number; inProcess: number }) => {
    const total = ready + inProcess
    if (total === 0) return <span className="text-xs text-surface-500">Sin stock</span>
    const readyPct = (ready / total) * 100

    return (
      <div className="max-w-[170px] space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{ready}</span>
          {inProcess > 0 && (
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              {inProcess} en proceso
            </span>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 flex overflow-hidden">
          <div className="h-full bg-emerald-500 dark:bg-emerald-600 transition-[width] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]" style={{ width: `${readyPct}%` }} />
          {inProcess > 0 && (
            <div
              className="h-full bg-amber-500 dark:bg-amber-600 transition-[width] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
              style={{ width: `${100 - readyPct}%` }}
            />
          )}
        </div>
      </div>
    )
  }

  // Badge de Rotación
  const RotationBadge = ({ days }: { days: number | null }) => {
    if (days === null) {
      return <span className="px-2 py-1 text-xs bg-surface-700 text-surface-400 rounded">N/A</span>
    }
    if (days < 30) {
      return (
        <span className="px-3 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 
                         border border-emerald-300 dark:border-emerald-500/30 rounded-lg">
          {days}d
        </span>
      )
    }
    if (days <= 60) {
      return (
        <span className="px-3 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 
                         border border-amber-300 dark:border-amber-500/30 rounded-lg">
          {days}d
        </span>
      )
    }
    return (
      <span className="px-3 py-1 text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 
                     border border-red-300 dark:border-red-500/30 rounded-lg">
        {days}d
      </span>
    )
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6">
      {/* KPIs Superiores - 3 Tarjetas */}
      <div className="grid grid-cols-3 gap-6">
        {/* 💰 Valor Total */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm uppercase tracking-wider">💰 Valor Total</span>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{formatCurrency(kpis.totalValue)}</p>
          <p className="text-emerald-600/70 dark:text-emerald-400/50 text-xs mt-1 font-medium">Capital en inventario</p>
        </div>

        {/* 📦 Total Unidades */}
        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/20 rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-indigo-700 dark:text-indigo-400 font-bold text-sm uppercase tracking-wider">📦 Total Unidades</span>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{kpis.totalUnits.toLocaleString()}</p>
          <p className="text-indigo-600/70 dark:text-indigo-400/50 text-xs mt-1 font-medium">Activos en stock</p>
        </div>

        {/* ⚠️ Modelos Lentos */}
        <div className={cn(
          "rounded-2xl p-6 border shadow-sm dark:shadow-none transition-all duration-300",
          kpis.slowModels > 10
            ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30"
            : kpis.slowModels > 5
              ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30"
              : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2.5 rounded-xl",
              kpis.slowModels > 10 ? "bg-red-500/10 dark:bg-red-500/20" :
                kpis.slowModels > 5 ? "bg-amber-500/10 dark:bg-amber-500/20" : "bg-emerald-500/10 dark:bg-emerald-500/20"
            )}>
              <AlertTriangle className={cn(
                "w-5 h-5",
                kpis.slowModels > 10 ? "text-red-600 dark:text-red-400" :
                  kpis.slowModels > 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              )} />
            </div>
            <span className={cn(
              "text-sm font-bold uppercase tracking-wider",
              kpis.slowModels > 10 ? "text-red-700 dark:text-red-400/80" :
                kpis.slowModels > 5 ? "text-amber-700 dark:text-amber-400/80" : "text-emerald-700 dark:text-emerald-400/80"
            )}>
              ⚠️ Modelos Lentos
            </span>
          </div>
          <p className={cn(
            "text-3xl font-extrabold",
            kpis.slowModels > 10 ? "text-red-700 dark:text-red-400" :
              kpis.slowModels > 5 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
          )}>
            {kpis.slowModels}
          </p>
          <p className={cn(
            "text-xs mt-1 font-medium",
            kpis.slowModels > 10 ? "text-red-600/70 dark:text-red-400/50" :
              kpis.slowModels > 5 ? "text-amber-600/70 dark:text-amber-400/50" : "text-emerald-600/70 dark:text-emerald-400/50"
          )}>
            &gt; 60 días en stock
          </p>
        </div>
      </div>

      {/* Buscador + leyenda */}
      <div className="space-y-4">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por marca, modelo o tipo..."
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-12 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 shadow-sm dark:shadow-inner focus:border-indigo-500 focus:outline-none transition-all duration-300"
          />
          {searchQuery && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {filteredData.length} resultados
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex-1 rounded-2xl border border-emerald-100 dark:border-emerald-800/20 bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-500">Rotación</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;30d</span>
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 30-60d</span>
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;60d</span>
            </div>
          </div>
          <div className="flex-1 rounded-2xl border border-indigo-100 dark:border-indigo-800/20 bg-indigo-50/50 dark:bg-indigo-900/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-500">ABC (Top Valor)</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold">
              <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> A · 80%</span>
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> B · 15%</span>
              <span className="text-amber-700 dark:text-amber-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600" /> C · 5%</span>
            </div>
          </div>
          <div className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">Estado de Stock</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Listo</span>
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> En Proceso</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Maestra */}
      <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm dark:shadow-none overflow-hidden overflow-x-auto transition-colors duration-300">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#0f1419] border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-4 text-gray-700 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                Producto
              </th>
              <th className="text-left px-4 py-4 text-gray-700 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                Disponibilidad
              </th>
              <th className="text-center px-3 py-4 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                Caja
              </th>
              <th className="text-center px-3 py-4 text-cyan-700 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                Fecha Recepción
              </th>
              <th className="text-center px-3 py-4 text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
                Ubicación
              </th>
              <th className="text-center px-3 py-4 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider">
                Transporte
              </th>
              <th className="text-left px-3 py-4 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                Lote
              </th>
              <th className="text-center px-3 py-4 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
                Clasificación ABC
              </th>
              <th className="text-center px-4 py-4 text-gray-700 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <Package className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                  <p className="text-surface-400">No se encontraron resultados</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr
                  key={`${item.brand}-${item.model}-${item.type}`}
                  className="hover:bg-gray-50 dark:hover:bg-[#242936] transition-colors border-b border-gray-50 dark:border-gray-800/50"
                >
                  {/* Producto */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        item.abcClass === 'A' ? 'bg-amber-500/15' :
                          item.abcClass === 'B' ? 'bg-slate-400/15' : 'bg-amber-700/15'
                      )}>
                        <Package className={cn(
                          "w-4 h-4",
                          item.abcClass === 'A' ? 'text-amber-400' :
                            item.abcClass === 'B' ? 'text-slate-300' : 'text-amber-600'
                        )} />
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold">{item.brand} {item.model}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{item.type}</p>
                      </div>
                    </div>
                  </td>

                  {/* Disponibilidad */}
                  <td className="px-4 py-4">
                    <AvailabilityBar ready={item.available_count} inProcess={item.in_process_count} />
                  </td>

                  {/* Caja */}
                  <td className="px-3 py-4 text-center">
                    {item.box_numbers && item.box_numbers.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        {item.box_numbers.slice(0, 2).map((boxNum, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30"
                          >
                            📦 {boxNum}
                          </span>
                        ))}
                        {item.box_numbers.length > 2 && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300/60 uppercase">
                            +{item.box_numbers.length - 2} más
                          </span>
                        )}
                      </div>
                    ) : item.box_number && item.box_number > 0 ? (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                        📦 {item.box_number}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Fecha de Recepción */}
                  <td className="px-3 py-4 text-center">
                    {item.reception_date ? (
                      <div className="flex flex-col items-center">
                        <span className="text-green-700 dark:text-green-400 text-xs font-bold">
                          {new Date(item.reception_date).toLocaleDateString('es-GT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500 text-[10px] font-medium">
                          {new Date(item.reception_date).toLocaleTimeString('es-GT', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Ubicación */}
                  <td className="px-3 py-4 text-center">
                    {item.location ? (
                      <span className="text-purple-700 dark:text-purple-400 text-xs font-mono font-bold">
                        {item.location}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Transporte */}
                  <td className="px-3 py-4 text-center">
                    {item.driver_name ? (
                      <div className="flex flex-col items-center text-[11px]">
                        <span className="text-green-700 dark:text-green-400 font-bold">{item.driver_name}</span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{item.vehicle_plate || '-'}</span>
                        {item.transport_guide && (
                          <span className="text-blue-700 dark:text-blue-400 font-mono font-bold">{item.transport_guide}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Lote */}
                  <td className="px-3 py-4">
                    {item.batch_code ? (
                      <span className="text-blue-700 dark:text-blue-400 text-xs font-mono font-bold">
                        {item.batch_code}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Clasificación ABC */}
                  <td className="px-3 py-4 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {item.classification_f && (
                        <span className="rounded-full border border-sky-300 dark:border-sky-500/30 bg-sky-100 dark:bg-sky-500/15 px-3 py-1 text-[10px] font-bold text-sky-800 dark:text-sky-200">
                          F: {item.classification_f}
                        </span>
                      )}
                      {item.classification_c && (
                        <span className="rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-100 dark:bg-amber-500/15 px-3 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-100">
                          C: {item.classification_c}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acción */}
                  <td className="px-4 py-4 text-center">
                    <Link
                      href={`/dashboard/inventario/activos?brand=${encodeURIComponent(item.brand)}&model=${encodeURIComponent(item.model)}&type=${encodeURIComponent(item.type)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 
                               bg-indigo-600 hover:bg-indigo-500 
                               text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Ver Seriales
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
