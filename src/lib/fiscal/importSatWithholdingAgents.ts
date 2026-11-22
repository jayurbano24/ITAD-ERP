import { createHash } from 'crypto'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'
import { normalizeNitForLookup } from '@/lib/fiscal/nitGt'
import {
  parseSatWithholdingAgentsPdfBuffer,
  type ParsedWithholdingAgent,
} from '@/lib/fiscal/parseSatWithholdingAgentsPdf'

export type ImportWithholdingResult = {
  importId: string
  nitCount: number
  fileSha256: string
}

function adminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada (requerida para importar catálogo)')
  }
  return createSupabaseClient(supabaseConfig.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function persistWithholdingAgents(
  supabase: SupabaseClient,
  agents: ParsedWithholdingAgent[],
  meta: {
    sourceType: 'pdf_upload' | 'url_sync' | 'manual'
    sourceLabel?: string | null
    fileSha256?: string | null
    createdBy?: string | null
    storagePath?: string | null
  }
): Promise<ImportWithholdingResult> {
  const { data: importRow, error: importErr } = await supabase
    .from('sat_withholding_agent_imports')
    .insert({
      source_type: meta.sourceType,
      source_label: meta.sourceLabel ?? null,
      nit_count: agents.length,
      file_sha256: meta.fileSha256 ?? null,
      created_by: meta.createdBy ?? null,
    })
    .select('id')
    .single()

  if (importErr || !importRow) {
    throw new Error(importErr?.message || 'No se pudo registrar la importación')
  }

  const payload = agents.map((a) => ({
    nit_normalized: a.nit_normalized,
    display_nit: a.display_nit,
    legal_name: a.legal_name,
  }))

  const batchSize = 1200
  let insertedTotal = 0
  for (let i = 0; i < payload.length; i += batchSize) {
    const slice = payload.slice(i, i + batchSize)
    const { data: batchCount, error: batchErr } = await supabase.rpc(
      'append_sat_withholding_agents_batch',
      {
        p_import_id: importRow.id,
        p_agents: slice,
        p_clear_first: i === 0,
      }
    )

    if (batchErr) {
      throw new Error(
        `Error en lote ${Math.floor(i / batchSize) + 1}: ${batchErr.message}${
          batchErr.message.includes('append_sat_withholding_agents_batch')
            ? ' (aplica migración sat_withholding_batch_append en Supabase)'
            : ''
        }`
      )
    }
    insertedTotal += Number(batchCount) || slice.length
  }

  if (insertedTotal < agents.length * 0.95) {
    throw new Error(
      `Importación incompleta: se esperaban ${agents.length} NIT, se guardaron ~${insertedTotal}`
    )
  }

  if (meta.storagePath) {
    await supabase
      .from('sat_withholding_agent_imports')
      .update({ source_label: meta.storagePath })
      .eq('id', importRow.id)
  }

  const { data: settingsRow } = await supabase.from('company_settings').select('id').limit(1).maybeSingle()
  if (settingsRow?.id) {
    await supabase
      .from('company_settings')
      .update({ sat_retenedores_last_sync_at: new Date().toISOString() })
      .eq('id', settingsRow.id)
  }

  return {
    importId: importRow.id,
    nitCount: agents.length,
    fileSha256: meta.fileSha256 ?? '',
  }
}

export async function importWithholdingAgentsFromPdfBuffer(
  buffer: Buffer,
  options: {
    /** Cliente con sesión super_admin (UI) o service role (cron). */
    supabase?: SupabaseClient
    sourceType?: 'pdf_upload' | 'url_sync'
    sourceLabel?: string
    createdBy?: string | null
    uploadToStorage?: boolean
  } = {}
): Promise<ImportWithholdingResult> {
  const agents = await parseSatWithholdingAgentsPdfBuffer(buffer)
  const fileSha256 = createHash('sha256').update(buffer).digest('hex')
  const supabase = options.supabase ?? adminClient()

  const result = await persistWithholdingAgents(supabase, agents, {
    sourceType: options.sourceType ?? 'pdf_upload',
    sourceLabel: options.sourceLabel ?? null,
    fileSha256,
    createdBy: options.createdBy ?? null,
    storagePath: null,
  })

  if (options.uploadToStorage !== false) {
    const path = `retenedores/${fileSha256.slice(0, 16)}-${Date.now()}.pdf`
    void supabase.storage
      .from('sat-fiscal-catalogs')
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
      .then(() =>
        supabase
          .from('sat_withholding_agent_imports')
          .update({ source_label: options.sourceLabel ?? path })
          .eq('id', result.importId)
      )
  }

  return result
}

export async function lookupIsWithholdingAgent(nit: string): Promise<{
  isAgent: boolean
  displayNit?: string
  legalName?: string | null
}> {
  const norm = normalizeNitForLookup(nit)
  if (!norm) return { isAgent: false }

  const supabase = adminClient()
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