/** Razón de anulación: columna dedicada o nota interna histórica. */
export function getSaleCancellationReason(order: {
  status?: string | null
  cancelled_reason?: string | null
  internal_notes?: string | null
}): string | null {
  const direct = (order.cancelled_reason || '').trim()
  if (direct) return direct
  if (order.status !== 'cancelled') return null
  const notes = (order.internal_notes || '').trim()
  if (!notes) return null
  const lines = notes.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    const match = line.match(/ANULACIÓN\s*·\s*(.+?)\.\s*Equipos a/i)
    if (match?.[1]) return match[1].trim()
  }
  return null
}