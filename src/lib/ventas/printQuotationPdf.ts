import type { SalesQuotation } from '@/app/dashboard/ventas/cotizaciones/actions'
import { TECHCORPS_HEADER_CONTACT_LINES, TECHCORPS_LETTERHEAD } from '@/lib/ventas/techcorpsLetterhead'
import { formatQuotationPaymentMethod } from '@/lib/ventas/quotationMeta'
import { formatQuotationStatus } from '@/lib/ventas/quotationStatus'
import { QUOTATION_IVA_RATE } from '@/lib/ventas/quotationIva'
import type { WarrantyPrintPayload } from '@/lib/ventas/printWarrantyPolicy'
import { appendWarrantyPolicyPageToDocument } from '@/lib/ventas/printWarrantyPolicy'
import {
  drawHelveticaMultiline,
  sanitizeTextForHelveticaPdf,
} from '@/lib/ventas/pdfHelveticaText'
import { resolveCode128BarcodeDataUrl } from '@/lib/ventas/code128Barcode'
import {
  clampWarrantyDays,
  DEFAULT_WARRANTY_DAYS,
  warrantyEndLabelFromBase,
} from '@/lib/ventas/warrantyOptions'

/** RGB corporativo (azul TECHCORPS) */
const BRAND = { r: 26, g: 45, b: 105 } as const
const MUTED = { r: 75, g: 85, b: 99 } as const

import type { QuotationIvaTotals, QuotationTotalsView } from '@/lib/ventas/quotationIva'

export type { QuotationIvaTotals }

function quotationPdfDashValue(value: string): string {
  const v = value.trim()
  return v === '—' || !v ? '' : v
}

export function formatQuotationItemGrade(condition?: string | null): string {
  if (!condition?.trim()) return '—'
  const g = condition.trim()
  if (/^grade\s*a$/i.test(g) || g === 'A') return 'Grado A'
  if (/^grade\s*b$/i.test(g) || g === 'B') return 'Grado B'
  if (/^grade\s*c$/i.test(g) || g === 'C') return 'Grado C'
  if (/scrap|grade\s*d/i.test(g)) return 'Grado D / Scrap'
  if (/^grado\b/i.test(g)) return g
  const m = g.match(/\bgrade\s*([a-d])\b/i)
  if (m) return `Grado ${m[1].toUpperCase()}`
  return g
}

function buildWarrantyPayloadFromQuotation(payload: QuotationPrintPayload): WarrantyPrintPayload {
  const quoteDate = payload.createdAt || new Date().toLocaleDateString('es-GT')
  const saleDay = quoteDate.includes(',') ? quoteDate.split(',')[0].trim() : quoteDate
  const warrantyDays = clampWarrantyDays(payload.warrantyDays ?? DEFAULT_WARRANTY_DAYS)
  const base = new Date()
  const parsed = Date.parse(saleDay)
  if (Number.isFinite(parsed)) {
    base.setTime(parsed)
  }

  return {
    customerName: payload.customerName,
    taxId: quotationPdfDashValue(payload.nit) || 'CF',
    phone: quotationPdfDashValue(payload.phone) || null,
    email: quotationPdfDashValue(payload.email) || null,
    policyNumber: payload.quoteNumber,
    saleDate: saleDay,
    deliveryDate: 'Al aceptar cotización',
    warrantyEnd: warrantyEndLabelFromBase(base, warrantyDays),
    warrantyDays,
    items: payload.items.map((item) => ({
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: '__________',
      grade: item.grade,
    })),
    commentsDetail: payload.notes
      ? sanitizeTextForHelveticaPdf(
          formatQuotationPlainTextForPdf(payload.notes).replace(/^- /gm, '')
        )
      : null,
  }
}

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
    warrantyDays: clampWarrantyDays(quotation.warranty_days ?? DEFAULT_WARRANTY_DAYS),
    items: (quotation.items ?? []).map((item) => ({
      manufacturer: item.manufacturer?.trim() || '—',
      model: item.model?.trim() || '—',
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
  warrantyDays?: number
  items: Array<{
    manufacturer: string
    model: string
    qty: number
    unitPrice: number
    lineTotal: number
  }>
}

function formatQ(amount: number): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount)
}

/** Texto de una celda (sin forzar viñetas por línea). */
function formatQuotationPlainTextForPdf(input: string): string {
  return sanitizeTextForHelveticaPdf(input)
}

/** Notas multilínea: viñeta ASCII compatible con Helvetica. */
export function formatQuotationNotesForPdf(input: string): string {
  return formatQuotationPlainTextForPdf(input)
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t) return ''
      if (/^[-–—]\s/.test(t)) return t.replace(/^–|—/, '-')
      return `- ${t}`
    })
    .filter(Boolean)
    .join('\n')
}

