import type { QuotationStatus } from '@/app/dashboard/ventas/cotizaciones/actions'

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  pendiente_aprobacion: 'Pendiente aprobación',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  aceptada: 'Aceptada',
}

export const QUOTATION_STATUS_STYLES: Record<QuotationStatus, string> = {
  pendiente_aprobacion:
    'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  aprobada:
    'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  rechazada:
    'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
  aceptada:
    'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
}

export function formatQuotationStatus(status: string): string {
  if (status in QUOTATION_STATUS_LABELS) {
    return QUOTATION_STATUS_LABELS[status as QuotationStatus]
  }
  return status
}
