import { roundMoney } from '@/lib/ventas/quotationIva'
import { computeNeonetCommissionForSale, type SaleForNeonetCommission } from '@/lib/ventas/neonetCommissions'

/** Comisión interna por ventas sobre el total facturado (con IVA). */
export const SALES_TEAM_COMMISSION_RATE = 0.06

export type SaleOrderForFiscalStats = SaleForNeonetCommission & {
  tax_amount?: number | null
  fiscal_withholding?: { ivaWithholdingAmount?: number } | null
  created_at?: string
}

export type SalesFiscalComputed = {
  totalGross: number
  totalTax: number
  withholdingIva: number
  /** Total − IVA (antes de comisiones POS y ventas) */
  netBeforeCommissions: number
  neonetCommissions: number
  salesTeamCommission: number
  /** Total − IVA − NeoNet − comisión ventas 6% */
  netIncome: number
  ivaToPay: number
}

export function computeSalesFiscalStats(orders: SaleOrderForFiscalStats[]): SalesFiscalComputed {
  let totalGross = 0
  let totalTax = 0
  let withholdingIva = 0
  let neonetCommissions = 0

  for (const o of orders) {
    if (o.status === 'cancelled') continue
    totalGross += Number(o.total_amount || 0)
    totalTax += Number(o.tax_amount || 0)
    withholdingIva += Number(o.fiscal_withholding?.ivaWithholdingAmount ?? 0)
    neonetCommissions += computeNeonetCommissionForSale(o)
  }

  totalGross = roundMoney(totalGross)
  totalTax = roundMoney(totalTax)
  withholdingIva = roundMoney(withholdingIva)
  neonetCommissions = roundMoney(neonetCommissions)

  const netBeforeCommissions = roundMoney(totalGross - totalTax)
  const salesTeamCommission = roundMoney(totalGross * SALES_TEAM_COMMISSION_RATE)
  const netIncome = roundMoney(
    Math.max(0, netBeforeCommissions - neonetCommissions - salesTeamCommission)
  )
  const ivaToPay = roundMoney(Math.max(0, totalTax - withholdingIva))

  return {
    totalGross,
    totalTax,
    withholdingIva,
    netBeforeCommissions,
    neonetCommissions,
    salesTeamCommission,
    netIncome,
    ivaToPay,
  }
}

export function monthKeyFromIso(createdAt: string): string {
  const d = new Date(createdAt)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatMonthKeyLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  return d.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
}

export function groupOrdersByMonth<T extends { created_at?: string; status?: string }>(
  orders: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    const key = monthKeyFromIso(o.created_at || new Date().toISOString())
    const list = map.get(key) || []
    list.push(o)
    map.set(key, list)
  }
  return map
}