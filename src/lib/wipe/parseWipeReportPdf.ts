import 'server-only'

import { ensurePdfParseWorker } from '@/lib/pdf/ensurePdfParseWorker'
import { resolveWipeDisplayModel } from '@/lib/wipe/resolveWipeDisplayModel'

export type WipeDiskInfo = {
  index: number
  vendor: string | null
  model: string | null
  serial: string | null
  size: string | null
  bus: string | null
  wipeStatus: string | null
  destruction: string | null
  method: string | null
  startEnd: string | null
  duration: string | null
  health: string | null
}

export type WipeReportOrder = {
  prefix: string | null
  make: string | null
  model: string | null
  /** MTM / código fábrica (Lenovo 20xxx) */
  modelMtm: string | null
  /** Nombre comercial (ej. ThinkPad T14 Gen 2) */
  displayModel: string | null
  systemVersion: string | null
  serialNumber: string | null
  customerAssetTag: string | null
  mainBoardPart: string | null
  ramCapacityGb: string | null
  ramType: string | null
  cpu: string | null
  hddCount: number | null
  ssd: string | null
  screenSize: string | null
  weightLbs: string | null
  weightKg: string | null
  powerOnOverHeat: string | null
  battery: string | null
  charger: string | null
  screen: string | null
  keyboard: string | null
  testDate: string | null
  technicianName: string | null
  comments: string | null
  errors: string[]
  processedTime: string | null
  disks: WipeDiskInfo[]
  software: string | null
  customerName: string | null
  reportUuid: string | null
  rawExcerpt: string | null
}

function pick(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].replace(/\s+/g, ' ').trim()
  }
  return null
}

function sliceBetween(text: string, start: RegExp, end: RegExp): string {
  const startM = text.match(start)
  if (!startM || startM.index === undefined) return ''
  const from = startM.index + startM[0].length
  const rest = text.slice(from)
  const endM = rest.match(end)
  const to = endM?.index ?? rest.length
  return rest.slice(0, to)
}

function looksLikeDiskModel(value: string): boolean {
  return /NVMe|SSD|SK hynix|KINGSTON|UMIS|SAMSUNG MZ|WD |WDC |PC SN|APPLE SSD|HFS\d|SKHynix_/i.test(value)
}

/** Seriales de almacenamiento (no chassis) — evita tomarlos como serie del activo. */
function looksLikeDiskSerial(serial: string): boolean {
  const s = serial.trim()
  if (!s) return true
  if (/^WD-/i.test(s)) return true
  if (/^(FDACN|FYB4N|FSACN|FJACN|CYA9N|SS0L|50026B|S4EN|UJUN|C027|819D)/i.test(s)) return true
  if (s.length >= 18 && /^[A-Z0-9]+$/.test(s)) return true
  if (/^CYA9N/i.test(s)) return true
  // Lenovo / Dell chassis típicos
  if (/^PF[0-9A-Z]{5,12}$/i.test(s)) return false
  if (/^C0[2-9][A-Z0-9]{8,12}$/i.test(s)) return false // Apple
  if (/^[A-Z0-9]{6,8}$/.test(s) && !/^[0-9]{6,}$/.test(s)) return false
  return s.length > 15
}

function textBeforeErasure(text: string): string {
  const idx = text.search(/Erasure Results/i)
  return idx > 0 ? text.slice(0, idx) : ''
}

/** Bloque inicial: Manufacturer / Model / Serial (antes de Erasure Results). */
function pickChassisSerialFromPreamble(text: string): string | null {
  const pre = textBeforeErasure(text)
  if (!pre || !/(?:Manufacturer|Chassis Type):/i.test(pre)) return null

  const afterModel = pick(pre, [
    /Model:\s*[^\n\t]+\s+Serial:\s*([A-Z0-9\-]+)/i,
    /Model:\s*[^\n]+\n\s*Serial:\s*([A-Z0-9\-]+)/i,
  ])
  if (afterModel && !looksLikeDiskSerial(afterModel)) return afterModel

  const scoped = pick(pre, [
    /(?:Manufacturer|Chassis Type):[\s\S]{0,1200}?Serial:\s*([A-Z0-9\-]+)/i,
  ])
  if (scoped && !looksLikeDiskSerial(scoped)) return scoped

  return null
}

