type VentasIncomePeriod = 'today' | '7d' | '30d' | 'month' | 'all'

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Rango por defecto del exportador alineado al filtro de ingresos en pantalla. */
export function resolveVentasExportDefaultRange(
  period: VentasIncomePeriod,
  month?: string
): { from: string; to: string } {
  const now = new Date()
  const to = formatYmdLocal(now)

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    const from = formatYmdLocal(new Date(y, m - 1, 1))
    const last = formatYmdLocal(new Date(y, m, 0))
    return { from, to: last }
  }

  switch (period) {
    case 'today':
      return { from: to, to }
    case '7d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { from: formatYmdLocal(d), to }
    }
    case '30d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return { from: formatYmdLocal(d), to }
    }
    case 'all': {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() - 2)
      return { from: formatYmdLocal(d), to }
    }
    case 'month':
    default: {
      const from = formatYmdLocal(new Date(now.getFullYear(), now.getMonth(), 1))
      return { from, to }
    }
  }
}