export function formatQuotationNotesForDisplay(input: string): string {
  return formatQuotationNotesForPdf(input).replace(/^- /gm, '• ')
}

const PDF_FOOT_FILL = [255, 255, 255] as const

type PdfFootCell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> }

/** Pie de tabla: (N−2) cols vacías + etiqueta + monto en las dos últimas columnas. */
const QUOTATION_TABLE_COLS = 5

function pdfFootAmountRow(
  label: string,
  amount: string,
  extra?: { label?: Record<string, unknown>; amount?: Record<string, unknown> }
): PdfFootCell[] {
  return [
    {
      content: '',
      colSpan: QUOTATION_TABLE_COLS - 2,
      styles: { fillColor: PDF_FOOT_FILL, minCellHeight: 8, valign: 'middle' },
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

async function loadImageAsset(src: string, fallbackAspect = 2): Promise<LogoAsset | null> {
  if (typeof window === 'undefined') return null
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image load failed'))
    })
    img.src = src
    await loaded
    const w = img.naturalWidth || 1200
    const h = img.naturalHeight || Math.round(w / fallbackAspect)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return { dataUrl: canvas.toDataURL('image/png'), aspect: w / h }
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
      return { dataUrl, aspect: fallbackAspect }
    } catch {
      return null
    }
  }
}

async function loadLogoForPdf(): Promise<LogoAsset | null> {
  if (typeof window === 'undefined') return null
  const src = TECHCORPS_LETTERHEAD.logoPrintSrc || TECHCORPS_LETTERHEAD.logoSrc
  return loadImageAsset(src, 520 / 284)
}

function trimImageCanvasWhitespace(canvas: HTMLCanvasElement): LogoAsset | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  const isContentPixel = (i: number) => {
    const a = data[i + 3]
    if (a < 12) return false
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > 248 && g > 248 && b > 248) return false
    const spread = Math.max(r, g, b) - Math.min(r, g, b)
    const avg = (r + g + b) / 3
    // Gutter claro y gris uniforme del PNG del pie (no contenido).
    if (spread < 10 && avg > 224) return false
    return true
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (!isContentPixel(i)) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < minX || maxY < minY) {
    return { dataUrl: canvas.toDataURL('image/png'), aspect: width / height }
  }
  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const trimmed = document.createElement('canvas')
  trimmed.width = cw
  trimmed.height = ch
  const tctx = trimmed.getContext('2d')
  if (!tctx) return null
  tctx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch)
  return { dataUrl: trimmed.toDataURL('image/png'), aspect: cw / ch }
}

async function loadCertFooterForPdf(): Promise<LogoAsset | null> {
  const asset = await loadImageAsset(TECHCORPS_LETTERHEAD.certFooterSrc, 1200 / 72)
  if (!asset || typeof document === 'undefined') return asset
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('footer load failed'))
      img.src = asset.dataUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return asset
    ctx.drawImage(img, 0, 0)
    return trimImageCanvasWhitespace(canvas) ?? asset
  } catch {
    return asset
  }
}

export function quotationPdfFileName(quoteNumber: string): string {
  const safeNum = quoteNumber.replace(/[^a-zA-Z0-9-]/g, '_')
  return `Cotizacion-${safeNum}.pdf`
}

function drawPdfFooter(
  doc: import('jspdf').jsPDF,
  marginX: number,
  pageW: number,
  pageNum: number,
  certFooter: LogoAsset | null,
  certFooterTopY?: number | null
) {
  const pageH = doc.internal.pageSize.getHeight()

  if (pageNum === 1 && certFooter) {
    const x = marginX
    const fw = pageW - marginX * 2
    const fh = fw / certFooter.aspect
    const minY = 4
    const maxY = pageH - fh - minY
    const y =
      certFooterTopY != null
        ? Math.min(Math.max(certFooterTopY, minY), maxY)
        : maxY
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.15)
    doc.line(x, y - 2, pageW - marginX, y - 2)
    doc.addImage(certFooter.dataUrl, 'PNG', x, y, fw, fh, undefined, 'FAST')
    return
  }

  const y = pageH - 10
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(marginX, y - 4, pageW - marginX, y - 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text(
    `${TECHCORPS_LETTERHEAD.legalName} · ${TECHCORPS_LETTERHEAD.phonesDisplay} · ${TECHCORPS_LETTERHEAD.websiteDisplay}`,
    pageW / 2,
    y,
    { align: 'center' }
  )
}

