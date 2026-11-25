import type { SupabaseClient } from '@supabase/supabase-js'
import { formatTrasCorrelative, maxTrasSequenceFromReferences } from './warehouseTransferCorrelative'

async function fallbackNextFromTables(supabase: SupabaseClient): Promise<string> {
  const movRes = await supabase
    .from('inventory_movements')
    .select('reference_number')
    .like('reference_number', 'TRAS-%')
    .order('created_at', { ascending: false })
    .limit(500)

  const refs: string[] = []
  for (const row of movRes.data ?? []) {
    if (row.reference_number) refs.push(row.reference_number)
  }

  const next = maxTrasSequenceFromReferences(refs) + 1
  return formatTrasCorrelative(next)
}

/** Vista previa del siguiente correlativo (modal). */
export async function peekWarehouseTransferCorrelative(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('peek_warehouse_transfer_correlative')
  if (!error && typeof data === 'string' && data.length > 0) {
    return data
  }
  if (error) {
    console.warn('peek_warehouse_transfer_correlative fallback:', error.message)
  }
  return fallbackNextFromTables(supabase)
}

/** Reserva el siguiente correlativo al confirmar traslado. */
export async function allocateWarehouseTransferCorrelative(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('allocate_warehouse_transfer_correlative')
  if (!error && typeof data === 'string' && data.length > 0) {
    return data
  }
  if (error) {
    console.warn('allocate_warehouse_transfer_correlative fallback:', error.message)
  }
  return fallbackNextFromTables(supabase)
}