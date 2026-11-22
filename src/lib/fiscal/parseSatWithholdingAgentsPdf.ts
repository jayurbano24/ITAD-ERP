import { formatNitGt, normalizeNitForLookup } from '@/lib/fiscal/nitGt'
import { ensurePdfParseWorker } from '@/lib/pdf/ensurePdfParseWorker'

export type ParsedWithholdingAgent = {
  nit_normalized: string
  display_nit: string
  legal_name: string | null
}

const NIT_WITH_HYPHEN = /\b(\d{1,8}-\d)\b/g
const NIT_RUN = /\b(\d{2,9})\s+(\d)\b/g
/** Listado SAT nov-2026: `1 101361769 "NOMBRE" 1/02/2023` */
const SAT_LIST_ROW = /^\s*\d+\s+(\d{4,12}K?)\s+(.+)$/
const SAT_DATE_SUFFIX = /\s+\d{1,2}\/\d{1,2}\/\d{4}\s*$/

function pushUnique(
  map: Map<string, ParsedWithholdingAgent>,
  displayNit: string,
  legalName: string | null
) {
  const norm = normalizeNitForLookup(displayNit)
  if (!norm || norm.length < 3) return
  if (map.has(norm)) return
  map.set(norm, {
    nit_normalized: norm,
    display_nit: formatNitGt(displayNit),
    legal_name: legalName,
  })
}

export function extractWithholdingAgentsFromText(text: string): ParsedWithholdingAgent[] {
  const map = new Map<string, ParsedWithholdingAgent>()
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^NO\.?\s+NIT\b/i.test(trimmed)) continue

    const satRow = trimmed.match(SAT_LIST_ROW)
    if (satRow) {
      const nitRaw = satRow[1]
      let name = satRow[2].replace(SAT_DATE_SUFFIX, '').trim()
      name = name.replace(/^["']|["']$/g, '').trim()
      pushUnique(map, nitRaw, name.length > 2 ? name.slice(0, 240) : null)
      continue
    }

    let match: RegExpExecArray | null
    NIT_WITH_HYPHEN.lastIndex = 0
    while ((match = NIT_WITH_HYPHEN.exec(trimmed)) !== null) {
      const nit = match[1]
      const before = trimmed.slice(0, match.index).trim()
      const after = trimmed.slice(match.index + nit.length).trim()
      const name = (before.length >= after.length ? before : after).replace(/\s{2,}/g, ' ').trim()
      pushUnique(map, nit, name.length > 2 ? name.slice(0, 240) : null)
    }

    NIT_RUN.lastIndex = 0
    while ((match = NIT_RUN.exec(trimmed)) !== null) {
      const combined = `${match[1]}${match[2]}`
      if (combined.length > 12) continue
      const nit = formatNitGt(combined)
      pushUnique(map, nit, null)
    }
  }

  const full = text
  NIT_WITH_HYPHEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = NIT_WITH_HYPHEN.exec(full)) !== null) {
    pushUnique(map, m[1], null)
  }

  return Array.from(map.values()).sort((a, b) => a.display_nit.localeCompare(b.display_nit))
}

type PdfParseCtor = new (opts: { data: Uint8Array }) => {
  getText: () => Promise<{ text: string }>
  setWorker?: (workerSrc?: string) => string
}

export async function parseSatWithholdingAgentsPdfBuffer(
  buffer: Buffer
): Promise<ParsedWithholdingAgent[]> {
  const pdfParseMod = require('pdf-parse') as { PDFParse?: PdfParseCtor }
  const PDFParse = pdfParseMod.PDFParse
  if (!PDFParse) {
    throw new Error('pdf-parse no disponible (PDFParse)')
  }
  await ensurePdfParseWorker(PDFParse as unknown as Parameters<typeof ensurePdfParseWorker>[0])
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  const agents = extractWithholdingAgentsFromText(result.text || '')
  if (agents.length === 0) {
    throw new Error(
      'No se detectaron NIT en el PDF. Verifica que sea el listado oficial de agentes retenedores SAT.'
    )
  }
  return agents
}