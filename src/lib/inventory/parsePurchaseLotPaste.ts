export type ParsedPurchaseLine = {
  serial: string
  manufacturer: string | null
  model: string | null
  asset_type: string
  conditionGrade: string | null
  cost: number
  configuration: string | null
  hardwareSpecs: Record<string, string>
}

const KNOWN_BRANDS = [
  'MICROSOFT',
  'LENOVO',
  'DELL',
  'HP',
  'HEWLETT',
  'APPLE',
  'ASUS',
  'ACER',
  'SAMSUNG',
  'TOSHIBA',
  'FUJITSU',
  'MSI',
  'LG',
  'PANASONIC',
  'GOOGLE',
]

/** Mapea Grade A/B/C/D del Excel al enum condition_grade de assets. */
export function normalizeConditionGrade(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (/^grade\s*a\b|^a$/.test(s)) return 'Grade A'
  if (/^grade\s*b\b|^b$/.test(s)) return 'Grade B'
  if (/^grade\s*c\b|^c$/.test(s)) return 'Grade C'
  if (/^grade\s*d\b|^d$|scrap|fail/.test(s)) return 'Scrap'
  return null
}

export function splitManufacturerModel(raw: string | null | undefined): {
  manufacturer: string | null
  model: string | null
  asset_type: string
} {
  const text = (raw || '').trim().replace(/\s+/g, ' ')
  if (!text) return { manufacturer: null, model: null, asset_type: 'Laptop' }

  const upper = text.toUpperCase()
  let manufacturer: string | null = null
  let rest = text

  const brandLabels: Record<string, string> = {
    MICROSOFT: 'Microsoft',
    LENOVO: 'Lenovo',
    DELL: 'Dell',
    HP: 'HP',
    HEWLETT: 'HP',
    APPLE: 'Apple',
    ASUS: 'ASUS',
    ACER: 'Acer',
    SAMSUNG: 'Samsung',
    TOSHIBA: 'Toshiba',
    FUJITSU: 'Fujitsu',
    MSI: 'MSI',
    LG: 'LG',
    PANASONIC: 'Panasonic',
    GOOGLE: 'Google',
  }

  for (const brand of KNOWN_BRANDS) {
    if (upper.startsWith(brand + ' ') || upper === brand) {
      manufacturer = brandLabels[brand] || brand
      rest = text.slice(brand.length).trim()
      break
    }
  }

  // "SURFACE LAP" / "THINKPAD P1" etc.
  let model = rest || text
  let asset_type = 'Laptop'
  if (/desktop|optiplex|prodesk|elitedesk|sff|tower/i.test(text)) asset_type = 'Desktop'
  if (/monitor|display/i.test(text)) asset_type = 'Monitor'
  if (/surface|thinkpad|latitude|elitebook|macbook|notebook|lap\b/i.test(text)) asset_type = 'Laptop'

  // Normalizar abreviatura SURFACE LAP → Surface Laptop
  model = model.replace(/\bLAP\b/i, 'Laptop').replace(/\s+/g, ' ').trim()

  return { manufacturer, model: model || null, asset_type }
}

