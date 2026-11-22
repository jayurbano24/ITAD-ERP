import 'server-only'

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

let configured = false

type PdfParseWithWorker = {
  setWorker: (workerSrc?: string) => string
}

function resolveWorkerMjsOnDisk(): string {
  const root = process.cwd()
  const candidates = [
    path.join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs'),
    path.join(root, 'node_modules', 'pdf-parse', 'dist', 'worker', 'pdf.worker.mjs'),
    path.join(root, 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'cjs', 'pdf.worker.mjs'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  throw new Error(
    `No se encontró pdf.worker.mjs en node_modules (cwd: ${root}). Revisa npm install.`
  )
}

/**
 * pdf-parse en Node usa un “fake worker” que hace dynamic import del worker .mjs.
 * Next/Turbopack rompe require.resolve (rutas con "(rsc)"); usamos cwd + precarga global.
 */
export async function ensurePdfParseWorker(PDFParse: PdfParseWithWorker): Promise<void> {
  if (configured) return

  const workerPath = resolveWorkerMjsOnDisk()
  const workerUrl = pathToFileURL(workerPath).href

  const g = globalThis as typeof globalThis & { pdfjsWorker?: unknown }
  if (!g.pdfjsWorker) {
    g.pdfjsWorker = await import(/* webpackIgnore: true */ workerUrl)
  }

  PDFParse.setWorker(workerUrl)
  configured = true
}