async function buildWatermarkDataUrl(logo: LogoAsset): Promise<string> {
  return await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const padRatio = 0.14
      const w = img.naturalWidth
      const h = img.naturalHeight
      const padX = Math.round(w * padRatio)
      const padY = Math.round(h * padRatio)
      const canvas = document.createElement('canvas')
      canvas.width = w + padX * 2
      canvas.height = h + padY * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(logo.dataUrl)
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 0.045
      ctx.drawImage(img, padX, padY, w, h)
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
  const margin = 16
  const footerReserve = 14
  const maxW = pageW - margin * 2
  const maxH = pageH - margin * 2 - footerReserve
  const paddedAspect = logo.aspect * (1 + 0.14 * 2)
  let wmH = Math.min(maxH * 0.52, 40)
  let wmW = wmH * paddedAspect
  if (wmW > maxW * 0.88) {
    wmW = maxW * 0.88
    wmH = wmW / paddedAspect
  }
  const faint = await buildWatermarkDataUrl(logo)
  const wmX = (pageW - wmW) / 2
  const wmY = Math.max(margin, (pageH - wmH) / 2 - 4)
  doc.addImage(faint, 'PNG', wmX, wmY, wmW, wmH, undefined, 'FAST')
}

const PDF_INFO_FONT = 8
const PDF_INFO_LINE = 3.55
const PDF_INFO_TITLE_FONT = 8.5
const PDF_INFO_LABEL_W_RATIO = 0.4

