import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Settings } from 'lucide-react'
import { Text } from '@/components/ui/Text'
import { GeneralConfigTabs } from './components/GeneralConfigTabs'
import { getFiscalSatCatalogStatus } from './actions'
import { getAllCatalogs, getCompanySettings } from '../usuarios/actions'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionGeneralPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = profile?.role === 'super_admin'

  const [fiscalSat, catalogs, companySettings] = isSuperAdmin
    ? await Promise.all([
        getFiscalSatCatalogStatus(),
        getAllCatalogs(),
        getCompanySettings(),
      ])
  : [null, null, null]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-gray-500 dark:text-gray-400" />
        <div>
          <Text variant="h1" as="h1">
            Configuración general
          </Text>
          <Text variant="secondary" className="mt-1 block">
            Apariencia, catálogos maestros, fiscal y datos de empresa
          </Text>
        </div>
      </div>

      <Suspense fallback={<p className="text-sm text-gray-500">Cargando…</p>}>
        <GeneralConfigTabs
          fiscalSat={fiscalSat}
          showAdmin={isSuperAdmin}
          catalogs={catalogs}
          companySettings={companySettings}
        />
      </Suspense>
    </div>
  )
}