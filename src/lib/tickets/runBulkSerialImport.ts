import { createClient } from '@/lib/supabase/server'
import { type BulkSerialRow } from '@/lib/tickets/parseBulkSerialPaste'
import { resolveTicketBrandModelForTicket } from '@/lib/tickets/matchBulkSerialToTicket'
import { applySerialToTicketLine } from '@/lib/tickets/applyBulkSerialScan'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type BulkImportResult = {
  ticketId: string
  readableId: string | null
  totalRows: number
  applied: number
  appliedSerials: string[]
  errors: Array<{ serial: string; error: string }>
  unmapped: Array<{ serial: string; make: string; model: string }>
  remainingWithoutSerial: number | null
}

export async function runBulkSerialImport(
  supabase: SupabaseClient,
  ticketId: string,
  readableId: string | null,
  rows: BulkSerialRow[],
  userId: string | null,
  capturedByName: string
): Promise<BulkImportResult> {
  const applied: string[] = []
  const errors: Array<{ serial: string; error: string }> = []
  const unmapped: Array<{ serial: string; make: string; model: string }> = []

  const { data: ticketItems } = await supabase
    .from('ticket_items')
    .select('brand, model')
    .eq('ticket_id', ticketId)

  const ticketLines = Array.from(
    new Map(
      (ticketItems || []).map((it) => {
        const brand = (it.brand || '').trim()
        const model = (it.model || '').trim()
        return [`${brand}|${model}`, { brand, model }]
      })
    ).values()
  ).filter((l) => l.brand || l.model)

  for (const row of rows) {
    const mapped = resolveTicketBrandModelForTicket(row.make, row.model, ticketLines)
    if (!mapped) {
      unmapped.push({ serial: row.serial, make: row.make, model: row.model })
      continue
    }

    const extraMetadata: Record<string, unknown> = {
      bulk_import: true,
      report_make: row.make,
      report_model: row.model,
    }
    if (row.cosmetic) extraMetadata.cosmetic = row.cosmetic
    if (row.functional) extraMetadata.functional = row.functional
    if (row.processor) extraMetadata.processor = row.processor
    if (row.ram) extraMetadata.ram_capacity = row.ram
    if (row.screenSize) extraMetadata.screen_size = row.screenSize
    if (row.comments) extraMetadata.observations = row.comments
    if (row.finalStatus) extraMetadata.final_status = row.finalStatus
    if (row.additionalNotes) extraMetadata.additional_notes = row.additionalNotes

    const result = await applySerialToTicketLine(supabase, {
      ticketId,
      template: { brand: mapped.brand, model: mapped.model, brand_id: null, model_id: null, product_type_id: null },
      serial: row.serial,
      userId,
      capturedByName,
      source: 'bulk',
      extraMetadata,
    })

    if (result.ok) applied.push(result.serial)
    else errors.push({ serial: result.serial, error: result.error })
  }

  const { count: remaining } = await supabase
    .from('ticket_items')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', ticketId)
    .is('collected_serial', null)

  return {
    ticketId,
    readableId,
    totalRows: rows.length,
    applied: applied.length,
    appliedSerials: applied,
    errors,
    unmapped,
    remainingWithoutSerial: remaining ?? null,
  }
}