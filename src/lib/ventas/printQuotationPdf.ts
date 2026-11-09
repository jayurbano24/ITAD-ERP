import type { SalesQuotation } from '@/app/dashboard/ventas/cotizaciones/actions'
import { TECHCORPS_HEADER_CONTACT_LINES, TECHCORPS_LETTERHEAD } from '@/lib/ventas/techcorpsLetterhead'
import { formatQuotationPaymentMethod } from '@/lib/ventas/quotationMeta'
import { formatQuotationStatus } from '@/lib/ventas/quotationStatus'
import { QUOTATION_IVA_RATE } from '@/lib/ventas/quotationIva'

/** RGB corporativo (azul TECHCORPS) */
const BRAND = { r: 26, g: 45, b: 105 } as const
const MUTED = { r: 75, g: 85, b: 99 } as const

import type { QuotationIvaTotals, QuotationTotalsView } from '@/lib/ventas/quotationIva'

export type { QuotationIvaTotals }

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

export function buildQuotationPrintPayload(
  quotation: SalesQuotation,
  includesIva: boolean,
  iva: QuotationTotalsView
): QuotationPrintPayload {
  const email =
    quotation.recipient_email?.trim() ||
    quotation.customer?.email?.trim() ||
    ''
  return {
    quoteNumber: quotation.quote_number,
    title: quotation.title,
    status: quotation.status,
    createdAt: new Date(quotation.created_at).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    customerName: quotation.customer?.commercial_name || '—',
    nit: quotation.customer?.tax_id_nit || '—',
    phone: quotation.customer?.phone || '—',
    email: email || '—',
    address: quotation.customer?.address || '—',
    paymentMethod: quotation.payment_method,
    solicitanteLabel: solicitanteLabel(quotation),
    sellerName: quotation.creator?.full_name || '—',
    pricesIncludeIva: includesIva,
    subtotal: iva.subtotal,
    taxAmount: iva.tax_amount,
    total: iva.total,
    subtotalBeforeDiscount: iva.subtotalBeforeDiscount,
    discountApplied: iva.discountApplied,
    discountNote: quotation.discount_note,
    notes: quotation.description,
    items: (quotation.items ?? []).map((item) => ({
      description: item.description,
      serial: item.serial_number || '—',
      brandModel: [item.manufacturer, item.model].filter(Boolean).join(' · ') || '—',
      condition: item.condition?.trim() || '',
      qty: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
  }
}

export type QuotationPrintPayload = {
  quoteNumber: string
  title: string
  status: string
  createdAt: string
  customerName: string
  nit: string
  phone: string
  email: string
  address: string
  paymentMethod: string | null | undefined
  solicitanteLabel: string
  sellerName: string
  pricesIncludeIva: boolean
  subtotal: number
  taxAmount: number
  total: number
  subtotalBeforeDiscount: number
  discountApplied: number
  discountNote?: string | null
  notes?: string | null
  items: Array<{
    description: string
    serial: string
    brandModel: string
    condition: string
    qty: number
    unitPrice: number
    lineTotal: number
  }>
}

function formatQ(amount: number): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount)
}

const PDF_FOOT_FILL = [249, 250, 251] as const

type PdfFootCell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> }

/** Pie de tabla: 4 cols vacías + etiqueta (Precio) + monto (Subtotal), alineado al cuerpo. */
function pdfFootAmountRow(
  label: string,
  amount: string,
  extra?: { label?: Record<string, unknown>; amount?: Record<string, unknown> }
): PdfFootCell[] {
  return [
    {
      content: '',
      colSpan: 4,
      styles: { fillColor: PDF_FOOT_FILL, minCellHeight: 6, valign: 'middle' },
    },
    {
      content: label,
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: PDF_FOOT_FILL,
        ...(extra?.label ?? {}),
      },
    },
    {
      content: amount,
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: PDF_FOOT_FILL,
        ...(extra?.amount ?? {}),
      },
    },
  ]
}

type LogoAsset = {
  dataUrl: string
  aspect: number
}

async function loadLogoForPdf(): Promise<LogoAsset | null> {
  if (typeof window === 'undefined') return null
  const src = TECHCORPS_LETTERHEAD.logoPrintSrc || TECHCORPS_LETTERHEAD.logoSrc
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('logo load failed'))
    })
    img.src = src
    await loaded
    const w = img.naturalWidth || 520
    const h = img.naturalHeight || 284
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return {
      dataUrl: canvas.toDataURL('image/png'),
      aspect: w / h,
    }
  } catch {
    try {
      const res = await fetch(src)
      if (!res.ok) return null
      const blob = await res.blob()
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
      if (!dataUrl) return null
      return { dataUrl, aspect: 520 / 284 }
    } catch {
      return null
    }
  }
}

