import { formatSaleStatusLabel, formatSalesChannel } from '@/lib/ventas/salesChannel'
import {
  VISACUOTA_PUBLISHED_TABLE,
  computeVisacuotaSettlement,
  isVisacuotaPayment,
  parseVisacuotaInstallments,
} from '@/lib/ventas/visacuotaFees'
import { roundMoney } from '@/lib/ventas/quotationIva'
import type { SaleWithholdingExportFields } from '@/lib/fiscal/saleWithholdingExport'

export type SaleOrderForAdvancedExport = {
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
    is_iva_withholding_agent?: boolean | null
  } | null
  fiscal_withholding?: SaleWithholdingExportFields | null
  sales_rep?: { full_name?: string | null } | null
  items?: Array<{
    serial_number?: string | null
    asset?: { serial_number?: string | null } | null
  }> | null
}

export type SalesAdvancedExcelRow = {
  createdAt: string
  customerName: string
  customerNit: string
  invoiceNumber: string
  satInvoiceNumber: string
  itemsCount: number
  serials: string
  channel: string
  paymentMethodRaw: string
  installments: number | null
  commissionRate: number | null
  commissionRateLabel: string
  commissionAmount: number | null
  grossTotal: number
  netReceived: number
  subtotal: number
  taxAmount: number
  isWithholdingAgent: boolean
  withholdingRate: number
  ivaWithholdingAmount: number
  netAfterIvaWithholding: number
  netFinalEstimate: number
  status: string
  salesRep: string
  settlementNote: string
}

const PURPLE_HEADER = '5B2C6F'
const WHITE = 'FFFFFF'
const GREEN_HEADER = '1D6F42'

function styleHeader(argb: string) {
  return {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: `FF${argb}` },
    },
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 10, name: 'Calibri' },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
      left: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
      right: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
    },
  }
}

const DETAIL_HEADERS = [
  'Fecha',
  'Cliente',
  'NIT',
  'Invoice',
  'Factura SAT',
  'Items',
  'Series',
  'Forma de pago',
  'Cuotas Visacuota',
  '% Comisión',
  'Comisión (Q)',
  'Total cobrado (Q)',
  'Neto Visacuota (Q)',
  'Subtotal',
  'IVA',
  'Agente retenedor SAT',
  '% Ret. IVA',
  'Retención IVA (Q)',
  'Neto post retención (Q)',
  'Neto final est. (Q)',
  'Estado',
  'Vendedor',
  'Notas liquidación',
]

export function saleOrderToAdvancedExcelRow(order: SaleOrderForAdvancedExport): SalesAdvancedExcelRow {
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

  const grossTotal = roundMoney(Number(order.total_amount || 0))
  const fiscal = order.fiscal_withholding
  const isAgent = fiscal?.isWithholdingAgent ?? false
  const withholdingRate = fiscal?.withholdingRate ?? 0.15
  const ivaWithholdingAmount = fiscal?.ivaWithholdingAmount ?? 0
  const netAfterIvaWithholding = fiscal?.netAfterIvaWithholding ?? grossTotal

  const isVisa = isVisacuotaPayment(order.payment_method)
  const installments = parseVisacuotaInstallments(order.payment_method, order.internal_notes)

  let commissionRate: number | null = null
  let commissionRateLabel = ''
  let commissionAmount: number | null = null
  let netReceived = grossTotal
  let settlementNote = isVisa ? 'Sin plazo en notas — revise comisión manual' : 'Sin comisión POS'

  if (isVisa && installments) {
    const settlement = computeVisacuotaSettlement(grossTotal, installments)
    commissionRate = settlement.commissionRate
    commissionRateLabel = settlement.commissionRateLabel
    commissionAmount = settlement.commissionAmount
    netReceived = settlement.netAmount
    settlementNote =
      settlement.rateKind === 'interpolated'
        ? 'Tasa estimada (plazo sin tarifa publicada)'
        : 'Tarifa publicada Visacuotas'
  } else if (isVisa && !installments) {
    commissionRateLabel = '—'
    settlementNote = 'Visacuota sin # cuotas en notas internas'
  }

  const visaFee = commissionAmount ?? 0
  const netFinalEstimate = roundMoney(
    Math.max(0, grossTotal - ivaWithholdingAmount - (isVisa ? visaFee : 0))
  )
  if (isAgent && isVisa) {
    settlementNote = `${settlementNote} · Incluye retención IVA y comisión Visacuota`
  } else if (isAgent) {
    settlementNote = 'Retención IVA 15% del IVA (agente retenedor SAT)'
  }

  return {
    createdAt: new Date(order.created_at).toLocaleString('es-GT'),
    customerName: order.customer?.commercial_name || 'N/A',
    customerNit: order.customer?.tax_id_nit || '',
    invoiceNumber: (order.invoice_number || '').trim(),
    satInvoiceNumber: (order.sat_invoice_number || '').trim(),
    itemsCount: items.length,
    serials,
    channel: channelInfo.channel,
    paymentMethodRaw: (order.payment_method || '').trim() || channelInfo.channel,
    installments: isVisa ? installments : null,
    commissionRate,
    commissionRateLabel: isVisa ? commissionRateLabel : '',
    commissionAmount: isVisa ? commissionAmount : null,
    grossTotal,
    netReceived: isVisa ? netReceived : grossTotal,
    subtotal: Number(order.subtotal || 0),
    taxAmount: Number(order.tax_amount || 0),
    isWithholdingAgent: isAgent,
    withholdingRate: isAgent ? withholdingRate : 0,
    ivaWithholdingAmount,
    netAfterIvaWithholding,
    netFinalEstimate,
    status: formatSaleStatusLabel(order.status),
    salesRep,
    settlementNote,
  }
}

