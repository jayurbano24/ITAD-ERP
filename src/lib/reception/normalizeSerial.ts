/**
 * Normalización única para comparar series del Receipt vs pistoleo.
 */
export function normalizeSerial(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, '')
    .replace(/[^A-Z0-9]/g, '')
}

export function serialsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeSerial(a)
  const nb = normalizeSerial(b)
  if (!na || !nb) return false
  return na === nb
}