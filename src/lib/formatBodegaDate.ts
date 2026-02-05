export function formatBodegaDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''

  const datePart = new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)

  const timePart = new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(date)

  return `${datePart}, ${timePart}`
}
