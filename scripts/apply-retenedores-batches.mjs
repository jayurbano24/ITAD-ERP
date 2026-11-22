/**
 * Aplica tmp/retenedores-sql/batch-*.sql vía Supabase Management API SQL.
 * Requiere: SUPABASE_ACCESS_TOKEN o ejecutar batches manualmente con MCP.
 * Alternativa: node con DATABASE_URL (Postgres directo).
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(__dirname, '..', 'tmp', 'retenedores-sql')
const conn = process.env.DATABASE_URL?.trim()

if (!conn) {
  console.error('DATABASE_URL no configurada (Supabase → Settings → Database → connection string)')
  process.exit(1)
}

const files = readdirSync(dir)
  .filter((f) => f.startsWith('batch-') && f.endsWith('.sql'))
  .sort()

const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
await client.connect()

try {
  for (const f of files) {
    const sql = readFileSync(path.join(dir, f), 'utf8')
    process.stdout.write(`Applying ${f}... `)
    await client.query(sql)
    console.log('ok')
  }
  const { rows } = await client.query('SELECT count(*)::int AS c FROM sat_withholding_agents')
  await client.query(
    `UPDATE company_settings SET sat_retenedores_last_sync_at = now() WHERE id = (SELECT id FROM company_settings LIMIT 1)`
  )
  console.log('Total agents:', rows[0]?.c)
} finally {
  await client.end()
}