function pickPreambleSystemModel(text: string): string | null {
  const pre = textBeforeErasure(text)
  if (!pre) return null
  const m = pick(pre, [/Model:\s*([^\n\t]+)/i])
  if (m && !looksLikeDiskModel(m) && !/Serial:/i.test(m)) return m
  return null
}

/** Pie de página Blancco: `..., DELL INC., LATITUDE 5420, 3H6Q6M3` */
function parseBlanccoBanner(text: string): { model: string | null; serial: string | null } {
  for (const rawLine of text.split(/\n/)) {
    const line = rawLine.trim()
    if (!/BLANCCO DRIVE ERASER|DRIVE ERASER 7/i.test(line)) continue
  if (!/(?:DELL|LENOVO|HP|Apple)/i.test(line)) continue

    const parts = line.split(',').map((p) => p.trim()).filter(Boolean)
    const brandIdx = parts.findIndex((p) =>
      /^(DELL INC\.|Dell Inc\.|LENOVO|HP Inc\.|HP\b|Apple)/i.test(p)
    )
    if (brandIdx >= 0 && parts.length > brandIdx + 2) {
      const model = parts[brandIdx + 1]
      const serial = parts[brandIdx + 2]
      if (serial && !looksLikeDiskSerial(serial)) {
        return { model: model && !looksLikeDiskModel(model) ? model : null, serial }
      }
    }
    if (parts.length >= 2) {
      const serial = parts[parts.length - 1]
      const model = parts[parts.length - 2]
      if (serial && !looksLikeDiskSerial(serial) && /^[A-Z0-9\-]{4,20}$/i.test(serial)) {
        return {
          model: model && !looksLikeDiskModel(model) ? model : null,
          serial,
        }
      }
    }
  }
  return { model: null, serial: null }
}

/** Serie del equipo (chassis), nunca la del disco. */
function pickSystemSerial(text: string): string | null {
  const fromPreamble = pickChassisSerialFromPreamble(text)
  if (fromPreamble) return fromPreamble

  const banner = parseBlanccoBanner(text)
  if (banner.serial) return banner.serial

  const hw = sliceBetween(
    text,
    /Hardware Details/i,
    /Testing\s*&\s*Diagnostics|Report Comments|Diagnostic Tests|Report Details/i
  )
  if (hw && /Manufacturer:/i.test(hw)) {
    const afterModel = pick(hw, [
      /Model:\s*[^\n\t]+\s+Serial:\s*([A-Z0-9\-]+)/i,
      /Model:\s*[^\n]+\n\s*Serial:\s*([A-Z0-9\-]+)/i,
    ])
    if (afterModel && !looksLikeDiskSerial(afterModel)) return afterModel

    const chassisOnly = pick(hw, [
      /Chassis Serial:\s*([A-Z0-9\-]+)/i,
      /System Serial(?: Number)?:\s*([A-Z0-9\-]+)/i,
    ])
    if (chassisOnly && !looksLikeDiskSerial(chassisOnly)) return chassisOnly
  }

  const explicit = pick(text, [
    /System Serial(?: Number)?:\s*([A-Z0-9\-]+)/i,
    /Chassis Serial:\s*([A-Z0-9\-]+)/i,
  ])
  if (explicit && !looksLikeDiskSerial(explicit)) return explicit

  return null
}

