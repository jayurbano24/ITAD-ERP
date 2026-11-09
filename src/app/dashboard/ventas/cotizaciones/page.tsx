import Link from 'next/link'
import { Plus, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getQuotations } from './actions'
import { QUOTATION_STATUS_LABELS } from '@/lib/ventas/quotationStatus'
import QuotationsTable from './QuotationsTable'

export const dynamic = 'force-dynamic'

type SearchParams = { q?: string; status?: string }

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'pendiente_aprobacion', label: QUOTATION_STATUS_LABELS.pendiente_aprobacion },
  { id: 'all', label: 'Todas' },
  { id: 'aprobada', label: QUOTATION_STATUS_LABELS.aprobada },
  { id: 'rechazada', label: QUOTATION_STATUS_LABELS.rechazada },
  { id: 'aceptada', label: QUOTATION_STATUS_LABELS.aceptada },
]

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const sp = await Promise.resolve(searchParams || {})
  const q = (sp.q || '').trim()
  const status = sp.status || 'pendiente_aprobacion'

  const { data: quotations } = await getQuotations({
    status: status === 'all' ? undefined : status,
    search: q || undefined,
  })

  const pendingAll = quotations.filter((x) => x.status === 'pendiente_aprobacion')
  const pendingCount = pendingAll.length
  const approved = quotations.filter((x) => x.status === 'aprobada' || x.status === 'aceptada').length

  const showPendingSection = status === 'all' && pendingAll.length > 0
  const otros =
    status === 'all' ? quotations.filter((x) => x.status !== 'pendiente_aprobacion') : quotations

  return (
    <div className="p-2 sm:p-3 pb-4 flex flex-col gap-2 bg-gray-50/50 dark:bg-surface-950 min-h-0 flex-1 w-full max-w-[1280px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Cotizaciones
            </h1>
            <p className="text-sm text-gray-600 dark:text-surface-400">
              Tabla de pendientes y seguimiento de aprobación
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/ventas/cotizaciones/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva cotización
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        <div className="rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-2">
          <p className="text-xs text-gray-500 dark:text-surface-400">Total (filtro)</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{quotations.length}</p>
        </div>
        <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 p-2">
          <p className="text-xs text-amber-800 dark:text-amber-300">Pendientes</p>
          <p className="text-lg font-bold text-amber-900 dark:text-amber-200">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/10 p-2">
          <p className="text-xs text-emerald-800 dark:text-emerald-300">Aprobadas / Aceptadas</p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{approved}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-2 col-span-2 lg:col-span-1">
          <p className="text-xs text-gray-500 dark:text-surface-400">Rechazadas</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {quotations.filter((x) => x.status === 'rechazada').length}
          </p>
        </div>
      </div>

      <form className="flex flex-col sm:flex-row gap-2" action="/dashboard/ventas/cotizaciones" method="get">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por número, título..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
        />
        <button
          type="submit"
          className="rounded-lg border border-gray-300 dark:border-surface-600 px-4 py-2 text-sm font-medium bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
        >
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const params = new URLSearchParams()
          if (q) params.set('q', q)
          if (f.id !== 'pendiente_aprobacion') params.set('status', f.id)
          const href = `/dashboard/ventas/cotizaciones${params.toString() ? `?${params}` : ''}`
          const active = status === f.id
          return (
            <Link
              key={f.id}
              href={href}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                active
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-surface-900 border-gray-200 dark:border-surface-600 text-gray-700 dark:text-surface-300'
              )}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {status === 'pendiente_aprobacion' ? (
          <QuotationsTable
            rows={quotations}
            caption={`Pendientes de aprobación (${quotations.length})`}
            emptyMessage="No hay cotizaciones pendientes de aprobación."
            className="flex-1 min-h-0"
          />
        ) : showPendingSection ? (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <QuotationsTable
              rows={pendingAll}
              caption={`Pendientes de aprobación (${pendingAll.length})`}
              emptyMessage="No hay cotizaciones pendientes."
              className="flex-1 min-h-0"
            />
            <QuotationsTable
              rows={otros}
              caption={`Otras cotizaciones (${otros.length})`}
              emptyMessage="No hay otras cotizaciones en este filtro."
              className="flex-1 min-h-0"
            />
          </div>
        ) : (
          <QuotationsTable
            rows={quotations}
            emptyMessage="Sin cotizaciones en este filtro."
            className="flex-1 min-h-0"
          />
        )}
      </div>
    </div>
  )
}
