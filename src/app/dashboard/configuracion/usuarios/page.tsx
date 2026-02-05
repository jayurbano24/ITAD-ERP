import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Users,
  Settings,
  Building2,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { getSystemUsers, getAllCatalogs, getCompanySettings, checkAdminConfig } from './actions'
import { ConfigTabs } from './components/ConfigTabs'
import { Text } from '@/components/ui/Text'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionUsuariosPage() {
  const supabase = await createClient()

  // Verificar autenticación y permisos
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // Verificar configuración
  const isConfigured = await checkAdminConfig()

  // Obtener datos
  const [usersResult, catalogs, companySettings] = await Promise.all([
    getSystemUsers(),
    getAllCatalogs(),
    getCompanySettings()
  ])

  const users = usersResult.data || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            <Text variant="h1" as="h1">Configuración del Sistema</Text>
          </div>
          <Text variant="secondary" className="mt-1 block">
            Administración de usuarios, roles y catálogos
          </Text>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl shadow-sm">
          <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <Text variant="label" className="text-rose-600 dark:text-rose-400 font-black tracking-tight">Acceso Restringido</Text>
        </div>
      </div>

      {/* Aviso de configuración */}
      {!isConfigured && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 flex items-start gap-4 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <Text variant="h3" className="text-rose-600 dark:text-rose-400">Configuración Requerida</Text>
            <Text variant="muted" className="text-rose-600/80 dark:text-rose-400/80 mt-1 block">
              Para crear usuarios, necesitas configurar <code className="bg-rose-500/20 px-1.5 py-0.5 rounded font-mono font-bold">SUPABASE_SERVICE_ROLE_KEY</code> en tu archivo <code className="bg-rose-500/20 px-1.5 py-0.5 rounded font-mono font-bold">.env.local</code>
            </Text>
            <Text variant="muted" className="text-rose-400/60 text-xs mt-3 block font-bold italic">
              Encuéntrala en: Supabase Dashboard → Settings → API → service_role (secret)
            </Text>
          </div>
        </div>
      )}

      {/* Tabs Component */}
      <ConfigTabs
        users={users}
        catalogs={catalogs}
        companySettings={companySettings}
        isConfigured={isConfigured}
      />
    </div>
  )
}

