import { roundMoney } from '@/lib/ventas/quotationIva'

export const DEFAULT_IVA_WITHHOLDING_RATE = 0.15

export function computeIvaWithholding(
  taxAmount: number,
  rate: number = DEFAULT_IVA_WITHHOLDING_RATE
): number {
  const iva = Math.max(0, Number(taxAmount) || 0)
  const r = Math.max(0, Math.min(1, Number(rate) || 0))
  return roundMoney(iva * r)
}

export function netCollectibleTotal(totalWithIva: number, withholdingAmount: number): number {
  return roundMoney(Math.max(0, totalWithIva - Math.max(0, withholdingAmount)))
}