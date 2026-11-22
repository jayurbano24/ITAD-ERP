/**
 * Exporta el listado de cotizaciones (filtro actual) a Excel.
 */

import type { SalesQuotation } from '@/app/dashboard/ventas/cotizaciones/actions'
import { formatQuotationPaymentMethod } from '@/lib/ventas/quotationMeta'
import { formatQuotationStatus } from '@/lib/ventas/quotationStatus'

export type QuotationExcelRow = {
  quoteNumber: string
  createdBy: string
  solicitante: string
  customerNit: string
  customerPhone: string
  paymentMethod: string
  amount: number | null
  subtotal: number | null
  taxAmount: number | null
  status: string
  warrantyDays: number | null
  createdAt: string
  itemsCount: number
}

const PURPLE_HEADER = '5B2C6F'
const WHITE = 'FFFFFF'

function styleHeader() {
  return {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: `FF${PURPLE_HEADER}` },
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

const HEADERS = [
  'Número',
  'Creado por',
  'Solicitante',
  'NIT cliente',
  'Teléfono',
  'Método pago',
  'Monto',
  'Subtotal',
  'IVA',
  'Estado',
  'Días garantía',
  'Fecha',
  'Líneas',
]

function solicitanteLabel(row: SalesQuotation): string {
  if (row.solicitante_tipo === 'empresa') {
    const company = row.solicitante_empresa?.trim()
    const contact = row.solicitante_contacto?.trim()
    if (company && contact) return `${company} · ${contact}`
    return company || contact || 'Empresa'
  }
  if (row.solicitante_tipo === 'cliente_final') {
    return row.customer?.commercial_name
      ? `Cliente final · ${row.customer.commercial_name}`
      : 'Cliente final'
  }
  return row.customer?.commercial_name || '—'
}

function formatFechaExport(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function quotationToExcelRow(row: SalesQuotation): QuotationExcelRow {
  return {
    quoteNumber: row.quote_number,
    createdBy: row.creator?.full_name?.trim() || '—',
    solicitante: solicitanteLabel(row),
    customerNit: row.customer?.tax_id_nit?.trim() || '—',
    customerPhone: row.customer?.phone?.trim() || '—',
    paymentMethod: formatQuotationPaymentMethod(row.payment_method) || '—',
    amount: row.amount ?? null,
    subtotal: row.subtotal ?? null,
    taxAmount: row.tax_amount ?? null,
    status: formatQuotationStatus(row.status),
    warrantyDays: row.warranty_days ?? null,
    createdAt: formatFechaExport(row.created_at),
    itemsCount: row.items?.length ?? 0,
  }
}

export async function downloadQuotationsExcel(
  rows: QuotationExcelRow[],
  fileName?: string
): Promise<void> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ITAD-ERP'
  wb.created = new Date()

  const ws = wb.addWorksheet('Cotizaciones', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const title = ws.addRow(HEADERS)
  title.height = 28
  HEADERS.forEach((_, idx) => {
    Object.assign(ws.getCell(1, idx + 1), styleHeader())
  })

  for (const r of rows) {
    const excelRow = ws.addRow([
      r.quoteNumber,
      r.createdBy,
      r.solicitante,
      r.customerNit,
      r.customerPhone,
      r.paymentMethod,
      r.amount ?? '',
      r.subtotal ?? '',
      r.taxAmount ?? '',
      r.status,
      r.warrantyDays ?? '',
      r.createdAt,
      r.itemsCount,
    ])
    excelRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = {
        horizontal:
          col >= 7 && col <= 9 ? 'right' : col === 3 || col === 4 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: col === 3,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        left: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        right: { style: 'thin', color: { argb: 'FFB4B4B4' } },
      }
      if (col >= 7 && col <= 9 && typeof cell.value === 'number') {
        cell.numFmt = '"Q"#,##0.00'
      }
    })
  }

  ;[14, 18, 28, 14, 14, 14, 12, 12, 12, 14, 12, 18, 8].forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = fileName || `Cotizaciones-${stamp}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
