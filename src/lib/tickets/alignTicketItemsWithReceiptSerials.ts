import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReceiptEquipmentItem } from '@/lib/receipts/parseEquipmentReceipt'

const norm = (v: string | null | undefined) => (v || '').trim().toLowerCase()

function matchRowToReceiptSlot(
  row: { brand: string | null; model: string | null; product_type: string | null },
  slot: { make: string | null; model: string | null; product: string | null }
): boolean {
  const rb = norm(row.brand)
  const rm = norm(row.model)
  const sb = norm(slot.make)
  const sm = norm(slot.model)
  if (rb && sb && rb !== sb && !rb.includes(sb) && !sb.includes(rb)) return false
  if (rm && sm && rm !== sm && !rm.includes(sm) && !sm.includes(rm)) return false
  return true
}

export type AlignReceiptSerialsResult = {
  updated: number
  serials: Array<{ itemId: string; expected_serial: string }>
}

/**
 * Escribe expected_serial en cupos del ticket según el manifiesto del Receipt of Equipment.
 */
export async function alignTicketItemsWithReceiptSerials(
  supabase: SupabaseClient,
  ticketId: string,
  receiptItems: ReceiptEquipmentItem[]
): Promise<AlignReceiptSerialsResult> {
  const { data: rows, error } = await supabase
    .from('ticket_items')
    .select('id, brand, model, product_type, expected_serial, collected_serial, reception_metadata')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  type PoolEntry = {
    make: string | null
    model: string | null
    product: string | null
    serial: string
  }

  const pool: PoolEntry[] = []
  for (const item of receiptItems) {
    const serial = (item.serial || '').trim().toUpperCase()
    const qty = Math.max(1, item.quantity || 1)
    if (serial) {
      for (let i = 0; i < qty; i++) {
        pool.push({
          make: item.make,
          model: item.model,
          product: item.product,
          serial,
        })
      }
    }
  }

  if (pool.length === 0) {
    throw new Error('El recibo no contiene números de serie detectables')
  }

  const updated: AlignReceiptSerialsResult['serials'] = []
  const now = new Date().toISOString()

  for (const row of rows ?? []) {
    const meta = (row.reception_metadata || {}) as Record<string, unknown>
    if (meta.additional) continue

    const currentExpected = (row.expected_serial || '').trim().toUpperCase()
    if (currentExpected) continue

    const idx = pool.findIndex((slot) => matchRowToReceiptSlot(row, slot))
    let pick: PoolEntry | undefined
    if (idx >= 0) {
      pick = pool[idx]
      pool.splice(idx, 1)
    } else if (pool.length === 1) {
      pick = pool.shift()
    }

    if (!pick?.serial) continue

    const { error: upError } = await supabase
      .from('ticket_items')
      .update({
        expected_serial: pick.serial,
        updated_at: now,
      })
      .eq('id', row.id)

    if (upError) throw new Error(upError.message)
    updated.push({ itemId: row.id, expected_serial: pick.serial })
  }

  return { updated: updated.length, serials: updated }
}