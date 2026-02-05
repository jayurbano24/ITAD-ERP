import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClients } from './actions'
import ClientsTable from './components/ClientsTable'
import { Users, Building2, Loader2, UserCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Página de Gestión de Clientes (CRM)
 * Muestra la lista de empresas clientes y proveedores
 */
export default async function ClientesPage() {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/')
  }

  // Obtener clientes
  const { data: clients, error } = await getClients()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors">
      <PageHeader
        icon={Building2}
        title="Gestión de Clientes"
        subtitle="Administra empresas, clientes y proveedores corporativos"
        actions={
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">Registros</p>
              <p className="text-xs font-medium text-gray-500 dark:text-surface-400">{clients?.length || 0} Entidades</p>
            </div>
          </div>
        }
      />

      <main className="p-8 max-w-[1600px] mx-auto">
        {error ? (
          <div className="p-8 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/20 rounded-[2rem] text-rose-600 dark:text-rose-400 shadow-sm">
            <p className="font-bold">Error al cargar clientes</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : (
          <Suspense fallback={<LoadingState />}>
            <ClientsTable initialClients={clients || []} />
          </Suspense>
        )}
      </main>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center p-20">
      <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )
}

