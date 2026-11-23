import { roundMoney } from '@/lib/ventas/quotationIva'

/** Comisión publicada por el programa Visacuotas (referencia bancaria). */
export const VISACUOTA_PUBLISHED_COMMISSION: Readonly<Record<number, number>> = {
  2: 0.0525,
  3: 0.0575,
  6: 0.07,
  10: 0.0725,
  12: 0.08,
  15: 0.1,
  18: 0.12,
  24: 0.125,
  36: 0.13,
}

export const VISACUOTA_PUBLISHED_TABLE: ReadonlyArray<{ installments: number; rate: number; note?: string }> =
  [
    { installments: 2, rate: 0.0525 },
    { installments: 3, rate: 0.0575 },
    { installments: 6, rate: 0.07 },
    { installments: 10, rate: 0.0725 },
    { installments: 12, rate: 0.08 },
    { installments: 15, rate: 0.1, note: 'Condición especial (*)' },
    { installments: 18, rate: 0.12 },
    { installments: 24, rate: 0.125 },
    { installments: 36, rate: 0.13 },
  ]

const SORTED_PUBLISHED = Object.entries(VISACUOTA_PUBLISHED_COMMISSION)
  .map(([k, v]) => ({ installments: Number(k), rate: v }))
  .sort((a, b) => a.installments - b.installments)

export type VisacuotaCommissionLookup = {
  rate: number
  kind: 'published' | 'interpolated'
  label: string
}

export function parseVisacuotaInstallments(
  paymentMethod?: string | null,
  internalNotes?: string | null
): number | null {
  const raw = (paymentMethod || '').trim().toLowerCase()
  if (raw !== 'visacuota' && !raw.includes('visa')) return null
  const notes = (internalNotes || '').trim()
  const m = notes.match(/(\d+)\s*cuota/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

export function isVisacuotaPayment(paymentMethod?: string | null): boolean {
  const raw = (paymentMethod || '').trim().toLowerCase()
  return raw === 'visacuota' || raw.includes('visa')
}

/** Tasa para el plazo: publicada o interpolada lineal entre plazos oficiales. */
export function getVisacuotaCommissionRate(installments: number): VisacuotaCommissionLookup | null {
  if (!Number.isFinite(installments) || installments < 1) return null
  const exact = VISACUOTA_PUBLISHED_COMMISSION[installments]
  if (exact != null) {
    return {
      rate: exact,
      kind: 'published',
      label: `${(exact * 100).toFixed(2)}%`,
    }
  }

  if (installments <= SORTED_PUBLISHED[0].installments) {
    const r = SORTED_PUBLISHED[0].rate
    return { rate: r, kind: 'interpolated', label: `${(r * 100).toFixed(2)}% (est.)` }
  }
  const last = SORTED_PUBLISHED[SORTED_PUBLISHED.length - 1]
  if (installments >= last.installments) {
    return { rate: last.rate, kind: 'interpolated', label: `${(last.rate * 100).toFixed(2)}% (est.)` }
  }

  for (let i = 0; i < SORTED_PUBLISHED.length - 1; i++) {
    const lo = SORTED_PUBLISHED[i]
    const hi = SORTED_PUBLISHED[i + 1]
    if (installments >= lo.installments && installments <= hi.installments) {
      const span = hi.installments - lo.installments
      const t = span > 0 ? (installments - lo.installments) / span : 0
      const rate = lo.rate + t * (hi.rate - lo.rate)
      return {
        rate,
        kind: 'interpolated',
        label: `${(rate * 100).toFixed(2)}% (est.)`,
      }
    }
  }
  return null
}

export function computeVisacuotaSettlement(totalCharged: number, installments: number) {
  const lookup = getVisacuotaCommissionRate(installments)
  if (!lookup) {
    return {
      commissionRate: null as number | null,
      commissionRateLabel: '',
      commissionAmount: null as number | null,
      netAmount: roundMoney(Math.max(0, totalCharged)),
      rateKind: null as VisacuotaCommissionLookup['kind'] | null,
    }
  }
  const commissionAmount = roundMoney(Math.max(0, totalCharged) * lookup.rate)
  const netAmount = roundMoney(Math.max(0, totalCharged - commissionAmount))
  return {
    commissionRate: lookup.rate,
    commissionRateLabel: lookup.label,
    commissionAmount,
    netAmount,
    rateKind: lookup.kind,
  }
}