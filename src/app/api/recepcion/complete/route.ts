import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RECEIVING_WAREHOUSE_CODE = 'BOD-REC'

/**
 * Completa recepción del ticket y envía equipos a Bodega Recepción (BOD-REC).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ticketId?: string
    }

    const ticketId = body.ticketId?.trim() || ''
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId es requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth?.user?.id ?? null

    const { data: ticket, error: ticketError } = await supabase
      .from('operations_tickets')
      .select('id, readable_id, status, expected_units, description, title')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('ticket_items')
      .select(
        'id, collected_serial, brand, model, color, product_type, classification_f, classification_c, reception_metadata, asset_id, box_number'
      )
      .eq('ticket_id', ticketId)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const rows = items ?? []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'El ticket no tiene equipos para completar' }, { status: 400 })
    }

    const missingSerial = rows.filter((row) => !(row.collected_serial || '').trim())
    if (missingSerial.length > 0) {
      return NextResponse.json(
        {
          error: `Faltan ${missingSerial.length} serie(s) por registrar antes de completar`,
          missingSerial: missingSerial.length,
        },
        { status: 400 }
      )
    }

    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .eq('code', RECEIVING_WAREHOUSE_CODE)
      .maybeSingle()

    if (warehouseError) {
      return NextResponse.json({ error: warehouseError.message }, { status: 500 })
    }
    if (!warehouse?.id) {
      return NextResponse.json(
        { error: `Bodega ${RECEIVING_WAREHOUSE_CODE} (Recepción) no está configurada` },
        { status: 500 }
      )
    }

    // Lote del ticket
    let batchId: string | null = null
    const { data: existingBatch } = await supabase
      .from('batches')
      .select('id')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingBatch?.id) {
      batchId = existingBatch.id
      await supabase
        .from('batches')
        .update({
          status: 'received',
          received_units: rows.length,
          reception_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)
    } else {
      const { data: createdBatch, error: batchError } = await supabase
        .from('batches')
        .insert({
          internal_batch_id: `REC-${ticket.readable_id || Date.now()}`,
          ticket_id: ticketId,
          status: 'received',
          expected_units: Number(ticket.expected_units ?? rows.length),
          received_units: rows.length,
          reception_date: new Date().toISOString(),
          pallet_count: 1,
          received_by: userId,
        })
        .select('id')
        .single()

      if (batchError) {
        return NextResponse.json({ error: `No se pudo crear lote: ${batchError.message}` }, { status: 500 })
      }
      batchId = createdBatch.id
    }

    let movedAssets = 0
    const now = new Date().toISOString()
    const orderMatch = `${ticket.description || ''} ${ticket.title || ''}`.match(/\b(ORD\s*[-]?\s*\d{4,})\b/i)
    const sourceOrderNumber = orderMatch?.[1]
      ? orderMatch[1].replace(/\s+/g, '').replace(/ORD-/i, 'ORD').toUpperCase()
      : null

    // Preferir ORD de la foto como identificador de lote
    if (batchId && sourceOrderNumber) {
      await supabase
        .from('batches')
        .update({
          internal_batch_id: sourceOrderNumber,
          updated_at: now,
        })
        .eq('id', batchId)
    }

    for (const item of rows) {
      const serial = (item.collected_serial || '').trim().toUpperCase()
      const meta = (item.reception_metadata || {}) as Record<string, unknown>
      const specs = {
        workshop_classifications: {
          f: item.classification_f,
          c: item.classification_c,
          rec: meta.classification_rec || null,
        },
        hardware_specs: {
          processor: meta.processor || null,
          ram_capacity: meta.ram_capacity || null,
          ram_type: meta.ram_type || null,
          disk_capacity: meta.disk_capacity || null,
          disk_type: meta.disk_type || null,
          keyboard_type: meta.keyboard_type || null,
          keyboard_version: meta.keyboard_version || null,
          bios_version: meta.bios_version || null,
        },
        reception_notes: meta.observations || null,
        ticket_readable_id: ticket.readable_id,
        source_order_number: sourceOrderNumber,
      }

      let assetId = item.asset_id as string | null

      if (!assetId) {
        // Buscar por serie (case-insensitive) para no crear duplicados
        const { data: existingBySerial } = await supabase
          .from('assets')
          .select('id, status, serial_number')
          .ilike('serial_number', serial)
          .limit(5)

        const match =
          (existingBySerial || []).find(
            (a) => String(a.serial_number || '').trim().toUpperCase() === serial
          ) || null

        if (match?.status === 'sold' || match?.status === 'destroyed' || match?.status === 'scrapped') {
          return NextResponse.json(
            {
              error: `La serie ${serial} ya existe como ${match.status}. No se puede volver a recibir el mismo activo.`,
            },
            { status: 409 }
          )
        }

        assetId = match?.id || null
      }

      if (!assetId) {
        // internal_tag es NOT NULL + UNIQUE
        const internalTag = `AST-${serial}`.replace(/[^A-Z0-9\-]/gi, '').slice(0, 64)

        const { data: createdAsset, error: assetError } = await supabase
          .from('assets')
          .insert({
            internal_tag: internalTag,
            serial_number: serial,
            batch_id: batchId,
            asset_type: item.product_type || 'Laptop',
            manufacturer: item.brand,
            model: item.model,
            color: item.color,
            status: 'received',
            current_warehouse_id: warehouse.id,
            currency: 'GTQ',
            cost_amount: 0,
            specifications: specs,
            last_transfer_date: now,
            created_by: userId,
          })
          .select('id')
          .single()

        if (assetError) {
          // Si ya existe por tag/serie (reintento), reutilizar — NUNCA insertar otra fila con la misma serie
          const { data: byTag } = await supabase
            .from('assets')
            .select('id, status')
            .or(`internal_tag.eq.${internalTag},serial_number.eq.${serial}`)
            .maybeSingle()

          if (byTag?.id) {
            if (byTag.status === 'sold' || byTag.status === 'destroyed' || byTag.status === 'scrapped') {
              return NextResponse.json(
                {
                  error: `La serie ${serial} ya existe como ${byTag.status}. No se puede duplicar el activo.`,
                },
                { status: 409 }
              )
            }
            assetId = byTag.id
          } else {
            return NextResponse.json(
              { error: `Error creando activo ${serial}: ${assetError.message}` },
              { status: 500 }
            )
          }
        } else {
          assetId = createdAsset.id
        }
      }

      if (assetId) {
        const { error: updateAssetError } = await supabase
          .from('assets')
          .update({
            batch_id: batchId,
            manufacturer: item.brand,
            model: item.model,
            color: item.color,
            asset_type: item.product_type || 'Laptop',
            status: 'received',
            current_warehouse_id: warehouse.id,
            specifications: specs,
            last_transfer_date: now,
            updated_at: now,
          })
          .eq('id', assetId)

        if (updateAssetError) {
          return NextResponse.json(
            { error: `Error actualizando activo ${serial}: ${updateAssetError.message}` },
            { status: 500 }
          )
        }
      }

      await supabase
        .from('ticket_items')
        .update({
          asset_id: assetId,
          validation_status: 'RECIBIDO',
          updated_at: now,
        })
        .eq('id', item.id)

      movedAssets += 1
    }

    if (ticket.status !== 'completed' && ticket.status !== 'closed') {
      const { error: updateError } = await supabase
        .from('operations_tickets')
        .update({
          status: 'completed',
          completed_at: now,
          completed_by: userId,
          updated_at: now,
        })
        .eq('id', ticketId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      ok: true,
      readableId: ticket.readable_id,
      status: 'completed',
      itemCount: rows.length,
      movedAssets,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name || 'Bodega Recepción',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al completar ticket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