export function quotationPdfFileName(quoteNumber: string): string {
  const safeNum = quoteNumber.replace(/[^a-zA-Z0-9-]/g, '_')
  return `Cotizacion-${safeNum}.pdf`
}

function drawPdfFooter(doc: import('jspdf').jsPDF, marginX: number, pageW: number) {
  const pageH = doc.internal.pageSize.getHeight()
  const y = pageH - 10
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(marginX, y - 4, pageW - marginX, y - 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text(
    `${TECHCORPS_LETTERHEAD.legalName} · ${TECHCORPS_LETTERHEAD.phonesDisplay} · ${TECHCORPS_LETTERHEAD.email}`,
    pageW / 2,
    y,
    { align: 'center' }
  )
}

async function buildWatermarkDataUrl(logo: LogoAsset): Promise<string> {
  return await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(logo.dataUrl)
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 0.045
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(logo.dataUrl)
    img.src = logo.dataUrl
  })
}

async function drawWatermark(doc: import('jspdf').jsPDF, logo: LogoAsset | null) {
  if (!logo) return
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const wmH = 34
  const wmW = wmH * logo.aspect
  const faint = await buildWatermarkDataUrl(logo)
  doc.addImage(faint, 'PNG', (pageW - wmW) / 2, (pageH - wmH) / 2, wmW, wmH, undefined, 'FAST')
}

const PDF_INFO_FONT = 7
const PDF_INFO_LINE = 3.25

function labeledLine(
  doc: import('jspdf').jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number
): number {
  const text = (value || '—').trim() || '—'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(PDF_INFO_FONT)
  doc.setTextColor(30, 30, 30)
  const prefix = `${label}: `
  const prefixW = doc.getTextWidth(prefix)
  doc.text(prefix, x, y)
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(text, Math.max(16, w - prefixW))
  if (lines.length === 1) {
    doc.text(lines[0], x + prefixW, y)
    return y + PDF_INFO_LINE + 0.5
  }
  doc.text(lines[0], x + prefixW, y)
  let ly = y + PDF_INFO_LINE
  for (let i = 1; i < lines.length; i++) {
    ly += PDF_INFO_LINE
    doc.text(lines[i], x + prefixW, ly)
  }
  return ly + 1
}