/** Extrae CPU / RAM / disco desde el string Configuration del Excel. */
export function parseConfigurationText(raw: string | null | undefined): {
  configuration: string | null
  hardwareSpecs: Record<string, string>
} {
  const configuration = (raw || '').trim() || null
  const hardwareSpecs: Record<string, string> = {}
  if (!configuration) return { configuration, hardwareSpecs }

  const cpu = configuration.match(
    /(Core i[3579][^\s;,]*(?:\s+[0-9A-Z]+)?(?:\s+[0-9.]+GHz)?|(?:Intel|AMD)[^;]{5,60})/i
  )
  if (cpu?.[1]) hardwareSpecs.processor = cpu[1].replace(/\s+/g, ' ').trim()

  const ram = configuration.match(/([0-9]+)\s*mb\s*RAM/i) || configuration.match(/([0-9]+)\s*GB\s*RAM/i)
  if (ram?.[1]) {
    const n = Number(ram[1])
    hardwareSpecs.ram_capacity = /mb\s*RAM/i.test(ram[0]) ? `${Math.round(n / 1024)}GB` : `${n}GB`
  }

  const disk =
    configuration.match(/HDD:\s*[0-9]+\s*-\s*([0-9.]+)\s*GB\s*(SSD|HDD|NVMe)?/i) ||
    configuration.match(/([0-9.]+)\s*GB\s*(SSD|HDD|NVMe)/i)
  if (disk?.[1]) {
    const gb = Math.round(Number(disk[1]))
    hardwareSpecs.disk_capacity = `${gb}GB`
    hardwareSpecs.disk_type = (disk[2] || 'SSD').toUpperCase()
  }

  const screen = configuration.match(/([0-9.]+)\s*(?:TFT|\"|inch)/i)
  if (screen?.[1]) hardwareSpecs.screen_size = `${screen[1]}"`

  return { configuration, hardwareSpecs }
}

function looksLikeHeader(parts: string[]): boolean {
  const joined = parts.join(' ').toLowerCase()
  return (
    joined.includes('serial') ||
    (joined.includes('manufacturer') && joined.includes('model')) ||
    joined.includes('precio base') ||
    joined.includes('configuration')
  )
}

function parseCostToken(raw: string): number | null {
  const cleaned = raw.replace(/[Qq$\s]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Formato plantilla Remarketing:
 * Serial # | Manufacturer Model | Condition | Precio base final | Configuration
 * También acepta variantes cortas (serie+costo, etc.).
 */
export function parsePurchaseLotPaste(text: string): ParsedPurchaseLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const out: ParsedPurchaseLine[] = []

  for (const line of lines) {
    // Prefer tab (Excel); fallback coma/punto y coma
    let parts = line.includes('\t')
      ? line.split('\t').map((p) => p.trim())
      : line.split(/[;]+/).map((p) => p.trim())

    // Si se pegó con comas pero Configuration tiene muchas comas, usar tab preferido;
    // con 5+ columnas tipicas del Excel: serial, model, grade, price, config...
    if (!line.includes('\t') && parts.length < 4) {
      parts = line.split(/[,;\t]+/).map((p) => p.trim())
    }

    if (parts.length === 0) continue
    if (looksLikeHeader(parts)) continue

    const serial = (parts[0] || '').replace(/^#/, '').trim()
    if (!serial || serial.length < 3) continue

    let manufacturer: string | null = null
    let model: string | null = null
    let asset_type = 'Laptop'
    let conditionGrade: string | null = null
    let cost: number | null = null
    let configuration: string | null = null

    if (parts.length === 2) {
      cost = parseCostToken(parts[1])
    } else if (parts.length === 3) {
      // serie | modelo | costo  OR serie | grade | costo
      if (/grade/i.test(parts[1])) {
        conditionGrade = normalizeConditionGrade(parts[1])
        cost = parseCostToken(parts[2])
      } else {
        const mm = splitManufacturerModel(parts[1])
        manufacturer = mm.manufacturer
        model = mm.model
        asset_type = mm.asset_type
        cost = parseCostToken(parts[2])
      }
    } else if (parts.length >= 4) {
      // serie | Manufacturer Model | Condition | Precio [| Configuration...]
      const mm = splitManufacturerModel(parts[1])
      manufacturer = mm.manufacturer
      model = mm.model
      asset_type = mm.asset_type
      conditionGrade = normalizeConditionGrade(parts[2])
      cost = parseCostToken(parts[3])
      if (parts.length >= 5) {
        configuration = parts.slice(4).join(' ').trim() || null
      }
      // Si la col 3 no era grade sino precio (formato viejo)
      if (cost == null && parseCostToken(parts[2]) != null && !/grade/i.test(parts[2])) {
        cost = parseCostToken(parts[2])
        model = parts[1]
        conditionGrade = null
        configuration = parts.slice(3).join(' ').trim() || null
      }
    }

    if (cost == null || cost < 0) continue

    const cfg = parseConfigurationText(configuration)
    out.push({
      serial: serial.toUpperCase(),
      manufacturer,
      model,
      asset_type,
      conditionGrade,
      cost,
      configuration: cfg.configuration,
      hardwareSpecs: cfg.hardwareSpecs,
    })
  }

  return out
}
