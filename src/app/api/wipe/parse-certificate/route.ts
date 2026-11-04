import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  parseWipeCertificateSummary,
  type WipeCertificateSummary,
} from '@/lib/wipe/parseWipeReportPdf'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Sube un certificado PDF' }, { status: 400 })
    }

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF no debe exceder 10 MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { report, summary } = await parseWipeCertificateSummary(buffer)

    let matchedAsset: {
      id: string
      serial_number: string | null
      manufacturer: string | null
      model: string | null
      status: string | null
    } | null = null

    if (summary.serie) {
      const { data } = await supabase
        .from('assets')
        .select('id, serial_number, manufacturer, model, status')
        .ilike('serial_number', summary.serie)
        .limit(5)

      matchedAsset =
        (data || []).find(
          (a) =>
            String(a.serial_number || '')
              .trim()
              .toUpperCase() === summary.serie!.trim().toUpperCase()
        ) || null
    }

    return NextResponse.json({
      success: true,
      summary: summary as WipeCertificateSummary,
      report,
      matchedAsset,
      fileName: file.name,
    })
  } catch (error: unknown) {
    console.error('[parse-certificate]', error)
    const message = error instanceof Error ? error.message : 'No se pudo leer el certificado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
