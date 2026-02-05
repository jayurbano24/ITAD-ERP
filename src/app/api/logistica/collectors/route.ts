import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseConfig.url
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Configura SUPABASE_SERVICE_ROLE_KEY en .env.local para obtener la lista de recolectores' },
      { status: 500 }
    )
  }

  try {
    const supabase = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'logistics')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible obtener el personal de logística'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
