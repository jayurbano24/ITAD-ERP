import { NextResponse } from 'next/server'
import { extractSerialCandidates, pickBestSerialCandidate } from '@/lib/receipts/parseSerialOcr'

export const runtime = 'nodejs'

/**
 * POST multipart: image file → candidatos de serie (OCR etiqueta).
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('image')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 })
    }

    const sharp = (await import('sharp')).default
    const { createWorker } = await import('tesseract.js')

    const input = Buffer.from(await file.arrayBuffer())
    const preprocessed = await sharp(input)
      .rotate()
      .grayscale()
      .normalize()
      .resize({ width: 1600, withoutEnlargement: false })
      .sharpen()
      .png()
      .toBuffer()

    const worker = await createWorker('eng')
    let text = ''
    try {
      const {
        data: { text: ocrText },
      } = await worker.recognize(preprocessed)
      text = ocrText || ''
    } finally {
      await worker.terminate()
    }

    const candidates = extractSerialCandidates(text)
    const best = pickBestSerialCandidate(candidates)

    return NextResponse.json({
      ok: true,
      best,
      candidates: candidates.slice(0, 8),
      rawPreview: text.slice(0, 400),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR falló'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}