export async function downloadSalesAdvancedExcel(
  rows: SalesAdvancedExcelRow[],
  fileName?: string
): Promise<void> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ITAD-ERP'
  wb.created = new Date()

  const ws = wb.addWorksheet('Ventas avanzado', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const title = ws.addRow(DETAIL_HEADERS)
  title.height = 28
  DETAIL_HEADERS.forEach((_, idx) => {
    Object.assign(ws.getCell(1, idx + 1), styleHeader(PURPLE_HEADER))
  })

  let sumGrossVisa = 0
  let sumCommission = 0
  let sumNetVisa = 0
  let countVisa = 0
  let countAgents = 0
  let sumWithholding = 0
  let sumNetAfterWithholding = 0

  for (const r of rows) {
    const isVisa = r.channel === 'Visacuota'
    if (isVisa) {
      countVisa++
      sumGrossVisa += r.grossTotal
      sumCommission += r.commissionAmount ?? 0
      sumNetVisa += r.netReceived
    }
    if (r.isWithholdingAgent) {
      countAgents++
      sumWithholding += r.ivaWithholdingAmount
      sumNetAfterWithholding += r.netAfterIvaWithholding
    }

    const excelRow = ws.addRow([
      r.createdAt,
      r.customerName,
      r.customerNit,
      r.invoiceNumber,
      r.satInvoiceNumber,
      r.itemsCount,
      r.serials,
      r.channel,
      r.installments ?? '',
      r.commissionRateLabel || (r.commissionRate != null ? `${(r.commissionRate * 100).toFixed(2)}%` : ''),
      r.commissionAmount ?? '',
      r.grossTotal,
      r.netReceived,
      r.subtotal,
      r.taxAmount,
      r.isWithholdingAgent ? 'Sí' : 'No',
      r.isWithholdingAgent ? r.withholdingRate : '',
      r.ivaWithholdingAmount || '',
      r.netAfterIvaWithholding,
      r.netFinalEstimate,
      r.status,
      r.salesRep,
      r.settlementNote,
    ])
    const moneyCols = [11, 12, 13, 14, 15, 18, 19, 20]
    excelRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = {
        horizontal:
          moneyCols.includes(col) || col === 17
            ? 'right'
            : col === 7 || col === 23
              ? 'left'
              : 'center',
        vertical: 'middle',
        wrapText: col === 7 || col === 23,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        left: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        right: { style: 'thin', color: { argb: 'FFB4B4B4' } },
      }
      if (col === 17 && r.isWithholdingAgent) {
        cell.numFmt = '0.00%'
      } else if (moneyCols.includes(col)) {
        cell.numFmt = '"Q"#,##0.00'
      }
    })
  }

  if (rows.length > 0) {
    const totals = ws.addRow([
      'TOTALES',
      '',
      '',
      '',
      '',
      '',
      '',
      'Resumen',
      `${countVisa} Visa · ${countAgents} ret.`,
      '',
      roundMoney(sumCommission),
      roundMoney(sumGrossVisa),
      roundMoney(sumNetVisa),
      '',
      '',
      '',
      '',
      roundMoney(sumWithholding),
      roundMoney(sumNetAfterWithholding),
      '',
      '',
      '',
      `Visacuota: ${countVisa} · Agentes retenedores: ${countAgents}`,
    ])
    totals.font = { bold: true, name: 'Calibri', size: 10 }
    totals.eachCell({ includeEmpty: true }, (cell, col) => {
      if ([11, 12, 13, 18, 19].includes(col)) cell.numFmt = '"Q"#,##0.00'
    })
  }

  ;[14, 22, 12, 14, 16, 8, 28, 14, 12, 11, 12, 14, 14, 12, 12, 14, 10, 14, 16, 16, 12, 14, 32].forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  const wsRates = wb.addWorksheet('Tarifas Visacuota', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  const rateHeaders = ['Plazo', 'Comisión publicada', 'Notas']
  const rateTitle = wsRates.addRow(rateHeaders)
  rateTitle.height = 24
  rateHeaders.forEach((_, idx) => {
    Object.assign(wsRates.getCell(1, idx + 1), styleHeader(GREEN_HEADER))
  })
  for (const row of VISACUOTA_PUBLISHED_TABLE) {
    const r = wsRates.addRow([
      `${row.installments} cuotas`,
      row.rate,
      row.note || '',
    ])
    r.getCell(2).numFmt = '0.00%'
  }
  wsRates.getColumn(1).width = 16
  wsRates.getColumn(2).width = 20
  wsRates.getColumn(3).width = 28
  wsRates.addRow([])
  wsRates.addRow([
    'Otros plazos en POS',
    'Interpolación',
    'Entre plazos publicados (marcado como est.)',
  ])

  const byPlazo = new Map<number, { count: number; gross: number; commission: number; net: number }>()
  for (const r of rows) {
    if (r.channel !== 'Visacuota' && r.installments == null) continue
    const key = r.installments ?? 0
    const prev = byPlazo.get(key) || { count: 0, gross: 0, commission: 0, net: 0 }
    prev.count++
    prev.gross += r.grossTotal
    prev.commission += r.commissionAmount ?? 0
    prev.net += r.netReceived
    byPlazo.set(key, prev)
  }

  const wsSum = wb.addWorksheet('Resumen Visacuota')
  const sumHeaders = ['Cuotas', 'Ventas', 'Total cobrado', 'Comisión est.', 'Neto est.']
  const sumTitle = wsSum.addRow(sumHeaders)
  sumTitle.height = 24
  sumHeaders.forEach((_, idx) => {
    Object.assign(wsSum.getCell(1, idx + 1), styleHeader(GREEN_HEADER))
  })
  const plazos = Array.from(byPlazo.entries()).sort((a, b) => a[0] - b[0])
  for (const [cuotas, agg] of plazos) {
    const row = wsSum.addRow([
      cuotas > 0 ? cuotas : 'Sin plazo',
      agg.count,
      roundMoney(agg.gross),
      roundMoney(agg.commission),
      roundMoney(agg.net),
    ])
    row.eachCell((cell, col) => {
      if (col >= 3) cell.numFmt = '"Q"#,##0.00'
    })
  }
  ;[14, 10, 16, 16, 16].forEach((w, i) => {
    wsSum.getColumn(i + 1).width = w
  })

  const wsRet = wb.addWorksheet('Resumen retenedores')
  const retHeaders = ['Concepto', 'Ventas', 'Total facturado', 'IVA venta', 'Retención IVA', 'Neto a cobrar']
  const retTitle = wsRet.addRow(retHeaders)
  retTitle.height = 24
  retHeaders.forEach((_, idx) => {
    Object.assign(wsRet.getCell(1, idx + 1), styleHeader(GREEN_HEADER))
  })
  const agentRows = rows.filter((r) => r.isWithholdingAgent)
  if (agentRows.length > 0) {
    const totalGross = agentRows.reduce((s, r) => s + r.grossTotal, 0)
    const totalIva = agentRows.reduce((s, r) => s + r.taxAmount, 0)
    const totalRet = agentRows.reduce((s, r) => s + r.ivaWithholdingAmount, 0)
    const totalNet = agentRows.reduce((s, r) => s + r.netAfterIvaWithholding, 0)
  const summaryRow = wsRet.addRow([
      'Agentes retenedores SAT',
      agentRows.length,
      roundMoney(totalGross),
      roundMoney(totalIva),
      roundMoney(totalRet),
      roundMoney(totalNet),
    ])
    summaryRow.eachCell((cell, col) => {
      if (col >= 3) cell.numFmt = '"Q"#,##0.00'
    })
    wsRet.addRow([])
    wsRet.addRow([
      'Fórmula',
      '',
      '',
      '',
      '% del IVA (config. empresa)',
      'Total − retención',
    ])
  } else {
    wsRet.addRow(['Sin ventas a agentes retenedores en este export', '', '', '', '', ''])
  }
  ;[28, 10, 16, 14, 16, 16].forEach((w, i) => {
    wsRet.getColumn(i + 1).width = w
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download =
    fileName || `Ventas-Avanzado-Visacuota-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}