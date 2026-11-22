/** Texto único en UI: «XSI: ORD26876 · EPC: ABC123» */

export function formatOrderReferences(
  xsi: string | null | undefined,
  epc: string | null | undefined
): string {
  const parts: string[] = []
  const x = xsi?.trim()
  const e = epc?.trim()
  if (x) parts.push(`XSI: ${x}`)
  if (e) parts.push(`EPC: ${e}`)
  return parts.join(' · ')
}

export function parseOrderReferences(input: string): {
  xsi: string | null
  epc: string | null
} {
  const t = input.trim()
  if (!t) return { xsi: null, epc: null }

  let xsi: string | null = null
  let epc: string | null = null

  const xsiLabel = t.match(/(?:^|[·|;,])\s*XSI\s*[:=-]?\s*([^\s·|;,]+)/i)
  const epcLabel = t.match(/(?:^|[·|;,])\s*EPC\s*[:=-]?\s*([^\s·|;,]+)/i)
  if (xsiLabel?.[1]) xsi = xsiLabel[1].replace(/\s+/g, '').toUpperCase()
  if (epcLabel?.[1]) epc = epcLabel[1].replace(/\s+/g, '').toUpperCase()

  if (!xsi) {
    const ord = t.match(/\b(ORD[-\s]?\d[\w-]*)\b/i)
    if (ord?.[1]) xsi = ord[1].replace(/\s+/g, '').toUpperCase()
  }

  if (!xsi && !epc) {
    if (t.includes('·') || t.includes('|') || t.includes(';')) {
      const parts = t.split(/[·|;]/).map((p) => p.trim()).filter(Boolean)
      if (parts[0]) {
        const first = parts[0].replace(/^(XSI|EPC)\s*[:=-]?\s*/i, '').trim()
        if (/^ORD/i.test(first)) xsi = first.replace(/\s+/g, '').toUpperCase()
        else epc = first.replace(/\s+/g, '').toUpperCase()
      }
      if (parts[1]) {
        const second = parts[1].replace(/^(XSI|EPC)\s*[:=-]?\s*/i, '').trim()
        if (!epc) epc = second.replace(/\s+/g, '').toUpperCase()
        else if (!xsi && /^ORD/i.test(second)) xsi = second.replace(/\s+/g, '').toUpperCase()
      }
    } else if (/^ORD/i.test(t)) {
      xsi = t.replace(/\s+/g, '').toUpperCase()
    } else if (!/^XSI|^EPC/i.test(t)) {
      epc = t.replace(/\s+/g, '').toUpperCase()
    }
  }

  return { xsi, epc }
}