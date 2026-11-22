import { createClient } from '@/lib/supabase/server'

export async function requireSuperAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401, message: 'No autorizado' }
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return { ok: false, status: 403, message: 'Requiere rol super_admin' }
  }
  return { ok: true, userId: user.id }
}