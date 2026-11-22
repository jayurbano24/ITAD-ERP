import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/fiscal/requireSuperAdmin'
import { importWithholdingAgentsFromPdfBuffer } from '@/lib/fiscal/importSatWithholdingAgents'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo PDF requerido (campo file)' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se acepta PDF' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const supabase = await createClient()
    const result = await importWithholdingAgentsFromPdfBuffer(buffer, {
      supabase,
      sourceType: 'pdf_upload',
      sourceLabel: file.name,
      createdBy: auth.userId,
      uploadToStorage: false,
    })

    return NextResponse.json({
      ok: true,
      nitCount: result.nitCount,
      importId: result.importId,
      fileSha256: result.fileSha256,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al importar catálogo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}