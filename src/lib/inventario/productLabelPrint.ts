import { formatDiskLabel, formatRamLabel, resolveAssetHardwareSpecs } from '@/lib/inventario/resolveAssetHardwareSpecs'

/** Impresión de etiqueta de producto: DYMO LabelWriter, TSC y hoja. */

export type ProductLabelPrinterId =
  | 'sheet'
  | 'dymo-30256'
  | 'dymo-30252'
  | 'tsc-100x50'
  | 'tsc-58x40'

export type ProductLabelAsset = {
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  ticket_code?: string | null
  batch_code?: string | null
  specifications?: Record<string, unknown> | null
  inputClassifications?: { rec?: string; f?: string; c?: string }
  hardwareSpecs?: {
    processor?: string | null
    processor_generation?: string | null
    ram_capacity?: string | null
    ram_type?: string | null
    disk_capacity?: string | null
    disk_type?: string | null
  }
}

export type ProductLabelPrinterProfile = {
  id: ProductLabelPrinterId
  name: string
  /** Ancho físico de la etiqueta */
  widthMm: number
  /** Alto físico; null = altura automática (hoja) */
  heightMm: number | null
  pageSizeCss: string | null
  driverHint: string
  compact: boolean
}

export const PRODUCT_LABEL_PRINTERS: ProductLabelPrinterProfile[] = [
  {
    id: 'sheet',
    name: 'Hoja / impresora estándar',
    widthMm: 90,
    heightMm: null,
    pageSizeCss: null,
    driverHint: 'Use impresora de oficina o PDF. Escala 100%, sin márgenes.',
    compact: false,
  },
  {
    id: 'dymo-30256',
    name: 'DYMO LabelWriter 450 Turbo — rollo 30256 (59 × 102 mm)',
    widthMm: 59,
    heightMm: 102,
    pageSizeCss: '59mm 102mm',
    driverHint:
      'En el diálogo elija «DYMO LabelWriter 450 Turbo», rollo 30256 / Address. Escala 100%, márgenes ninguno.',
    compact: false,
  },
  {
    id: 'dymo-30252',
    name: 'DYMO LabelWriter — rollo 30252 (25 × 54 mm)',
    widthMm: 25,
    heightMm: 54,
    pageSizeCss: '25mm 54mm',
    driverHint: 'Rollo 30252 o equivalente. Contenido en modo compacto.',
    compact: true,
  },
  {
    id: 'tsc-100x50',
    name: 'TSC — 100 × 50 mm (4″ × 2″)',
    widthMm: 100,
    heightMm: 50,
    pageSizeCss: '100mm 50mm',
    driverHint:
      'Impresora TSC: etiqueta 100×50 mm, sin gap o gap según driver. Escala 100%, orientación horizontal.',
    compact: true,
  },
  {
    id: 'tsc-58x40',
    name: 'TSC — 58 × 40 mm',
    widthMm: 58,
    heightMm: 40,
    pageSizeCss: '58mm 40mm',
    driverHint: 'Etiqueta térmica 58×40 mm. Modo compacto.',
    compact: true,
  },
]

const STORAGE_KEY = 'itad-product-label-printer'

export function getProductLabelPrinterProfile(
  id: ProductLabelPrinterId
): ProductLabelPrinterProfile {
  return PRODUCT_LABEL_PRINTERS.find((p) => p.id === id) ?? PRODUCT_LABEL_PRINTERS[0]
}

export function loadProductLabelPrinterPreference(): ProductLabelPrinterId {
  if (typeof window === 'undefined') return 'dymo-30256'
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw && PRODUCT_LABEL_PRINTERS.some((p) => p.id === raw)) {
    return raw as ProductLabelPrinterId
  }
  return 'dymo-30256'
}

export function saveProductLabelPrinterPreference(id: ProductLabelPrinterId) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, id)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

