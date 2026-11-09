export const QUOTATION_IVA_RATE = 0.12

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export type QuotationIvaTotals = {
  subtotal: number
  tax_amount: number
  total: number
}

export type QuotationTotalsView = QuotationIvaTotals & {
  subtotalBeforeDiscount: number
  discountApplied: number
}

/** Totales de cotización a partir de sumas de líneas (precio digitado × cantidad). */
export function computeQuotationIva(
  linesListedTotal: number,
  pricesIncludeIva: boolean
): QuotationIvaTotals {
  const listed = Math.max(0, roundMoney(linesListedTotal))
  if (pricesIncludeIva) {
    const subtotal = roundMoney(listed / (1 + QUOTATION_IVA_RATE))
    const tax_amount = roundMoney(subtotal * QUOTATION_IVA_RATE)
    const total = roundMoney(subtotal + tax_amount)
    return { subtotal, tax_amount, total }
  }
  const subtotal = listed
  const tax_amount = roundMoney(subtotal * QUOTATION_IVA_RATE)
  const total = roundMoney(subtotal + tax_amount)
  return { subtotal, tax_amount, total }
}

type DiscountInput = {
  discount_percent?: number | null
  discount_amount?: number | null
}

/** Base sin IVA + descuento (sobre subtotal) + IVA recalculado. */
export function computeQuotationTotalsWithDiscount(
  linesListedTotal: number,
  pricesIncludeIva: boolean,
  discount?: DiscountInput
): QuotationTotalsView {
  const base = computeQuotationIva(linesListedTotal, pricesIncludeIva)
  const subtotalBeforeDiscount = base.subtotal
  let subtotal = base.subtotal
  const pct = Math.max(0, Number(discount?.discount_percent) || 0)
  const fixed = Math.max(0, Number(discount?.discount_amount) || 0)
  let discountApplied = 0

  if (pct > 0) {
    const capped = Math.min(100, pct)
    discountApplied = roundMoney((subtotal * capped) / 100)
    subtotal = roundMoney(subtotal - discountApplied)
  } else if (fixed > 0) {
    discountApplied = roundMoney(Math.min(fixed, subtotal))
    subtotal = roundMoney(subtotal - discountApplied)
  }

  const tax_amount = roundMoney(subtotal * QUOTATION_IVA_RATE)
  const total = roundMoney(subtotal + tax_amount)

  return { subtotal, tax_amount, total, subtotalBeforeDiscount, discountApplied }
}

type LineItemLike = { line_total?: number | null }

export function resolveQuotationTotals(
  linesListedTotal: number,
  pricesIncludeIva: boolean,
  stored: {
    subtotal?: number | null
    tax_amount?: number | null
    amount?: number | null
    discount_percent?: number | null
    discount_amount?: number | null
  }
): QuotationTotalsView {
  const hasDiscount =
    (Number(stored.discount_percent) || 0) > 0 || (Number(stored.discount_amount) || 0) > 0

  if (hasDiscount) {
    return computeQuotationTotalsWithDiscount(linesListedTotal, pricesIncludeIva, stored)
  }

  if (stored.subtotal == null || stored.tax_amount == null) {
    return computeQuotationTotalsWithDiscount(linesListedTotal, pricesIncludeIva, stored)
  }

  const total = stored.amount ?? roundMoney(stored.subtotal + stored.tax_amount)
  return {
    subtotal: stored.subtotal,
    tax_amount: stored.tax_amount,
    total,
    subtotalBeforeDiscount: stored.subtotal,
    discountApplied: 0,
  }
}

export function listedTotalFromItems(items: LineItemLike[] | undefined | null, fallback = 0): number {
  if (!items?.length) return fallback
  return roundMoney(items.reduce((sum, i) => sum + (Number(i.line_total) || 0), 0))
}
