import type { SupabaseClient } from '@supabase/supabase-js'

/** Longitud mínima para buscar por sufijo (p. ej. PF3ADJ1H en Lenovo). */
export const MIN_SERIAL_SUFFIX_LEN = 5

export function normalizeSerialInput(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export type ResolvedSerialMatch = {
  assetId: string | null
  serialNumber: string
  internalTag?: string | null
  ticketId?: string | null
  matchType: 'exact' | 'suffix' | 'contains'
}

function pickSingleAsset(
  rows: Array<{ id: string; serial_number: string | null; internal_tag: string | null }>,
  needle: string,
  mode: 'exact' | 'suffix' | 'contains'
): ResolvedSerialMatch | null {
  if (rows.length === 0) return null
  const normalized = rows.map((r) => ({
    ...r,
    sn: normalizeSerialInput(r.serial_number || ''),
  }))

  if (mode === 'exact') {
    const hit = normalized.find((r) => r.sn === needle || normalizeSerialInput(r.internal_tag || '') === needle)
    if (hit) {
      return {
        assetId: hit.id,
        serialNumber: hit.serial_number || needle,
        internalTag: hit.internal_tag,
        matchType: 'exact',
      }
    }
    return null
  }

  const filtered =
    mode === 'suffix'
      ? normalized.filter((r) => r.sn.endsWith(needle))
      : normalized.filter((r) => r.sn.includes(needle))

  if (filtered.length !== 1) return null
  const hit = filtered[0]
  return {
    assetId: hit.id,
    serialNumber: hit.serial_number || needle,
    internalTag: hit.internal_tag,
    matchType: mode,
  }
}

/**
 * Resuelve una serie completa a partir de escaneo parcial (sufijo Lenovo / service tag).
 */
export async function resolveSerialLookup(
  supabase: SupabaseClient,
  rawInput: string
): Promise<ResolvedSerialMatch | null> {
  const needle = normalizeSerialInput(rawInput)
  if (!needle) return null

  const { data: exactRows } = await supabase
    .from('assets')
    .select('id, serial_number, internal_tag')
    .or(`serial_number.eq.${needle},internal_tag.eq.${needle}`)
    .limit(5)

  const exact = pickSingleAsset(exactRows || [], needle, 'exact')
  if (exact) return exact

  if (needle.length < MIN_SERIAL_SUFFIX_LEN) return null

  const { data: suffixRows } = await supabase
    .from('assets')
    .select('id, serial_number, internal_tag')
    .ilike('serial_number', `%${needle}`)
    .limit(15)

  const suffix = pickSingleAsset(suffixRows || [], needle, 'suffix')
  if (suffix) return suffix

  const { data: containsRows } = await supabase
    .from('assets')
    .select('id, serial_number, internal_tag')
    .ilike('serial_number', `%${needle}%`)
    .limit(15)

  const contains = pickSingleAsset(containsRows || [], needle, 'contains')
  if (contains) return contains

  const { data: ticketItems } = await supabase
    .from('ticket_items')
    .select('id, collected_serial, ticket_id, asset_id')
    .not('collected_serial', 'is', null)
    .ilike('collected_serial', `%${needle}`)
    .limit(15)

  const items = (ticketItems || [])
    .map((it) => ({
      sn: normalizeSerialInput(it.collected_serial || ''),
      item: it,
    }))
    .filter((x) => x.sn === needle || x.sn.endsWith(needle) || x.sn.includes(needle))

  const suffixItems = items.filter((x) => x.sn.endsWith(needle))
  const pick =
    suffixItems.length === 1
      ? suffixItems[0]
      : items.length === 1
        ? items[0]
        : null

  if (!pick) return null

  return {
    assetId: pick.item.asset_id,
    serialNumber: pick.item.collected_serial || needle,
    ticketId: pick.item.ticket_id,
    matchType: pick.sn.endsWith(needle) && pick.sn !== needle ? 'suffix' : 'contains',
  }
}