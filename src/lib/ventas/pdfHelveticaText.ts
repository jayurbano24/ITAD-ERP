/**
 * Texto seguro para jsPDF + Helvetica (WinAnsi / Latin-1).
 */

export function normalizePdfTypography(line: string): string {
  return line
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00B7/g, ' · ')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/[\u2000-\u200A\u202F\u205F]/g, ' ')
}

/** Viñetas / emojis leídos como Latin-1 (Ø=Ü³, â€¢, etc.). */
export function repairPdfMojibake(input: string): string {
  return input
    .replace(/\uFEFF/g, '')
    .replace(/Ø=Ü./g, '')
    .replace(/Ø=Ü[\u00A0-\u00FF]/g, '')
    .replace(/Ø=[^\s\n]{1,4}/g, '')
    .replace(/â€[¢³»"']/g, '')
    .replace(/Ã¢â‚¬Â./g, '')
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€\u009d/g, '"')
    .replace(/ï¿½/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u2022\u2023\u2043\u2219\u25E6\u25AA\u25AB\u25CF\u25A0\u25B6\u25B8\u25BA]/g, '')
    .replace(/[\u2600-\u27BF]/g, '')
}

function stripLeadingArtifacts(line: string): string {
  let t = line.trimStart()
  t = repairPdfMojibake(t)
  t = t.replace(/^[\s\u00B7\-–—]+/, '')
  t = t.replace(/^['\u2018\u2019\u201A`´]+\s*/, '')
  t = normalizePdfTypography(t)
  t = t.replace(/\s{2,}/g, ' ')
  return t.trimEnd()
}

/** Limpia notas/comentarios antes de imprimir en PDF. */
export function sanitizeTextForHelveticaPdf(input: string): string {
  const stripControl = (s: string) =>
    s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

  let s = stripControl(input).replace(/\r\n/g, '\n')
  s = repairPdfMojibake(s)

  s = s
    .split('\n')
    .map((line) => stripLeadingArtifacts(line))
    .filter((line) => line.length > 0)
    .join('\n')

  s = s.replace(/[^\t\n\r\x20-\xFF]/g, '')
  return s.trim()
}

type MultilineOpts = {
  fontSize: number
  lineMm: number
  fontStyle?: 'normal' | 'bold' | 'italic'
  textColor?: [number, number, number]
}

function wrapWordsHelvetica(
  doc: import('jspdf').jsPDF,
  text: string,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const words = normalized.split(' ')
  const lines: string[] = []
  let current = ''

  const fits = (trial: string) => doc.getTextWidth(trial) <= maxWidth

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (fits(trial)) {
      current = trial
      continue
    }
    if (current) lines.push(current)
    if (fits(word)) {
      current = word
      continue
    }
    const chunks = doc.splitTextToSize(word, maxWidth) as string[]
    if (chunks.length > 1) {
      lines.push(...chunks.slice(0, -1))
      current = chunks[chunks.length - 1] ?? ''
    } else {
      lines.push(word)
      current = ''
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Párrafo con interlineado fijo y salto por palabras (misma apariencia que el resto del PDF).
 */
export function drawHelveticaMultiline(
  doc: import('jspdf').jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: MultilineOpts
): number {
  const safe = sanitizeTextForHelveticaPdf(text)
  if (!safe) return y

  doc.setFont('helvetica', opts.fontStyle ?? 'normal')
  doc.setFontSize(opts.fontSize)
  if (opts.textColor) doc.setTextColor(...opts.textColor)

  const lines = wrapWordsHelvetica(doc, safe, maxWidth)
  let cy = y
  for (const line of lines) {
    doc.text(line, x, cy)
    cy += opts.lineMm
  }
  return cy
}