/** Misma estructura que la vista en pantalla / captura de referencia */
export async function renderQuotationPdfDocument(
  payload: QuotationPrintPayload
): Promise<import('jspdf').jsPDF> {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 12
  const contentW = pageW - marginX * 2

  const logo = await loadLogoForPdf()
  await drawWatermark(doc, logo)

  let y = 10
  const logoH = 11
  const logoW = logo ? logoH * logo.aspect : 0
  if (logo) {
    doc.addImage(logo.dataUrl, 'PNG', marginX, y - 1, logoW, logoH, undefined, 'SLOW')
  }

  const headTextX = marginX + (logo ? logoW + 4 : 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
  doc.text(TECHCORPS_LETTERHEAD.legalName, headTextX, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  const contactW = contentW - (logoW + 4)
  let contactY = y + 8.5
  for (const line of TECHCORPS_HEADER_CONTACT_LINES) {
    const wrapped = doc.splitTextToSize(line, contactW)
    doc.text(wrapped, headTextX, contactY)
    contactY += wrapped.length * 3.2 + 0.8
  }

  y = Math.max(y + (logo ? 16 : 10), contactY + 2)
  doc.setDrawColor(200, 200, 200)
  doc.line(marginX, y, marginX + contentW, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 17, 17)
  doc.text(payload.title, marginX, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
  doc.text(payload.quoteNumber, pageW - marginX, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text(formatQuotationStatus(payload.status), pageW - marginX, y + 4.5, { align: 'right' })
  y += 11

  const gap = 3
  const colW = (contentW - gap) / 2
  const blockTop = y
  const innerPad = 2.5
  const titleH = 5
  const blockPadBottom = 2

  const clientLines = [
    ['Nombre', payload.customerName],
    ['NIT', payload.nit],
    ['Teléfono', payload.phone],
    ['Correo envío', payload.email],
    ['Dirección', payload.address],
  ] as const
  const opLines = [
    ['Creado', payload.createdAt],
    ['Vendedor', payload.sellerName],
    ['Solicitante', payload.solicitanteLabel],
    ['Pago', formatQuotationPaymentMethod(payload.paymentMethod)],
  ] as const

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(PDF_INFO_FONT)
  const measureCol = (lines: readonly (readonly [string, string])[]) => {
    let contentH = 0
    for (const [label, value] of lines) {
      doc.setFont('helvetica', 'bold')
      const prefixW = doc.getTextWidth(`${label}: `)
      doc.setFont('helvetica', 'normal')
      const wrapped = doc.splitTextToSize((value || '—').trim() || '—', Math.max(16, colW - innerPad * 2 - prefixW))
      contentH += Math.max(1, wrapped.length) * PDF_INFO_LINE + 0.5
    }
    return titleH + contentH + blockPadBottom
  }
  const clientBlockH = measureCol(clientLines)
  const opBlockH = measureCol(opLines)

  const drawGreyBlock = (x: number, title: string, blockH: number) => {
    doc.setFillColor(248, 249, 251)
    doc.setDrawColor(220, 224, 230)
    doc.roundedRect(x, blockTop, colW, blockH, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.text(title.toUpperCase(), x + innerPad, blockTop + 3.8)
  }

  drawGreyBlock(marginX, 'Cliente', clientBlockH)
  drawGreyBlock(marginX + colW + gap, 'Operación', opBlockH)

  let cy = blockTop + titleH + 1
  for (const [label, value] of clientLines) {
    cy = labeledLine(doc, label, value, marginX + innerPad, cy, colW - innerPad * 2)
  }

  let oy = blockTop + titleH + 1
  for (const [label, value] of opLines) {
    oy = labeledLine(doc, label, value, marginX + colW + gap + innerPad, oy, colW - innerPad * 2)
  }

  y = blockTop + Math.max(clientBlockH, opBlockH) + 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text('EQUIPOS COTIZADOS', marginX, y)
  y += 4

  autoTable(doc, {
    startY: y,
    tableWidth: contentW,
    head: [['Descripción', 'Serie', 'Marca / modelo', 'Cant.', 'Precio', 'Subtotal']],
    body: payload.items.map((row) => [
      row.description,
      row.serial,
      row.brandModel,
      String(row.qty),
      formatQ(row.unitPrice),
      formatQ(row.lineTotal),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
      valign: 'middle',
      halign: 'center',
      textColor: [30, 30, 30],
      fillColor: [255, 255, 255],
      lineColor: [200, 200, 200],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [248, 249, 251],
      textColor: [90, 90, 90],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: contentW * 0.28, halign: 'left' },
      1: { cellWidth: contentW * 0.14, halign: 'center', textColor: [BRAND.r, BRAND.g, BRAND.b] },
      2: { cellWidth: contentW * 0.24, halign: 'center' },
      3: { halign: 'center', cellWidth: contentW * 0.08 },
      4: { halign: 'center', cellWidth: contentW * 0.13 },
      5: { halign: 'center', cellWidth: contentW * 0.13, fontStyle: 'bold' },
    },
    foot: [
      ...(payload.discountApplied > 0 ?
        [
          pdfFootAmountRow('Subtotal equipos (sin IVA)', formatQ(payload.subtotalBeforeDiscount)),
          pdfFootAmountRow('Descuento', `- ${formatQ(payload.discountApplied)}`, {
            label: { textColor: [180, 50, 50] },
            amount: { textColor: [180, 50, 50], fontStyle: 'normal' },
          }),
        ]
      : []),
      pdfFootAmountRow('Subtotal sin IVA', formatQ(payload.subtotal)),
      pdfFootAmountRow(`IVA (${Math.round(QUOTATION_IVA_RATE * 100)}%)`, formatQ(payload.taxAmount)),
      pdfFootAmountRow('Total con IVA', formatQ(payload.total), {
        label: { fontStyle: 'bold' },
        amount: { fontStyle: 'bold', textColor: [5, 120, 72] },
      }),
    ],
    footStyles: { fontSize: 7.5, textColor: [80, 80, 80], valign: 'middle', cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 } },
    margin: { left: marginX, right: marginX },
    didDrawPage: () => drawPdfFooter(doc, marginX, pageW),
  })

  const tableEnd = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
  y = (tableEnd ?? y) + 6

  if (payload.notes?.trim()) {
    y += 4
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Notas', marginX, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    doc.text(doc.splitTextToSize(payload.notes.trim(), contentW), marginX, y + 4.5)
  }

  drawPdfFooter(doc, marginX, pageW)
  return doc
}

export async function buildQuotationPdfBlob(payload: QuotationPrintPayload): Promise<Blob> {
  const doc = await renderQuotationPdfDocument(payload)
  return doc.output('blob')
}

export async function downloadQuotationPdf(payload: QuotationPrintPayload): Promise<void> {
  const doc = await renderQuotationPdfDocument(payload)
  doc.save(quotationPdfFileName(payload.quoteNumber))
}
