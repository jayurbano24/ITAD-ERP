import { read, utils } from 'xlsx'
import { inferMakeFromModel, type BulkSerialRow } from '@/lib/tickets/parseBulkSerialPaste'

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findHeaderRow(matrix: string[][]): number {
  let bestRow = 0
  let bestScore = -1
  for (let i = 0; i < Math.min(matrix.length, 80); i++) {
    const headers = matrix[i].map((c) => normalizeHeader(c))
    const joined = headers.join(' | ')
    const hasSerial =
      joined.includes('serial') || headers.some((h) => h.includes('serial-ta') || h === 'serial ta')
    const hasMake =
      joined.includes('make') ||
      joined.includes('manufacturer') ||
      joined.includes('marca') ||
      joined.includes('brand')
    const hasModel = joined.includes('model') || joined.includes('modelo')

    let score = 0
    if (hasSerial) score += 3
    if (hasModel) score += 2
    if (hasMake) score += 2
    if (headers.some((h) => h.includes('device'))) score += 1
    if (score > bestScore) {
      bestScore = score
      bestRow = i
    }
    if (hasSerial && hasMake && hasModel) return i
    if (hasSerial && hasModel && score >= 5) return i
  }
  if (bestScore >= 5) return bestRow
  for (let i = 0; i < Math.min(matrix.length, 60); i++) {
    const joined = matrix[i].map((c) => normalizeHeader(c)).join(' | ')
    if (joined.includes('serial') && (joined.includes('device') || joined.includes('laptop'))) return i
  }
  return bestRow
}

function columnIndex(headers: string[], needles: string[]): number {
  const idx = headers.findIndex((h) => needles.some((n) => h.includes(n)))
  return idx
}

function findSerialColumn(headers: string[]): number {
  const prefer = (pred: (h: string) => boolean) => headers.findIndex(pred)
  const serialTa = prefer((h) => h.includes('serial-ta') || h === 'serial ta')
  if (serialTa >= 0) return serialTa
  const serialNumber = prefer((h) => h.includes('serial number'))
  if (serialNumber >= 0) return serialNumber
  const plain = prefer((h) => h === 'serial' || /^serial\s*#?$/.test(h))
  if (plain >= 0) return plain
  const serviceTag = prefer((h) => h.includes('service tag'))
  if (serviceTag >= 0) return serviceTag
  const anySerial = headers.findIndex(
    (h) => h.includes('serial') && !h.includes('serial- no') && h !== 'serial no' && !h.endsWith(' no')
  )
  if (anySerial >= 0) return anySerial
  return columnIndex(headers, ['serial', 'serie', 's/n'])
}

function inferFixedColumns(headers: string[]): {
  makeIdx: number
  modelIdx: number
  serialIdx: number
  cosmeticIdx: number
  functionalIdx: number
  processorIdx: number
  ramIdx: number
} | null {
  const hasPdf = headers.some((h) => h.includes('pdf'))
  const deviceIdx = headers.findIndex((h) => h === 'device' || h.includes('device'))
  const makeLike = columnIndex(headers, ['make', 'manufacturer', 'marca', 'brand'])
  const modelLike = columnIndex(headers, ['model', 'modelo'])
  const serialLike = findSerialColumn(headers)

  const pickMeta = () => ({
    cosmeticIdx: columnIndex(headers, ['rec: c', 'cosmetic']),
    functionalIdx: columnIndex(headers, ['rec: f', 'functional']),
    processorIdx: columnIndex(headers, ['procesador', 'processor', 'cpu', 'gpu']),
    ramIdx: columnIndex(headers, ['ram']),
  })

  if (modelLike >= 0 && serialLike >= 0) {
    return {
      makeIdx: makeLike,
      modelIdx: modelLike,
      serialIdx: serialLike,
      ...pickMeta(),
    }
  }

  if (makeLike >= 0 && modelLike >= 0 && serialLike >= 0) {
    return {
      makeIdx: makeLike,
      modelIdx: modelLike,
      serialIdx: serialLike,
      ...pickMeta(),
    }
  }

  // Plantilla ITAD export: PDF | PDF | Device | Make | Model | Serial Number | ...
  if (hasPdf && headers.length >= 6) {
    return {
      makeIdx: 3,
      modelIdx: 4,
      serialIdx: 5,
      cosmeticIdx: columnIndex(headers, ['cosmetic']),
      functionalIdx: columnIndex(headers, ['functional']),
      processorIdx: columnIndex(headers, ['processor', 'cpu', 'gpu']),
      ramIdx: columnIndex(headers, ['ram']),
    }
  }

  // Device | Make | Model | Serial (columna A o B según plantilla XS)
  if (deviceIdx >= 0 && deviceIdx <= 1 && headers.length >= deviceIdx + 4) {
    const makeOffset = deviceIdx + 1
    const modelOffset = deviceIdx + 2
    const serialOffset = deviceIdx + 3
    if (
      (makeLike < 0 || makeLike === makeOffset) &&
      (modelLike < 0 || modelLike === modelOffset) &&
      (serialLike < 0 || serialLike === serialOffset)
    ) {
      return {
        makeIdx: makeLike >= 0 ? makeLike : makeOffset,
        modelIdx: modelLike >= 0 ? modelLike : modelOffset,
        serialIdx: serialLike >= 0 ? serialLike : serialOffset,
        cosmeticIdx: columnIndex(headers, ['cosmetic']),
        functionalIdx: columnIndex(headers, ['functional']),
        processorIdx: columnIndex(headers, ['processor', 'cpu', 'gpu']),
        ramIdx: columnIndex(headers, ['ram']),
      }
    }
  }

  return null
}

const ASSET_SHEET_PRIORITY = [
  'laptops',
  'pcs',
  'loose hdd',
  'servers',
  'storage',
  'tablet',
  'mobile phones',
  'monitors',
  'printers',
  'network eq.',
  'ip phone & voice devices',
  'miscellaneous',
  'sn for the cod',
]

function sheetRank(name: string): number {
  const key = normalizeHeader(name)
  const idx = ASSET_SHEET_PRIORITY.indexOf(key)
  return idx >= 0 ? idx : ASSET_SHEET_PRIORITY.length
}

export function parseBulkSerialExcelBuffer(buffer: Buffer, fileName?: string): BulkSerialRow[] {
  const ext = (fileName || '').toLowerCase()
  if (ext.endsWith('.csv')) {
    const text = buffer.toString('utf8')
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []
    const matrix = lines.map((l) => l.split(/[,;\t]/))
    return parseMatrix(matrix)
  }

  const workbook = read(buffer, { type: 'buffer', cellDates: false })
  if (!workbook.SheetNames.length) return []

  const orderedNames = [...workbook.SheetNames].sort(
    (a, b) => sheetRank(a) - sheetRank(b) || a.localeCompare(b)
  )

  let best: BulkSerialRow[] = []
  for (const sheetName of orderedNames) {
    if (/^summary$/i.test(sheetName.trim())) continue
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const matrix = utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false }) as string[][]
    const rows = parseMatrix(matrix)
    if (rows.length > best.length) best = rows
    if (rows.length >= 50) break
  }

  return best
}

