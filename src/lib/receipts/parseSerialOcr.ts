/** Extrae candidatos de número de serie desde texto OCR ruidoso. */
export function extractSerialCandidates(ocrText: string): string[] {
  const text = (ocrText || '').toUpperCase().replace(/\s+/g, ' ')
  const candidates = new Set<string>()

  const patterns = [
    /(?:S\/N|SN|SERIAL|SERVICE\s*TAG|ST)[:\s#-]*([A-Z0-9][A-Z0-9\-]{3,24})/gi,
    /\b([A-Z0-9]{2,4}[- ]?[A-Z0-9]{4,12}[A-Z0-9]{2,8})\b/g,
    /\b([A-Z0-9]{7,20})\b/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    const re = new RegExp(pattern.source, pattern.flags)
    while ((match = re.exec(text)) !== null) {
      const raw = (match[1] || match[0] || '').replace(/[\s\-]+/g, '').toUpperCase()
      if (raw.length >= 5 && raw.length <= 24 && /\d/.test(raw) && /[A-Z]/.test(raw)) {
        candidates.add(raw)
      }
    }
  }

  return Array.from(candidates).sort((a, b) => b.length - a.length)
}

export function pickBestSerialCandidate(candidates: string[]): string | null {
  if (candidates.length === 0) return null
  return candidates[0] ?? null
}