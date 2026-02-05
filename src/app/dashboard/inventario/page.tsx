import { Package, AlertTriangle, Warehouse, Download } from 'lucide-react'
import Link from 'next/link'
import { getInventoryMaster } from './actions'
import { InventoryDashboard } from './components/InventoryDashboard'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getWarehouseCounts() {
  const supabase = await createClient()
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, code')
    .in('code', ['BOD-REC', 'BOD-REM', 'BOD-VAL'])
    .eq('is_active', true)

  if (!warehouses) return {}

  const counts = await Promise.all(
    warehouses.map(async (warehouse) => {
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('current_warehouse_id', warehouse.id)
      return { code: warehouse.code, count: count || 0 }
    })
  )

  return counts.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.code] = entry.count
    return acc
  }, {})
}

export default async function InventoryPage() {
  const [{ data, error }, warehouseCounts] = await Promise.all([
    getInventoryMaster(),
    getWarehouseCounts()
  ])

  return (
    <div className="p-6 bg-white dark:bg-[#0f1419] min-h-screen transition-colors duration-300">
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="space-y-6 rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f2e] p-6 shadow-sm dark:shadow-none">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                Inventario Maestro
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
                Dashboard Gerencial • Clasificación ABC • Análisis de Rotación
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/dashboard/inventario/api/excel"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-5 py-3 text-sm font-bold text-gray-900 dark:text-white transition hover:border-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                Reporte Excel
              </a>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-300 dark:border-red-800 bg-red-100 dark:bg-red-900/10 p-4 text-sm text-red-800 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="font-semibold">Error al cargar datos: {error}</p>
            </div>
          )}

          {/* Dashboard (Client Component) */}
          <InventoryDashboard data={data} />
        </div>
      </div>
    </div>
  )
}
