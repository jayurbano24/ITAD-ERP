/**
 * Exporta el historial de ventas filtrado a Excel.
 */

export type SalesExcelRow = {
  createdAt: string
  customerName: string
  customerNit: string
  invoiceNumber: string
  satInvoiceNumber: string
  itemsCount: number
  serials: string
  channel: string
  channelDetail: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: string
  salesRep: string
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
  'Fecha',
  'Cliente',
  'NIT',
  'Invoice',
  'Factura SAT',
  'Items',
  'Series',
  'Canal / forma de pago',
  'Detalle canal',
  'Subtotal',
  'IVA',
  'Total',
  'Estado',
  'Vendedor',
]

export async function downloadSalesHistoryExcel(
  rows: SalesExcelRow[],
  fileName?: string
): Promise<void> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ITAD-ERP'
  wb.created = new Date()

  const ws = wb.addWorksheet('Ventas', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const title = ws.addRow(HEADERS)
  title.height = 28
  HEADERS.forEach((_, idx) => {
    Object.assign(ws.getCell(1, idx + 1), styleHeader())
  })

  for (const r of rows) {
    const excelRow = ws.addRow([
      r.createdAt,
      r.customerName,
      r.customerNit,
      r.invoiceNumber,
      r.satInvoiceNumber,
      r.itemsCount,
      r.serials,
      r.channel,
      r.channelDetail,
      r.subtotal,
      r.taxAmount,
      r.totalAmount,
      r.status,
      r.salesRep,
    ])
    excelRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = {
        horizontal: col >= 10 && col <= 12 ? 'right' : col === 7 || col === 9 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: col === 7 || col === 9,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        left: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        right: { style: 'thin', color: { argb: 'FFB4B4B4' } },
      }
      if (col >= 10 && col <= 12) {
        cell.numFmt = '"Q"#,##0.00'
      }
    })
  }

  ;[14, 22, 12, 16, 18, 8, 28, 16, 28, 12, 12, 12, 12, 16].forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download =
    fileName || `Ventas-Remarketing-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
