/** Correlativo de traslado entre bodegas: TRAS-000001 */

export const TRAS_PREFIX = 'TRAS'

export function parseTrasSequence(reference: string | null | undefined): number | null {
  if (!reference?.trim()) return null
  const parts = reference.trim().split('-')
  if (parts.length !== 2 || parts[0] !== TRAS_PREFIX) return null
  const num = parseInt(parts[1], 10)
  return Number.isFinite(num) && num > 0 ? num : null
}

export function formatTrasCorrelative(sequence: number): string {
  return `${TRAS_PREFIX}-${sequence.toString().padStart(6, '0')}`
}

export function maxTrasSequenceFromReferences(references: (string | null | undefined)[]): number {
  let maxSeen = 0
  for (const ref of references) {
    const num = parseTrasSequence(ref)
    if (num != null && num > maxSeen) maxSeen = num
  }
  return maxSeen
}