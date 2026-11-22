import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ReceptionMobileLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(`/?redirect=${encodeURIComponent('/recepcion/movil')}`)
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Operador'

  return (
    <div className="min-h-[100dvh] bg-[#0b0f14] text-gray-100">
      <div className="px-4 py-3 border-b border-white/10 bg-[#0f1419]/95 backdrop-blur sticky top-0 z-20 flex items-center justify-between gap-3">
        <h1 className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">Captura móvil</h1>
        <span className="text-[10px] font-bold text-gray-400 truncate max-w-[55%]">{displayName}</span>
      </div>
      {children}
    </div>
  )
}