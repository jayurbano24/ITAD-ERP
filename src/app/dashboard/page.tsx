import { createClient } from '@/lib/supabase/server'
import {
  Package,
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Truck,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { StatsCard } from '@/components/ui/StatsCard'

/**
 * Dashboard Principal - Ruta Protegida
 * Muestra resumen y estadísticas del sistema
 */
export default async function DashboardPage() {
  const supabase = await createClient()

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

  // Consultas de estadísticas en paralelo
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { data: activeWarehouses },
    { count: activeTicketsCount },
    { count: wipingCount },
    { count: completedTodayCount }
  ] = await Promise.all([
    // 1. Obtener IDs de bodegas principales
    supabase
      .from('warehouses')
      .select('id')
      .in('code', ['BOD-REC', 'BOD-REM', 'BOD-VAL']),

    // 2. Tickets Activos
    supabase
      .from('operations_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'assigned', 'confirmed', 'in_progress']),

    // 3. En Proceso de Borrado
    supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['received', 'wiping']),

    // 4. Tickets Completados Hoy
    supabase
      .from('operations_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString())
  ])

  // Calcular total de assets en bodegas principales
  let assetsCount = 0
  if (activeWarehouses && activeWarehouses.length > 0) {
    const warehouseIds = activeWarehouses.map(w => w.id)
    const { count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .in('current_warehouse_id', warehouseIds)
    assetsCount = count || 0
  }

  // Datos reales para las tarjetas
  const stats = [
    { label: 'Assets en Bodega', value: assetsCount.toLocaleString() || '0', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Tickets Activos', value: activeTicketsCount?.toString() || '0', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'En Proceso de Borrado', value: wipingCount?.toString() || '0', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Tickets Completados Hoy', value: completedTodayCount?.toString() || '0', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <Text variant="muted">User ID</Text>
                <Text variant="muted" className="font-mono text-xs">{user?.id?.slice(0, 8)}...</Text>
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