export function buildProductLabelPrintDocument(input: {
  asset: ProductLabelAsset
  barcodeAbsoluteUrl: string
  brandLogoSrc: string
  printerId: ProductLabelPrinterId
}): string {
  const profile = getProductLabelPrinterProfile(input.printerId)
  const asset = input.asset
  const classifications = asset.inputClassifications || {}
  const resolved = resolveAssetHardwareSpecs(asset.specifications ?? null)
  const specs = { ...resolved, ...(asset.hardwareSpecs || {}) }
  const compact = profile.compact
  const diskLabel = formatDiskLabel(specs)

  const manufacturer = escapeHtml(asset.manufacturer || 'N/A')
  const model = escapeHtml(truncate(asset.model || 'N/A', compact ? 28 : 80))
  const assetType = escapeHtml(asset.asset_type || 'N/A')
  const ticket = escapeHtml(asset.ticket_code || 'N/A')
  const serial =
    asset.serial_number && compact
      ? escapeHtml(truncate(asset.serial_number, 20))
      : escapeHtml(asset.serial_number || '—')

  const pageRule = profile.pageSizeCss
    ? `@page { size: ${profile.pageSizeCss}; margin: 0; }`
    : '@page { margin: 8mm; }'

  const labelWidth = profile.heightMm ? `${profile.widthMm}mm` : '100%'
  const labelHeight = profile.heightMm ? `${profile.heightMm}mm` : 'auto'
  const labelMaxWidth = profile.heightMm ? undefined : '90mm'

  const fontBase = compact ? 6 : 9
  const fontSm = compact ? 5 : 7
  const fontVal = compact ? 6 : 8
  const logoH = compact ? 14 : 22
  const barcodeH = compact ? 22 : 36

  const classifHtml = [
    classifications.rec ? `<span class="classification">REC:${escapeHtml(classifications.rec)}</span>` : '',
    classifications.f ? `<span class="classification">F:${escapeHtml(classifications.f)}</span>` : '',
    classifications.c ? `<span class="classification">C:${escapeHtml(classifications.c)}</span>` : '',
  ]
    .filter(Boolean)
    .join('')

  const ramLabel = formatRamLabel(specs)
  const specParts: string[] = [
    `RAM ${escapeHtml(ramLabel || '—')}`,
    `Disco NVM ${escapeHtml(diskLabel || '—')}`,
  ]
  if (specs.processor && !compact) {
    specParts.push(`CPU ${escapeHtml(truncate(specs.processor, 40))}`)
  } else if (specs.processor && compact) {
    specParts.push(`CPU ${escapeHtml(truncate(specs.processor, 18))}`)
  }

  const specsHtml = specParts.map((s) => `<span class="spec">${s}</span>`).join('')
  const showSpecsBlock = specParts.length > 0

  const gridCols = compact ? '1fr' : '1fr 1fr'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta Techcorp</title>
  <style>
    ${pageRule}
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      border: ${compact ? '0.5px' : '1px'} solid #000;
      padding: ${compact ? '2px' : '4px'};
      width: ${labelWidth};
      ${labelMaxWidth ? `max-width: ${labelMaxWidth};` : ''}
      height: auto;
      min-height: ${profile.heightMm ? labelHeight : 'auto'};
      max-height: none;
      overflow: visible;
      font-size: ${fontBase}px;
    }
    .brand-row {
      text-align: center;
      margin-bottom: 2px;
      padding-bottom: 2px;
      border-bottom: 0.5px solid #ccc;
    }
    .brand-logo {
      height: ${logoH}px;
      width: auto;
      max-width: 90%;
      object-fit: contain;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      font-size: ${fontSm}px;
      border-bottom: 0.5px solid #ccc;
      padding: 1px 0;
      margin-bottom: 2px;
    }
    .header-item { flex: 1; text-align: center; }
    .header-item .muted { color: #666; font-size: ${fontSm}px; }
    .header-item .val { font-weight: bold; }
    .barcode-row {
      text-align: center;
      margin-bottom: 2px;
    }
    .barcode-row .sn-title {
      font-weight: bold;
      font-size: ${fontSm}px;
      text-transform: uppercase;
    }
    .barcode-row img {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      height: ${barcodeH}px;
      object-fit: contain;
    }
    .serial-text {
      font-family: monospace;
      font-size: ${fontSm}px;
      font-weight: bold;
      margin-top: 1px;
    }
    .data-grid {
      display: grid;
      grid-template-columns: ${gridCols};
      gap: 2px;
    }
    .label-title {
      font-weight: bold;
      font-size: ${fontSm}px;
      text-transform: uppercase;
      color: #333;
    }
    .label-value {
      font-size: ${fontVal}px;
      font-weight: bold;
      line-height: 1.1;
      word-break: break-word;
    }
    .classifications, .specifications-list {
      display: flex;
      flex-wrap: wrap;
      gap: 1px;
    }
    .classification {
      background: #e3f2fd;
      border: 0.5px solid #1976d2;
      padding: 0 2px;
      font-size: ${fontSm}px;
      font-weight: bold;
      border-radius: 1px;
    }
    .spec {
      background: #f3e5f5;
      border: 0.5px solid #7b1fa2;
      padding: 0 2px;
      font-size: ${fontSm}px;
      font-weight: bold;
      border-radius: 1px;
    }
    .specs-block { margin-top: 2px; }
  </style>
</head>
<body>
  <div class="label">
    <div class="brand-row">
      <img src="${input.brandLogoSrc}" alt="Techcorp TC" class="brand-logo" />
    </div>
    <div class="header-info" style="justify-content: center;">
      <div class="header-item" style="flex: none; min-width: 100%;">
        <div class="muted">Ticket</div>
        <div class="val">${ticket}</div>
      </div>
    </div>
    <div class="barcode-row">
      <div class="sn-title">S/N</div>
      <img src="${input.barcodeAbsoluteUrl}" alt="Barcode" />
      <div class="serial-text">${serial}</div>
    </div>
    <div class="data-grid">
      <div>
        <div class="label-title">Marca</div>
        <div class="label-value">${manufacturer}</div>
      </div>
      ${
        compact
          ? `<div>
        <div class="label-title">Modelo · Tipo</div>
        <div class="label-value">${model} · ${assetType}</div>
      </div>`
          : `<div>
        <div class="label-title">Modelo</div>
        <div class="label-value">${model}</div>
      </div>
      <div>
        <div class="label-title">Tipo</div>
        <div class="label-value">${assetType}</div>
      </div>
      ${
        classifHtml
          ? `<div>
        <div class="label-title">Clasificación</div>
        <div class="classifications">${classifHtml}</div>
      </div>`
          : ''
      }`
      }
      ${
        compact && classifHtml
          ? `<div>
        <div class="label-title">Clasif.</div>
        <div class="classifications">${classifHtml}</div>
      </div>`
          : ''
      }
      ${
        showSpecsBlock
          ? `<div class="specs-block" style="grid-column: 1 / -1;">
        <div class="label-title">${compact ? 'Specs' : 'Especificaciones'}</div>
        <div class="specifications-list">${specsHtml}</div>
      </div>`
          : ''
      }
    </div>
  </div>
</body>
</html>`
}

/** Ancho de vista previa en pantalla (px) ~ mm × 3.78 */
export function labelPreviewWidthPx(profile: ProductLabelPrinterProfile): number {
  if (profile.id === 'sheet') return 360
  return Math.round(profile.widthMm * 3.78)
}