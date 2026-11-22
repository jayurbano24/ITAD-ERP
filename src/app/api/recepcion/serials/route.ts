import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeSerial, serialsEqual } from '@/lib/reception/normalizeSerial'
import { logReceptionScanEvent } from '@/lib/reception/logReceptionScanEvent'

type TicketItemTemplate = {
  id: string
  ticket_id: string
  brand: string | null
  model: string | null
  color: string | null
  product_type: string | null
  box_number: number | null
  box_sku: string | null
  box_seal: string | null
  box_reception_code: string | null
  brand_id: string | null
  model_id: string | null
  product_type_id: string | null
  validation_status: string | null
}

const lineFilter = <T extends { eq: (c: string, v: string) => T }>(
  query: T,
  template: Pick<TicketItemTemplate, 'brand' | 'model' | 'brand_id' | 'model_id' | 'product_type_id'>
) => {
  let q = query
  if (template.brand_id) q = q.eq('brand_id', template.brand_id)
  else if (template.brand) q = q.eq('brand', template.brand)
  if (template.model_id) q = q.eq('model_id', template.model_id)
  else if (template.model) q = q.eq('model', template.model)
  if (template.product_type_id) q = q.eq('product_type_id', template.product_type_id)
  return q
}

/**
 * POST actions:
 * - scan: pitolea una serie en un cupo vacío (no crea filas)
 * - additional: agrega un cupo vacío extra a la línea
 * - setQuantity: fija cantidad cerrada (enteros) de cupos en la línea
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: 'scan' | 'additional' | 'setQuantity' | 'reassign'
      ticketId?: string
      templateItemId?: string
      targetItemId?: string
      serial?: string
      quantity?: number
      source?: 'desktop' | 'mobile'
      allowReceiptMismatch?: boolean
      mismatchJustification?: string
    }

    const action = body.action || 'scan'
    const ticketId = body.ticketId?.trim() || ''
    const templateItemId = body.templateItemId?.trim() || ''

    if (!ticketId || !templateItemId) {
      return NextResponse.json(
        { error: 'ticketId y templateItemId son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: template, error: templateError } = await supabase
      .from('ticket_items')
      .select(
        'id, ticket_id, brand, model, color, product_type, box_number, box_sku, box_seal, box_reception_code, brand_id, model_id, product_type_id, validation_status'
      )
      .eq('id', templateItemId)
      .eq('ticket_id', ticketId)
      .maybeSingle()

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }
    if (!template) {
      return NextResponse.json({ error: 'Ítem plantilla no encontrado' }, { status: 404 })
    }

    if (action === 'additional') {
      const additionalNote =
        typeof (body as { additionalNote?: string }).additionalNote === 'string'
          ? (body as { additionalNote?: string }).additionalNote!.trim()
          : ''
      const { data: inserted, error: insertError } = await supabase
        .from('ticket_items')
        .insert({
          ticket_id: ticketId,
          brand: template.brand,
          model: template.model,
          color: template.color,
          product_type: template.product_type,
          box_number: template.box_number ?? 0,
          box_sku: template.box_sku,
          box_seal: template.box_seal,
          box_reception_code: template.box_reception_code,
          brand_id: template.brand_id,
          model_id: template.model_id,
          product_type_id: template.product_type_id,
          expected_serial: null,
          collected_serial: null,
          validation_status: 'EXTRA',
          reception_metadata: {
            additional: true,
            ...(additionalNote ? { additional_note: additionalNote } : {}),
          },
        })
        .select('id, brand, model, product_type')
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, mode: 'additional', item: inserted })
    }

    if (action === 'setQuantity') {
      const targetQty = Math.floor(Number(body.quantity))
      if (!Number.isFinite(targetQty) || targetQty < 1) {
        return NextResponse.json(
          { error: 'La cantidad debe ser un entero mayor o igual a 1' },
          { status: 400 }
        )
      }

      let allQuery = supabase
        .from('ticket_items')
        .select('id, collected_serial, expected_serial, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      allQuery = lineFilter(allQuery, template)

      const { data: lineItems, error: listError } = await allQuery
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 })
      }

      const items = lineItems || []
      const current = items.length
      const withSerial = items.filter(
        (row) => ((row.collected_serial || row.expected_serial) || '').trim().length > 0
      ).length

      if (targetQty < withSerial) {
        return NextResponse.json(
          {
            error: `No puede bajar de ${withSerial}: ya hay ${withSerial} serie(s) capturada(s)`,
          },
          { status: 400 }
        )
      }

      if (targetQty === current) {
        return NextResponse.json({ ok: true, mode: 'setQuantity', quantity: targetQty })
      }

      if (targetQty > current) {
        const toAdd = targetQty - current
        const rows = Array.from({ length: toAdd }, () => ({
          ticket_id: ticketId,
          brand: template.brand,
          model: template.model,
          color: template.color,
          product_type: template.product_type,
          box_number: template.box_number ?? 0,
          box_sku: template.box_sku,
          box_seal: template.box_seal,
          box_reception_code: template.box_reception_code,
          brand_id: template.brand_id,
          model_id: template.model_id,
          product_type_id: template.product_type_id,
          expected_serial: null,
          collected_serial: null,
          validation_status: template.validation_status || 'PENDIENTE_VALIDACION',
        }))
        const { error: insertError } = await supabase.from('ticket_items').insert(rows)
        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
        return NextResponse.json({ ok: true, mode: 'setQuantity', quantity: targetQty })
      }

      const toRemove = current - targetQty
      const emptySlots = items.filter(
        (row) => !((row.collected_serial || row.expected_serial) || '').trim()
      )
      if (emptySlots.length < toRemove) {
        return NextResponse.json(
          {
            error: `Solo puede eliminar ${emptySlots.length} cupo(s) vacío(s). Quite series o suba la cantidad mínima a ${withSerial}.`,
          },
          { status: 400 }
        )
      }

      const idsToDelete = emptySlots.slice(-toRemove).map((row) => row.id)
      const { error: deleteError } = await supabase
        .from('ticket_items')
        .delete()
        .in('id', idsToDelete)
        .eq('ticket_id', ticketId)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, mode: 'setQuantity', quantity: targetQty })
    }

    if (action === 'reassign') {
      const serial = normalizeSerial(body.serial)
      const targetItemId = body.targetItemId?.trim() || ''
      const justification = (body.mismatchJustification || '').trim()
      if (!serial || !targetItemId || justification.length < 5) {
        return NextResponse.json(
          { error: 'reassign requiere serie, cupo destino y justificación' },
          { status: 400 }
        )
      }

      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id ?? null

      const { data: target, error: targetErr } = await supabase
        .from('ticket_items')
        .select('id, expected_serial, collected_serial, reception_metadata')
        .eq('id', targetItemId)
        .eq('ticket_id', ticketId)
        .maybeSingle()

      if (targetErr) return NextResponse.json({ error: targetErr.message }, { status: 500 })
      if (!target) return NextResponse.json({ error: 'Cupo destino no encontrado' }, { status: 404 })
      if ((target.collected_serial || '').trim()) {
        return NextResponse.json({ error: 'Ese cupo ya tiene serie capturada' }, { status: 409 })
      }

      const expectedFromReceipt = normalizeSerial(target.expected_serial)
      const now = new Date().toISOString()
      const meta = (target.reception_metadata || {}) as Record<string, unknown>
      const receiptMatch = !expectedFromReceipt || serialsEqual(serial, expectedFromReceipt)

      const { error: upErr } = await supabase
        .from('ticket_items')
        .update({
          collected_serial: serial,
          validation_status: receiptMatch ? 'VALIDADO' : 'DISCREPANCIA',
          reception_metadata: {
            ...meta,
            reassign_at: now,
            reassign_justification: justification,
            scanned_serial: serial,
            expected_receipt_serial: expectedFromReceipt || null,
          },
          updated_at: now,
        })
        .eq('id', targetItemId)
        .is('collected_serial', null)

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

      await logReceptionScanEvent(supabase, {
        ticketId,
        ticketItemId: targetItemId,
        eventType: 'scan_reassign',
        scannedSerial: serial,
        expectedSerial: expectedFromReceipt || null,
        correctedSerial: serial,
        justification,
        performedBy: userId,
      })

      return NextResponse.json({ ok: true, mode: 'reassign', itemId: targetItemId, serial })
    }

    // action === 'scan'
    const serial = normalizeSerial(body.serial)
    if (!serial) {
      return NextResponse.json({ error: 'serial es requerido' }, { status: 400 })
    }

    const { data: duplicateRows } = await supabase
      .from('ticket_items')
      .select('id, collected_serial')
      .eq('ticket_id', ticketId)
      .not('collected_serial', 'is', null)

    const duplicateCollected = (duplicateRows || []).some((row) =>
      serialsEqual(row.collected_serial, serial)
    )

    if (duplicateCollected) {
      await logReceptionScanEvent(supabase, {
        ticketId,
        eventType: 'scan_duplicate',
        scannedSerial: serial,
      })
      return NextResponse.json({ error: `Serie duplicada: ${serial} ya está en este ticket` }, { status: 409 })
    }

    const { data: foreignItem } = await supabase
      .from('ticket_items')
      .select('ticket_id, operations_tickets(readable_id)')
      .neq('ticket_id', ticketId)
      .not('collected_serial', 'is', null)
      .ilike('collected_serial', serial)
      .limit(1)
      .maybeSingle()

    const foreignLabel =
      foreignItem &&
      typeof foreignItem.operations_tickets === 'object' &&
      foreignItem.operations_tickets &&
      'readable_id' in (foreignItem.operations_tickets as object)
        ? String((foreignItem.operations_tickets as { readable_id?: string }).readable_id || '')
        : null

    if (foreignLabel) {
      await logReceptionScanEvent(supabase, {
        ticketId,
        eventType: 'scan_foreign_ticket',
        scannedSerial: serial,
        metadata: { other_ticket: foreignLabel },
      })
      return NextResponse.json(
        {
          error: `La serie ${serial} ya fue recibida en el ticket ${foreignLabel}`,
          code: 'FOREIGN_TICKET_SERIAL',
        },
        { status: 409 }
      )
    }

    const allowReceiptMismatch = Boolean(body.allowReceiptMismatch)
    const mismatchJustification = (body.mismatchJustification || '').trim()

    const { data: lockOk, error: lockErr } = await supabase.rpc('reception_try_serial_lock', {
      p_ticket_id: ticketId,
      p_serial: serial,
    })
    if (!lockErr && lockOk === false) {
      return NextResponse.json(
        { error: 'Otro operador está registrando esta serie. Reintente en un momento.' },
        { status: 409 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id ?? null
    let capturedByName = authData?.user?.email?.split('@')[0] || 'Operador'
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.full_name) capturedByName = profile.full_name
    }
    const capturedAt = new Date().toISOString()

    const { data: conflictingAsset } = await supabase
      .from('assets')
      .select('id, serial_number')
      .ilike('serial_number', serial)
      .limit(3)

    const foreignAsset = (conflictingAsset || []).find(
      (a) => String(a.serial_number || '').trim().toUpperCase() === serial
    )

    type UpdatedRow = {
      id: string
      collected_serial: string | null
      brand: string | null
      model: string | null
      product_type: string | null
      asset_id: string | null
    }

    let updated: UpdatedRow | null = null
  let lastAssetId: string | null = null

    for (let attempt = 0; attempt < 8; attempt++) {
      let emptyQuery = supabase
        .from('ticket_items')
        .select('id, asset_id, reception_metadata, expected_serial')
        .eq('ticket_id', ticketId)
        .is('collected_serial', null)
        .order('created_at', { ascending: true })

      emptyQuery = lineFilter(emptyQuery, template)

      const { data: emptyRows, error: slotError } = await emptyQuery
      const emptySlot =
        (emptyRows || []).find((row) => serialsEqual(row.expected_serial, serial)) ||
        (emptyRows || [])[0] ||
        null
      if (slotError) {
        return NextResponse.json({ error: slotError.message }, { status: 500 })
      }
      if (!emptySlot?.id) break

      lastAssetId = emptySlot.asset_id ?? null
      if (foreignAsset?.id && foreignAsset.id !== lastAssetId) {
        return NextResponse.json(
          { error: `La serie ${serial} ya existe en inventario` },
          { status: 409 }
        )
      }

      const previousMeta =
        emptySlot.reception_metadata && typeof emptySlot.reception_metadata === 'object'
          ? (emptySlot.reception_metadata as Record<string, unknown>)
          : {}

      const isAdditional = Boolean(previousMeta.additional)
      const expectedFromReceipt = normalizeSerial(emptySlot.expected_serial)
      if (
        !isAdditional &&
        expectedFromReceipt &&
        !serialsEqual(serial, expectedFromReceipt) &&
        !allowReceiptMismatch
      ) {
        return NextResponse.json(
          {
            error: `La serie ${serial} no coincide con el Receipt of Equipment (${expectedFromReceipt})`,
            code: 'RECEIPT_SERIAL_MISMATCH',
            expectedSerial: expectedFromReceipt,
          },
          { status: 409 }
        )
      }

      if (allowReceiptMismatch && mismatchJustification.length < 5) {
        return NextResponse.json(
          { error: 'Indique justificación para registrar la discrepancia' },
          { status: 400 }
        )
      }

      const receiptMatch =
        isAdditional || !expectedFromReceipt || serialsEqual(serial, expectedFromReceipt)
      const reception_metadata = {
        ...previousMeta,
        captured_at: capturedAt,
        captured_by: userId,
        captured_by_name: capturedByName,
        capture_source: body.source === 'mobile' ? 'mobile' : 'desktop',
        ...(receiptMatch
          ? {}
          : {
              receipt_mismatch: true,
              scanned_serial: serial,
              expected_receipt_serial: expectedFromReceipt,
              mismatch_justification: mismatchJustification || null,
            }),
      }

      const { data: row, error: updateError } = await supabase
        .from('ticket_items')
        .update({
          collected_serial: serial,
          validation_status: isAdditional ? 'EXTRA' : receiptMatch ? 'VALIDADO' : 'DISCREPANCIA',
          reception_metadata,
          updated_at: capturedAt,
        })
        .eq('id', emptySlot.id)
        .is('collected_serial', null)
        .select('id, collected_serial, brand, model, product_type, asset_id')
        .maybeSingle()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      if (row) {
        updated = row as UpdatedRow
        await logReceptionScanEvent(supabase, {
          ticketId,
          ticketItemId: emptySlot.id,
          eventType: receiptMatch
            ? isAdditional
              ? 'scan_additional'
              : 'scan_exact_match'
            : 'scan_mismatch',
          scannedSerial: serial,
          expectedSerial: expectedFromReceipt || null,
          justification: mismatchJustification || null,
          performedBy: userId,
        })
        break
      }
    }

    if (!updated) {
      let countQuery = supabase
        .from('ticket_items')
        .select('id', { count: 'exact', head: true })
        .eq('ticket_id', ticketId)
      countQuery = lineFilter(countQuery, template)
      const { count } = await countQuery
      const max = count ?? 0

      return NextResponse.json(
        {
          error:
            max > 0
              ? 'No hay cupo libre en esta línea (otro operador lo tomó). Reintente.'
              : 'No hay cupos disponibles. Usa "Agregar adicional".',
        },
        { status: 409 }
      )
    }

    if (updated?.asset_id) {
      const internalTag = `AST-${serial.replace(/[^A-Z0-9\-]/gi, '').toUpperCase()}`.slice(0, 64)
      const { data: assetRow } = await supabase
        .from('assets')
        .select('specifications')
        .eq('id', updated.asset_id)
        .maybeSingle()

      const specs =
        assetRow?.specifications && typeof assetRow.specifications === 'object'
          ? { ...(assetRow.specifications as Record<string, unknown>) }
          : {}

      if ('reception_pending_serial' in specs) {
        specs.reception_pending_serial = false
      }

      const { error: assetError } = await supabase
        .from('assets')
        .update({
          serial_number: serial,
          internal_tag: internalTag || `AST-NR-${updated.id.slice(0, 12)}`,
          specifications: Object.keys(specs).length > 0 ? specs : assetRow?.specifications ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updated.asset_id)

      if (assetError) {
        return NextResponse.json(
          { error: `Serie guardada en ticket pero no en activo: ${assetError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ ok: true, mode: 'updated', item: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al procesar serie'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Elimina una serie de la línea:
 * - Si queda más de 1 unidad en la línea → borra la fila
 * - Si es la única → limpia la serie (mantiene el cupo del ticket)
 */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      ticketId?: string
      itemId?: string
    }

    const ticketId = body.ticketId?.trim() || ''
    const itemId = body.itemId?.trim() || ''

    if (!ticketId || !itemId) {
      return NextResponse.json({ error: 'ticketId e itemId son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: item, error: itemError } = await supabase
      .from('ticket_items')
      .select(
        'id, ticket_id, brand, model, brand_id, model_id, product_type_id, collected_serial, reception_metadata'
      )
      .eq('id', itemId)
      .eq('ticket_id', ticketId)
      .maybeSingle()

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 })
    }
    if (!item) {
      return NextResponse.json({ error: 'Serie no encontrada' }, { status: 404 })
    }

    let countQuery = supabase
      .from('ticket_items')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_id', ticketId)
    countQuery = lineFilter(countQuery, item)
    const { count } = await countQuery
    const lineCount = count ?? 0

    // Más de un cupo: eliminar fila (corrige cantidad inflada / adicionales)
    if (lineCount > 1) {
      const { error: deleteError } = await supabase
        .from('ticket_items')
        .delete()
        .eq('id', itemId)
        .eq('ticket_id', ticketId)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, mode: 'deleted', remaining: lineCount - 1 })
    }

    // Único cupo del ticket: solo limpia la serie
    const { error: clearError } = await supabase
      .from('ticket_items')
      .update({
        collected_serial: null,
        expected_serial: null,
        classification_f: null,
        classification_c: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mode: 'cleared', remaining: 1 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al eliminar serie'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
