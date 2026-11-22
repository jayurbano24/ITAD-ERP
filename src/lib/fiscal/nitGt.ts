/** NIT Guatemala: normalizado sin guiones ni espacios (clave de búsqueda). */
export function normalizeNitForLookup(nit: string): string | null {
  const raw = nit.trim().toUpperCase()
  if (!raw || raw === 'CF' || raw === 'C/F' || raw === 'CONSUMIDOR FINAL') {
    return null
  }
  const compact = raw.replace(/\s/g, '').replace(/-/g, '')
  const withK = compact.match(/^(\d{4,12})(K)$/)
  if (withK) return `${withK[1]}K`
  const digits = compact.replace(/[^0-9]/g, '')
  if (digits.length < 4) return null
  return digits
}

/** Formato habitual NIT con guion antes del dígito verificador. */
export function formatNitGt(nit: string): string {
  const raw = nit.trim().toUpperCase()
  if (raw.endsWith('K') || /K$/i.test(raw.replace(/\s/g, '').replace(/-/g, ''))) {
    const base = raw.replace(/[^0-9]/g, '')
    if (base.length >= 2) return `${base.slice(0, -1)}-${base.slice(-1)}K`
    return raw
  }
  const norm = normalizeNitForLookup(nit)
  if (!norm) return raw || 'CF'
  if (norm.length <= 1) return norm
  return `${norm.slice(0, -1)}-${norm.slice(-1)}`
}

export function isConsumidorFinalNit(nit: string): boolean {
  const raw = nit.trim().toUpperCase()
  return !raw || raw === 'CF' || raw === 'C/F' || raw === 'CONSUMIDOR FINAL'
}