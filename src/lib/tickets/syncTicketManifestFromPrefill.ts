import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReceiptPrefillItem, ReceiptPrefillResult } from '@/lib/tickets/receiptPrefillService'

type TicketItemInsertRow = {
  ticket_id: string
  brand_id: string
  model_id: string
  product_type_id: string
  brand: string | null
  model: string | null
  product_type: string | null
  box_number: number
  validation_status: 'PENDIENTE_VALIDACION'
  expected_serial: string | null
}

export function buildTicketItemsInsertRows(
  ticketId: string,
  manifest: ReceiptPrefillItem[]
): TicketItemInsertRow[] {
  return manifest.flatMap((item) => {
    const base = {
      ticket_id: ticketId,
      brand_id: item.brand_id,
      model_id: item.model_id,
      product_type_id: item.product_type_id,
      brand: item.brand_name,
      model: item.model_name,
      product_type: item.product_type_name,
      box_number: 0,
      validation_status: 'PENDIENTE_VALIDACION' as const,
    }

    const serial = item.expected_serial?.trim() || null
    if (serial) {
      return [{ ...base, expected_serial: serial }]
    }

    const qty = Math.max(1, item.quantity || 1)
    return Array.from({ length: qty }, (): TicketItemInsertRow => ({
      ...base,
      expected_serial: null,
    }))
  })
}

export type ManifestSyncResult = {
  insertedSlots: number
  expectedUnits: number
  replaced: boolean
}

export async function syncTicketManifestFromPrefill(
  supabase: SupabaseClient,
  ticketId: string,
  prefill: ReceiptPrefillResult,
  options?: { forceReplace?: boolean }
): Promise<ManifestSyncResult> {
  if (!prefill.success || prefill.items.length === 0) {
    throw new Error(prefill.error || 'El recibo no contiene equipos reconocibles')
  }

  const { data: existing, error: loadError } = await supabase
    .from('ticket_items')
    .select('id, collected_serial, expected_serial')
    .eq('ticket_id', ticketId)

  if (loadError) {
    throw new Error(loadError.message)
  }

  const rows = existing ?? []
  const anyCollected = rows.some((r) => (r.collected_serial || '').trim())
  if (anyCollected && !options?.forceReplace) {
    throw new Error(
      'Este ticket ya tiene series capturadas. No se puede reemplazar el manifiesto del recibo.'
    )
  }

  const payload = buildTicketItemsInsertRows(ticketId, prefill.items)
  const expectedUnits = payload.length

  if (rows.length > 0) {
    const { error: delError } = await supabase.from('ticket_items').delete().eq('ticket_id', ticketId)
    if (delError) throw new Error(delError.message)
  }

  const { error: insertError } = await supabase.from('ticket_items').insert(payload)
  if (insertError) throw new Error(insertError.message)

  const ticketPatch: Record<string, unknown> = {
    expected_units: expectedUnits,
    updated_at: new Date().toISOString(),
  }
  if (prefill.pickup_address) ticketPatch.pickup_address = prefill.pickup_address
  if (prefill.pickup_date) ticketPatch.pickup_date = prefill.pickup_date
  if (prefill.xsi_order_number) ticketPatch.xsi_order_number = prefill.xsi_order_number
  if (prefill.epc_order_number) ticketPatch.epc_order_number = prefill.epc_order_number

  const { error: updateError } = await supabase
    .from('operations_tickets')
    .update(ticketPatch)
    .eq('id', ticketId)

  if (updateError) throw new Error(updateError.message)

  return {
    insertedSlots: payload.length,
    expectedUnits,
    replaced: rows.length > 0,
  }
}

export async function uploadTicketReceiptAttachment(
  supabase: SupabaseClient,
  ticketId: string,
  file: File
): Promise<{ attachment_url: string; attachment_name: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${ticketId}/receipt/${Date.now()}-${safeName || `recibo.${ext}`}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const spreadsheetExt = ['xlsx', 'xls', 'csv']
  const contentType =
    file.type ||
    (ext === 'pdf'
      ? 'application/pdf'
      : spreadsheetExt.includes(ext)
        ? ext === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'image/jpeg')

  const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(path, buffer, {
    contentType,
    upsert: false,
  })
  if (uploadError) throw new Error(uploadError.message)

  const { data: urlData } = supabase.storage.from('ticket-attachments').getPublicUrl(path)
  const attachment_url = urlData.publicUrl
  const attachment_name = file.name || 'recibo.pdf'

  const { error: attachError } = await supabase
    .from('operations_tickets')
    .update({ attachment_url, attachment_name })
    .eq('id', ticketId)

  if (attachError) throw new Error(attachError.message)

  return { attachment_url, attachment_name }
}