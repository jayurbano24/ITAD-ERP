/** Etiqueta de canal / forma de pago de una venta */

export function formatSalesChannel(
  paymentMethod?: string | null,
  internalNotes?: string | null,
  customerNotes?: string | null
): { channel: string; detail: string } {
  const raw = (paymentMethod || '').trim().toLowerCase()
  const notes = (internalNotes || '').trim()
  const hasCustomerNote = Boolean((customerNotes || '').trim())

  /** No usar el texto largo de garantía como subtítulo del canal */
  const paymentDetail = (fallback: string) => {
    if (hasCustomerNote) return fallback
    return notes || fallback
  }

  if (raw === 'efectivo' || raw === 'cash') {
    return { channel: 'Efectivo', detail: paymentDetail('POS · pago en efectivo') }
  }
  if (raw === 'tarjeta' || raw === 'card' || raw === 'credit_card') {
    return { channel: 'Tarjeta', detail: paymentDetail('POS · tarjeta') }
  }
  if (raw === 'visacuota' || raw.includes('visa')) {
    const cuotas = notes.match(/(\d+)\s*cuota/i)
    return {
      channel: 'Visacuota',
      detail: cuotas
        ? `Visacuota · ${cuotas[1]} cuotas`
        : paymentDetail('Visacuota'),
    }
  }
  if (raw === 'transferencia' || raw === 'transfer') {
    return { channel: 'Transferencia', detail: paymentDetail('Transferencia bancaria') }
  }
  if (!raw) {
    return {
      channel: 'POS Remarketing',
      detail: paymentDetail('Sin forma de pago registrada'),
    }
  }
  return {
    channel: paymentMethod || 'Otro',
    detail: paymentDetail('POS Remarketing'),
  }
}

export function formatSaleStatusLabel(status?: string | null): string {
  const map: Record<string, string> = {
    draft: 'Borrador',
    confirmed: 'Confirmada',
    paid: 'Pagada',
    shipped: 'Enviada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
    partially_refunded: 'Devolución parcial',
    refunded: 'Reembolsada',
  }
  if (!status) return '—'
  return map[status] || status
}
