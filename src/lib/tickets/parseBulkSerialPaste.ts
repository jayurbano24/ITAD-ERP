export type BulkSerialRow = {
  serial: string
  make: string
  model: string
  cosmetic?: string | null
  functional?: string | null
  processor?: string | null
  ram?: string | null
  screenSize?: string | null
  comments?: string | null
  finalStatus?: string | null
  additionalNotes?: string | null
}

const HEADER_ALIASES: Record<string, keyof BulkSerialRow | 'ignore'> = {
  device: 'ignore',
  make: 'make',
  model: 'model',
  'serial number': 'serial',
  serial: 'serial',
  'cosmetic conditions': 'cosmetic',
  'functional conditions': 'functional',
  'cpu / processor': 'processor',
  processor: 'processor',
  ram: 'ram',
  'screen size': 'screenSize',
  comments: 'comments',
  'final status': 'finalStatus',
  ' additional notes ': 'additionalNotes',
  'additional notes': 'additionalNotes',
  'serial-ta': 'serial',
  'serial ta': 'serial',
  marca: 'make',
  brand: 'make',
  procesador: 'processor',
  'rec: c': 'cosmetic',
  'rec: f': 'functional',
}

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function parseBulkSerialPaste(text: string): BulkSerialRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','

  const headerCells = lines[0].split(delimiter).map(normalizeHeader)
  const columnMap: Array<keyof BulkSerialRow | 'ignore' | null> = headerCells.map((h) => {
    if (HEADER_ALIASES[h]) return HEADER_ALIASES[h]
    if (h.includes('serial-ta') || h === 'serial ta') return 'serial'
    if (h.includes('serial') && (h.includes('serial- no') || h === 'serial no')) return 'ignore'
    if (h.includes('serial')) return 'serial'
    if (h === 'make' || h.includes('manufacturer')) return 'make'
    if (h === 'model') return 'model'
    return null
  })

  const serialIdx = columnMap.findIndex((c) => c === 'serial')
  const makeIdx = columnMap.findIndex((c) => c === 'make')
  const modelIdx = columnMap.findIndex((c) => c === 'model')
  if (serialIdx < 0) return []

  const rows: BulkSerialRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter)
    const serial = (cells[serialIdx] || '').trim().toUpperCase().replace(/\s+/g, '')
    if (!serial || serial.length < 4) continue

    const row: BulkSerialRow = {
      serial,
      make: (cells[makeIdx] || '').trim(),
      model: (cells[modelIdx] || '').trim(),
    }

    columnMap.forEach((key, idx) => {
      if (!key || key === 'ignore' || key === 'serial' || key === 'make' || key === 'model') return
      const value = (cells[idx] || '').trim()
      if (value) (row as Record<string, string>)[key] = value
    })

    rows.push(row)
  }

  return rows
}

/** Marca cuando el Excel solo trae columna Model (p. ej. Laptitude -5420, MacBook pro). */
export function inferMakeFromModel(modelRaw: string, makeHint = ''): string {
  const hint = makeHint.trim()
  if (hint) return hint
  const u = modelRaw.trim().toUpperCase()
  if (!u) return ''
  if (u.includes('LATITUDE') || u.includes('LAPTITUDE') || u.includes('INSPIRON') || u.includes('XPS')) return 'Dell'
  if (u.includes('MACBOOK') || u.includes('IMAC') || u.includes('IPAD')) return 'APPLE'
  if (u.includes('THINKPAD') || u.includes('IDEAPAD') || /\b20[UW][A-Z0-9]/.test(u)) return 'LENOVO'
  if (u.includes('ELITE') || u.includes('PROBOOK') || u.includes('ZBOOK')) return 'HP'
  return ''
}

/** Mapea fila del informe ITAD → marca/modelo del ticket en BD */
export function resolveTicketBrandModel(make: string, modelRaw: string): { brand: string; model: string } | null {
  const makeU = make.trim().toUpperCase()
  const modelU = modelRaw.trim().toUpperCase()

  let brand = make.trim()
  if (makeU.includes('DELL')) brand = 'Dell'
  else if (makeU.includes('LENOVO')) brand = 'LENOVO'
  else if (makeU.includes('APPLE')) brand = 'APPLE'
  else if (makeU.includes('HP')) brand = 'HP'

  if (brand === 'Dell') {
    if (modelU.includes('5420') || modelU.includes('LATITUDE')) {
      return { brand, model: 'Laptitude -5420' }
    }
    if (modelU.includes('INSPIRON')) {
      return { brand, model: 'Inspiron 13' }
    }
    return null
  }

  if (brand === 'APPLE') {
    if (!modelU.includes('MACBOOK')) return null
    if (modelU.includes('14,2') || modelU.includes('2017')) {
      return { brand, model: 'MacBook pro - A1989' }
    }
    return { brand, model: 'MacBook pro A1989' }
  }

  if (brand === 'HP') {
    if (modelU.includes('ZBOOK') || modelU.includes('STUDIO')) {
      return { brand, model: 'ZBPPK STUDIO' }
    }
    return null
  }

  if (brand === 'LENOVO') {
    if (modelU.includes('P15') || modelU.includes('P15 GEN') || modelU.includes('20SUS')) {
      return { brand, model: 'ThinkPad-P15 Gen-1' }
    }
    if (modelU.includes('20UD')) {
      return { brand, model: 'ThinkPad-T14 Gen-1' }
    }
    if (modelU.includes('20W1') || modelU.includes('20W0') || modelU.includes('20W0008')) {
      return { brand, model: 'ThinkPad-T14 Gen-2' }
    }
    const isGen2 =
      modelU.includes('GEN 2') ||
      modelU.includes('GEN-2') ||
      (modelU.includes('T14') && modelU.includes('GEN 2I'))
    if (isGen2) {
      return { brand, model: 'ThinkPad-T14 Gen-2' }
    }
    if (modelU.includes('T14') || modelU.includes('GEN 1') || modelU.includes('GEN-1')) {
      return { brand, model: 'ThinkPad-T14 Gen-1' }
    }
    if (modelU.includes('THINKPAD')) {
      return { brand, model: 'ThinkPad-T14 Gen-2' }
    }
    return null
  }

  return null
}