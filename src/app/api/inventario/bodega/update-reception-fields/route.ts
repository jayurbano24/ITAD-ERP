import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'

const R2_VALUES = new Set(['C', 'U'])
const SANITIZATION_VALUES = new Set(['D1', 'D2'])

/**
 * Actualiza Color, R2 Applicability y Data Sanitization de un activo en Bodega Recepción.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assetId?: string
      color?: string | null
      r2Applicability?: string | null
      dataSanitization?: string | null
    }

    const assetId = body.assetId?.trim() || ''
    if (!assetId) {
      return NextResponse.json({ error: 'assetId es requerido' }, { status: 400 })
    }

    const color = (body.color || '').trim() || null
    const r2 = (body.r2Applicability || '').trim().toUpperCase() || null
    const sanitization = (body.dataSanitization || '').trim().toUpperCase() || null

    if (r2 && !R2_VALUES.has(r2)) {
      return NextResponse.json({ error: 'R2 inválido. Use C o U' }, { status: 400 })
    }
    if (sanitization && !SANITIZATION_VALUES.has(sanitization)) {
      return NextResponse.json({ error: 'Sanitización inválida. Use D1 o D2' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, serial_number, specifications, color')
      .eq('id', assetId)
      .maybeSingle()

    if (assetError || !asset) {
      return NextResponse.json({ error: assetError?.message || 'Activo no encontrado' }, { status: 404 })
    }

    const specs = (asset.specifications || {}) as Record<string, unknown>
    const workshop = (specs.workshop_classifications || {}) as Record<string, unknown>
    const nextSpecs = {
      ...specs,
      workshop_classifications: {
        ...workshop,
        r2_applicability: r2,
        data_sanitization: sanitization,
        f: workshop.f ?? null,
        c: workshop.c ?? null,
      },
    }

    const { error: updateError } = await supabase
      .from('assets')
      .update({
        color,
        specifications: nextSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: ticketItem } = await supabase
      .from('ticket_items')
      .select('id, reception_metadata')
      .eq('asset_id', assetId)
      .maybeSingle()

    if (ticketItem?.id) {
      const meta = (ticketItem.reception_metadata || {}) as Record<string, unknown>
      await supabase
        .from('ticket_items')
        .update({
          color,
          reception_metadata: {
            ...meta,
            color_detail: color,
            r2_applicability: r2,
            data_sanitization: sanitization,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketItem.id)
    }

    return NextResponse.json({
      ok: true,
      color,
      r2Applicability: r2,
      dataSanitization: sanitization,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al guardar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
