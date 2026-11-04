/**
 * Rellena la plantilla oficial del cliente:
 * ORD20xxx - ITAD Asset Report Testing Log.xlsx
 *
 * Hoja principal (wipe): Laptops — columnas A–AG según captura del cliente.
 */

import type { WipeExcelRow } from '@/lib/wipe/exportWipeOrderExcel'
import {
  buildAssetReportBaseName,
  displayBattery,
  displayCharger,
  displayMemory,
  displayWipe,
  formatTestDateExcel,
  mapDeviceLabel,
  mapFinalStatus,
  sanitizePdfFileName,
} from '@/lib/wipe/exportWipeOrderExcel'

const TEMPLATE_URL = '/templates/ORD20xxx-ITAD_Asset_Report_Testing_Log.xlsx'

/** Filas de datos en Laptops del template vacío: 4..13; 15 = totales */
const LAPTOPS_DATA_START = 4
const LAPTOPS_PLACEHOLDER_END = 13

function v(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function kgToLbs(kg: string | null | undefined): string {
  if (!kg) return ''
  const n = parseFloat(String(kg).replace(/[^0-9.]/g, ''))
  if (Number.isNaN(n)) return String(kg)
  return (n / 0.453592).toFixed(2)
}

function moneyNumber(value: string | number | null | undefined): number | '' {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? '' : n
}

function sheetForDevice(device: string): string {
  const d = device.toLowerCase()
  if (d.includes('laptop') || d === 'lap') return 'Laptops'
  if (d.includes('desktop') || d === 'pc' || d === 'des') return 'PCs'
  if (d.includes('server') || d === 'srv') return 'Servers'
  if (d.includes('tablet') || d === 'tab') return 'Tablet'
  if (d.includes('phone') || d.includes('mobile')) return 'Mobile Phones'
  if (d.includes('monitor')) return 'Monitors'
  if (d.includes('printer')) return 'Printers'
  if (d.includes('storage') || d.includes('hdd')) return 'Loose HDD'
  return 'Laptops'
}

function clearDataRow(row: { eachCell: Function; getCell: (n: number) => { value: unknown } }) {
  for (let c = 1; c <= 33; c++) {
    const cell = row.getCell(c)
    // No borrar fórmulas de totales (se manejan aparte)
    const val = cell.value as { formula?: string } | null
    if (val && typeof val === 'object' && 'formula' in val) continue
    cell.value = null
  }
}

/** Valores Laptops A–X + HDD Z–AG (col 25 vacía como en plantilla) */
function laptopValues(r: WipeExcelRow): Array<string | number | null> {
  const device = v(r.device) || mapDeviceLabel(r.prefix) || 'Laptop'
  const ram = v(r.ramCapacityGb)
    ? /gb/i.test(v(r.ramCapacityGb))
      ? v(r.ramCapacityGb)
      : `${v(r.ramCapacityGb)} GB`
    : ''
  const weight = v(r.weightLbs) || kgToLbs(r.weightKg) || ''
  const remarket = moneyNumber(r.remarketPrice)
  const fee = moneyNumber(r.serviceFee)

  return [
    device, // A Device
    v(r.make), // B Make
    v(r.model), // C Model
    v(r.serialNumber), // D Serial
    v(r.customerAssetTag), // E Asset Tag
    v(r.r2Applicability), // F R2
    v(r.dataSanitization), // G Sanitization
    v(r.cpu), // H CPU
    r.hddCount ?? '', // I # HDD
    ram, // J RAM
    v(r.screenSize)?.replace(/"/g, '') || '', // K Screen
    weight, // L Weight
    v(r.cosmeticConditions || r.classificationC), // M Cosmetic
    displayBattery(r.battery), // N Battery
    displayCharger(r.charger), // O Charger
    displayMemory(r.memory, r.ramCapacityGb), // P Memory
    v(r.functionalConditions || r.classificationF), // Q Functional
    formatTestDateExcel(r.testDate || r.processedTime), // R Test Date
    v(r.technicianName), // S Tech
    v(r.comments), // T Comments
    remarket === '' ? 0 : remarket, // U Remarket
    fee === '' ? 0 : fee, // V Service Fee
    v(r.finalStatus) || mapFinalStatus(r.status), // W Final Status
    v(r.additionalNotes), // X Additional Notes
    null, // Y spacer
    v(r.hdd1Serial), // Z HDD1 Serial
    v(r.hdd1Size), // AA Size
    displayWipe(r.hdd1Wipe), // AB Wipe
    v(r.hdd1Destruction), // AC Destruction
    v(r.hdd2Serial), // AD HDD2 Serial
    v(r.hdd2Size), // AE Size
    displayWipe(r.hdd2Wipe), // AF Wipe
    v(r.hdd2Destruction), // AG Destruction
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

async function loadTemplateWorkbook() {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const res = await fetch(TEMPLATE_URL, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(
      `No se pudo cargar la plantilla ITAD (${res.status}). Verifica public/templates/`
    )
  }
  const ab = await res.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(ab)
  return wb
}

export type ItadPackResult = {
  pdfOk: number
  pdfFail: number
  total: number
  xlsxName: string
}

/**
 * Exporta usando la plantilla oficial del cliente + PDFs en ZIP.
 * Excel interno: ORD26673-ITAD_Asset_Report.xlsx
 */
export async function downloadItadAssetReportPack(
  rows: WipeExcelRow[],
  fileName?: string
): Promise<ItadPackResult> {
  if (!rows.length) throw new Error('No hay filas para exportar')

  const wb = await loadTemplateWorkbook()
  const bySheet = new Map<string, WipeExcelRow[]>()
  for (const row of rows) {
    const device = v(row.device) || mapDeviceLabel(row.prefix) || 'Laptop'
    const sheetName = sheetForDevice(device)
    const list = bySheet.get(sheetName) || []
    list.push(row)
    bySheet.set(sheetName, list)
  }

  // Si no hubo mapeo a Laptops (device vacío / raro), mandar todo ahí (flujo wipe típico)
  if (!bySheet.has('Laptops') || (bySheet.get('Laptops') || []).length === 0) {
    bySheet.set('Laptops', rows)
  }
  const laptops = bySheet.get('Laptops') || []
  const ws = wb.getWorksheet('Laptops')
  if (!ws) throw new Error('La plantilla no tiene hoja Laptops')

  // Limpiar placeholders 4..13
  for (let r = LAPTOPS_DATA_START; r <= LAPTOPS_PLACEHOLDER_END; r++) {
    clearDataRow(ws.getRow(r))
  }

  const pdfMeta: Array<{ row: WipeExcelRow; zipPath: string }> = []
  const usedNames = new Map<string, number>()

  laptops.forEach((row, idx) => {
    const excelRow = LAPTOPS_DATA_START + idx
    const values = laptopValues(row)
    const target = ws.getRow(excelRow)
    values.forEach((val, i) => {
      target.getCell(i + 1).value = val === '' ? null : val
    })

    if (row.evidenceUrl) {
      let file = sanitizePdfFileName(row.serialNumber, String(row.evidenceId || idx))
      const count = usedNames.get(file) || 0
      if (count > 0) file = file.replace(/\.pdf$/i, `_${count + 1}.pdf`)
      usedNames.set(sanitizePdfFileName(row.serialNumber, String(row.evidenceId || idx)), count + 1)
      const zipPath = `pdfs/${file}`
      pdfMeta.push({ row, zipPath })
      // Link en Additional Notes si está vacío, o columna Comments no — mejor hipervínculo en Serial
      const serialCell = target.getCell(4)
      if (row.serialNumber) {
        serialCell.value = {
          text: String(row.serialNumber),
          hyperlink: row.evidenceUrl,
        }
        serialCell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF0563C1' },
          underline: true,
        }
      }
    }
  })

  // Totales: SUM debajo de la última fila de datos
  const lastData = LAPTOPS_DATA_START + Math.max(laptops.length, 1) - 1
  const totalRow = Math.max(lastData + 2, 15)
  // Limpiar fila 15 vieja si movemos totales
  if (totalRow !== 15) {
    const old = ws.getRow(15)
    old.getCell(21).value = null
    old.getCell(22).value = null
  }
  ws.getRow(totalRow).getCell(21).value = {
    formula: `SUM(U${LAPTOPS_DATA_START}:U${lastData})`,
  }
  ws.getRow(totalRow).getCell(22).value = {
    formula: `SUM(V${LAPTOPS_DATA_START}:V${lastData})`,
  }

  // Otras hojas del template (PC, Server, etc.): Device/Make/Model/Serial básicos
  for (const [sheetName, list] of Array.from(bySheet.entries())) {
    if (sheetName === 'Laptops') continue
    const sheet = wb.getWorksheet(sheetName)
    if (!sheet || list.length === 0) continue
    list.forEach((row, idx) => {
      const excelRow = 4 + idx
      const device = v(row.device) || mapDeviceLabel(row.prefix) || sheetName
      const target = sheet.getRow(excelRow)
      target.getCell(1).value = device
      target.getCell(2).value = v(row.make) || null
      target.getCell(3).value = v(row.model) || null
      target.getCell(4).value = v(row.serialNumber) || null
    })
  }

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer
  const base = (fileName || buildAssetReportBaseName(rows[0]?.ordCode, rows)).replace(
    /\.(xlsx|zip)$/i,
    ''
  )
  const xlsxName = `${base}.xlsx`

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file(xlsxName, buffer)

  let pdfOk = 0
  let pdfFail = 0
  await Promise.all(
    pdfMeta.map(async ({ row, zipPath }) => {
      if (!row.evidenceUrl) {
        pdfFail += 1
        return
      }
      try {
        const res = await fetch(row.evidenceUrl, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        zip.file(zipPath, await res.arrayBuffer())
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

  return { pdfOk, pdfFail, total: pdfMeta.length, xlsxName }
}
