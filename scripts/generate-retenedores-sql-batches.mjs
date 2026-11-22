import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function normalizeNitForLookup(nit) {
  const raw = nit.trim().toUpperCase()
  const compact = raw.replace(/\s/g, '').replace(/-/g, '')
  const withK = compact.match(/^(\d{4,12})(K)$/)
  if (withK) return `${withK[1]}K`
  const digits = compact.replace(/[^0-9]/g, '')
  if (digits.length < 4) return null
  return digits
}

function formatNitGt(nit) {
  const raw = nit.trim().toUpperCase()
  if (/K$/i.test(raw.replace(/\s/g, '').replace(/-/g, ''))) {
    const base = raw.replace(/[^0-9]/g, '')
    if (base.length >= 2) return `${base.slice(0, -1)}-${base.slice(-1)}K`
    return raw
  }
  const norm = normalizeNitForLookup(nit)
  if (!norm || norm.length <= 1) return norm || raw
  return `${norm.slice(0, -1)}-${norm.slice(-1)}`
}

const SAT_LIST_ROW = /^\s*\d+\s+(\d{4,12}K?)\s+(.+)$/
const SAT_DATE_SUFFIX = /\s+\d{1,2}\/\d{1,2}\/\d{4}\s*$/

function extract(text) {
  const map = new Map()
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || /^NO\.?\s+NIT\b/i.test(trimmed)) continue
    const satRow = trimmed.match(SAT_LIST_ROW)
    if (!satRow) continue
    const norm = normalizeNitForLookup(satRow[1])
    if (!norm || map.has(norm)) continue
    let name = satRow[2].replace(SAT_DATE_SUFFIX, '').trim().replace(/^["']|["']$/g, '')
    map.set(norm, {
      nit_normalized: norm,
      display_nit: formatNitGt(satRow[1]),
      legal_name: name.length > 2 ? name.slice(0, 240) : null,
    })
  }
  return [...map.values()]
}

function sqlLit(s) {
  if (s == null) return 'NULL'
  return `'${String(s).replace(/'/g, "''")}'`
}

const pdfPath =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || '',
    '.cursor',
    'projects',
    'c-Users-Usuario01-ITAD-ERP-GUATEMALA',
    'attachments',
    'ae84dc02-35cf-4fae-b4a0-b231b2e55839',
    'LISTADO-DE-AGENTES-DE-RETENCION-DEL-IVA-AL-01-11-2026.pdf'
  )

const { PDFParse } = await import('pdf-parse').then((m) => m.default || m)
const buf = readFileSync(pdfPath)
const parser = new PDFParse({ data: buf })
const { text } = await parser.getText()
const agents = extract(text || '')
const importId = process.argv[3] || '00000000-0000-0000-0000-000000000001'
const outDir = path.join(__dirname, '..', 'tmp', 'retenedores-sql')
mkdirSync(outDir, { recursive: true })

const batchSize = 350
const files = []
for (let i = 0; i < agents.length; i += batchSize) {
  const slice = agents.slice(i, i + batchSize)
  const values = slice
    .map(
      (a) =>
        `(${sqlLit(a.nit_normalized)}, ${sqlLit(a.display_nit)}, ${sqlLit(a.legal_name)}, '${importId}'::uuid, true)`
    )
    .join(',\n')
  const clear = i === 0 ? 'DELETE FROM public.sat_withholding_agents;\n' : ''
  const sql = `${clear}INSERT INTO public.sat_withholding_agents (nit_normalized, display_nit, legal_name, import_id, active) VALUES\n${values};`
  const fn = path.join(outDir, `batch-${String(Math.floor(i / batchSize)).padStart(3, '0')}.sql`)
  writeFileSync(fn, sql, 'utf8')
  files.push(fn)
}

writeFileSync(
  path.join(outDir, 'meta.json'),
  JSON.stringify({ agentCount: agents.length, batches: files.length, importId }, null, 2)
)
console.log(JSON.stringify({ agentCount: agents.length, batches: files.length, outDir }))