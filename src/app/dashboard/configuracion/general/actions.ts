'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function verifySuperAdmin(): Promise<{ authorized: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, error: 'No autenticado' }
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return { authorized: false, error: 'Requiere rol super_admin' }
  }
  return { authorized: true }
}

export type FiscalSatCatalogStatus = {
  agentCount: number
  lastSyncAt: string | null
  sourceUrl: string | null
  withholdingRate: number
  lastImportLabel: string | null
}

export async function getFiscalSatCatalogStatus(): Promise<FiscalSatCatalogStatus> {
  const supabase = await createClient()

  const [{ count }, { data: settings }, { data: lastImport }] = await Promise.all([
    supabase.from('sat_withholding_agents').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase
      .from('company_settings')
      .select('sat_retenedores_source_url, sat_retenedores_last_sync_at, iva_withholding_rate')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sat_withholding_agent_imports')
      .select('source_label, imported_at')
      .order('imported_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const rate = Number(settings?.iva_withholding_rate)
  return {
    agentCount: count ?? 0,
    lastSyncAt: settings?.sat_retenedores_last_sync_at ?? lastImport?.imported_at ?? null,
    sourceUrl: settings?.sat_retenedores_source_url ?? null,
    withholdingRate: Number.isFinite(rate) && rate > 0 ? rate : 0.15,
    lastImportLabel: lastImport?.source_label ?? null,
  }
}

export async function updateSatFiscalSettings(input: {
  sat_retenedores_source_url?: string | null
  iva_withholding_rate?: number
}): Promise<{ success: boolean; error: string | null }> {
  const access = await verifySuperAdmin()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  const supabase = await createClient()
  const { data: existing } = await supabase.from('company_settings').select('id').limit(1).maybeSingle()
  if (!existing?.id) {
    return { success: false, error: 'No hay configuración de empresa' }
  }

  const patch: Record<string, unknown> = {}
  if (input.sat_retenedores_source_url !== undefined) {
    patch.sat_retenedores_source_url = input.sat_retenedores_source_url
  }
  if (input.iva_withholding_rate !== undefined) {
    const r = Math.max(0, Math.min(1, Number(input.iva_withholding_rate) || 0))
    patch.iva_withholding_rate = r
  }

  const { error } = await supabase.from('company_settings').update(patch).eq('id', existing.id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/general')
  return { success: true, error: null }
}