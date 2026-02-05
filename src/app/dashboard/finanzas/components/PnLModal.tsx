'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Package,
  Truck,
  Wrench,
  HardDrive,
  DollarSign,
  FileText,
  Download,
  CheckCircle,
  Loader2,
  PieChart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createSettlement, type BatchForSettlement, type PnLResult } from '../actions'

interface PnLModalProps {
  batch: BatchForSettlement
  pnl: PnLResult
  onClose: () => void
}

export function PnLModal({ batch, pnl, onClose }: PnLModalProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 0
    }).format(value)
  }

  const handleSaveSettlement = async () => {
    setIsSaving(true)
    const result = await createSettlement(batch.id, pnl)
    setIsSaving(false)
    
    if (result.success) {
      setSaved(true)
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 1500)
    }
  }

  // Calcular alturas para el gráfico de cascada
  const maxValue = Math.max(pnl.gross_revenue, pnl.acquisition_cost + pnl.total_expenses)
  const getHeight = (value: number) => Math.max((value / maxValue) * 200, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-700 bg-gradient-to-r from-surface-850 to-surface-900">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PieChart className="w-6 h-6 text-amber-400" />
              Estado de Resultados
            </h2>
            <p className="text-surface-400 text-sm mt-1">
              Lote {pnl.batch_number} • {batch.client_reference || 'Sin referencia'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* KPIs rápidos */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-800/50 rounded-xl p-4 text-center">
              <Package className="w-5 h-5 text-surface-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{pnl.total_units}</p>
              <p className="text-surface-500 text-xs">Unidades</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-400">{pnl.units_sold}</p>
              <p className="text-surface-500 text-xs">Vendidos ({pnl.sell_through_pct}%)</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{formatCurrency(pnl.avg_sale_price)}</p>
              <p className="text-surface-500 text-xs">Precio Prom. Venta</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-surface-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-surface-300">{formatCurrency(pnl.avg_cost_per_unit)}</p>
              <p className="text-surface-500 text-xs">Costo Prom. Unidad</p>
            </div>
          </div>

          {/* Gráfico de Cascada (Waterfall) */}
          <div className="mb-6 p-4 bg-surface-800/30 rounded-xl">
            <h3 className="text-sm font-bold text-surface-400 uppercase mb-4">Flujo Financiero</h3>
            <div className="flex items-end justify-between gap-2 h-56">
              {/* Ventas */}
              <div className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-emerald-600 to-emerald-500 rounded-t-lg transition-all"
                  style={{ height: getHeight(pnl.gross_revenue) }}
                />
                <div className="mt-2 text-center">
                  <p className="text-emerald-400 font-bold text-sm">{formatCurrency(pnl.gross_revenue)}</p>
                  <p className="text-surface-500 text-xs">Ventas</p>
                </div>
              </div>

              {/* Costo Adquisición */}
              <div className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-red-600 to-red-500 rounded-t-lg transition-all"
                  style={{ height: getHeight(pnl.acquisition_cost) }}
                />
                <div className="mt-2 text-center">
                  <p className="text-red-400 font-bold text-sm">-{formatCurrency(pnl.acquisition_cost)}</p>
                  <p className="text-surface-500 text-xs">Costo Lote</p>
                </div>
              </div>

              {/* Logística */}
              {pnl.logistics_cost > 0 && (
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-orange-600 to-orange-500 rounded-t-lg transition-all"
                    style={{ height: getHeight(pnl.logistics_cost) }}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-orange-400 font-bold text-sm">-{formatCurrency(pnl.logistics_cost)}</p>
                    <p className="text-surface-500 text-xs">Logística</p>
                  </div>
                </div>
              )}

              {/* Refurbishing */}
              {(pnl.parts_cost + pnl.labor_cost) > 0 && (
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-lg transition-all"
                    style={{ height: getHeight(pnl.parts_cost + pnl.labor_cost) }}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-amber-400 font-bold text-sm">-{formatCurrency(pnl.parts_cost + pnl.labor_cost)}</p>
                    <p className="text-surface-500 text-xs">Refurbishing</p>
                  </div>
                </div>
              )}

              {/* Data Wipe */}
              {pnl.data_wipe_cost > 0 && (
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-500 rounded-t-lg transition-all"
                    style={{ height: getHeight(pnl.data_wipe_cost) }}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-purple-400 font-bold text-sm">-{formatCurrency(pnl.data_wipe_cost)}</p>
                    <p className="text-surface-500 text-xs">Borrado</p>
                  </div>
                </div>
              )}

              {/* Margen Neto */}
              <div className="flex-1 flex flex-col items-center">
                <div 
                  className={cn(
                    "w-full rounded-t-lg transition-all",
                    pnl.operating_profit >= 0 
                      ? "bg-gradient-to-t from-blue-600 to-blue-500"
                      : "bg-gradient-to-t from-red-800 to-red-700"
                  )}
                  style={{ height: getHeight(Math.abs(pnl.operating_profit)) }}
                />
                <div className="mt-2 text-center">
                  <p className={cn(
                    "font-bold text-sm",
                    pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400"
                  )}>
                    {pnl.operating_profit >= 0 ? '' : '-'}{formatCurrency(Math.abs(pnl.operating_profit))}
                  </p>
                  <p className="text-surface-500 text-xs">Margen Neto</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Desglose */}
          <div className="bg-surface-800/30 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left px-4 py-3 text-surface-400 text-xs font-semibold uppercase">
                    Concepto
                  </th>
                  <th className="text-right px-4 py-3 text-surface-400 text-xs font-semibold uppercase">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {/* Ingresos */}
                <tr className="bg-emerald-500/5">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">(+) Ventas Brutas</span>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                    {formatCurrency(pnl.gross_revenue)}
                  </td>
                </tr>

                {/* Costos */}
                <tr>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-surface-400" />
                    <span className="text-surface-300">(-) Costo de Adquisición</span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-400">
                    -{formatCurrency(pnl.acquisition_cost)}
                  </td>
                </tr>

                {pnl.logistics_cost > 0 && (
                  <tr>
                    <td className="px-4 py-3 flex items-center gap-2 pl-8">
                      <Truck className="w-4 h-4 text-surface-500" />
                      <span className="text-surface-400">(-) Logística / Flete</span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      -{formatCurrency(pnl.logistics_cost)}
                    </td>
                  </tr>
                )}

                {pnl.parts_cost > 0 && (
                  <tr>
                    <td className="px-4 py-3 flex items-center gap-2 pl-8">
                      <Wrench className="w-4 h-4 text-surface-500" />
                      <span className="text-surface-400">(-) Repuestos</span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      -{formatCurrency(pnl.parts_cost)}
                    </td>
                  </tr>
                )}

                {pnl.labor_cost > 0 && (
                  <tr>
                    <td className="px-4 py-3 flex items-center gap-2 pl-8">
                      <Wrench className="w-4 h-4 text-surface-500" />
                      <span className="text-surface-400">(-) Mano de Obra</span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      -{formatCurrency(pnl.labor_cost)}
                    </td>
                  </tr>
                )}

                {pnl.data_wipe_cost > 0 && (
                  <tr>
                    <td className="px-4 py-3 flex items-center gap-2 pl-8">
                      <HardDrive className="w-4 h-4 text-surface-500" />
                      <span className="text-surface-400">(-) Borrado de Datos</span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      -{formatCurrency(pnl.data_wipe_cost)}
                    </td>
                  </tr>
                )}

                {pnl.other_costs > 0 && (
                  <tr>
                    <td className="px-4 py-3 flex items-center gap-2 pl-8">
                      <DollarSign className="w-4 h-4 text-surface-500" />
                      <span className="text-surface-400">(-) Otros Gastos</span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      -{formatCurrency(pnl.other_costs)}
                    </td>
                  </tr>
                )}

                {/* Resultado */}
                <tr className={cn(
                  "font-bold",
                  pnl.operating_profit >= 0 ? "bg-blue-500/10" : "bg-red-500/10"
                )}>
                  <td className="px-4 py-4 flex items-center gap-2">
                    <DollarSign className={cn("w-5 h-5", pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400")} />
                    <span className={pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400"}>
                      (=) MARGEN NETO
                    </span>
                    <span className={cn(
                      "ml-2 px-2 py-0.5 rounded text-xs",
                      pnl.profit_margin_pct >= 20 ? "bg-emerald-500/20 text-emerald-400" :
                      pnl.profit_margin_pct >= 10 ? "bg-amber-500/20 text-amber-400" :
                      pnl.profit_margin_pct >= 0 ? "bg-blue-500/20 text-blue-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      {pnl.profit_margin_pct}%
                    </span>
                  </td>
                  <td className={cn(
                    "px-4 py-4 text-right text-xl",
                    pnl.operating_profit >= 0 ? "text-blue-400" : "text-red-400"
                  )}>
                    {formatCurrency(pnl.operating_profit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="flex items-center justify-between p-6 border-t border-surface-700 bg-surface-850">
          <button
            onClick={onClose}
            className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
          >
            Cerrar
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {/* TODO: Generar PDF */}}
              className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 
                       text-white rounded-lg transition-colors border border-surface-700"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
            
            {saved ? (
              <div className="flex items-center gap-2 px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                ¡Guardado!
              </div>
            ) : (
              <button
                onClick={handleSaveSettlement}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 
                         text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Guardar Liquidación
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

