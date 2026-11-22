import 'server-only'

import { ensurePdfParseWorker } from '@/lib/pdf/ensurePdfParseWorker'

type PdfParseCtor = new (opts: { data: Uint8Array }) => {
  getText: () => Promise<{ text: string }>
}

export async function extractTextFromReceiptPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParseMod = require('pdf-parse') as { PDFParse?: PdfParseCtor }
  const PDFParse = pdfParseMod.PDFParse
  if (!PDFParse) {
    throw new Error('pdf-parse no disponible (PDFParse)')
  }

  await ensurePdfParseWorker(PDFParse as unknown as Parameters<typeof ensurePdfParseWorker>[0])
  const data = new Uint8Array(buffer)
  const parser = new PDFParse({ data })
  const result = await parser.getText()
  return (result.text || '').trim()
}