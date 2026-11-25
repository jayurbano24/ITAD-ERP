import { createClient } from '@/lib/supabase/server'
import {
  Package,
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Truck,
  Calendar,
  Laptop,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import DashboardDateFilters from './components/DashboardDateFilters'
import { resolveDashboardDateRange } from '@/lib/dashboard/dashboardDateRange'

export const dynamic = 'force-dynamic'

type DashboardSearchParams = {
  from?: string
  to?: string
  preset?: string
}

/**
 * Dashboard Principal - Ruta Protegida
 * Muestra resumen y estadísticas del sistema
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>
}) {
  const supabase = await createClient()
  const params = (await searchParams) ?? {}
  const dateRange = resolveDashboardDateRange(params)
  const { fromIso, toIso, hasFilter, preset } = dateRange

  // Obtener usuario y perfil
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user?.id)
    .single()

  const { data: company } = await supabase
    .from('company_settings')
    .select('name, address')
    .limit(1)
    .single()

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const companyName = company?.name || 'ITAD ERP Guatemala'

  const { data: activeWarehouses } = await supabase
    .from('warehouses')
    .select('id')
    .in('code', ['BOD-REC', 'BOD-REM', 'BOD-VAL'])

  const warehouseIds = activeWarehouses?.map((w) => w.id) ?? []

  const applyDate = <T extends { gte: (col: string, v: string) => T; lte: (col: string, v: string) => T }>(
    q: T,
    column: string
  ) => q.gte(column, fromIso).lte(column, toIso)

  const ticketsActiveQuery = supabase
    .from('operations_tickets')
    .select('*', { count: 'exact', head: true })

  const ticketsActiveCountPromise =
    preset === 'all'
      ? ticketsActiveQuery.in('status', ['open', 'assigned', 'confirmed', 'in_progress'])
      : applyDate(ticketsActiveQuery, 'created_at')

  const wipingQuery = supabase.from('assets').select('*', { count: 'exact', head: true })
  const wipingCountPromise =
    preset === 'all'
      ? wipingQuery.in('status', ['received', 'wiping'])
      : applyDate(wipingQuery.in('status', ['received', 'wiping']), 'created_at')

  let completedQuery = supabase
    .from('operations_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
  if (preset !== 'all') {
    completedQuery = applyDate(completedQuery, 'completed_at')
  }

  let soldQuery = supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold')
    .ilike('asset_type', 'laptop')
  if (preset !== 'all') {
    soldQuery = applyDate(soldQuery, 'sold_at')
  }

  const [
    { count: activeTicketsCount },
    { count: wipingCount },
    { count: completedCount },
    { count: soldLaptopsCount },
  ] = await Promise.all([
    ticketsActiveCountPromise,
    wipingCountPromise,
    completedQuery,
    soldQuery,
  ])

  let assetsCount = 0
  if (warehouseIds.length > 0) {
    let assetsQuery = supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .in('current_warehouse_id', warehouseIds)

    if (preset !== 'all') {
      assetsQuery = applyDate(assetsQuery, 'created_at')
    }

    const { count } = await assetsQuery
    assetsCount = count || 0
  }

  const assetsLabel = preset === 'all' ? 'Assets en Bodega' : 'Recepciones (período)'
  const ticketsActiveLabel = preset === 'all' ? 'Tickets Activos' : 'Tickets creados'
  const completedLabel = preset === 'today' ? 'Tickets completados hoy' : 'Tickets completados'

  const stats = [
    {
      label: assetsLabel,
      value: assetsCount.toLocaleString(),
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      hint: preset === 'all' ? 'Inventario actual' : 'Equipos registrados en el período',
    },
    {
      label: ticketsActiveLabel,
      value: (activeTicketsCount ?? 0).toString(),
      icon: FileText,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      hint: preset === 'all' ? 'En curso ahora' : 'Nuevos tickets en el período',
    },
    {
      label: 'En Proceso de Borrado',
      value: (wipingCount ?? 0).toString(),
      icon: Clock,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      hint: preset === 'all' ? 'Estado actual' : 'En cola en el período',
    },
    {
      label: 'Laptops vendidas',
      value: (soldLaptopsCount ?? 0).toLocaleString(),
      icon: Laptop,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      hint: preset === 'all' ? 'Histórico total' : 'Por fecha de venta',
    },
    {
      label: completedLabel,
      value: (completedCount ?? 0).toString(),
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      hint: 'Por fecha de cierre',
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1419] transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-8 py-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <Text variant="h1" as="h2">Dashboard</Text>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Bienvenido de vuelta, <span className="text-green-600 dark:text-green-400 font-semibold">{userName}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <Text variant="secondary" className="text-sm">
                {new Date().toLocaleDateString('es-GT', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        <DashboardDateFilters
          preset={dateRange.preset}
          from={dateRange.from}
          to={dateRange.to}
          rangeLabel={dateRange.label}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm dark:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <Text variant="h2" as="p" className="leading-tight">{stat.value}</Text>
              <Text variant="muted" className="mt-1 block uppercase font-bold tracking-tighter">{stat.label}</Text>
              {'hint' in stat && stat.hint ? (
                <Text variant="muted" className="mt-1 block text-[10px] normal-case font-medium text-gray-400">
                  {stat.hint}
                </Text>
              ) : null}
            </div>
          ))}
        </div>

        {/* Welcome Card */}
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/20 rounded-2xl p-8 mb-8 text-indigo-100">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-500/10 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <Text variant="h3" as="h3" className="text-gray-900 dark:text-white">
                Sistema {companyName}
              </Text>
              <Text variant="secondary" className="mt-1 block">
                Gestión integral de activos tecnológicos y reciclaje electrónico certificado R2v3.
              </Text>
              <Text variant="muted" className="text-sm mt-2 block">
                Usuario: <span className="text-green-700 dark:text-green-400 font-mono font-bold">{userName}</span>
              </Text>
            </div>
          </div>
        </div>

        {/* Quick Actions & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
            <Text variant="h3" as="h4" className="mb-4">Acciones Rápidas</Text>
            <div className="space-y-3">
              <a
                href="/dashboard/tickets"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1419] rounded-xl hover:bg-gray-100 dark:hover:bg-[#1a1f2e] transition-colors border border-gray-100 dark:border-gray-800"
              >
                <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <Text variant="secondary" className="font-medium">Crear nuevo ticket</Text>
              </a>
              <a
                href="/dashboard/inventario"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1419] rounded-xl hover:bg-gray-100 dark:hover:bg-[#1a1f2e] transition-colors border border-gray-100 dark:border-gray-800"
              >
                <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <Text variant="secondary" className="font-medium">Ver inventario</Text>
              </a>
              <a
                href="/dashboard/logistica"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1419] rounded-xl hover:bg-gray-100 dark:hover:bg-[#1a1f2e] transition-colors border border-gray-100 dark:border-gray-800"
              >
                <Truck className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <Text variant="secondary" className="font-medium">Recepción de lotes</Text>
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
            <Text variant="h3" as="h4" className="mb-4">Información de Sesión</Text>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <Text variant="muted">Email</Text>
                <Text variant="body" className="font-mono">{user?.email}</Text>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <Text variant="muted">Rol</Text>
                <Text variant="body" className="capitalize font-bold text-green-700 dark:text-green-400">
                  {profile?.role?.replace('_', ' ') || 'Usuario'}
                </Text>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <Text variant="muted">Nombre</Text>
                <Text variant="body" className="font-semibold text-right max-w-[60%]">
                  {profile?.full_name || userName}
                </Text>
              </div>
              <div className="flex justify-between py-2">
                <Text variant="muted">Último acceso</Text>
                <Text variant="secondary">
                  {new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
