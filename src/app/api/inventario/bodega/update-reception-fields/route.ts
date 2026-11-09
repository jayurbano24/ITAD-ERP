import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'
import { C_VALUES, F_VALUES } from '@/lib/classifications/workshopGrades'

const R2_VALUES = new Set(['C', 'U'])
const SANITIZATION_VALUES = new Set(['D1', 'D2'])

function normalizeAssetType(raw: string | null | undefined): string | null {
  const t = (raw || '').trim()
  if (!t) return null
  const u = t.toUpperCase()
  if (u === 'LAPTOP' || u === 'LAP') return 'Laptop'
  if (u === 'DESKTOP' || u === 'PC') return 'Desktop'
  if (u === 'SERVIDOR' || u === 'SERVER') return 'Servidor'
  return t
}

/**
 * Actualiza color, clasificaciones, R2, specs de hardware y notas del activo.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assetId?: string
      color?: string | null
      r2Applicability?: string | null
      dataSanitization?: string | null
      classificationF?: string | null
      classificationC?: string | null
      assetType?: string | null
      receptionNotes?: string | null
      hardwareSpecs?: {
        processor?: string | null
        processor_brand?: string | null
        processor_generation?: string | null
        processor_family?: string | null
        ram_capacity?: string | null
        ram_type?: string | null
        disk_capacity?: string | null
        disk_type?: string | null
        screen_size?: string | null
        keyboard_type?: string | null
        keyboard_version?: string | null
      } | null
    }

    const assetId = body.assetId?.trim() || ''
    if (!assetId) {
      return NextResponse.json({ error: 'assetId es requerido' }, { status: 400 })
    }

    const color = (body.color || '').trim() || null
    const r2 = (body.r2Applicability || '').trim().toUpperCase() || null
    const sanitization = (body.dataSanitization || '').trim().toUpperCase() || null
    const classF = (body.classificationF || '').trim().toUpperCase() || null
    const classC = (body.classificationC || '').trim().toUpperCase() || null
    const assetType =
      body.assetType !== undefined ? normalizeAssetType(body.assetType) : undefined

    if (r2 && !R2_VALUES.has(r2)) {
      return NextResponse.json({ error: 'R2 inválido. Use C o U' }, { status: 400 })
    }
    if (sanitization && !SANITIZATION_VALUES.has(sanitization)) {
      return NextResponse.json({ error: 'Sanitización inválida. Use D1 o D2' }, { status: 400 })
    }
    if (classF && !F_VALUES.has(classF)) {
      return NextResponse.json({ error: 'Clasificación F inválida. Use F1–F6' }, { status: 400 })
    }
    if (classC && !C_VALUES.has(classC)) {
      return NextResponse.json({ error: 'Clasificación C inválida. Use C0–C9' }, { status: 400 })
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
    const existingHw = (specs.hardware_specs || {}) as Record<string, unknown>

    const trimOrNull = (v: string | null | undefined) => {
      const t = (v || '').trim()
      return t || null
    }

    const hwIn = body.hardwareSpecs
    const nextHw = hwIn
      ? {
          ...existingHw,
          processor: trimOrNull(hwIn.processor) ?? existingHw.processor ?? null,
          processor_brand: trimOrNull(hwIn.processor_brand) ?? existingHw.processor_brand ?? null,
          processor_generation:
            trimOrNull(hwIn.processor_generation) ?? existingHw.processor_generation ?? null,
          processor_family:
            trimOrNull(hwIn.processor_family) ?? existingHw.processor_family ?? null,
          ram_capacity: trimOrNull(hwIn.ram_capacity) ?? existingHw.ram_capacity ?? null,
          ram_type: trimOrNull(hwIn.ram_type) ?? existingHw.ram_type ?? null,
          disk_capacity: trimOrNull(hwIn.disk_capacity) ?? existingHw.disk_capacity ?? null,
          disk_type: trimOrNull(hwIn.disk_type) ?? existingHw.disk_type ?? null,
          screen_size: trimOrNull(hwIn.screen_size) ?? existingHw.screen_size ?? null,
          keyboard_type: trimOrNull(hwIn.keyboard_type) ?? existingHw.keyboard_type ?? null,
          keyboard_version:
            trimOrNull(hwIn.keyboard_version) ?? existingHw.keyboard_version ?? null,
        }
      : existingHw

    const notes =
      body.receptionNotes !== undefined
        ? trimOrNull(body.receptionNotes)
        : (specs.reception_notes as string | null | undefined) ?? null

    const nextSpecs = {
      ...specs,
      reception_notes: notes,
      hardware_specs: nextHw,
      workshop_classifications: {
        ...workshop,
        r2_applicability: r2,
        data_sanitization: sanitization,
        f: classF ?? workshop.f ?? null,
        c: classC ?? workshop.c ?? null,
      },
    }

    const assetPatch: Record<string, unknown> = {
      color,
      specifications: nextSpecs,
      updated_at: new Date().toISOString(),
    }
    if (assetType !== undefined) {
      assetPatch.asset_type = assetType
    }

    const { error: updateError } = await supabase
      .from('assets')
      .update(assetPatch)
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
      const ticketPatch: Record<string, unknown> = {
        color,
        classification_f: classF,
        classification_c: classC,
        reception_metadata: {
          ...meta,
          color_detail: color,
          r2_applicability: r2,
          data_sanitization: sanitization,
        },
        updated_at: new Date().toISOString(),
      }
      if (hwIn) {
        ticketPatch.processor = nextHw.processor
        ticketPatch.ram_capacity = nextHw.ram_capacity
        ticketPatch.ram_type = nextHw.ram_type
        ticketPatch.disk_capacity = nextHw.disk_capacity
        ticketPatch.disk_type = nextHw.disk_type
        ticketPatch.keyboard_type = nextHw.keyboard_type
        ticketPatch.keyboard_version = nextHw.keyboard_version
        ticketPatch.reception_metadata = {
          ...(ticketPatch.reception_metadata as Record<string, unknown>),
          screen_size: nextHw.screen_size,
          processor_brand: nextHw.processor_brand,
          processor_generation: nextHw.processor_generation,
          processor_family: nextHw.processor_family,
        }
      }
      if (body.receptionNotes !== undefined) {
        ticketPatch.observations = notes
      }
      if (assetType !== undefined) {
        ticketPatch.product_type = assetType
        if (assetType) {
          const { data: catalogType } = await supabase
            .from('catalog_product_types')
            .select('id')
            .ilike('name', assetType)
            .maybeSingle()
          if (catalogType?.id) {
            ticketPatch.product_type_id = catalogType.id
          }
        } else {
          ticketPatch.product_type_id = null
        }
      }
      await supabase.from('ticket_items').update(ticketPatch).eq('id', ticketItem.id)
    }

    return NextResponse.json({
      ok: true,
      color,
      r2Applicability: r2,
      dataSanitization: sanitization,
      classificationF: classF,
      classificationC: classC,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al guardar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
