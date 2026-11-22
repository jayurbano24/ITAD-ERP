/* Carga local del PDF SAT → sat_withholding_agents (requiere .env.local + SERVICE_ROLE) */
const { readFileSync } = require('node:fs')
const { createHash } = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')
const path = require('node:path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

function normalizeNitForLookup(nit) {
  const raw = nit.trim().toUpperCase()
  if (!raw || raw === 'CF') return null
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

function extractWithholdingAgentsFromText(text) {
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
  return Array.from(map.values())
}

async function parsePdf(buffer) {
  const { PDFParse } = require('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  const agents = extractWithholdingAgentsFromText(result.text || '')
  if (!agents.length) throw new Error('No se detectaron NIT en el PDF')
  return agents
}

async function main() {
  const pdfPath =
    process.argv[2] ||
    path.join(
      'C:',
      'Users',
      'Usuario01',
      '.cursor',
      'projects',
      'c-Users-Usuario01-ITAD-ERP-GUATEMALA',
      'attachments',
      'ae84dc02-35cf-4fae-b4a0-b231b2e55839',
      'LISTADO-DE-AGENTES-DE-RETENCION-DEL-IVA-AL-01-11-2026.pdf'
    )

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')

  const buffer = readFileSync(pdfPath)
  const agents = await parsePdf(buffer)
  const sha = createHash('sha256').update(buffer).digest('hex')
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: importRow, error: importErr } = await supabase
    .from('sat_withholding_agent_imports')
    .insert({
      source_type: 'pdf_upload',
      source_label: path.basename(pdfPath),
      nit_count: agents.length,
      file_sha256: sha,
    })
    .select('id')
    .single()
  if (importErr) throw importErr

  await supabase.from('sat_withholding_agents').delete().neq('nit_normalized', '__none__')

  const chunkSize = 400
  for (let i = 0; i < agents.length; i += chunkSize) {
    const slice = agents.slice(i, i + chunkSize).map((a) => ({
      nit_normalized: a.nit_normalized,
      display_nit: a.display_nit,
      legal_name: a.legal_name,
      import_id: importRow.id,
      active: true,
    }))
    const { error } = await supabase.from('sat_withholding_agents').upsert(slice, {
      onConflict: 'nit_normalized',
    })
    if (error) throw error
    process.stdout.write(`\r${Math.min(i + chunkSize, agents.length)} / ${agents.length}`)
  }

  const { data: settingsRow } = await supabase.from('company_settings').select('id').limit(1).maybeSingle()
  if (settingsRow?.id) {
    await supabase
      .from('company_settings')
      .update({ sat_retenedores_last_sync_at: new Date().toISOString() })
      .eq('id', settingsRow.id)
  }

  console.log('\nImportado:', agents.length, 'NIT ·', importRow.id)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})