/* eslint-disable */
import fs from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = { exports: {} }

const { parseWipeCertificateSummary } = await import('../src/lib/wipe/parseWipeReportPdf.ts')

const paths = [
  'tmp/wipe-sample.pdf',
  process.argv[2],
].filter(Boolean)

for (const p of paths) {
  if (!fs.existsSync(p)) continue
  const buf = fs.readFileSync(p)
  const { summary } = await parseWipeCertificateSummary(buf)
  console.log(
    JSON.stringify(
      {
        file: p.split(/[/\\]/).pop(),
        serie: summary.serie,
        modelo: summary.modelo,
        serieDisco: summary.serieDisco,
        capacidadDisco: summary.capacidadDisco,
        memoriaRam: summary.memoriaRam,
        estadoBorrado: summary.estadoBorrado,
      },
      null,
      2
    )
  )
}