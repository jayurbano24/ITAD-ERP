import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalSidebar } from './components/PortalSidebar'
import { PortalHeader } from './components/PortalHeader'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login?redirect=/portal')
  }
  
  // Obtener perfil y verificar rol de cliente
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, client:crm_entities(id, commercial_name, legal_name, logo_url)')
    .eq('id', user.id)
    .single()
  
  if (!profile) {
    redirect('/login')
  }
  
  // Verificar que sea un cliente (no admin interno)
  const clientRoles = ['client_b2b', 'client_retail', 'client_admin']
  if (!clientRoles.includes(profile.role)) {
    // Si es admin interno, redirigir al dashboard
    redirect('/dashboard')
  }
  
  // Obtener el client_id del perfil o de la relación
  const clientId = profile.client_id || profile.client?.id
  
  if (!clientId) {
    // Cliente sin empresa asignada
    redirect('/login?error=no_client')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      <PortalSidebar 
        userName={profile.full_name || user.email || 'Cliente'}
        clientName={profile.client?.commercial_name || profile.client?.legal_name || 'Mi Empresa'}
        clientLogo={profile.client?.logo_url}
      />
      <main className="flex-1 flex flex-col">
        <PortalHeader userName={profile.full_name || 'Cliente'} />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

