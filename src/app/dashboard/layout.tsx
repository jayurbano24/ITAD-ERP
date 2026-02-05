import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CSSProperties } from 'react'
import DashboardLayoutClient from './components/DashboardLayoutClient'

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
    <DashboardLayoutClient
      userName={userName}
      userRole={userRole}
      userEmail={user.email || ''}
      allowedModules={allowedModules || null}
      companyName={companyName}
      companyTagline={companyTagline}
      companyLogoUrl={companyLogoUrl}
      companyLogoSvg={companyLogoSvg}
      companyPrimaryColor={companyPrimaryColor}
      companySecondaryColor={companySecondaryColor}
      themeStyles={themeStyles}
    >
      {children}
    </DashboardLayoutClient>
  )
}