function pickSystemModel(text: string): string | null {
  const hw = sliceBetween(
    text,
    /Hardware Details/i,
    /Erasure Results|Testing\s*&\s*Diagnostics|Report Comments|Diagnostic Tests/i
  )
  if (hw) {
    const hwModel = pick(hw, [/Model:\s*([^\n\t]+)/i])
    if (hwModel && !looksLikeDiskModel(hwModel)) return hwModel
    if (hwModel && looksLikeDiskModel(hwModel)) {
      const chassis = pick(hw, [/Chassis Type:\s*([^\n\t]+)/i])
      const mfg = pick(hw, [/Manufacturer:\s*([^\n\t]+)/i])
      if (chassis && mfg) return `${mfg.replace(/\s*Inc\.?/i, '')} ${chassis}`.trim()
    }
  }

  const bannerModel = pick(text, [
    /(?:Dell Inc\.|DELL INC\.|LENOVO|HP Inc\.|HP\b|Apple)[^,\n]*,\s*([^,\n]+),\s*[A-Z0-9]{6,20}\b/i,
  ])
  if (bannerModel && !looksLikeDiskModel(bannerModel)) return bannerModel

  const sysTab = pick(text, [/SYSTEM MODEL\t([^\t\n]+)/i])
  if (sysTab && !looksLikeDiskModel(sysTab)) return sysTab

  return null
}