function infoRowMeasureHeight(
  doc: import('jspdf').jsPDF,
  value: string,
  w: number
): number {
  const labelW = w * PDF_INFO_LABEL_W_RATIO
  const valueW = Math.max(20, w - labelW - 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(PDF_INFO_FONT)
  const lines = doc.splitTextToSize((value || '—').trim() || '—', valueW)
  return Math.max(1, lines.length) * PDF_INFO_LINE + 0.85
}

/** Etiqueta a la izquierda, valor alineado a la derecha (como en pantalla). */
function infoRowTwoColumn(
  doc: import('jspdf').jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number
): number {
  const text = (value || '—').trim() || '—'
  const labelW = w * PDF_INFO_LABEL_W_RATIO
  const valueW = Math.max(20, w - labelW - 2)
  const rightX = x + w

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(PDF_INFO_FONT)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text(label, x, y)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 22, 22)
  const lines = doc.splitTextToSize(text, valueW) as string[]
  let cy = y
  for (const line of lines) {
    doc.text(line, rightX, cy, { align: 'right' })
    cy += PDF_INFO_LINE
  }
  return y + Math.max(1, lines.length) * PDF_INFO_LINE + 0.85
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
  const certFooter = await loadCertFooterForPdf()
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
  TECHCORPS_HEADER_CONTACT_LINES.forEach((line, index) => {
    if (index === 2) {
      doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
      doc.textWithLink(line, headTextX, contactY, { url: TECHCORPS_LETTERHEAD.websiteUrl })
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
      contactY += 3.2
      return
    }
    const wrapped = doc.splitTextToSize(line, contactW)
    doc.text(wrapped, headTextX, contactY)
    contactY += wrapped.length * 3.2 + 0.8
  })

  y = Math.max(y + (logo ? 16 : 10), contactY + 2)
  doc.setDrawColor(200, 200, 200)
  doc.line(marginX, y, marginX + contentW, y)
  y += 5

  const sectionTop = y
  const barcodeDataUrl = await resolveCode128BarcodeDataUrl(payload.quoteNumber, {
    scale: 3,
    height: 8,
    includetext: false,
  })

  const barW = 48
  const barH = 9
  const barX = pageW - marginX - barW
  const pad = 2
  const barcodeBlockH = barH + pad * 2 + 9

  if (barcodeDataUrl) {
    doc.setFillColor(252, 252, 253)
    doc.setDrawColor(220, 225, 232)
    doc.roundedRect(barX - pad, sectionTop, barW + pad * 2, barcodeBlockH, 1.2, 1.2, 'FD')
    doc.addImage(barcodeDataUrl, 'PNG', barX, sectionTop + pad, barW, barH, undefined, 'FAST')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    doc.text(payload.quoteNumber, barX + barW / 2, sectionTop + pad + barH + 4.2, {
      align: 'center',
    })
  }

  const titleY = sectionTop + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(17, 17, 17)
  doc.text('COTIZACIÓN', marginX, titleY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  const statusY = sectionTop + barcodeBlockH + 2.5
  doc.text(formatQuotationStatus(payload.status), pageW - marginX, statusY, { align: 'right' })

  y = Math.max(titleY + 10, statusY + 5)

  const gap = 4
  const colW = (contentW - gap) / 2
  const blockTop = y
  const innerPad = 4
  const titleH = 8
  const blockPadBottom = 3.5
  const cardRadius = 2.8
  const cardHeaderGap = 3.5

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

  const innerW = colW - innerPad * 2
  const measureCol = (lines: readonly (readonly [string, string])[]) => {
    let contentH = 0
    for (const [, value] of lines) {
      contentH += infoRowMeasureHeight(doc, value, innerW)
    }
    return titleH + cardHeaderGap + contentH + blockPadBottom
  }
  const blockH = Math.max(measureCol(clientLines), measureCol(opLines))
  const cardContentTop = blockTop + titleH + cardHeaderGap

  const paintInfoCardHeader = (x: number) => {
    const headerFillH = titleH + cardRadius * 0.55
    doc.setFillColor(248, 249, 251)
    doc.setDrawColor(248, 249, 251)
    doc.roundedRect(x, blockTop, colW, headerFillH, cardRadius, cardRadius, 'F')
    doc.setFillColor(255, 255, 255)
    doc.rect(x + 0.2, blockTop + titleH, colW - 0.4, cardRadius * 0.55 + 0.25, 'F')
  }

  const drawInfoCardTitle = (x: number, title: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(PDF_INFO_TITLE_FONT)
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    doc.text(title.toUpperCase(), x + innerPad, blockTop + 5.2)
    const sepY = blockTop + titleH + 0.55
    doc.setDrawColor(220, 226, 234)
    doc.setLineWidth(0.12)
    doc.line(x + innerPad, sepY, x + colW - innerPad, sepY)
  }

  const strokeInfoCardOutline = (x: number) => {
    doc.setDrawColor(208, 214, 224)
    doc.setLineWidth(0.22)
    doc.roundedRect(x, blockTop, colW, blockH, cardRadius, cardRadius, 'S')
  }

  paintInfoCardHeader(marginX)
  paintInfoCardHeader(marginX + colW + gap)
  drawInfoCardTitle(marginX, 'Cliente')
  drawInfoCardTitle(marginX + colW + gap, 'Operación')

  let cy = cardContentTop
  for (const [label, value] of clientLines) {
    cy = infoRowTwoColumn(doc, label, value, marginX + innerPad, cy, innerW)
  }

  let oy = cardContentTop
  for (const [label, value] of opLines) {
    oy = infoRowTwoColumn(doc, label, value, marginX + colW + gap + innerPad, oy, innerW)
  }

  strokeInfoCardOutline(marginX)
  strokeInfoCardOutline(marginX + colW + gap)

  y = blockTop + blockH + 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text('EQUIPOS COTIZADOS', marginX, y)
  y += 4

  autoTable(doc, {
    theme: 'plain',
    startY: y,
    tableWidth: contentW,
    head: [['Marca', 'Modelo', 'Cant.', 'Precio', 'Sub-total']],
    body: payload.items.map((row) => [
      row.manufacturer,
      row.model,
      String(row.qty),
      formatQ(row.unitPrice),
      formatQ(row.lineTotal),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      minCellHeight: 7,
      cellPadding: { top: 3.5, right: 2.5, bottom: 3.5, left: 2.5 },
      valign: 'middle',
      halign: 'center',
      textColor: [30, 30, 30],
      fillColor: [255, 255, 255],
      lineColor: [200, 200, 200],
      lineWidth: 0.12,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [248, 249, 251],
      textColor: [90, 90, 90],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.2, halign: 'left' },
      1: { cellWidth: contentW * 0.32, halign: 'left' },
      2: { halign: 'center', cellWidth: contentW * 0.12 },
      3: { halign: 'center', cellWidth: contentW * 0.18 },
      4: { halign: 'center', cellWidth: contentW * 0.18, fontStyle: 'bold' },
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
    footStyles: {
      fontSize: 7.5,
      textColor: [80, 80, 80],
      valign: 'middle',
      minCellHeight: 8,
      fillColor: [255, 255, 255],
      cellPadding: { top: 4, right: 2, bottom: 4, left: 2 },
    },
    margin: { left: marginX, right: marginX, bottom: 12 },
  })

  const tableEnd = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
  y = (tableEnd ?? y) + 4

  if (payload.notes?.trim()) {
    y += 4
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Notas', marginX, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    const notesPdf = formatQuotationNotesForPdf(payload.notes)
    y = drawHelveticaMultiline(doc, notesPdf, marginX, y, contentW, {
      fontSize: 8,
      lineMm: 3.4,
      textColor: [50, 50, 50],
    })
  }

  const certFooterTopY = certFooter ? y + 5 : null

  appendWarrantyPolicyPageToDocument(doc, buildWarrantyPayloadFromQuotation(payload))

  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    drawPdfFooter(doc, marginX, pageW, p, certFooter, certFooterTopY)
  }

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
