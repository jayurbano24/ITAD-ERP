/** Code 128 para numeración de cotizaciones y documentos de venta. */
export type Code128BarcodeOptions = {
  scale?: number
  height?: number
  includetext?: boolean
}

function bytesToDataUrl(png: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < png.length; i++) {
    binary += String.fromCharCode(png[i]!)
  }
  const base64 =
    typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(png).toString('base64')
  return `data:image/png;base64,${base64}`
}

export async function code128BarcodeDataUrl(
  text: string,
  options: Code128BarcodeOptions = {}
): Promise<string | null> {
  const value = text.trim()
  if (!value) return null

  try {
    const bwip = (await import('bwip-js')).default
    const raw = await bwip.toBuffer({
      bcid: 'code128',
      text: value,
      scale: options.scale ?? 2,
      height: options.height ?? 8,
      includetext: options.includetext ?? true,
      textxalign: 'center',
    })
    const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>)
    return bytesToDataUrl(bytes)
  } catch (err) {
    console.error('[code128Barcode]', err)
    return null
  }
}

export type BarcodeImageUrlOptions = {
  includeHumanText?: boolean
  scale?: number
  height?: number
}

export function barcodeImageUrl(value: string, options?: BarcodeImageUrlOptions): string {
  const params = new URLSearchParams({ value: value.trim() })
  if (options?.includeHumanText === false) params.set('text', '0')
  if (options?.scale) params.set('scale', String(options.scale))
  if (options?.height) params.set('height', String(options.height))
  return `/api/utils/generate-barcode?${params}`
}

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  if (typeof FileReader === 'undefined') return null
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}

/** Cliente o servidor: bwip local y, si falla, API `/api/utils/generate-barcode`. */
export async function resolveCode128BarcodeDataUrl(
  text: string,
  options: Code128BarcodeOptions = {}
): Promise<string | null> {
  const local = await code128BarcodeDataUrl(text, options)
  if (local) return local
  if (typeof fetch === 'undefined') return null
  try {
    const res = await fetch(
      barcodeImageUrl(text, {
        includeHumanText: options.includetext !== false,
        scale: options.scale,
        height: options.height,
      })
    )
    if (!res.ok) return null
    return blobToDataUrl(await res.blob())
  } catch {
    return null
  }
}
