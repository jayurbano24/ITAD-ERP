/**
 * Comisiones estimadas pagadas al comercio vía NeoNet (POS).
 * NeoCuotas: tasas publicadas (FAQ ebi / NeoNet, mismas que Visacuotas).
 * Tarjeta contado: tasa de referencia FAQ régimen general (ajustable).
 */

import { roundMoney } from '@/lib/ventas/quotationIva'
import {
  computeVisacuotaSettlement,
  isVisacuotaPayment,
  parseVisacuotaInstallments,
} from '@/lib/ventas/visacuotaFees'

/** Referencia FAQ: régimen general desde 5.5% (usamos mínimo publicado). */
export const NEONET_DEFAULT_CARD_COMMISSION_RATE = 0.055

export type SaleForNeonetCommission = {
  status: string
  total_amount?: number | null
  payment_method?: string | null
  internal_notes?: string | null
}

export function computeNeonetCommissionForSale(order: SaleForNeonetCommission): number {
  if (order.status === 'cancelled') return 0
  const total = roundMoney(Number(order.total_amount || 0))
  if (total <= 0) return 0

  const raw = (order.payment_method || '').trim().toLowerCase()

  if (isVisacuotaPayment(order.payment_method)) {
    const installments = parseVisacuotaInstallments(order.payment_method, order.internal_notes)
    if (!installments) return 0
    const settlement = computeVisacuotaSettlement(total, installments)
    return settlement.commissionAmount ?? 0
  }

  if (raw === 'tarjeta' || raw === 'card' || raw === 'credit_card' || raw.includes('tarjeta')) {
    return roundMoney(total * NEONET_DEFAULT_CARD_COMMISSION_RATE)
  }

  return 0
}

export function sumNeonetCommissions(orders: SaleForNeonetCommission[]): number {
  let sum = 0
  for (const o of orders) {
    sum += computeNeonetCommissionForSale(o)
  }
  return roundMoney(sum)
}