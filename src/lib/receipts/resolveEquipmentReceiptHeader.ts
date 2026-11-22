import { parseOrderReferences } from '@/lib/tickets/orderReferences'

const PROJECT_ID_PATTERN =
  /\b(PO\s*[-#]?\s*[\w-]+|TRMA\s*\d[\w-]*|PRJ\s*[-#]?\s*[\w-]+|COMP\s*[-]?\s*\d[\w-]*)\b/i

function extractOrd(text: string | null | undefined): string | null {
  if (!text?.trim()) return null
  const m = text.match(/\b(ORD\s*[-]?\s*\d[\w-]*)\b/i)
  return m ? m[1].replace(/\s+/g, '').toUpperCase() : null
}

function extractProjectIdFromText(...chunks: (string | null | undefined)[]): string | null {
  for (const chunk of chunks) {
    if (!chunk?.trim()) continue
    const m = chunk.match(PROJECT_ID_PATTERN)
    if (m) return m[1].replace(/\s+/g, ' ').trim()
  }
  return null
}

function extractAddressFromText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (/collection address|direcci[oó]n de recolecci[oó]n|pickup address/i.test(line)) {
      const after = line.split(/[:|-]/).slice(1).join(':').trim()
      if (after.length > 8) return after
    }
  }
  const addrLine = lines.find(
    (l) =>
      /\b(calle|avenue|av\.|zona|guatemala|zone|cp\.|c\.p\.)\b/i.test(l) && l.length > 20
  )
  return addrLine || null
}

/** Company Name desde título tipo "Auditoría - CAPGEMINI" */
export function companyNameFromTicketTitle(title: string | null | undefined): string | null {
  if (!title?.trim()) return null
  const t = title.trim()
  const dash = t.split(/\s*[-–|]\s*/)
  if (dash.length >= 2) {
    const tail = dash[dash.length - 1].trim()
    if (tail.length >= 2 && !/^lote\b/i.test(tail) && !/^recepci/i.test(tail)) return tail
  }
  const cap = t.match(/\b(CAPGEMINI|UBER|BTR|Wisete?k)\b/i)
  return cap ? cap[1] : null
}

export type ReceiptHeaderSources = {
  xsi_order_number?: string | null
  epc_order_number?: string | null
  readable_id?: string | null
  title?: string | null
  description?: string | null
  notes?: string | null
  pickup_address?: string | null
  pickup_date?: string | null
  completed_at?: string | null
  created_at?: string | null
  client?: {
    commercial_name?: string | null
    legal_name?: string | null
    address?: string | null
  } | null
  batchOrdCodes?: string[]
  batchReceptionDate?: string | null
}

export function resolveReceiptOrderNumber(sources: ReceiptHeaderSources): string {
  const parsed = parseOrderReferences(
    [sources.xsi_order_number, sources.epc_order_number].filter(Boolean).join(' · ')
  )
  if (parsed.xsi && /^ORD/i.test(parsed.xsi)) return parsed.xsi
  if (parsed.epc && /^ORD/i.test(parsed.epc)) return parsed.epc
  const x = sources.xsi_order_number?.trim()
  const e = sources.epc_order_number?.trim()
  if (x && /^ORD/i.test(x)) return x.replace(/\s+/g, '').toUpperCase()
  if (e && /^ORD/i.test(e)) return e.replace(/\s+/g, '').toUpperCase()
  for (const code of sources.batchOrdCodes || []) {
    const ord = extractOrd(code)
    if (ord) return ord
  }
  const fromText = extractOrd(
    [sources.title, sources.description, sources.notes].filter(Boolean).join('\n')
  )
  if (fromText) return fromText
  return (x || e || sources.readable_id || 'ORD').toUpperCase()
}

export function resolveReceiptProjectId(sources: ReceiptHeaderSources): string {
  const x = sources.xsi_order_number?.trim()
  const e = sources.epc_order_number?.trim()
  if (e && !/^ORD[-\s]?\d/i.test(e)) return e
  if (x && !/^ORD[-\s]?\d/i.test(x)) return x
  const parsed = parseOrderReferences(
    [x, e].filter(Boolean).join(' · ')
  )
  if (parsed.epc && !/^ORD/i.test(parsed.epc)) return parsed.epc
  if (parsed.xsi && !/^ORD/i.test(parsed.xsi)) return parsed.xsi
  return (
    extractProjectIdFromText(
      sources.description,
      sources.notes,
      sources.title,
      [sources.xsi_order_number, sources.epc_order_number].join(' ')
    ) || ''
  )
}

export function resolveReceiptCompanyName(sources: ReceiptHeaderSources): string {
  const clientName =
    sources.client?.commercial_name?.trim() ||
    sources.client?.legal_name?.trim() ||
    ''
  if (clientName && !/^ITAD\s+Compra\b/i.test(clientName)) {
    return clientName
  }
  return (
    companyNameFromTicketTitle(sources.title) ||
    clientName ||
    ''
  )
}

export function resolveReceiptPickupDateIso(sources: ReceiptHeaderSources): string | null {
  const candidates = [
    sources.pickup_date,
    sources.batchReceptionDate,
    sources.completed_at,
    sources.created_at,
  ]
  for (const c of candidates) {
    if (c?.trim()) return c.trim()
  }
  return null
}

export function resolveReceiptCollectionAddress(sources: ReceiptHeaderSources): string {
  const direct = sources.pickup_address?.trim()
  if (direct) return direct
  const clientAddr = sources.client?.address?.trim()
  if (clientAddr) return clientAddr
  return (
    extractAddressFromText(sources.description) ||
    extractAddressFromText(sources.notes) ||
    ''
  )
}