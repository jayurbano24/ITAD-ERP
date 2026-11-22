import { read, utils, type WorkBook, type WorkSheet } from 'xlsx'

export type ParsedReceptionRow = {
  brand: string | null
  model: string | null
  product_type: string | null
  color: string | null
  expected_serial: string | null
  quantity: number
}

export type ParseReceptionExcelResult = {
  rows: ParsedReceptionRow[]
  sheetName: string | null
  warnings: string[]
  xsiOrderNumber: string | null
  epcOrderNumber: string | null
}

const manifestColumns: Record<keyof Omit<ParsedReceptionRow, 'quantity'>, string[]> = {
  brand: [
    'brand',
    'marca',
    'marca_equipo',
    'make',
    'manufacturer',
    'fabricante',
    'oem',
    'vendor',
  ],
  model: [
    'model',
    'modelo',
    'modelnumber',
    'model_number',
    'modelname',
    'model_name',
    'partnumber',
    'part_number',
  ],
  color: ['color', 'colores'],
  product_type: [
    'product_type',
    'tipo_producto',
    'producto',
    'tipo',
    'product',
    'equipmenttype',
    'equipment_type',
    'tipoequipo',
  ],
  expected_serial: [
    'expected_serial',
    'serie_esperada',
    'serie',
    'serial',
    'serial_number',
    'serialnumber',
    'sn',
    'service_tag',
    'servicetag',
  ],
}

const quantityColumns = [
  'quantity',
  'cantidad',
  'qty',
  'q',
  'unidades',
  'cant',
  'count',
  'noofunits',
  'no_units',
  'units',
]

const normalizeHeader = (header: string) =>
  header
    .replace(/[_\s-]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const normalizedManifestColumns: Record<keyof Omit<ParsedReceptionRow, 'quantity'>, string[]> =
  Object.fromEntries(
    Object.entries(manifestColumns).map(([key, values]) => [
      key,
      values.map(normalizeHeader),
    ])
  ) as Record<keyof Omit<ParsedReceptionRow, 'quantity'>, string[]>

const normalizedQuantityColumns = quantityColumns.map(normalizeHeader)

const xsiOrderColumns = ['xsi', 'xsiorder', 'xsi_order', 'ord', 'orden', 'ordenn', 'order', 'ordernumber', 'order_number', 'po', 'purchaseorder'].map(
  normalizeHeader
)
const epcOrderColumns = ['epc', 'epcorder', 'epc_order', 'epcreference', 'referenciaepc'].map(normalizeHeader)

function extractOrderFromRows(rows: Record<string, unknown>[]): {
  xsiOrderNumber: string | null
  epcOrderNumber: string | null
} {
  let xsiOrderNumber: string | null = null
  let epcOrderNumber: string | null = null
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const nk = normalizeHeader(key)
      const val = row[key]
      if (val === null || val === undefined) continue
      const text = String(val).trim()
      if (!text) continue
      if (!xsiOrderNumber && xsiOrderColumns.includes(nk)) {
        xsiOrderNumber = text.replace(/\s+/g, '').toUpperCase()
      }
      if (!epcOrderNumber && epcOrderColumns.includes(nk)) {
        epcOrderNumber = text.replace(/\s+/g, '').toUpperCase()
      }
    }
    if (xsiOrderNumber && epcOrderNumber) break
  }
  return { xsiOrderNumber, epcOrderNumber }
}

function extractValue(row: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of Object.keys(row)) {
    if (!key) continue
    const normalizedKey = normalizeHeader(key)
    if (candidates.some((c) => c === normalizedKey)) {
      const value = row[key]
      if (value === null || value === undefined) continue
      const textValue = String(value).trim()
      if (textValue.length === 0) continue
      return textValue
    }
  }
  return null
}

function parseQuantity(value: unknown): number {
  if (value === null || value === undefined || value === '') return 1
  const n = Number(String(value).replace(/,/g, '').trim())
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(Math.floor(n), 9999)
}

function mapJsonRow(row: Record<string, unknown>): ParsedReceptionRow | null {
  const brand = extractValue(row, normalizedManifestColumns.brand)
  const model = extractValue(row, normalizedManifestColumns.model)
  const product_type = extractValue(row, normalizedManifestColumns.product_type)
  const color = extractValue(row, normalizedManifestColumns.color)
  const expected_serial = extractValue(row, normalizedManifestColumns.expected_serial)
  let quantity = 1
  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeHeader(key)
    if (normalizedQuantityColumns.includes(normalizedKey)) {
      quantity = parseQuantity(row[key])
      break
    }
  }

  if (!brand && !model && !product_type && !expected_serial) return null

  return {
    brand,
    model,
    product_type,
    color,
    expected_serial,
    quantity,
  }
}

function rowsFromObjects(rows: Record<string, unknown>[]): ParsedReceptionRow[] {
  const out: ParsedReceptionRow[] = []
  for (const row of rows) {
    const mapped = mapJsonRow(row)
    if (mapped) out.push(mapped)
  }
  return out
}

