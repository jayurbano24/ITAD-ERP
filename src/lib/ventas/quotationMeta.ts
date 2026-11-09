export type QuotationRequesterType = 'empresa' | 'cliente_final'

export type QuotationPaymentMethod =
  | 'tarjeta'
  | 'transferencia'
  | 'deposito'
  | 'credito'

export const QUOTATION_REQUESTER_LABELS: Record<QuotationRequesterType, string> = {
  empresa: 'Empresa (contacto corporativo)',
  cliente_final: 'Cliente final',
}

export const QUOTATION_PAYMENT_LABELS: Record<QuotationPaymentMethod, string> = {
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  deposito: 'Depósito',
  credito: 'Crédito',
}

export function formatQuotationPaymentMethod(value: string | null | undefined): string {
  if (!value) return '—'
  if (value in QUOTATION_PAYMENT_LABELS) {
    return QUOTATION_PAYMENT_LABELS[value as QuotationPaymentMethod]
  }
  return value
}

export function formatQuotationRequesterType(value: string | null | undefined): string {
  if (!value) return '—'
  if (value in QUOTATION_REQUESTER_LABELS) {
    return QUOTATION_REQUESTER_LABELS[value as QuotationRequesterType]
  }
  return value
}
