/** Progreso recibidas / esperadas para listado y detalle de tickets. */

export type TicketUnitsSource = {
  status: string
  expected_units?: number | null
  received_units?: number | null
  ticket_items?: Array<{ collected_serial?: string | null }> | null
}

export function resolveTicketUnitsProgress(ticket: TicketUnitsSource): {
  received: number
  expected: number
} {
  const expected = Math.max(0, Number(ticket.expected_units ?? 0))
  let received = Math.max(0, Number(ticket.received_units ?? 0))

  const items = ticket.ticket_items ?? []
  const serialCount = items.filter((i) => String(i.collected_serial ?? '').trim().length > 0).length
  if (serialCount > received) received = serialCount

  const terminal = ticket.status === 'completed' || ticket.status === 'closed'
  if (terminal && expected > 0 && received < expected) {
    received = expected
  }

  return { received, expected }
}