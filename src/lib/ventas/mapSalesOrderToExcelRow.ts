import { formatSaleStatusLabel, formatSalesChannel } from '@/lib/ventas/salesChannel'
import type { SalesExcelRow } from '@/lib/ventas/exportSalesExcel'

export type SalesOrderForExcelExport = {
  created_at: string
  invoice_number?: string | null
  sat_invoice_number?: string | null
  status: string
  subtotal?: number | null
  tax_amount?: number | null
  total_amount?: number | null
  payment_method?: string | null
  internal_notes?: string | null
  customer_notes?: string | null
  customer?: {
    commercial_name?: string | null
    tax_id_nit?: string | null
  } | null
  fiscal_withholding?: {
    isWithholdingAgent: boolean
    withholdingRate: number
    ivaWithholdingAmount: number
    netAfterIvaWithholding: number
  } | null
  sales_rep?: { full_name?: string | null } | null
  items?: Array<{
    serial_number?: string | null
    asset?: { serial_number?: string | null } | null
  }> | null
}

function formatInvoiceLabel(invoiceNumber?: string | null): string {
  const v = (invoiceNumber || '').trim()
  return v || ''
}

function formatSatInvoiceLabel(satNumber?: string | null): string {
  const v = (satNumber || '').trim()
  return v || ''
}

export function mapSalesOrderToExcelRow(order: SalesOrderForExcelExport): SalesExcelRow {
  const items = Array.isArray(order.items) ? order.items : []
  const channelInfo = formatSalesChannel(
    order.payment_method,
    order.internal_notes,
    order.customer_notes
  )
  const serials = items
    .map((it) => it.serial_number || it.asset?.serial_number || '')
    .filter(Boolean)
    .join(', ')
  const salesRep =
    order.sales_rep && typeof order.sales_rep === 'object'
      ? String(order.sales_rep.full_name || '')
      : ''

  const fiscal = order.fiscal_withholding
  const isAgent = fiscal?.isWithholdingAgent ?? false

  return {
    createdAt: new Date(order.created_at).toLocaleString('es-GT'),
    customerName: order.customer?.commercial_name || 'N/A',
    customerNit: order.customer?.tax_id_nit || '',
    invoiceNumber: formatInvoiceLabel(order.invoice_number),
    satInvoiceNumber: formatSatInvoiceLabel(order.sat_invoice_number),
    itemsCount: items.length,
    serials,
    channel: channelInfo.channel,
    channelDetail: channelInfo.detail,
    subtotal: Number(order.subtotal || 0),
    taxAmount: Number(order.tax_amount || 0),
    totalAmount: Number(order.total_amount || 0),
    isWithholdingAgent: isAgent,
    withholdingRate: fiscal?.withholdingRate ?? 0.15,
    ivaWithholdingAmount: fiscal?.ivaWithholdingAmount ?? 0,
    netAfterIvaWithholding:
      fiscal?.netAfterIvaWithholding ?? Number(order.total_amount || 0),
    status: formatSaleStatusLabel(order.status),
    salesRep,
  }
}