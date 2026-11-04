/**
 * Parser for XSi / ITAD "Receipt of Equipment Containing Data" OCR text.
 * Tolerates OCR noise (broken labels, extra spaces, line wraps).
 */

export interface ReceiptEquipmentItem {
  product: string | null
  make: string | null
  model: string | null
  serial: string | null
  quantity: number
}

export interface ParsedEquipmentReceipt {
  orderNumber: string | null
  customer: string | null
  companyName: string | null
  collectionAddress: string | null
  pickupDate: string | null
  pickupDateIso: string | null
  projectId: string | null
  items: ReceiptEquipmentItem[]
  rawConfidenceNotes: string[]
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

function cleanLine(value: string): string {
  return value
    .replace(/[~\u00a0]+/g, ' ')
    .replace(/[|\[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeModelToken(value: string): string {
  // Latitude7430 → Latitude 7430
  return cleanLine(value.replace(/([A-Za-z])(\d)/g, '$1 $2'))
}

const KNOWN_BRANDS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Dell', pattern: /\bDell\b|\bDel{1,2}\b/i },
  { name: 'HP', pattern: /\bHP\b|\bHewlett\b/i },
  { name: 'Lenovo', pattern: /\bLenovo\b|\bThinkPad\b/i },
  { name: 'Apple', pattern: /\bApple\b|\bMacBook\b/i },
  { name: 'Acer', pattern: /\bAcer\b/i },
  { name: 'Asus', pattern: /\bAsus\b/i },
  { name: 'Microsoft', pattern: /\bMicrosoft\b|\bSurface\b/i },
  { name: 'Samsung', pattern: /\bSamsung\b/i },
  { name: 'Toshiba', pattern: /\bToshiba\b/i },
  { name: 'Cisco', pattern: /\bCisco\b/i },
  { name: 'Huawei', pattern: /\bHuawei\b/i },
]

function detectBrand(text: string): string | null {
  for (const brand of KNOWN_BRANDS) {
    if (brand.pattern.test(text)) return brand.name
  }
  return null
}

function detectModel(text: string): string | null {
  const latitude = text.match(/\bLatitude\s*[-]?\s*(\d{3,5}[A-Za-z]?)\b/i)
  if (latitude) return `Latitude ${latitude[1]}`
  const elitebook = text.match(/\bEliteBook\s*[-]?\s*(\d{3,5}[A-Za-z]?)\b/i)
  if (elitebook) return `EliteBook ${elitebook[1]}`
  const thinkpad = text.match(/\b(?:ThinkPad\s+)?([XTL]\d{1,2})\b/i)
  if (thinkpad) return thinkpad[0]
  return null
}

function detectProduct(text: string): string | null {
  if (/laptop|notebook|taptop|teptop|latop/i.test(text)) return 'Laptop'
  if (/desktop|optiplex|tower/i.test(text)) return 'Desktop'
  if (/monitor|display/i.test(text)) return 'Monitor'
  if (/server/i.test(text)) return 'Server'
  if (/tablet|ipad/i.test(text)) return 'Tablet'
  return null
}

function captureAfterLabel(
  text: string,
  labels: string[],
  options?: { requireSeparator?: boolean }
): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const sep = options?.requireSeparator ? '\\s*[:|-]\\s*' : '\\s*[:|-]?\\s*'
    const re = new RegExp(`${escaped}${sep}(.+)`, 'i')
    const match = text.match(re)
    if (match?.[1]) {
      // Take only the rest of the line (avoid swallowing following fields)
      let value = cleanLine(match[1].split(/\r?\n/)[0])
      value = value
        .replace(
          /\s+(Pickup Date|Project ID|Company Name|Collection Address|Customer|Item|Product|Make|Model|Serial Number)\b.*$/i,
          ''
        )
        .trim()
      if (value.length > 0) return value
    }
  }
  return null
}

function parsePickupDateToIso(raw: string | null): string | null {
  if (!raw) return null
  const cleaned = cleanLine(raw)

  const iso = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dmy = cleaned.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    return `${dmy[3]}-${month}-${day}`
  }

  const english = cleaned.match(/([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (english) {
    const month = MONTHS[english[1].toLowerCase()]
    if (month) {
      return `${english[3]}-${String(month).padStart(2, '0')}-${english[2].padStart(2, '0')}`
    }
  }

  return null
}

function extractOrderNumber(text: string): string | null {
  const match = text.match(/\b(ORD\s*[-]?\s*\d{4,})\b/i)
  if (!match) return null
  return match[1].replace(/\s+/g, '').toUpperCase()
}

function extractItems(text: string): ReceiptEquipmentItem[] {
  const notes: ReceiptEquipmentItem[] = []
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean)

  // Pipe / OCR-noisy rows: "| 1] taptop | Dell | Latitude7430 €Qa1T3"
  for (const rawLine of lines) {
    if (/^(item|product|make|model|serial|total|xsi|customer signature)/i.test(rawLine)) continue

    if (rawLine.includes('|')) {
      const cells = rawLine
        .split('|')
        .map((c) => cleanLine(c))
        .filter((c) => c.length > 0 && !/^[\d\W]+$/.test(c))
      // Expect product, make, model(+serial)
      if (cells.length >= 3) {
        const product = cells[0].replace(/^\d+\s*/, '')
        const make = cells[1]
        const rest = cells.slice(2).join(' ')
        const serialMatch = rest.match(/([A-Za-z0-9]{5,})\s*$/)
        const modelPart = serialMatch ? rest.slice(0, serialMatch.index).trim() : rest
        const serialRaw = serialMatch?.[1] || null
        notes.push({
          quantity: 1,
          product: /laptop|desktop|server|monitor|phone|tablet|hdd|ssd/i.test(product)
            ? product.replace(/teptop|taptop/i, 'Laptop')
            : product.replace(/teptop|taptop/i, 'Laptop'),
          make,
          model: normalizeModelToken(modelPart || rest),
          serial: serialRaw ? serialRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : null,
        })
        continue
      }
    }

    // Table-style row: "1 Laptop Dell Latitude 7430 CJQQ1T3"
    const row = rawLine.match(
      /^(\d+)\s+([A-Za-z][A-Za-z0-9\/\- ]+?)\s+([A-Za-z][A-Za-z0-9]+)\s+([A-Za-z0-9][A-Za-z0-9 \-]+?)\s+([A-Z0-9]{5,})\s*$/i
    )
    if (row) {
      notes.push({
        quantity: Number(row[1]) || 1,
        product: cleanLine(row[2]),
        make: cleanLine(row[3]),
        model: normalizeModelToken(row[4]),
        serial: cleanLine(row[5]).toUpperCase(),
      })
    }
  }

  if (notes.length > 0) {
    // Enrich first item with dictionary detection when OCR cells are noisy
    const first = notes[0]
    const detectedBrand = detectBrand(text)
    const detectedModel = detectModel(text)
    const detectedProduct = detectProduct(text)
    if (detectedBrand) first.make = detectedBrand
    if (detectedModel) first.model = detectedModel
    if (detectedProduct) first.product = detectedProduct
    return notes
  }

  // Labeled fields require ":" so table headers ("Make Model Serial") are ignored
  const serial = captureAfterLabel(
    text,
    ['Serial Number', 'Serial No', 'Serie', 'S/N'],
    { requireSeparator: true }
  )
  const make =
    captureAfterLabel(text, ['Make', 'Marca', 'Manufacturer', 'Brand'], {
      requireSeparator: true,
    }) || detectBrand(text)
  const model =
    captureAfterLabel(text, ['Model', 'Modelo'], { requireSeparator: true }) || detectModel(text)
  const product =
    captureAfterLabel(text, ['Product', 'Producto', 'Equipment Type'], {
      requireSeparator: true,
    }) || detectProduct(text)

  if (make || model || product || serial) {
    return [
      {
        product,
        make,
        model: model ? normalizeModelToken(model) : null,
        serial: serial ? serial.toUpperCase() : null,
        quantity: 1,
      },
    ]
  }

  // Last resort: brand/model dictionary over full OCR text
  const fallbackMake = detectBrand(text)
  const fallbackModel = detectModel(text)
  const fallbackProduct = detectProduct(text)
  if (fallbackMake || fallbackModel || fallbackProduct) {
    return [
      {
        product: fallbackProduct,
        make: fallbackMake,
        model: fallbackModel,
        serial: null,
        quantity: 1,
      },
    ]
  }

  return []
}

export function parseEquipmentReceiptText(ocrText: string): ParsedEquipmentReceipt {
  const text = ocrText.replace(/\u0000/g, '')
  const notes: string[] = []

  const orderNumber = extractOrderNumber(text)
  if (!orderNumber) notes.push('No se detectó número de orden (ORD…)')

  let customer = captureAfterLabel(text, ['Customer', 'Cliente'])
  // Avoid capturing "Customer Signature" as customer name
  if (customer && /signature|firma/i.test(customer)) {
    customer = null
  }

  const companyName = captureAfterLabel(text, ['Company Name', 'Company', 'Empresa', 'Razón Social'])
  let collectionAddress = captureAfterLabel(text, [
    'Collection Address',
    'Pickup Address',
    'Dirección de Recolección',
    'Direccion de Recoleccion',
    'Address',
  ])
  if (collectionAddress) {
    collectionAddress = collectionAddress.replace(/\bSta\b/gi, '5ta').replace(/\bSth\b/gi, '5th')
  }

  // Address often wraps; take until Pickup Date / Project if still short
  if (collectionAddress && collectionAddress.length < 20) {
    const block = text.match(
      /Collection Address\s*[:|-]?\s*([\s\S]*?)(?=Pickup Date|Project ID|Item\b|Product\b|$)/i
    )
    if (block?.[1]) {
      collectionAddress = cleanLine(block[1].replace(/\n/g, ' '))
    }
  }

  const pickupDateRaw = captureAfterLabel(text, ['Pickup Date', 'Fecha de Recolección', 'Fecha de Recoleccion', 'Collection Date'])
  const pickupDateIso = parsePickupDateToIso(pickupDateRaw)
  const projectId = captureAfterLabel(text, ['Project ID', 'Project Id', 'ID Proyecto', 'Proyecto'])

  const items = extractItems(text)
  if (items.length === 0) notes.push('No se detectaron equipos en la foto')

  return {
    orderNumber,
    customer: customer ? cleanLine(customer.split(/\s{2,}/)[0]) : null,
    companyName: companyName ? cleanLine(companyName.split(/\s{2,}/)[0]) : null,
    collectionAddress,
    pickupDate: pickupDateRaw ? cleanLine(pickupDateRaw) : null,
    pickupDateIso,
    projectId: projectId ? cleanLine(projectId.split(/\s/)[0]) : null,
    items,
    rawConfidenceNotes: notes,
  }
}
