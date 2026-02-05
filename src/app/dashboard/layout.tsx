import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CSSProperties } from 'react'
import Sidebar from './components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/')
  }

  // Obtener perfil del usuario y configuración de empresa en paralelo
  const [profileResult, companyResult] = await Promise.all([
    supabase.from('profiles').select('full_name, role, allowed_modules').eq('id', user.id).single(),
    supabase.from('company_settings').select('name, address, logo_url, primary_color, secondary_color').limit(1).single()
  ])

  const profile = profileResult.data

  const companyFullName = companyResult.data?.name || 'ITAD ERP Guatemala'

  const nameParts = companyFullName.split(' ')
  const companyName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : companyFullName
  const companyTagline = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'ERP'

  const companyPrimaryColor = companyResult.data?.primary_color || '#10b981'
  const companySecondaryColor = companyResult.data?.secondary_color || '#059669'
  const companyLogoUrl = companyResult.data?.logo_url || null
  const companyLogoSvg = undefined

  const userName = profile?.full_name || user.email?.split('@')[0] || 'Usuario'
  const userRole = profile?.role || 'usuario'
  const allowedModules = profile?.allowed_modules as string[] | null | undefined
  const themeStyles = {
    '--brand-primary': companyPrimaryColor,
    '--brand-secondary': companySecondaryColor,
  } as CSSProperties

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1419] flex transition-colors duration-300" style={themeStyles}>
      <Sidebar
        userName={userName}
        userRole={userRole}
        userEmail={user.email || ''}
        allowedModules={allowedModules}
        companyName={companyName}
        companyTagline={companyTagline}
        companyLogo={companyLogoUrl ?? undefined}
        companyLogoSvg={companyLogoSvg}
        companyPrimaryColor={companyPrimaryColor}
        companySecondaryColor={companySecondaryColor}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Barra */}
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 bg-white/50 dark:bg-[#0f1419]/50 backdrop-blur-sm z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            {/* Espacio para breadcrumbs o search bar a futuro */}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-8 w-px bg-surface-200 dark:bg-surface-800 mx-2" />
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{userName}</p>
                <p className="text-[10px] text-surface-500 dark:text-surface-400 uppercase leading-tight">{userRole}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-0">
          {children}
        </main>
      </div>
    </div>
  )
}

