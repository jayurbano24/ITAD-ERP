export type ProjectDispositionKey = 'resale' | 'recycle' | 'spare' | 'harvesting'

export type ProjectDispositionPlan = {
  key: ProjectDispositionKey
  label: string
  warehouseCode: string
  status: string
}

/** Tras diagnóstico masivo, todos los equipos pasan a valorización; la etiqueta distingue el canal. */
export const PROJECT_DISPOSITION_VALUATION_WAREHOUSE = 'BOD-VAL'

export const PROJECT_DISPOSITION_OPTIONS: ProjectDispositionPlan[] = [
  { key: 'resale', label: 'Resale', warehouseCode: PROJECT_DISPOSITION_VALUATION_WAREHOUSE, status: 'received' },
  { key: 'recycle', label: 'Recycle', warehouseCode: PROJECT_DISPOSITION_VALUATION_WAREHOUSE, status: 'received' },
  { key: 'spare', label: 'Spare', warehouseCode: PROJECT_DISPOSITION_VALUATION_WAREHOUSE, status: 'received' },
  { key: 'harvesting', label: 'Harvesting', warehouseCode: PROJECT_DISPOSITION_VALUATION_WAREHOUSE, status: 'received' },
]

export function getProjectDispositionPlan(key: ProjectDispositionKey): ProjectDispositionPlan {
  const found = PROJECT_DISPOSITION_OPTIONS.find((o) => o.key === key)
  if (!found) {
    throw new Error(`Disposición desconocida: ${key}`)
  }
  return found
}

export function normalizeProjectRef(value: string): string {
  return value.trim().toUpperCase()
}

export function projectRefFromAsset(input: {
  specifications?: Record<string, unknown> | null
  order_code?: string | null
  batch_code?: string | null
}): string | null {
  const specs = input.specifications
  if (specs && typeof specs === 'object') {
    const raw =
      specs.project_number ??
      specs.source_order_number ??
      specs.project_hash ??
      specs.invoice_ref ??
      specs.Project ??
      null
    if (raw != null && String(raw).trim() !== '') {
      return String(raw).trim()
    }
  }
  const order = input.order_code?.trim()
  if (order) return order
  const batch = input.batch_code?.trim()
  if (batch) return batch
  return null
}

export function assetMatchesProjectRef(
  asset: {
    specifications?: Record<string, unknown> | null
    order_code?: string | null
    batch_code?: string | null
  },
  projectRef: string
): boolean {
  const needle = normalizeProjectRef(projectRef)
  if (!needle) return false

  const direct = projectRefFromAsset(asset)
  if (direct && normalizeProjectRef(direct) === needle) return true
  if (direct && normalizeProjectRef(direct).includes(needle)) return true

  const order = asset.order_code?.trim()
  if (order && normalizeProjectRef(order) === needle) return true
  if (order && normalizeProjectRef(order).includes(needle)) return true

  const batch = asset.batch_code?.trim()
  if (batch && normalizeProjectRef(batch) === needle) return true
  if (batch && normalizeProjectRef(batch).includes(needle)) return true

  return false
}

export function readItadDisposition(specifications?: Record<string, unknown> | null): string | null {
  if (!specifications || typeof specifications !== 'object') return null
  const top = specifications.itad_disposition
  if (typeof top === 'string' && top.trim()) return top.trim()
  const workshop = specifications.workshop_classifications
  if (workshop && typeof workshop === 'object') {
    const nested = (workshop as Record<string, unknown>).itad_disposition
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  return null
}

export function isAssetPendingProjectDisposition(
  asset: { specifications?: Record<string, unknown> | null },
  onlyRemaining: boolean
): boolean {
  if (!onlyRemaining) return true
  return !readItadDisposition(asset.specifications)
}