/** Nombre de archivo estándar para evidencia PDF por serie de equipo. */
export function wipeCertificatePdfFileName(serial: string, fallback = 'certificado.pdf'): string {
  const base = serial.trim().replace(/[^\w.-]+/g, '_')
  if (!base) return fallback.replace(/[^\w.\-]+/g, '_')
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`
}

function mapPrefix(chassisOrType: string | null, model: string | null): string | null {
  const source = `${chassisOrType || ''} ${model || ''}`.toLowerCase()
  if (/notebook|laptop|latitude|elitebook|thinkpad|macbook/.test(source)) return 'LAP'
  if (/desktop|tower|optiplex|precision tower/.test(source)) return 'DES'
  if (/server|poweredge|proliant/.test(source)) return 'SRV'
  if (/tablet|ipad/.test(source)) return 'TAB'
  return chassisOrType ? chassisOrType.slice(0, 3).toUpperCase() : null
}

function normalizeWipeStatus(status: string | null): string | null {
  if (!status) return null
  const s = status.toLowerCase()
  if (s.includes('erased')) return 'Erased'
  if (s.includes('pass') || s.includes('successful') || s.includes('success')) return 'Erased'
  if (s.includes('fail')) return 'Failed'
  return status
}

/** Resumen operativo para UI / reportes (lo que pide el módulo de borrado). */
export type WipeCertificateSummary = {
  marca: string | null
  modelo: string | null
  /** Código MTM Blancco (Lenovo) cuando difiere del nombre comercial */
  modeloMtm: string | null
  serie: string | null
  serieDisco: string | null
  borrado: boolean | null
  estadoBorrado: string | null
  certificadoId: string | null
  software: string | null
  capacidadDisco: string | null
  memoriaRam: string | null
  metodo: string | null
  fecha: string | null
}

/**
 * Blancco “summary / export” table:
 * UUID | PRODUCT NAME | DATE | ERASURE STATE | SYSTEM MANUFACTURER | SYSTEM MODEL | DISK CAPACITY
 */
function parseBlanccoSummaryTable(text: string): Partial<WipeReportOrder> | null {
  if (!/ERASURE STATE/i.test(text) || !/SYSTEM MANUFACTURER/i.test(text)) return null

  const line =
    text
      .split(/\n/)
      .map((l) => l.trim())
      .find(
        (l) =>
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(l) &&
          /Blancco|Drive Eraser|Successful|Failed|Erased/i.test(l)
      ) || null

  if (!line) return null

  const cols = line.split(/\t+/).map((c) => c.trim()).filter(Boolean)
  // Expected: uuid, product, date, state, manufacturer, model, capacity
  if (cols.length >= 6) {
    const reportUuid = cols[0]?.match(/[0-9a-f-]{36}/i)?.[0] || null
    const software = cols[1] || null
    const testDate = cols[2] || null
    const erasureState = cols[3] || null
    const make = (cols[4] || null)?.replace(/\s*Inc\.?/i, '').trim() || null
    const model = cols[5] || null
    const diskSize = cols[6] || null
    const wipedOk = /success|erased|pass/i.test(erasureState || '') || /\berased successfully\b/i.test(text)
    return {
      make,
      model,
      serialNumber: null,
      software,
      testDate,
      reportUuid,
      processedTime: testDate,
      disks: [
        {
          index: 1,
          vendor: make,
          model,
          serial: null,
          size: diskSize,
          bus: /NVMe/i.test(text) ? 'NVMe' : null,
          wipeStatus: wipedOk ? 'Pass' : normalizeWipeStatus(erasureState),
          destruction: 'No',
          method: pick(text, [/(NIST[^\n\t:]+)/i]),
          startEnd: testDate,
          duration: null,
          health: null,
        },
      ],
      comments: erasureState ? `Erasure state: ${erasureState}` : null,
      ssd: /NVMe|SSD/i.test(text) ? 'Yes' : null,
    }
  }

  // Fallback regex when tabs collapse to spaces
  const m = text.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s+([^\n]+?)\s+(\d{4}-\d{2}-\d{2}T[^\s]+)\s+(Successful|Failed|Erased|Pass)\s+([A-Za-z0-9 .]+?)\s+(Latitude|Precision|OptiPlex|ThinkPad|EliteBook|Pavilion|[A-Za-z0-9][A-Za-z0-9\- ]{2,40})\s+(\d+(?:\.\d+)?\s*GB)/i
  )
  if (!m) return null
  const erasedOk = /success|erased|pass/i.test(m[4]) || /\berased successfully\b/i.test(text)
  return {
    reportUuid: m[1],
    software: m[2].trim(),
    testDate: m[3],
    make: m[5].replace(/\s*Inc\.?/i, '').trim(),
    model: m[6].trim(),
    disks: [
      {
        index: 1,
        vendor: m[5].replace(/\s*Inc\.?/i, '').trim(),
        model: m[6].trim(),
        serial: null,
        size: m[7].replace(/\s+/g, ' '),
        bus: /NVMe/i.test(text) ? 'NVMe' : null,
        wipeStatus: erasedOk ? 'Pass' : 'Fail',
        destruction: 'No',
        method: pick(text, [/(NIST[^\n\t:]+)/i]),
        startEnd: m[3],
        duration: null,
        health: null,
      },
    ],
    comments: `Erasure state: ${m[4]}`,
  }
}

export function toWipeCertificateSummary(report: WipeReportOrder): WipeCertificateSummary {
  const disk = report.disks?.[0]
  const status = normalizeWipeStatus(disk?.wipeStatus) || (report.comments?.match(/Erasure state:\s*([^\n·]+)/i)?.[1] ?? null)
  const borrado =
    status == null
      ? /\berased successfully\b/i.test(report.rawExcerpt || '') || /\bStatus:\s*Erased/i.test(report.rawExcerpt || '')
        ? true
        : null
      : /erased|pass|success/i.test(status)

  const estadoBorrado =
    status ||
    (borrado === true ? 'Erased' : borrado === false ? 'Failed' : null)

  const { modelo, modeloMtm } = resolveWipeDisplayModel(
    report.make,
    report.modelMtm || report.model,
    report.rawExcerpt || null,
    report.systemVersion
  )

  return {
    marca: report.make,
    modelo,
    modeloMtm,
    serie: report.serialNumber || null,
    serieDisco: disk?.serial || null,
    borrado,
    estadoBorrado,
    certificadoId: report.reportUuid,
    software: report.software,
    capacidadDisco: disk?.size || null,
    memoriaRam: report.ramCapacityGb || null,
    metodo: disk?.method || null,
    fecha: report.testDate || report.processedTime || null,
  }
}

/**
 * Extrae campos de un reporte Blancco / WipeDrive (texto OCR/PDF).
 */
export function parseWipeReportText(rawText: string): WipeReportOrder {
  const text = rawText.replace(/\u0000/g, ' ').replace(/\r/g, '')

  const summary = parseBlanccoSummaryTable(text)

  const make =
    summary?.make ||
    pick(text, [
      /Manufacturer:\s*([^\n\t]+)/i,
      /Make:\s*([^\n\t]+)/i,
      /SYSTEM MANUFACTURER\s+[^\n]*\n[^\n]*?\t[^\t]*\t[^\t]*\t[^\t]*\t([^\t]+)\t/i,
    ])?.replace(/\s*Inc\.?/i, '').trim() ||
    null

  const bannerMeta = parseBlanccoBanner(text)
  const systemModel = pickPreambleSystemModel(text) || pickSystemModel(text) || bannerMeta.model
  const model =
    (summary?.model && !looksLikeDiskModel(summary.model) ? summary.model : null) ||
    systemModel ||
    pick(text, [/SYSTEM MODEL\t([^\t\n]+)/i]) ||
    null

  const serialNumber = pickSystemSerial(text) || summary?.serialNumber || null
  const chassis = pick(text, [/Chassis Type:\s*([^\n\t]+)/i])
  const mainBoardPart = pick(text, [
    /Motherboard:\s*[^\n,]*,\s*([A-Z0-9\-]+)/i,
    /Main Board Part:\s*([^\n\t]+)/i,
    /System Board:\s*([^\n\t]+)/i,
  ])
  const totalMemoryRaw = pick(text, [
    /Total Memory:\s*([0-9]+)\s*GB/i,
    /Total Memory:\s*([0-9]+)\s*MB/i,
  ])
  const totalMemoryUnit = /Total Memory:\s*[0-9]+\s*GB/i.test(text)
    ? 'GB'
    : /Total Memory:\s*[0-9]+\s*MB/i.test(text)
      ? 'MB'
      : null
  const totalMemoryGb =
    (totalMemoryRaw && totalMemoryUnit === 'MB'
      ? String(Math.round(Number(totalMemoryRaw) / 1024) || Number(totalMemoryRaw) / 1024)
      : totalMemoryRaw) ||
    pick(text, [/Memory Bank:\s*(\d+)\s*GB/i, /Total Memory Size:\s*(\d+)\s*GB/i])
  const ramType = pick(text, [/Memory Bank:.*?,\s*[0-9]+MB,\s*[0-9]+MHz,\s*(DDR[0-9]+)/i])
  const cpu = pick(text, [
    /([0-9]+th Gen Intel\(R\) Core\(TM\) i[0-9]-[0-9A-Z]+)/i,
    /Processor:\s*[^\n]*?((?:Intel|AMD)[^\n,]{8,90})/i,
    /(AMD Ryzen[^\n,]{5,60})/i,
  ])
  const screenSize = pick(text, [/Size:\s*([0-9]+(?:\.[0-9]+)?)"/i, /Screen Size:\s*([0-9]+(?:\.[0-9]+)?)/i])
  const technicianName = pick(text, [
    /Erasure Technician:\s*\n?\s*([A-ZÁÉÍÓÚÑ][^\n]+)/i,
    /Erasure Technician:\s*([^\n]+)/i,
    /Technician Name:\s*([^\n]+)/i,
  ])
  const customerName = pick(text, [
    /Customer Name:\s*\n?\s*([^\n]+)/i,
  ])
  const testDate = pick(text, [
    /Report Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}[^\n]*)/i,
    /Start\/End Time:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}[^\n]*)/i,
  ])
  const processedTime = pick(text, [
    /Start\/End Time:\s*([^\n]+)/i,
    /([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9:]{8}).*BLANCCO/i,
  ])
  const software = pick(text, [
    /(BLANCCO DRIVE ERASER [0-9.]+)/i,
    /(Blancco Drive Eraser [0-9.]+)/i,
    /Software Version:\s*([^\n]+)/i,
    /(WipeDrive[^\n]*)/i,
  ])
  const reportUuid = pick(text, [/Report UUID:\s*([a-f0-9\-]+)/i])
  const method = pick(text, [/Method:\s*([^\n]+)/i])

  const batteryCapacity = pick(text, [/Battery capacity:\s*(Successful|Failed|Not performed|Not available)/i])
  const batteryDetail = pick(text, [/Battery capacity:\s*[^\n]*\n\s*([^\n]+)/i])
  const batteryCharge = pick(text, [/Charge level:\s*([0-9]+\s*%)/i])
  const battery =
    [batteryCapacity, batteryDetail, batteryCharge ? `Charge ${batteryCharge}` : null]
      .filter(Boolean)
      .join(' ') || null

  const cpuBasic = pick(text, [/CPU basic:\s*(Successful|Failed|Not performed)/i])
  const cpuStress = pick(text, [/CPU stress:\s*(Successful|Failed|Not performed)/i])
  const powerOnOverHeat = [cpuBasic && `CPU basic: ${cpuBasic}`, cpuStress && `CPU stress: ${cpuStress}`]
    .filter(Boolean)
    .join(' / ') || null

  const screen = pick(text, [/Display:\s*(Successful|Failed|Not performed)/i])
  const keyboard = pick(text, [/Keyboard:\s*(Successful|Failed|Not performed)/i])

  /** Bloques Blancco Drive Eraser: Vendor/Model/Serial/Size/Bus/.../Status: Erased */
  const parsedDisksFromBlocks: WipeDiskInfo[] = []
  const erasureBlockRegex =
    /Vendor:\s*([^\n\t]+?)\s+Model:\s*([^\n\t]+?)\s+Serial:\s*([A-Z0-9\-]+)\s+Size:\s*([0-9.]+\s*GB|[0-9.]+\s*TB)\s+Bus:\s*(NVMe|SATA|SAS|USB)[\s\S]*?Method:\s*([^\n\t]+)[\s\S]*?Status:\s*(Erased|Failed|Pass|Partial|Successful)/gi
  let blockMatch: RegExpExecArray | null
  let diskIndex = 0
  while ((blockMatch = erasureBlockRegex.exec(text)) !== null) {
    diskIndex += 1
    parsedDisksFromBlocks.push({
      index: diskIndex,
      vendor: blockMatch[1].replace(/\s+/g, ' ').trim(),
      model: blockMatch[2].replace(/\s+/g, ' ').trim(),
      serial: blockMatch[3].trim(),
      size: blockMatch[4].replace(/\s+/g, ''),
      bus: blockMatch[5],
      wipeStatus: normalizeWipeStatus(blockMatch[7]),
      destruction: 'No',
      method: blockMatch[6].replace(/\s+/g, ' ').trim(),
      startEnd: pick(blockMatch[0], [/Start\/End Time:\s*([^\n]+)/i]),
      duration: pick(blockMatch[0], [/Duration:\s*([0-9:]+)/i]),
      health: pick(blockMatch[0], [/Health Status:\s*([a-zA-Z]+)/i]),
    })
  }

  const diskWipeStatus =
    summary?.disks?.[0]?.wipeStatus ||
    parsedDisksFromBlocks[0]?.wipeStatus ||
    pick(text, [
      /Status:\s*(Erased|Failed|Pass|Partial|Successful)/i,
      /ERASURE STATE\s+[^\n]*\n[^\n]*?\t[^\t]*\t[^\t]*\t([^\t]+)/i,
      /(\d+)\s+erased successfully/i,
    ])
  const diskSerial =
    parsedDisksFromBlocks[0]?.serial ||
    pick(text, [
      /Erasure Results[\s\S]*?Serial:\s*([A-Z0-9\-]+)/i,
      /Disk: 1[\s\S]*?Serial:\s*([A-Z0-9\-]+)/i,
    ])
  const diskSize =
    summary?.disks?.[0]?.size ||
    parsedDisksFromBlocks[0]?.size ||
    pick(text, [
      /Erasure Results[\s\S]*?Size:\s*([0-9.]+\s*GB)/i,
      /KIOXIA[\s\S]*?(512GB|256GB|1TB|[0-9]+GB)/i,
      /(\d+(?:\.\d+)?\s*GB)\s*(?:\n|$)/i,
    ])
  const diskVendor =
    summary?.disks?.[0]?.vendor ||
    parsedDisksFromBlocks[0]?.vendor ||
    pick(text, [/Erasure Results[\s\S]*?Vendor:\s*([^\n\t]+)/i])
  const diskModel =
    summary?.disks?.[0]?.model ||
    parsedDisksFromBlocks[0]?.model ||
    pick(text, [
      /Erasure Results[\s\S]*?Vendor:[^\n]*Model:\s*([^\n\t]+?)\s+Serial:/i,
      /Erasure Results[\s\S]*?Model:\s*\n?\s*([^\n]+)/i,
    ])
  const diskBus =
    summary?.disks?.[0]?.bus ||
    parsedDisksFromBlocks[0]?.bus ||
    pick(text, [/Bus:\s*(NVMe|SATA|SAS|USB)/i])
  const diskHealth =
    parsedDisksFromBlocks[0]?.health || pick(text, [/Health Status:\s*([a-zA-Z]+)/i])
  const duration =
    parsedDisksFromBlocks[0]?.duration || pick(text, [/Duration:\s*([0-9:]+)/i])

  const isSsd = /NVMe|SSD/i.test(text)
  const disks: WipeDiskInfo[] =
    summary?.disks && summary.disks.length > 0
      ? summary.disks
      : parsedDisksFromBlocks.length > 0
        ? parsedDisksFromBlocks
        : diskSerial || diskSize || diskWipeStatus
          ? [
              {
                index: 1,
                vendor: diskVendor,
                model: diskModel?.replace(/\s+/g, ' ').trim() || null,
                serial: diskSerial,
                size: diskSize,
                bus: diskBus,
                wipeStatus:
                  normalizeWipeStatus(diskWipeStatus) ||
                  (/\berased successfully\b/i.test(text) ? 'Pass' : null),
                destruction: /destruction|shredd|destruc/i.test(text) ? 'Yes' : 'No',
                method: method || summary?.disks?.[0]?.method || null,
                startEnd: processedTime,
                duration,
                health: diskHealth,
              },
            ]
          : []

  const errors: string[] = []

  const pushFailed = (label: string, status: string | null, detail?: string | null) => {
    if (!status || !/fail/i.test(status)) return
    const extra = detail?.replace(/\s+/g, ' ').trim()
    errors.push(extra ? `${label}: Failed ${extra}` : `${label}: Failed`)
  }

  const cpuStressDetail = pick(text, [/CPU stress:\s*Failed\s*\n?\s*([^\n]+)/i])
  const wifiDetail = pick(text, [/Wi-Fi adapter:\s*Failed\s*\n?\s*([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)?)/i])
  const micDetail = pick(text, [/Microphone:\s*Failed\s*\n?\s*([^\n]+)/i])

  pushFailed('Battery', batteryCapacity, batteryDetail)
  pushFailed('CPU stress', cpuStress, cpuStressDetail)
  pushFailed('CPU basic', cpuBasic)
  pushFailed('Display', screen)
  pushFailed('Keyboard', keyboard)
  pushFailed('Wi-Fi', pick(text, [/Wi-Fi adapter:\s*(Failed|Successful)/i]), wifiDetail)
  pushFailed('Microphone', pick(text, [/Microphone:\s*(Failed|Successful|Not available)/i]), micDetail)
  pushFailed('Motherboard', pick(text, [/Motherboard:\s*(Successful|Failed|Not performed)/i]))
  pushFailed('Webcam', pick(text, [/Webcam:\s*(Successful|Failed|Not available)/i]))
  pushFailed('Wipe', diskWipeStatus && /fail/i.test(diskWipeStatus) ? 'Failed' : null)

  // Captura genérica de líneas "X: Failed" no listadas arriba
  const failedLineRegex =
    /^(Battery capacity|CPU stress|CPU basic|Display|Keyboard|Wi-Fi adapter|Microphone|Motherboard|Webcam|Speaker|PC Speaker|Touchscreen|Optical Drive|TPM):\s*Failed\b/gim
  let failedMatch: RegExpExecArray | null
  while ((failedMatch = failedLineRegex.exec(text)) !== null) {
    const label = failedMatch[1]
    const already = errors.some((e) => e.toLowerCase().startsWith(label.toLowerCase().replace(' adapter', '').replace(' capacity', '')))
    if (!already && /fail/i.test(failedMatch[0])) {
      // ya cubierto por pushFailed en la mayoría; solo agrega si falta
      const short = label.replace(' capacity', '').replace(' adapter', '')
      if (!errors.some((e) => e.toLowerCase().includes(short.toLowerCase()))) {
        errors.push(`${short}: Failed`)
      }
    }
  }

  const commentsParts = [
    ...errors,
    method ? `Método: ${method}` : null,
    diskWipeStatus && !/fail/i.test(diskWipeStatus) ? `Wipe: ${diskWipeStatus}` : null,
  ].filter(Boolean)

  const systemVersion = pick(text, [
    /System Version:\s*([^\n\t]+)/i,
    /System SKU Number:[^\n]*?(ThinkPad[^\n]+)/i,
  ])
  const modelMtm =
    model && /^20[A-Z0-9]{4,}/i.test(model) ? model : null
  const { modelo: displayModel, modeloMtm } = resolveWipeDisplayModel(
    make,
    modelMtm || model,
    text,
    systemVersion
  )

  return {
    prefix: mapPrefix(chassis, model),
    make,
    model,
    modelMtm: modeloMtm || modelMtm,
    displayModel,
    systemVersion,
    serialNumber,
    customerAssetTag: null,
    mainBoardPart,
    ramCapacityGb: totalMemoryGb ? `${totalMemoryGb}GB` : null,
    ramType,
    cpu: cpu?.replace(/\s+/g, ' ').trim() || null,
    hddCount: disks.length || (isSsd ? 1 : null),
    ssd: summary?.ssd || (isSsd ? 'Yes' : 'No'),
    screenSize: screenSize ? `${screenSize}"` : null,
    weightLbs: null,
    weightKg: null,
    powerOnOverHeat,
    battery,
    charger: null,
    screen,
    keyboard,
    testDate: summary?.testDate || testDate,
    technicianName,
    comments: commentsParts.join(' · ') || summary?.comments || null,
    errors,
    processedTime: summary?.processedTime || processedTime,
    disks,
    software: summary?.software || software,
    customerName: customerName?.replace(/\s+/g, ' ').trim() || null,
    reportUuid: summary?.reportUuid || reportUuid,
    rawExcerpt: text.slice(0, 1200),
  }
}

export async function parseWipeReportPdfBuffer(buffer: Buffer): Promise<WipeReportOrder> {
  // pdf-parse v2: clase PDFParse (CJS)
  const pdfParseMod = require('pdf-parse') as {
    PDFParse?: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> }
  }
  const PDFParse = pdfParseMod.PDFParse
  if (!PDFParse) {
    throw new Error('pdf-parse no disponible (PDFParse)')
  }
  await ensurePdfParseWorker(PDFParse as unknown as Parameters<typeof ensurePdfParseWorker>[0])
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return parseWipeReportText(result.text || '')
}

export async function parseWipeCertificateSummary(
  buffer: Buffer
): Promise<{ report: WipeReportOrder; summary: WipeCertificateSummary }> {
  const report = await parseWipeReportPdfBuffer(buffer)
  return { report, summary: toWipeCertificateSummary(report) }
}
