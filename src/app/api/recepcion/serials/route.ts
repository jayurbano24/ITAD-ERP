import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      action?: 'scan' | 'additional' | 'setQuantity'
      ticketId?: string
      templateItemId?: string
      serial?: string
      quantity?: number
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
          validation_status: template.validation_status || 'PENDIENTE_VALIDACION',
          reception_metadata: { additional: true },
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

    // action === 'scan'
    const serial = (body.serial || '').trim().toUpperCase()
    if (!serial) {
      return NextResponse.json({ error: 'serial es requerido' }, { status: 400 })
    }

    const { data: duplicateCollected } = await supabase
      .from('ticket_items')
      .select('id')
      .eq('ticket_id', ticketId)
      .ilike('collected_serial', serial)
      .maybeSingle()

    if (duplicateCollected) {
      return NextResponse.json({ error: `Serie duplicada: ${serial} ya está en este ticket` }, { status: 409 })
    }

    const { data: duplicateExpected } = await supabase
      .from('ticket_items')
      .select('id')
      .eq('ticket_id', ticketId)
      .ilike('expected_serial', serial)
      .maybeSingle()

    if (duplicateExpected) {
      return NextResponse.json({ error: `Serie duplicada: ${serial} ya está en este ticket` }, { status: 409 })
    }

    let emptyQuery = supabase
      .from('ticket_items')
      .select('id')
      .eq('ticket_id', ticketId)
      .is('collected_serial', null)
      .order('created_at', { ascending: true })
      .limit(1)

    emptyQuery = lineFilter(emptyQuery, template)

    const { data: emptySlot } = await emptyQuery.maybeSingle()

    if (!emptySlot?.id) {
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
              ? `Máximo ${max} series en esta línea. Usa "Agregar adicional" si necesitas más cupos.`
              : 'No hay cupos disponibles. Usa "Agregar adicional".',
        },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('ticket_items')
      .update({
        collected_serial: serial,
        expected_serial: serial,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emptySlot.id)
      .select('id, collected_serial, brand, model, product_type')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
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
