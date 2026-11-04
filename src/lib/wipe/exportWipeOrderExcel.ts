/**
 * Exporta la orden de borrado con el layout de plantilla Excel (captura):
 * Device → … → Additional Notes + HDD INFORMATION
 */

export type WipeExcelRow = {
  ordCode?: string | null
  prefix?: string | null
  device?: string | null
  make?: string | null
  model?: string | null
  serialNumber?: string | null
  customerAssetTag?: string | null
  classificationRec?: string | null
  mainBoardPart?: string | null
  cpu?: string | null
  hddCount?: number | null
  ramCapacityGb?: string | null
  screenSize?: string | null
  weightKg?: string | null
  weightLbs?: string | null
  cosmeticConditions?: string | null
  classificationC?: string | null
  battery?: string | null
  charger?: string | null
  memory?: string | null
  functionalConditions?: string | null
  classificationF?: string | null
  testDate?: string | null
  processedTime?: string | null
  technicianName?: string | null
  comments?: string | null
  wipeCertificateId?: string | null
  hdd1Wipe?: string | null
  status?: string | null
  finalStatus?: string | null
  remarketPrice?: string | number | null
  serviceFee?: string | number | null
  additionalNotes?: string | null
  hdd1Serial?: string | null
  hdd1Size?: string | null
  hdd1Destruction?: string | null
  hdd2Serial?: string | null
  hdd2Size?: string | null
  hdd2Wipe?: string | null
  hdd2Destruction?: string | null
  r2Applicability?: string | null
  dataSanitization?: string | null
  /** URL pública / firmada del certificado PDF de borrado */
  evidenceUrl?: string | null
  evidenceId?: string | null
}

const PURPLE_GROUP = 'D5C6E0'
const PURPLE_HEADER = '5B2C6F'
const GREEN_HEADER = '548235'
const WHITE = 'FFFFFF'
const BLACK = '000000'
const RED = 'C00000'

function v(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

/** 6/14/2024 o 6/14/2024 18:57 */
export function formatTestDateExcel(raw: string | null | undefined): string {
  if (!raw) return ''
  const cleaned = raw.replace(/\(\+[0-9]+\)/g, '').trim()
  const first = cleaned.split(/\s*\/\s*/)[0]?.trim() || cleaned
  const iso = first.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (iso) {
    const base = `${Number(iso[2])}/${Number(iso[3])}/${iso[1]}`
    if (iso[4] && iso[5]) return `${base} ${iso[4]}:${iso[5]}`
    return base
  }
  const us = first.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (us) {
    const time = us[4] && us[5] ? ` ${us[4].padStart(2, '0')}:${us[5]}` : ''
    return `${Number(us[1])}/${Number(us[2])}/${us[3]}${time}`
  }
  const d = new Date(first)
  if (!Number.isNaN(d.getTime())) {
    const mm = d.getMonth() + 1
    const dd = d.getDate()
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
  }
  return first.slice(0, 19)
}

function kgToLbs(kg: string | null | undefined): string {
  if (!kg) return ''
  const n = parseFloat(String(kg).replace(/[^0-9.]/g, ''))
  if (Number.isNaN(n)) return String(kg)
  return (n / 0.453592).toFixed(2)
}

/** LAP / laptop → Laptop (columna Device de la plantilla) */
export function mapDeviceLabel(
  prefix: string | null | undefined,
  assetType?: string | null
): string {
  const src = `${prefix || ''} ${assetType || ''}`.toLowerCase()
  if (/lap|notebook|elitebook|latitude|thinkpad|macbook/.test(src)) return 'Laptop'
  if (/des|desktop|tower|optiplex/.test(src)) return 'Desktop'
  if (/srv|server|poweredge|proliant/.test(src)) return 'Server'
  if (/tab|tablet|ipad/.test(src)) return 'Tablet'
  if (/all.?in.?one|aio/.test(src)) return 'All-in-One'
  const p = (prefix || '').toUpperCase()
  if (p === 'LAP') return 'Laptop'
  if (p === 'DES') return 'Desktop'
  if (p === 'SRV') return 'Server'
  if (p === 'TAB') return 'Tablet'
  return prefix || assetType || ''
}

export function mapFinalStatus(status: string | null | undefined): string {
  if (!status) return ''
  const s = status.toLowerCase().replace(/_/g, ' ')
  if (s.includes('ready for sale') || s.includes('resale')) return 'Resale'
  if (s === 'sold' || s.includes('vendido')) return 'Sold'
  if (s.includes('spare') || s.includes('sapare')) return 'Spare'
  if (s.includes('recycle') || s.includes('destroy') || s.includes('scrap')) return 'Recycle'
  if (s.includes('wipe') || s.includes('borrad')) return 'Wiped'
  return status
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(n)) return String(value)
  return `$ ${n.toFixed(2)}`
}

