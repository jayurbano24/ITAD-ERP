import type { SupabaseClient } from '@supabase/supabase-js'

type LineFilterTemplate = {
  brand: string | null
  model: string | null
  brand_id: string | null
  model_id: string | null
  product_type_id: string | null
}

const lineFilter = <T extends { eq: (c: string, v: string) => T }>(query: T, template: LineFilterTemplate) => {
  let q = query
  if (template.brand_id) q = q.eq('brand_id', template.brand_id)
  else if (template.brand) q = q.eq('brand', template.brand)
  if (template.model_id) q = q.eq('model_id', template.model_id)
  else if (template.model) q = q.eq('model', template.model)
  if (template.product_type_id) q = q.eq('product_type_id', template.product_type_id)
  return q
}

export type ApplySerialResult =
  | { ok: true; itemId: string; serial: string }
  | { ok: false; serial: string; error: string }

export async function applySerialToTicketLine(
  supabase: SupabaseClient,
  params: {
    ticketId: string
    template: LineFilterTemplate
    serial: string
    userId: string | null
    capturedByName: string
    source: 'desktop' | 'mobile' | 'bulk'
    extraMetadata?: Record<string, unknown>
  }
): Promise<ApplySerialResult> {
  const serial = params.serial.trim().toUpperCase()
  if (!serial) return { ok: false, serial, error: 'Serie vacía' }

  const { data: dup } = await supabase
    .from('ticket_items')
    .select('id')
    .eq('ticket_id', params.ticketId)
    .ilike('collected_serial', serial)
    .maybeSingle()

  if (dup?.id) {
    return { ok: false, serial, error: 'Serie duplicada en el ticket' }
  }

  const { data: conflictingAsset } = await supabase
    .from('assets')
    .select('id, serial_number')
    .ilike('serial_number', serial)
    .limit(3)

  const foreignAsset = (conflictingAsset || []).find(
    (a) => String(a.serial_number || '').trim().toUpperCase() === serial
  )

  const capturedAt = new Date().toISOString()

  for (let attempt = 0; attempt < 8; attempt++) {
    let emptyQuery = supabase
      .from('ticket_items')
      .select('id, asset_id, reception_metadata')
      .eq('ticket_id', params.ticketId)
      .is('collected_serial', null)
      .order('created_at', { ascending: true })
      .limit(1)

    emptyQuery = lineFilter(emptyQuery, params.template)

    const { data: emptySlot, error: slotError } = await emptyQuery.maybeSingle()
    if (slotError) return { ok: false, serial, error: slotError.message }
    if (!emptySlot?.id) {
      return { ok: false, serial, error: 'No hay cupo libre en esta línea' }
    }

    if (foreignAsset?.id && foreignAsset.id !== emptySlot.asset_id) {
      return { ok: false, serial, error: 'Serie ya existe en inventario' }
    }

    const previousMeta =
      emptySlot.reception_metadata && typeof emptySlot.reception_metadata === 'object'
        ? (emptySlot.reception_metadata as Record<string, unknown>)
        : {}

    const reception_metadata = {
      ...previousMeta,
      ...params.extraMetadata,
      captured_at: capturedAt,
      captured_by: params.userId,
      captured_by_name: params.capturedByName,
      capture_source: params.source,
    }

    const classification_f = (params.extraMetadata?.functional as string) || null
    const classification_c = (params.extraMetadata?.cosmetic as string) || null

    const { data: row, error: updateError } = await supabase
      .from('ticket_items')
      .update({
        collected_serial: serial,
        expected_serial: serial,
        classification_f: classification_f || undefined,
        classification_c: classification_c || undefined,
        reception_metadata,
        updated_at: capturedAt,
      })
      .eq('id', emptySlot.id)
      .is('collected_serial', null)
      .select('id, asset_id')
      .maybeSingle()

    if (updateError) return { ok: false, serial, error: updateError.message }
    if (!row?.id) continue

    if (row.asset_id) {
      const internalTag = `AST-${serial.replace(/[^A-Z0-9\-]/gi, '').toUpperCase()}`.slice(0, 64)
      const { data: assetRow } = await supabase
        .from('assets')
        .select('specifications')
        .eq('id', row.asset_id)
        .maybeSingle()

      const specs =
        assetRow?.specifications && typeof assetRow.specifications === 'object'
          ? { ...(assetRow.specifications as Record<string, unknown>) }
          : {}

      if ('reception_pending_serial' in specs) specs.reception_pending_serial = false

      const workshop = (specs.workshop_classifications || {}) as Record<string, unknown>
      const hw = (specs.hardware_specs || {}) as Record<string, unknown>
      if (params.extraMetadata?.cosmetic) workshop.c = params.extraMetadata.cosmetic
      if (params.extraMetadata?.functional) workshop.f = params.extraMetadata.functional
      if (params.extraMetadata?.processor) hw.processor = params.extraMetadata.processor
      if (params.extraMetadata?.ram_capacity) hw.ram_capacity = params.extraMetadata.ram_capacity
      specs.workshop_classifications = workshop
      specs.hardware_specs = hw
      specs.reception_test = {
        ...((specs.reception_test || {}) as Record<string, unknown>),
        memory: 'Pass',
        test_date: capturedAt,
        battery: params.extraMetadata?.battery ?? null,
        charger: params.extraMetadata?.charger ?? null,
      }

      await supabase
        .from('assets')
        .update({
          serial_number: serial,
          internal_tag: internalTag || `AST-NR-${row.id.slice(0, 12)}`,
          specifications: Object.keys(specs).length > 0 ? specs : assetRow?.specifications ?? null,
          updated_at: capturedAt,
        })
        .eq('id', row.asset_id)
    }

    return { ok: true, itemId: row.id, serial }
  }

  return { ok: false, serial, error: 'Cupo ocupado por otro proceso; reintente' }
}