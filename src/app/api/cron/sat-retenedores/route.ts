import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'
import { importWithholdingAgentsFromPdfBuffer } from '@/lib/fiscal/importSatWithholdingAgents'

export const runtime = 'nodejs'

async function fetchPdfFromUrl(sourceUrl: string): Promise<Buffer> {
  const res = await fetch(sourceUrl, {
    headers: { Accept: 'application/pdf,*/*' },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`No se pudo descargar el PDF (${res.status})`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')?.trim()
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, { status: 500 })
  }

  try {
    const supabase = createSupabaseClient(supabaseConfig.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: settings } = await supabase
      .from('company_settings')
      .select('id, sat_retenedores_source_url')
      .limit(1)
      .maybeSingle()

    const sourceUrl = settings?.sat_retenedores_source_url?.trim()
    if (!sourceUrl) {
      return NextResponse.json({ skipped: true, reason: 'Sin URL configurada' })
    }

    const buffer = await fetchPdfFromUrl(sourceUrl)
    const result = await importWithholdingAgentsFromPdfBuffer(buffer, {
      sourceType: 'url_sync',
      sourceLabel: sourceUrl,
      createdBy: null,
      uploadToStorage: true,
    })

    if (settings?.id) {
      await supabase
        .from('company_settings')
        .update({ sat_retenedores_last_sync_at: new Date().toISOString() })
        .eq('id', settings.id)
    }

    return NextResponse.json({
      ok: true,
      nitCount: result.nitCount,
      importId: result.importId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en cron SAT'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}