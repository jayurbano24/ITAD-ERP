import { isConsumidorFinalNit, normalizeNitForLookup } from '@/lib/fiscal/nitGt'
import { DEFAULT_IVA_WITHHOLDING_RATE, computeIvaWithholding, netCollectibleTotal } from '@/lib/fiscal/ivaWithholding'

export type SaleWithholdingExportFields = {
  isWithholdingAgent: boolean
  withholdingRate: number
  ivaWithholdingAmount: number
  netAfterIvaWithholding: number
}

export function computeSaleWithholdingExportFields(input: {
  customerNit?: string | null
  taxAmount?: number | null
  totalAmount?: number | null
  isAgentFromCustomerFlag?: boolean | null
  isAgentFromCatalog?: boolean | null
  withholdingRate?: number | null
}): SaleWithholdingExportFields {
  const rate =
    Number(input.withholdingRate) > 0 && Number(input.withholdingRate) <= 1
      ? Number(input.withholdingRate)
      : DEFAULT_IVA_WITHHOLDING_RATE

  const nit = (input.customerNit || '').trim()
  const isCf = isConsumidorFinalNit(nit)
  const isAgent =
    !isCf &&
    Boolean(input.isAgentFromCatalog || input.isAgentFromCustomerFlag || false)

  const tax = Number(input.taxAmount || 0)
  const total = Number(input.totalAmount || 0)
  const ivaWithholdingAmount = isAgent ? computeIvaWithholding(tax, rate) : 0
  const netAfterIvaWithholding = isAgent
    ? netCollectibleTotal(total, ivaWithholdingAmount)
    : total

  return {
    isWithholdingAgent: isAgent,
    withholdingRate: rate,
    ivaWithholdingAmount,
    netAfterIvaWithholding,
  }
}

export function normalizeNitKeysForBatch(nits: Iterable<string | null | undefined>): string[] {
  const set = new Set<string>()
  for (const raw of Array.from(nits)) {
    const norm = normalizeNitForLookup((raw || '').trim())
    if (norm) set.add(norm)
  }
  return Array.from(set)
}