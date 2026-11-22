import { resolveTicketBrandModel } from '@/lib/tickets/parseBulkSerialPaste'

const WIPE_MODEL_DISPLAY: Record<string, string> = {
  'ThinkPad-T14 Gen-1': 'ThinkPad T14 Gen 1',
  'ThinkPad-T14 Gen-2': 'ThinkPad T14 Gen 2',
  'ThinkPad-P15 Gen-1': 'ThinkPad P15 Gen 1',
  'Laptitude -5420': 'Latitude 5420',
}

const THINKPAD_GEN_SUGGESTIONS = [
  'ThinkPad T14 Gen 1',
  'ThinkPad T14 Gen 2',
  'ThinkPad T14 Gen 3',
  'ThinkPad P15 Gen 1',
]

export { THINKPAD_GEN_SUGGESTIONS }

function normalizeCommercialName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bGen\s*(\d+)i\b/gi, 'Gen $1')
    .replace(/\bGen(\d+)\b/gi, 'Gen $1')
}

export function resolveWipeDisplayModel(
  make: string | null,
  modelRaw: string | null,
  rawText: string | null,
  systemVersion?: string | null
): { modelo: string | null; modeloMtm: string | null } {
  const mtm = modelRaw?.trim() || null
  const sysVer = systemVersion?.trim() || null

  if (sysVer && /thinkpad|latitude|ideapad|elitebook|macbook|zbook/i.test(sysVer)) {
    const display = normalizeCommercialName(sysVer)
    const isMtm = mtm && /^20[A-Z0-9]{6,}/i.test(mtm)
    return { modelo: display, modeloMtm: isMtm ? mtm : null }
  }

  if (!mtm && !make) return { modelo: null, modeloMtm: null }

  const mapped = resolveTicketBrandModel(make || 'LENOVO', mtm || '')
  if (mapped?.model) {
    const display = WIPE_MODEL_DISPLAY[mapped.model] || mapped.model
    const isMtm = /^20[A-Z0-9]{6,}/i.test(mtm || '')
    return { modelo: display, modeloMtm: isMtm && mtm !== display ? mtm : null }
  }

  if (rawText) {
    const m = rawText.match(/\b(ThinkPad\s+T\d{1,2}\s+Gen\s*\d[^\n\t]{0,24})/i)
    if (m?.[1]) {
      return { modelo: normalizeCommercialName(m[1]), modeloMtm: mtm }
    }
  }

  if (mtm && /^20[A-Z0-9]{6,}/i.test(mtm)) {
    return { modelo: mtm, modeloMtm: mtm }
  }

  return { modelo: mtm, modeloMtm: null }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/** Modelo para tabla Excel / evidencias (prioriza displayModel guardado). */
export function resolveEvidenceDisplayModel(
  parsed: Record<string, unknown>,
  asset?: {
    model?: string | null
    manufacturer?: string | null
    specifications?: unknown
  } | null
): string | null {
  const specs = asRecord(asset?.specifications)
  const overrides = asRecord(specs?.report_overrides)
  if (overrides?.model) return normalizeCommercialName(String(overrides.model))

  if (parsed.displayModel) return normalizeCommercialName(String(parsed.displayModel))

  const fromResolver = resolveWipeDisplayModel(
    (parsed.make as string) || asset?.manufacturer || null,
    (parsed.modelMtm as string) || (parsed.model as string) || asset?.model || null,
    null,
    (parsed.systemVersion as string) || null
  )
  if (fromResolver.modelo) return fromResolver.modelo

  const assetModel = asset?.model?.trim()
  if (assetModel && !/^20[A-Z0-9]{6,}$/i.test(assetModel)) return assetModel

  return fromResolver.modelo || assetModel || null
}