function parseMatrix(matrix: string[][]): BulkSerialRow[] {
  const cleaned = matrix.map((row) => row.map((c) => String(c ?? '').trim()))
  const headerRow = findHeaderRow(cleaned)
  const headers = cleaned[headerRow].map(normalizeHeader)
  const cols = inferFixedColumns(headers)
  if (!cols) return []

  const rows: BulkSerialRow[] = []

  for (let i = headerRow + 1; i < cleaned.length; i++) {
    const cells = cleaned[i]
    if (!cells.some((c) => c.length > 0)) continue

    let serial = (cells[cols.serialIdx] || '').trim()
    if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(serial)) {
      const n = Number(serial)
      if (Number.isFinite(n)) serial = String(Math.trunc(n))
    }
    serial = serial.toUpperCase().replace(/\s+/g, '')
    if (!serial || serial.length < 4) continue
    if (
      /^(DEVICE|LAPTOP|N\/A|MAKE|MODEL|SERIAL|SERIALNUMBER|SERIAL#|SERIE|IMEI|IMEINUMBER)$/i.test(
        serial
      )
    ) {
      continue
    }

    let make = cols.makeIdx >= 0 ? (cells[cols.makeIdx] || '').trim() : ''
    let model = (cells[cols.modelIdx] || '').trim()
    if (!make && model) make = inferMakeFromModel(model)

    if (
      /^make$/i.test(make) &&
      /^model$/i.test(model) &&
      /^(serial|serialnumber)/i.test(cells[cols.serialIdx] || '')
    ) {
      continue
    }

    if (!make && !model) {
      const device = (cells[0] || cells[2] || '').trim()
      if (device && !/^laptop$/i.test(device)) continue
    }

    const row: BulkSerialRow = { serial, make, model }

    if (cols.cosmeticIdx >= 0 && cells[cols.cosmeticIdx]) row.cosmetic = cells[cols.cosmeticIdx]
    if (cols.functionalIdx >= 0 && cells[cols.functionalIdx]) row.functional = cells[cols.functionalIdx]
    if (cols.processorIdx >= 0 && cells[cols.processorIdx]) row.processor = cells[cols.processorIdx]
    if (cols.ramIdx >= 0 && cells[cols.ramIdx]) row.ram = cells[cols.ramIdx]

    rows.push(row)
  }

  return rows
}