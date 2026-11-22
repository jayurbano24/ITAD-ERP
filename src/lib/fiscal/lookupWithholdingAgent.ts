import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeNitForLookup } from '@/lib/fiscal/nitGt'

export type WithholdingAgentLookup = {
  isAgent: boolean
  displayNit?: string
  legalName?: string | null
}

export async function lookupWithholdingAgent(
  supabase: SupabaseClient,
  nit: string
): Promise<WithholdingAgentLookup> {
  const norm = normalizeNitForLookup(nit)
  if (!norm) return { isAgent: false }

  const { data, error } = await supabase
    .from('sat_withholding_agents')
    .select('display_nit, legal_name')
    .eq('nit_normalized', norm)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return { isAgent: false }
  return {
    isAgent: true,
    displayNit: data.display_nit,
    legalName: data.legal_name,
  }
}