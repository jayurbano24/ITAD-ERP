/** Cabecera XSi + certificaciones (PNG alta resolución para impresión). */
export const XSI_RECEIPT_HEADER_SRC = '/branding/xsi-receipt-header-hd.png'

/** Ancho objetivo del logo en el PDF (mm); con ~2400px de ancho queda nítido al imprimir. */
export const XSI_RECEIPT_HEADER_MM_HEIGHT = 30

export type ReceiptLogoAsset = {
  dataUrl: string
  aspect: number
  pixelWidth: number
  pixelHeight: number
}

/** Carga el PNG sin reescalarlo en canvas (evita pérdida y pixelado). */
export async function loadXsiReceiptHeaderLogo(): Promise<ReceiptLogoAsset | null> {
  if (typeof window === 'undefined') return null
  try {
    const response = await fetch(XSI_RECEIPT_HEADER_SRC, { cache: 'force-cache' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error ?? new Error('read failed'))
      reader.readAsDataURL(blob)
    })

    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('XSi logo decode failed'))
      img.src = dataUrl
    })

    const w = img.naturalWidth || 1
    const h = img.naturalHeight || 1
    return {
      dataUrl,
      aspect: w / h,
      pixelWidth: w,
      pixelHeight: h,
    }
  } catch {
    return null
  }
}