function styleFill(argb: string, bold = true, fontColor = WHITE) {
  return {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: `FF${argb}` },
    },
    font: { bold, color: { argb: `FF${fontColor}` }, size: 10, name: 'Calibri' },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
      left: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
      right: { style: 'thin' as const, color: { argb: 'FF7F7F7F' } },
    },
  }
}

/** Battery = ¿tiene batería? Yes / No (helper legacy) */
export function batteryHasYesNo(battery: string | null | undefined): 'Yes' | 'No' {
  if (!battery || !String(battery).trim()) return 'No'
  const s = String(battery).toLowerCase()
  if (
    /not available|not detected|component is missing|missing|no battery|absent|n\/a/.test(s)
  ) {
    return 'No'
  }
  if (/successful|failed|pass|charge|\d+\s*%|performed|full/.test(s)) return 'Yes'
  return 'Yes'
}

/** Valor de Battery para plantilla (Full, Failed, Yes/No…) */
export function displayBattery(battery: string | null | undefined): string {
  if (!battery || !String(battery).trim()) return ''
  const s = String(battery).trim()
  if (/^full$/i.test(s) || /\bfull\b/i.test(s)) return 'Full'
  if (/not available|not detected|missing|no battery|absent/i.test(s)) return 'NO'
  if (/^\d+(\.\d+)?\s*%$/.test(s)) return s
  if (/fail/i.test(s)) return 'Fail'
  if (/pass|successful/i.test(s)) return 'Pass'
  return s
}

export function displayCharger(charger: string | null | undefined): string {
  const ch = v(charger).trim()
  if (!ch || /^no$/i.test(ch)) return 'NO'
  if (/^yes$/i.test(ch)) return 'YES'
  return ch
}

export function displayMemory(memory: string | null | undefined, ramGb?: string | null): string {
  const m = v(memory).trim()
  if (!m) return ramGb ? 'Pass' : ''
  if (/^yes$/i.test(m)) return 'Pass'
  if (/^no$/i.test(m)) return 'Fail'
  return m
}

export function displayWipe(wipe: string | null | undefined): string {
  const w = v(wipe).trim()
  if (!w) return ''
  if (/pass|erased|success|yes/i.test(w)) return 'Yes'
  if (/fail|no/i.test(w)) return 'No'
  return w
}

/**
 * Columnas plantilla (fila de títulos) — orden de la captura Excel:
 * PDF | Device … Additional Notes | HDD #1 | HDD #2
 */
const COL_HEADERS: Array<{ title: string; green?: boolean }> = [
  { title: 'PDF Certificado' },
  { title: 'PDF en ZIP' },
  { title: 'Device' },
  { title: 'Make' },
  { title: 'Model' },
  { title: 'Serial Number' },
  { title: 'Customer Asset Tag#' },
  { title: 'R2 Applicability Field' },
  { title: 'Data Sanitization Field' },
  { title: 'GPU / Processor' },
  { title: 'Number of HDD' },
  { title: 'RAM' },
  { title: 'Screen Size' },
  { title: 'Weight (Lbs)' },
  { title: 'Cosmetic Conditions' },
  { title: 'Battery' },
  { title: 'Charger' },
  { title: 'Memory' },
  { title: 'Functional Conditions' },
  { title: 'Test Date' },
  { title: 'Technician Name' },
  { title: 'Comments' },
  { title: 'Remarket Price' },
  { title: 'Service Fee' },
  { title: 'Final Status' },
  { title: 'Additional Notes' },
  // HDD INFORMATION
  { title: 'Serial Number', green: true },
  { title: 'Size', green: true },
  { title: 'Wipe', green: true },
  { title: 'Destruction', green: true },
  { title: 'Serial Number', green: true },
  { title: 'Size', green: true },
  { title: 'Wipe', green: true },
  { title: 'Destruction', green: true },
]

export function sanitizePdfFileName(serial: string | null | undefined, fallback: string): string {
  const base = (serial || fallback || 'sin-serie')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80)
  return `wipe-${base}.pdf`
}

