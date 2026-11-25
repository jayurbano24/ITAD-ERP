export type DashboardDatePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

export type DashboardDateRange = {
  preset: DashboardDatePreset
  from: string
  to: string
  fromIso: string
  toIso: string
  hasFilter: boolean
  label: string
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDayLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function endOfDayLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

function isValidYmd(value: string | undefined): value is string {
  if (!value?.match(/^\d{4}-\d{2}-\d{2}$/)) return false
  const d = startOfDayLocal(value)
  return !Number.isNaN(d.getTime())
}

function presetRange(preset: DashboardDatePreset, now = new Date()): { from: string; to: string } {
  const to = toYmd(now)
  if (preset === 'today') return { from: to, to }
  if (preset === 'week') {
    const start = new Date(now)
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
    return { from: toYmd(start), to }
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: toYmd(start), to }
  }
  if (preset === 'year') {
    const start = new Date(now.getFullYear(), 0, 1)
    return { from: toYmd(start), to }
  }
  if (preset === 'all') {
    return { from: '2000-01-01', to }
  }
  return { from: to, to }
}

const PRESET_LABELS: Record<DashboardDatePreset, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este año',
  all: 'Histórico',
  custom: 'Personalizado',
}

export function resolveDashboardDateRange(
  searchParams: { from?: string; to?: string; preset?: string } | undefined
): DashboardDateRange {
  const rawPreset = searchParams?.preset
  const preset: DashboardDatePreset =
    rawPreset === 'today' ||
    rawPreset === 'week' ||
    rawPreset === 'month' ||
    rawPreset === 'year' ||
    rawPreset === 'all' ||
    rawPreset === 'custom'
      ? rawPreset
      : 'month'

  let from: string
  let to: string

  if (preset === 'custom' && isValidYmd(searchParams?.from) && isValidYmd(searchParams?.to)) {
    from = searchParams.from
    to = searchParams.to
    if (startOfDayLocal(from) > endOfDayLocal(to)) {
      ;[from, to] = [to, from]
    }
  } else if (preset !== 'custom') {
    ;({ from, to } = presetRange(preset))
  } else {
    ;({ from, to } = presetRange('month'))
  }

  const fromIso = startOfDayLocal(from).toISOString()
  const toIso = endOfDayLocal(to).toISOString()
  const hasFilter = preset !== 'all'

  const fromFmt = startOfDayLocal(from).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const toFmt = endOfDayLocal(to).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const label =
    from === to ? fromFmt : `${PRESET_LABELS[preset]} · ${fromFmt} – ${toFmt}`

  return { preset, from, to, fromIso, toIso, hasFilter, label }
}