import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/fiscal/requireSuperAdmin'
import { importWithholdingAgentsFromPdfBuffer } from '@/lib/fiscal/importSatWithholdingAgents'

export const runtime = 'nodejs'

async function fetchPdfFromUrl(sourceUrl: string): Promise<Buffer> {
  const res = await fetch(sourceUrl, {
    headers: { Accept: 'application/pdf,*/*' },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    throw new Error(`No se pudo descargar el PDF (${res.status})`)
  }
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('pdf') && !sourceUrl.toLowerCase().includes('.pdf')) {
    throw new Error('La URL no parece devolver un PDF')
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1000) {
    throw new Error('Archivo descargado demasiado pequeño para ser el catálogo SAT')
  }
  return buf
}

export async function POST() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const supabase = await createClient()
    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('id, sat_retenedores_source_url')
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sourceUrl = settings?.sat_retenedores_source_url?.trim()
    if (!sourceUrl) {
      return NextResponse.json(
        { error: 'Configura la URL del PDF SAT en Configuración → General → Fiscal' },
        { status: 400 }
      )
    }

    const buffer = await fetchPdfFromUrl(sourceUrl)
    const result = await importWithholdingAgentsFromPdfBuffer(buffer, {
      supabase,
      sourceType: 'url_sync',
      sourceLabel: sourceUrl,
      createdBy: auth.userId,
      uploadToStorage: true,
    })

    if (settings?.id) {
      await supabase
        .from('company_settings')
        .update({
          sat_retenedores_source_url: sourceUrl,
          sat_retenedores_last_sync_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
    }

    return NextResponse.json({
      ok: true,
      nitCount: result.nitCount,
      importId: result.importId,
      sourceUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al sincronizar catálogo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}