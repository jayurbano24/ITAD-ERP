import Link from 'next/link'
import {
  ShoppingCart,
  Plus,
  FileText,
  TrendingUp,
  Package,
  DollarSign,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSalesOrders } from './actions'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const { data: orders } = await getSalesOrders()

  // Calcular estadísticas
  const stats = {
    totalOrders: orders?.length || 0,
    confirmedOrders: orders?.filter(o => o.status === 'confirmed').length || 0,
    draftOrders: orders?.filter(o => o.status === 'draft').length || 0,
    totalRevenue: orders?.filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
  }

  const statusBadgeStyles: Record<string, string> = {
    draft: 'bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-300 border-gray-200 dark:border-surface-600',
    confirmed: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    paid: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
    shipped: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
    delivered: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30',
    cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    confirmed: 'Confirmada',
    paid: 'Pagada',
    shipped: 'Enviada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 dark:bg-surface-950 min-h-screen transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <ShoppingCart className="w-10 h-10 text-emerald-600 dark:text-emerald-500" />
            Ventas y Remarketing
          </h1>
          <p className="text-gray-500 dark:text-surface-400 mt-1 font-medium">
            Gestión de órdenes de venta • POS Serializado
          </p>
        </div>
        <Link
          href="/dashboard/ventas/nuevo"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 
                   text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Nueva Venta
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-gray-500 dark:text-surface-400 text-sm font-bold uppercase tracking-wider">Ingresos Totales</span>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            Q{stats.totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-gray-500 dark:text-surface-400 text-sm font-bold uppercase tracking-wider">Órdenes Totales</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stats.totalOrders}</p>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-gray-500 dark:text-surface-400 text-sm font-bold uppercase tracking-wider">Confirmadas</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stats.confirmedOrders}</p>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-gray-500 dark:text-surface-400 text-sm font-bold uppercase tracking-wider">Borradores</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{stats.draftOrders}</p>
        </div>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-50 dark:border-surface-800 flex items-center justify-between bg-white dark:bg-surface-850/50">
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Órdenes de Venta</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-surface-850 border-b border-gray-100 dark:border-surface-700">
                <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-widest leading-none">
                  Orden
                </th>
                <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-widest leading-none">
                  Cliente
                </th>
                <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-widest leading-none">
                  Items
                </th>
                <th className="text-right px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-widest leading-none">
                  Total
                </th>
                <th className="text-center px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-widest leading-none">
                  Estado
                </th>
                <th className="text-left px-6 py-4 text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-widest leading-none">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-surface-800">
              {(!orders || orders.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-surface-800 rounded-full">
                        <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-surface-700" />
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-surface-400 font-bold text-lg">No hay órdenes de venta</p>
                        <Link
                          href="/dashboard/ventas/nuevo"
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold text-sm mt-2 inline-block transition-colors"
                        >
                          Crear primera venta →
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="text-gray-900 dark:text-white font-mono font-bold tracking-tighter group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{order.order_number}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-gray-900 dark:text-white font-bold">{order.customer?.commercial_name || 'N/A'}</p>
                      <p className="text-gray-400 dark:text-surface-500 text-xs font-medium uppercase tracking-wider">{order.customer?.tax_id_nit}</p>
                    </td>
                    <td className="px-6 py-5 font-medium">
                      <span className="text-gray-600 dark:text-surface-300 px-2 py-1 bg-gray-100 dark:bg-surface-800 rounded-lg text-sm">
                        {order.items?.[0]?.count || 0} equipos
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums">
                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-lg">
                        Q{(order.total_amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                        statusBadgeStyles[order.status] || statusBadgeStyles.draft
                      )}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-gray-500 dark:text-surface-400 text-sm font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

