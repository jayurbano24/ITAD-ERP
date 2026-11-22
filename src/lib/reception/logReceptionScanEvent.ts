import type { SupabaseClient } from '@supabase/supabase-js'

export type LogScanEventParams = {
  ticketId: string
  ticketItemId?: string | null
  eventType:
    | 'scan_exact_match'
    | 'scan_mismatch'
    | 'scan_duplicate'
    | 'scan_foreign_ticket'
    | 'scan_reassign'
    | 'scan_additional'
    | 'scan_cancelled'
  scannedSerial: string
  expectedSerial?: string | null
  correctedSerial?: string | null
  justification?: string | null
  performedBy?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Inserta evento de auditoría; no falla el flujo principal si la tabla no existe aún.
 */
export async function logReceptionScanEvent(
  supabase: SupabaseClient,
  params: LogScanEventParams
): Promise<void> {
  const { error } = await supabase.from('ticket_reception_scan_events').insert({
    ticket_id: params.ticketId,
    ticket_item_id: params.ticketItemId ?? null,
    event_type: params.eventType,
    scanned_serial: params.scannedSerial,
    expected_serial: params.expectedSerial ?? null,
    corrected_serial: params.correctedSerial ?? null,
    justification: params.justification ?? null,
    performed_by: params.performedBy ?? null,
    metadata: params.metadata ?? {},
  })

  if (error && !/ticket_reception_scan_events|schema cache/i.test(error.message)) {
    console.error('[logReceptionScanEvent]', error.message)
  }
}