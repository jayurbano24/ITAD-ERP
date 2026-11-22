import { sanitizeTextForHelveticaPdf } from '@/lib/ventas/pdfHelveticaText'
import type { EquipmentReceiptPayload } from './buildEquipmentReceiptPayload'
import { loadXsiReceiptHeaderLogo, XSI_RECEIPT_HEADER_MM_HEIGHT } from './xsiReceiptBranding'

const TITLE_COLOR = { r: 74, g: 68, b: 83 } as const
const ORD_BADGE = { r: 74, g: 68, b: 83 } as const
const TABLE_HEAD_FILL: [number, number, number] = [217, 217, 217]
const META_LABEL_FILL: [number, number, number] = [255, 242, 204]
const META_LABEL_W_RATIO = 0.19
const META_VALUE_W_RATIO = 0.31

type Jspdf = import('jspdf').jsPDF

function drawDoubleRule(doc: Jspdf, x1: number, y: number, x2: number) {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.55)
  doc.line(x1, y, x2, y)
  doc.setLineWidth(0.25)
  doc.line(x1, y + 1.1, x2, y + 1.1)
}

function drawOrdBadge(doc: Jspdf, orderNumber: string, rightX: number, topY: number) {
  const label = sanitizeTextForHelveticaPdf(orderNumber) || 'ORD'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const padX = 10
  const w = Math.max(40, doc.getTextWidth(label) + padX * 2)
  const h = 14
  const x = rightX - w
  doc.setFillColor(ORD_BADGE.r, ORD_BADGE.g, ORD_BADGE.b)
  doc.roundedRect(x, topY, w, h, 3.5, 3.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(label, x + w / 2, topY + 10, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  return topY + h
}

function drawMetaGrid(
  doc: Jspdf,
  autoTable: (typeof import('jspdf-autotable'))['autoTable'],
  payload: EquipmentReceiptPayload,
  margin: number,
  y: number,
  contentW: number
) {
  const labelW = contentW * META_LABEL_W_RATIO
  const valueW = contentW * META_VALUE_W_RATIO

  const labelCell = (label: string) => ({
    content: `${label}:`,
    styles: { fontStyle: 'bold' as const, halign: 'left' as const },
  })
  const valueCell = (value: string) => ({
    content: sanitizeTextForHelveticaPdf(value) || '',
    styles: { halign: 'left' as const },
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      valign: 'middle',
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    body: [
      [
        labelCell('Customer'),
        valueCell(payload.customer),
        labelCell('Pickup Date'),
        valueCell(payload.pickupDate),
      ],
      [
        labelCell('Company Name'),
        valueCell(payload.companyName),
        labelCell('Project ID'),
        valueCell(payload.projectId),
      ],
      [
        { content: 'Collection Address:', styles: { fontStyle: 'bold', halign: 'left' } },
        {
          content: sanitizeTextForHelveticaPdf(payload.collectionAddress) || '',
          colSpan: 3,
          styles: { halign: 'left' },
        },
      ],
    ],
    columnStyles: {
      0: { cellWidth: labelW },
      1: { cellWidth: valueW },
      2: { cellWidth: labelW },
      3: { cellWidth: valueW },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      if (data.column.index === 0 || data.column.index === 2) {
        data.cell.styles.fillColor = META_LABEL_FILL
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
}

function drawReceiptHeader(
  doc: Jspdf,
  payload: EquipmentReceiptPayload,
  logo: { dataUrl: string; aspect: number; pixelWidth: number; pixelHeight: number } | null,
  margin: number,
  pageW: number,
  contentW: number
): number {
  const y0 = 10
  const rightX = pageW - margin
  const rightColW = contentW * 0.42
  const leftColW = contentW - rightColW

  let logoBottom = y0
  if (logo) {
    const logoH = XSI_RECEIPT_HEADER_MM_HEIGHT
    const logoW = Math.min(logoH * logo.aspect, leftColW)
    // 'FAST' + PNG HD: jsPDF re-muestrea menos agresivo que SLOW en algunos navegadores.
    const alias = `xsi-header-${logo.pixelWidth}x${logo.pixelHeight}`
    doc.addImage(logo.dataUrl, 'PNG', margin, y0, logoW, logoH, alias, 'FAST')
    logoBottom = y0 + logoH
  }

  const title = 'Receipt of Equipment Containing Data'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13.5)
  doc.setTextColor(TITLE_COLOR.r, TITLE_COLOR.g, TITLE_COLOR.b)
  const titleLines = doc.splitTextToSize(title, rightColW - 2) as string[]
  const titleX = rightX
  let titleY = y0 + 5
  for (const line of titleLines) {
    doc.text(line, titleX, titleY, { align: 'right' })
    titleY += 5.2
  }

  const badgeBottom = drawOrdBadge(doc, payload.orderNumber, rightX, titleY + 2)

  const headerBottom = Math.max(logoBottom, badgeBottom) + 4
  drawDoubleRule(doc, margin, headerBottom, pageW - margin)
  return headerBottom + 2.5
}

export async function buildEquipmentReceiptPdfBytes(payload: EquipmentReceiptPayload): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 10
  const contentW = pageW - margin * 2

  const logo = await loadXsiReceiptHeaderLogo()
  let y = drawReceiptHeader(doc, payload, logo, margin, pageW, contentW)

  drawMetaGrid(doc, autoTable, payload, margin, y, contentW)
  const afterMeta =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 24
  y = afterMeta + 4

  const tableBody = payload.items.map((item, idx) => [
    String(idx + 1),
    sanitizeTextForHelveticaPdf(item.product),
    sanitizeTextForHelveticaPdf(item.make),
    sanitizeTextForHelveticaPdf(item.model),
    sanitizeTextForHelveticaPdf(item.serial),
    '',
    '',
    '',
  ])

  if (!tableBody.length) {
    tableBody.push(['', '', '', 'No equipment listed yet', '', '', '', ''])
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    theme: 'grid',
    head: [
      [
        { content: 'Item', rowSpan: 2 },
        { content: 'Product', rowSpan: 2 },
        { content: 'Make', rowSpan: 2 },
        { content: 'Model', rowSpan: 2 },
        { content: 'Serial Number', rowSpan: 2 },
        { content: 'Equipment Containing Data', colSpan: 2 },
        { content: 'Notes', rowSpan: 2 },
      ],
      ['Y', 'N'],
    ],
    body: tableBody,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      valign: 'middle',
      textColor: [0, 0, 0],
      minCellHeight: 7,
    },
    headStyles: {
      fillColor: TABLE_HEAD_FILL,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 11 },
      1: { halign: 'left', cellWidth: 22 },
      2: { halign: 'left', cellWidth: 20 },
      3: { halign: 'left', cellWidth: 36 },
      4: { halign: 'left', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 9 },
      6: { halign: 'center', cellWidth: 9 },
      7: { halign: 'left', cellWidth: 'auto' },
    },
    foot: payload.receptionNotes.trim()
      ? [
          [
            {
              content: `Reception notes: ${sanitizeTextForHelveticaPdf(payload.receptionNotes)}`,
              colSpan: 8,
              styles: { halign: 'left', fontStyle: 'italic', fontSize: 8 },
            },
          ],
        ]
      : undefined,
    footStyles: {
      fillColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
    },
  })

  const afterTable =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40
  y = afterTable + 5

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    theme: 'grid',
    body: [
      [
        {
          content: `TOTAL ITEMS:  ${payload.items.length}`,
          colSpan: 8,
          styles: { fontStyle: 'bold', halign: 'left', fontSize: 10 },
        },
      ],
    ],
    styles: {
      font: 'helvetica',
      cellPadding: 2.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
    },
    columnStyles: {
      0: { cellWidth: contentW },
    },
  })

  const afterTotal =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 8
  y = afterTotal + 12

  const sigW = (contentW - 12) / 2
  const drawSigBlock = (label: string, leftX: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(label, leftX + sigW / 2, y, { align: 'center' })
    const lineY = y + 20
    doc.setLineWidth(0.4)
    doc.line(leftX, lineY, leftX + sigW, lineY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Date:  ____ / ________ / ______', leftX + sigW / 2, lineY + 6, { align: 'center' })
  }

  drawSigBlock('XSi Representative Signature', margin)
  drawSigBlock('Customer Signature', margin + sigW + 12)

  return new Uint8Array(doc.output('arraybuffer'))
}

export async function buildEquipmentReceiptPdfBlob(payload: EquipmentReceiptPayload): Promise<Blob> {
  const bytes = await buildEquipmentReceiptPdfBytes(payload)
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}

export function receiptPdfFileName(payload: EquipmentReceiptPayload, ticketReadableId?: string): string {
  const ord = payload.orderNumber.replace(/[^\w-]+/g, '_')
  return `Receipt-of-Equipment-${ord || ticketReadableId || 'ticket'}.pdf`
}

export async function downloadEquipmentReceiptPdf(
  payload: EquipmentReceiptPayload,
  fileName: string
): Promise<void> {
  const blob = await buildEquipmentReceiptPdfBlob(payload)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}