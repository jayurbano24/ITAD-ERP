export const DEFAULT_WARRANTY_DAYS = 90

/** Opciones habituales en venta y cotización (política de garantía). */
export const WARRANTY_DAY_OPTIONS = [30, 60, 90, 180, 365] as const

export type WarrantyDayOption = (typeof WARRANTY_DAY_OPTIONS)[number]

export function clampWarrantyDays(value: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) return DEFAULT_WARRANTY_DAYS
  return Math.min(730, n)
}

export function formatWarrantyPeriodEs(days: number): string {
  const d = clampWarrantyDays(days)
  if (d % 30 === 0 && d >= 30) {
    const months = d / 30
    if (months === 1) return '1 mes'
    return `${months} meses`
  }
  if (d === 1) return '1 día'
  return `${d} días`
}

export function warrantyEndDateFromBase(base: Date, days: number): Date {
  const end = new Date(base)
  end.setDate(end.getDate() + clampWarrantyDays(days))
  return end
}

export function warrantyEndLabelFromBase(base: Date, days: number, locale = 'es-GT'): string {
  return warrantyEndDateFromBase(base, days).toLocaleDateString(locale)
}