/** Encuentra fila de encabezados y devuelve objetos por fila de datos. */
function rowsFromMatrix(matrix: unknown[][]): ParsedReceptionRow[] {
  const headerIdx = matrix.findIndex((row) => {
    const cells = (row || []).map((c) => normalizeHeader(String(c ?? '')))
    const hasBrand = cells.some((c) => normalizedManifestColumns.brand.includes(c))
    const hasModel = cells.some((c) => normalizedManifestColumns.model.includes(c))
    return hasBrand || hasModel
  })
  if (headerIdx < 0) return []

  const headerRow = matrix[headerIdx] || []
  const keys = headerRow.map((h, i) => {
    const label = String(h ?? '').trim()
    return label || `col_${i}`
  })

  const objects: Record<string, unknown>[] = []
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r]
    if (!line || line.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue
    }
    const obj: Record<string, unknown> = {}
    keys.forEach((k, i) => {
      obj[k] = line[i]
    })
    objects.push(obj)
  }
  return rowsFromObjects(objects)
}

function parseSheet(worksheet: WorkSheet): ParsedReceptionRow[] {
  const asObjects = utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    blankrows: false,
  })
  const fromObjects = rowsFromObjects(asObjects)
  if (fromObjects.length > 0) return fromObjects

  const matrix = utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  })
  return rowsFromMatrix(matrix)
}

function parseWorkbook(workbook: WorkBook): ParseReceptionExcelResult {
  const warnings: string[] = []
  let xsiOrderNumber: string | null = null
  let epcOrderNumber: string | null = null
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) continue
    const rawObjects = utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      blankrows: false,
    })
    const orders = extractOrderFromRows(rawObjects)
    if (!xsiOrderNumber) xsiOrderNumber = orders.xsiOrderNumber
    if (!epcOrderNumber) epcOrderNumber = orders.epcOrderNumber

    const rows = parseSheet(worksheet)
    if (rows.length > 0) {
      return { rows, sheetName, warnings, xsiOrderNumber, epcOrderNumber }
    }
    warnings.push(`Hoja «${sheetName}»: sin filas con marca/modelo reconocibles.`)
  }
  return { rows: [], sheetName: null, warnings, xsiOrderNumber, epcOrderNumber }
}

export function parseReceptionExcelBuffer(buffer: Buffer): ParseReceptionExcelResult {
  try {
    const workbook = read(buffer, { type: 'buffer', cellDates: false })
    return parseWorkbook(workbook)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      rows: [],
      sheetName: null,
      warnings: [`No se pudo leer el Excel: ${message}`],
      xsiOrderNumber: null,
      epcOrderNumber: null,
    }
  }
}

/** Agrupa filas por marca + modelo + tipo (sin serie) y suma cantidades. */
export function aggregateReceptionRows(rows: ParsedReceptionRow[]): ParsedReceptionRow[] {
  const map = new Map<string, ParsedReceptionRow>()
  for (const raw of rows) {
    const brand = (raw.brand || 'SIN MARCA').trim()
    const model = (raw.model || 'SIN MODELO').trim()
    const product_type = (raw.product_type || 'Equipo').trim()
    const key = `${brand.toLowerCase()}|${model.toLowerCase()}|${product_type.toLowerCase()}`
    const prev = map.get(key)
    const qty = raw.quantity > 0 ? raw.quantity : 1
    if (prev) {
      prev.quantity += qty
    } else {
      map.set(key, {
        brand,
        model,
        product_type,
        color: raw.color,
        expected_serial: null,
        quantity: qty,
      })
    }
  }
  return Array.from(map.values())
}

export function isReceptionSpreadsheetFile(file: Pick<File, 'name' | 'type'>): boolean {
  const name = file.name.toLowerCase()
  if (/\.(xlsx|xls|csv)$/.test(name)) return true
  const t = (file.type || '').toLowerCase()
  return (
    t.includes('spreadsheet') ||
    t.includes('excel') ||
    t === 'text/csv' ||
    t === 'application/vnd.ms-excel'
  )
}

export function isReceiptPdfFile(file: Pick<File, 'name' | 'type'>): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return true
  const t = (file.type || '').toLowerCase()
  return t === 'application/pdf' || t === 'application/x-pdf'
}

export function bufferLooksLikePdf(buffer: ArrayBuffer | Buffer): boolean {
  const view =
    buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer))
  if (view.length < 5) return false
  return view.subarray(0, 5).toString('ascii') === '%PDF-'
}

export function isReceiptImageFile(file: Pick<File, 'name' | 'type'>): boolean {
  if (isReceptionSpreadsheetFile(file) || isReceiptPdfFile(file)) return false
  const t = (file.type || '').toLowerCase()
  if (t.startsWith('image/')) return true
  return /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(file.name)
}