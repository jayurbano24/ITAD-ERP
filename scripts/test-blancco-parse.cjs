/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const { PDFParse } = require('pdf-parse')

// Inline: load parseWipeReportText via dynamic transpile-free path —
// duplicate call by evaluating the built source through Function is fragile;
// instead re-implement a smoke check with the same pickers for this fixture.
async function extractText(pdfPath) {
  const buf = fs.readFileSync(pdfPath)
  const parser = new PDFParse({ data: buf })
  const result = await parser.getText()
  return { buf, text: result.text || '' }
}

function pick(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].replace(/\s+/g, ' ').trim()
  }
  return null
}

async function main() {
  const pdfPath =
    process.argv[2] ||
    path.join(
      process.env.USERPROFILE || '',
      '.cursor/projects/c-Users-Usuario01-ITAD-ERP-GUATEMALA/attachments/ae84dc02-35cf-4fae-b4a0-b231b2e55839/b6501f53-515a-4be5-93a3-cbc09b3209ed.pdf'
    )

  const { text } = await extractText(pdfPath)
  const make = pick(text, [/Manufacturer:\s*([^\n\t]+)/i])?.replace(/\s*Inc\.?/i, '').trim()
  const model = pick(text, [/Model:\s*([^\n\t]+)/i])
  const serie = pick(text, [/Serial:\s*([A-Z0-9\-]+)/i])
  const statuses = [...text.matchAll(/Status:\s*(Erased|Failed|Pass|Partial|Successful)/gi)].map(
    (m) => m[1]
  )
  const uuid = pick(text, [/Report UUID:\s*([a-f0-9\-]+)/i])
  const software = pick(text, [/Software Version:\s*([^\n]+)/i, /(Blancco Drive Eraser [0-9.]+)/i])

  const erasureBlocks = [
    ...text.matchAll(
      /Vendor:\s*([^\n\t]+?)\s+Model:\s*([^\n\t]+?)\s+Serial:\s*([A-Z0-9\-]+)\s+Size:\s*([0-9.]+\s*GB)[\s\S]*?Status:\s*(Erased|Failed|Pass|Partial|Successful)/gi
    ),
  ]

  console.log(
    JSON.stringify(
      {
        marca: make,
        modelo: model,
        serie,
        borrado: statuses.some((s) => /erased|pass|success/i.test(s)),
        estados: statuses,
        certificadoId: uuid,
        software,
        discos: erasureBlocks.map((m) => ({
          vendor: m[1].trim(),
          model: m[2].trim(),
          serial: m[3],
          size: m[4].replace(/\s+/g, ''),
          status: m[5],
        })),
      },
      null,
      2
    )
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
