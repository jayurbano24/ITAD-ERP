import { resolveTicketBrandModel } from '@/lib/tickets/parseBulkSerialPaste'

export type TicketLineKey = { brand: string; model: string }

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

const tokens = (value: string) =>
  value
    .toLowerCase()
    .split(/[\s\-\/,()]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 2)

export function scoreLineMatch(make: string, modelRaw: string, line: TicketLineKey): number {
  const makeN = norm(make)
  const modelN = norm(modelRaw)
  const brandN = norm(line.brand)
  const ticketModelN = norm(line.model)

  let score = 0

  if (makeN.includes('dell') && brandN.includes('dell')) score += 4
  else if (makeN.includes('lenovo') && brandN.includes('lenovo')) score += 4
  else if (makeN.includes('apple') && brandN.includes('apple')) score += 4
  else if (makeN.includes('hp') && brandN.includes('hp')) score += 4
  else if (makeN.includes(brandN) || brandN.includes(makeN.replace('inc', ''))) score += 3

  if (modelN.includes('5420') || ticketModelN.includes('5420')) {
    if (modelN.includes('5420') && ticketModelN.includes('5420')) score += 8
    else if (modelN.includes('latitude') && ticketModelN.includes('laptitude')) score += 7
  }

  if (modelN.includes('inspiron') && ticketModelN.includes('inspiron')) score += 8

  if (modelN.includes('macbook') && ticketModelN.includes('macbook')) {
    score += 6
    if (modelN.includes('142') || modelRaw.includes('14,2')) {
      if (ticketModelN.includes('a1989') && line.model.includes('-')) score += 2
    }
  }

  if (modelN.includes('zbook') || modelN.includes('studio')) {
    if (ticketModelN.includes('zbook') || ticketModelN.includes('studio') || ticketModelN.includes('zbppk')) score += 8
  }

  if (modelN.includes('p15') || modelRaw.toUpperCase().includes('P15')) {
    if (ticketModelN.includes('p15')) score += 8
  }

  if (modelRaw.toUpperCase().includes('20UD') || (modelN.includes('t14') && modelN.includes('gen1'))) {
    if (ticketModelN.includes('t14') && ticketModelN.includes('gen1')) score += 8
  }

  if (
    modelRaw.toUpperCase().includes('20W') ||
    modelN.includes('gen2') ||
    (modelN.includes('t14') && modelN.includes('gen2'))
  ) {
    if (ticketModelN.includes('t14') && ticketModelN.includes('gen2')) score += 8
  }

  const modelTokens = tokens(modelRaw)
  const ticketTokens = tokens(line.model)
  const shared = modelTokens.filter((t) => ticketTokens.some((tt) => tt.includes(t) || t.includes(tt)))
  score += Math.min(shared.length, 4)

  return score
}

export function resolveTicketBrandModelForTicket(
  make: string,
  modelRaw: string,
  ticketLines: TicketLineKey[]
): { brand: string; model: string } | null {
  const staticMap = resolveTicketBrandModel(make, modelRaw)
  if (staticMap) {
    const exists = ticketLines.some(
      (l) => norm(l.brand) === norm(staticMap.brand) && norm(l.model) === norm(staticMap.model)
    )
    if (exists) return staticMap
  }

  let best: { brand: string; model: string; score: number } | null = null
  for (const line of ticketLines) {
    const score = scoreLineMatch(make, modelRaw, line)
    if (!best || score > best.score) {
      best = { brand: line.brand, model: line.model, score }
    }
  }

  if (best && best.score >= 5) {
    return { brand: best.brand, model: best.model }
  }

  return staticMap
}