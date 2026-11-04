import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'

const REC_VALUES = new Set(['R', 'E', 'C'])
const F_VALUES = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F6'])
const C_VALUES = new Set(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'])
const R2_VALUES = new Set(['C', 'U'])
const SANITIZATION_VALUES = new Set(['D1', 'D2', 'D3'])
const MEMORY_VALUES = new Set(['YES', 'NO'])

/**
 * Guarda REC / Cosmetic (C) / Functional (F) / R2 / Data Sanitization / Memory.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assetId?: string
      rec?: string | null
      c?: string | null
      f?: string | null
      r2Applicability?: string | null
      dataSanitization?: string | null
      memory?: string | null
    }

    const assetId = body.assetId?.trim() || ''
    if (!assetId) {
      return NextResponse.json({ error: 'assetId es requerido' }, { status: 400 })
    }

    const rec = (body.rec || '').trim().toUpperCase() || null
    const c = (body.c || '').trim().toUpperCase() || null
    const f = (body.f || '').trim().toUpperCase() || null
    const r2 = (body.r2Applicability || '').trim().toUpperCase() || null
    const sanitization = (body.dataSanitization || '').trim().toUpperCase() || null
    const memoryRaw = (body.memory || '').trim()
    const memory = memoryRaw
      ? memoryRaw.charAt(0).toUpperCase() + memoryRaw.slice(1).toLowerCase()
      : null
    const memoryKey = memory?.toUpperCase() || null

    if (rec && !REC_VALUES.has(rec)) {
      return NextResponse.json({ error: 'REC inválido. Use R, E o C' }, { status: 400 })
    }
    if (c && !C_VALUES.has(c)) {
      return NextResponse.json({ error: 'Cosmetic Conditions inválido. Use C0–C9' }, { status: 400 })
    }
    if (f && !F_VALUES.has(f)) {
      return NextResponse.json({ error: 'Functional Conditions inválido. Use F1–F6' }, { status: 400 })
    }
    if (r2 && !R2_VALUES.has(r2)) {
      return NextResponse.json({ error: 'R2 inválido. Use C o U' }, { status: 400 })
    }
    if (sanitization && !SANITIZATION_VALUES.has(sanitization)) {
      return NextResponse.json({ error: 'Data Sanitization inválido. Use D1, D2 o D3' }, { status: 400 })
    }
    if (memoryKey && !MEMORY_VALUES.has(memoryKey)) {
      return NextResponse.json({ error: 'Memory inválido. Use Yes o No' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, specifications')
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
        rec,
        c,
        f,
        r2_applicability: r2,
        data_sanitization: sanitization,
        memory,
      },
      r2_applicability: r2,
      data_sanitization: sanitization,
      memory,
      rec_classification_out: rec,
      c_classification_out: c,
      f_classification_out: f,
    }

    const { error: updateError } = await supabase
      .from('assets')
      .update({
        specifications: nextSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase
      .from('work_orders')
      .update({
        rec_classification: rec,
        c_classification: c,
        f_classification: f,
        updated_at: new Date().toISOString(),
      })
      .eq('asset_id', assetId)

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
          classification_c: c,
          classification_f: f,
          reception_metadata: {
            ...meta,
            classification_rec: rec,
            r2_applicability: r2,
            data_sanitization: sanitization,
            memory,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketItem.id)
    }

    return NextResponse.json({
      ok: true,
      rec,
      c,
      f,
      r2Applicability: r2,
      dataSanitization: sanitization,
      memory,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al guardar clasificación' },
      { status: 500 }
    )
  }
}
