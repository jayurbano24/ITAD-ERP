import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import LoginPanel from './login/LoginPanel'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('company_settings')
    .select('name, address, primary_color, secondary_color')
    .limit(1)
    .single()

  const companyName = data?.name || 'ITAD ERP'
  const companyTagline = data?.address || 'Guatemala'
  const primary = data?.primary_color || '#22c55e'
  const secondary = data?.secondary_color || '#16a34a'
  const brandStyles = {
    '--brand-primary': primary,
    '--brand-secondary': secondary
  } as CSSProperties

  return (
    <LoginPanel
      companyName={companyName}
      companyTagline={companyTagline}
      style={brandStyles}
    />
  )
}