/** ORD26673-ITAD_Asset_Report (sin extensión) */
export function buildAssetReportBaseName(
  ordCode: string | null | undefined,
  rows?: WipeExcelRow[]
): string {
  const fromArg = (ordCode || '').trim()
  const fromRows = (() => {
    if (!rows?.length) return ''
    const codes = Array.from(
      new Set(rows.map((r) => (r.ordCode || '').trim()).filter(Boolean))
    )
    if (codes.length === 1) return codes[0]
    return ''
  })()
  const raw = fromArg || fromRows || 'ITAD'
  const ord = raw
    .replace(/\s+/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .toUpperCase()
  if (!ord || ord === 'SIN-ORD' || ord === 'ITAD') return 'ITAD_Asset_Report'
  return `${ord}-ITAD_Asset_Report`
}

function mapRow(r: WipeExcelRow, pdfZipPath: string): (string | number)[] {
  const weightLbs = v(r.weightLbs) || kgToLbs(r.weightKg) || ''
  const testDate = formatTestDateExcel(r.testDate || r.processedTime)
  const device = v(r.device) || mapDeviceLabel(r.prefix)
  const ram = v(r.ramCapacityGb)
    ? /gb/i.test(v(r.ramCapacityGb))
      ? v(r.ramCapacityGb)
      : `${v(r.ramCapacityGb)} GB`
    : ''

  return [
    r.evidenceUrl ? 'Abrir PDF' : '',
    pdfZipPath,
    device,
    v(r.make),
    v(r.model),
    v(r.serialNumber),
    v(r.customerAssetTag),
    v(r.r2Applicability),
    v(r.dataSanitization),
    v(r.cpu),
    r.hddCount ?? '',
    ram,
    v(r.screenSize)?.replace(/"/g, '') || '',
    weightLbs,
    v(r.cosmeticConditions || r.classificationC),
    displayBattery(r.battery),
    displayCharger(r.charger),
    displayMemory(r.memory, r.ramCapacityGb),
    v(r.functionalConditions || r.classificationF),
    testDate,
    v(r.technicianName),
    v(r.comments),
    formatMoney(r.remarketPrice),
    formatMoney(r.serviceFee),
    v(r.finalStatus) || mapFinalStatus(r.status),
    v(r.additionalNotes),
    v(r.hdd1Serial),
    v(r.hdd1Size),
    displayWipe(r.hdd1Wipe),
    v(r.hdd1Destruction),
    v(r.hdd2Serial),
    v(r.hdd2Size),
    displayWipe(r.hdd2Wipe),
    v(r.hdd2Destruction),
  ]
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function buildWipeOrderWorkbookBuffer(
  rows: WipeExcelRow[]
): Promise<{ buffer: ArrayBuffer; pdfMeta: Array<{ row: WipeExcelRow; zipPath: string }> }> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ITAD-ERP'
  wb.created = new Date()

  const ws = wb.addWorksheet('Wipe Orders', {
    views: [{ state: 'frozen', ySplit: 3, xSplit: 2 }],
  })

  const totalCols = COL_HEADERS.length // 2 PDF + 24 + 8
  const specsEnd = 26
  const hddStart = 27
  const hdd1End = 30
  const hdd2Start = 31
  const usedNames = new Map<string, number>()

  const pdfMeta: Array<{ row: WipeExcelRow; zipPath: string }> = []

  // Row 1 — group headers
  ws.addRow(new Array(totalCols).fill('')).height = 22
  ws.mergeCells(1, 1, 1, 2)
  ws.mergeCells(1, 3, 1, specsEnd)
  ws.mergeCells(1, hddStart, 1, totalCols)
  ws.getCell(1, 1).value = 'PDF'
  ws.getCell(1, 3).value = 'Specifications / Test Results'
  ws.getCell(1, hddStart).value = 'HDD INFORMATION'

  for (let c = 1; c <= totalCols; c++) {
    Object.assign(ws.getCell(1, c), styleFill(PURPLE_GROUP, true, BLACK))
  }
  Object.assign(ws.getCell(1, 1), styleFill(RED, true, WHITE))
  Object.assign(ws.getCell(1, 2), styleFill(RED, true, WHITE))

  // Row 2 — HDD subgroup labels
  ws.addRow(new Array(totalCols).fill('')).height = 18
  for (let c = 1; c <= specsEnd; c++) {
    Object.assign(ws.getCell(2, c), styleFill(PURPLE_HEADER, true, WHITE))
  }
  Object.assign(ws.getCell(2, 1), styleFill(RED, true, WHITE))
  Object.assign(ws.getCell(2, 2), styleFill(RED, true, WHITE))
  ws.mergeCells(2, hddStart, 2, hdd1End)
  ws.mergeCells(2, hdd2Start, 2, totalCols)
  ws.getCell(2, hddStart).value = 'HDD #1'
  ws.getCell(2, hdd2Start).value = 'HDD #2'
  for (let c = hddStart; c <= totalCols; c++) {
    Object.assign(ws.getCell(2, c), styleFill(GREEN_HEADER, true, WHITE))
  }

  // Row 3 — column titles
  ws.addRow(COL_HEADERS.map((h) => h.title)).height = 36
  COL_HEADERS.forEach((h, idx) => {
    const cell = ws.getCell(3, idx + 1)
    if (idx < 2) {
      Object.assign(cell, styleFill(RED, true, WHITE))
    } else if (h.green || idx >= hddStart - 1) {
      Object.assign(cell, styleFill(GREEN_HEADER, true, WHITE))
    } else {
      Object.assign(cell, styleFill(PURPLE_HEADER, true, WHITE))
    }
  })

  // Data
  for (const row of rows) {
    let fileName = sanitizePdfFileName(row.serialNumber, String(row.evidenceId || 'pdf'))
    const count = usedNames.get(fileName) || 0
    if (count > 0) {
      fileName = fileName.replace(/\.pdf$/i, `_${count + 1}.pdf`)
    }
    usedNames.set(sanitizePdfFileName(row.serialNumber, String(row.evidenceId || 'pdf')), count + 1)

    const zipPath = row.evidenceUrl ? `pdfs/${fileName}` : ''
    if (row.evidenceUrl) pdfMeta.push({ row, zipPath })

    const values = mapRow(row, zipPath)
    const excelRow = ws.addRow(values)
    const excelRowNumber = excelRow.number

    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = {
        horizontal: colNumber === 22 || colNumber === 26 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: colNumber === 22 || colNumber === 26,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        left: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        right: { style: 'thin', color: { argb: 'FFB4B4B4' } },
      }
      if (colNumber === 24 || colNumber === 25) {
        cell.font = { name: 'Calibri', size: 10, color: { argb: `FF${RED}` } }
      }
      if (
        colNumber === hddStart ||
        colNumber === hdd2Start ||
        colNumber === hddStart + 2 ||
        colNumber === hdd2Start + 2
      ) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${RED}` } }
      }
    })

    // Hipervínculo al PDF online
    if (row.evidenceUrl) {
      const linkCell = ws.getCell(excelRowNumber, 1)
      linkCell.value = {
        text: 'Abrir PDF',
        hyperlink: row.evidenceUrl,
      }
      linkCell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF0563C1' },
        underline: true,
      }
    }
  }

  const widths = [
    12, 28, 10, 10, 18, 16, 16, 14, 14, 16, 10, 10, 10, 11, 12,
    10, 10, 10, 12, 12, 18, 36, 12, 10, 12, 18,
    16, 10, 8, 12, 16, 10, 8, 12,
  ]
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer
  return { buffer, pdfMeta }
}

/** Solo Excel (.xlsx) → ORD26673-ITAD_Asset_Report.xlsx */
export async function downloadWipeOrderExcel(
  rows: WipeExcelRow[],
  fileName?: string
): Promise<void> {
  const { buffer } = await buildWipeOrderWorkbookBuffer(rows)
  const base = (fileName || buildAssetReportBaseName(rows[0]?.ordCode, rows)).replace(
    /\.(xlsx|zip)$/i,
    ''
  )
  triggerBrowserDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${base}.xlsx`
  )
}

export type WipePackResult = {
  pdfOk: number
  pdfFail: number
  total: number
}

/**
 * ZIP con Excel + carpeta pdfs/ (un PDF por línea con evidencia).
 * Nombre: ORD26673-ITAD_Asset_Report.zip
 * Excel interno: ORD26673-ITAD_Asset_Report.xlsx
 */
export async function downloadWipeOrderPack(
  rows: WipeExcelRow[],
  fileName?: string
): Promise<WipePackResult> {
  const JSZip = (await import('jszip')).default
  const { buffer, pdfMeta } = await buildWipeOrderWorkbookBuffer(rows)
  const zip = new JSZip()
  const base = (fileName || buildAssetReportBaseName(rows[0]?.ordCode, rows)).replace(
    /\.(xlsx|zip)$/i,
    ''
  )
  const xlsxName = `${base}.xlsx`

  zip.file(xlsxName, buffer)

  let pdfOk = 0
  let pdfFail = 0

  await Promise.all(
    pdfMeta.map(async ({ row, zipPath }) => {
      if (!row.evidenceUrl || !zipPath) {
        pdfFail += 1
        return
      }
      try {
        const res = await fetch(row.evidenceUrl, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const ab = await res.arrayBuffer()
        zip.file(zipPath, ab)
        pdfOk += 1
      } catch {
        pdfFail += 1
        zip.file(
          zipPath.replace(/\.pdf$/i, '.MISSING.txt'),
          `No se pudo descargar el PDF.\nSerie: ${row.serialNumber || ''}\nURL: ${row.evidenceUrl}\n`
        )
      }
    })
  )

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  triggerBrowserDownload(zipBlob, `${base}.zip`)

  return { pdfOk, pdfFail, total: pdfMeta.length }
}
