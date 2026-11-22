import { normalizeSerial, serialsEqual } from '@/lib/reception/normalizeSerial'

export type ScanEvaluationInput = {
  scannedSerial: string
  targetExpectedSerial: string | null | undefined
  isAdditionalSlot: boolean
  duplicateInSameTicket: boolean
  foreignTicketReadableId?: string | null
}

export type ScanEvaluationResult =
  | { outcome: 'exact_match' }
  | { outcome: 'mismatch'; expectedSerial: string }
  | { outcome: 'no_expected_serial' }
  | { outcome: 'duplicate' }
  | { outcome: 'foreign_ticket'; otherTicketLabel: string }
  | { outcome: 'additional_slot' }

/**
 * Reglas de negocio para un intento de escaneo (sin efectos en BD).
 */
export function evaluateSerialScan(input: ScanEvaluationInput): ScanEvaluationResult {
  const scanned = normalizeSerial(input.scannedSerial)
  if (!scanned) {
    return { outcome: 'duplicate' }
  }

  if (input.duplicateInSameTicket) {
    return { outcome: 'duplicate' }
  }

  if (input.foreignTicketReadableId) {
    return { outcome: 'foreign_ticket', otherTicketLabel: input.foreignTicketReadableId }
  }

  if (input.isAdditionalSlot) {
    return { outcome: 'additional_slot' }
  }

  const expected = normalizeSerial(input.targetExpectedSerial)
  if (!expected) {
    return { outcome: 'no_expected_serial' }
  }

  if (serialsEqual(scanned, expected)) {
    return { outcome: 'exact_match' }
  }

  return { outcome: 'mismatch', expectedSerial: expected }
}