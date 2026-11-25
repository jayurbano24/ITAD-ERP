import Link from 'next/link'
import { Filter, CalendarRange } from 'lucide-react'
import type { DashboardDatePreset } from '@/lib/dashboard/dashboardDateRange'

const PRESETS: { id: DashboardDatePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
  { id: 'all', label: 'Todo' },
]

type Props = {
  preset: DashboardDatePreset
  from: string
  to: string
  rangeLabel: string
}

export default function DashboardDateFilters({ preset, from, to, rangeLabel }: Props) {
  const showReset = preset !== 'month'

  return (
    <form
      method="get"
      className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1f2e] p-4 sm:p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <CalendarRange className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Filtro por fechas
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{rangeLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard?preset=${p.id}`}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-colors ${
                  preset === p.id
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-white dark:bg-[#0f1419] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 pl-0.5">
              Desde
            </span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f1419] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 pl-0.5">
              Hasta
            </span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f1419] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white"
            />
          </label>
          <input type="hidden" name="preset" value="custom" />
          <button
            type="submit"
            className="h-[46px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Aplicar
          </button>
          {showReset ? (
            <Link
              href="/dashboard?preset=month"
              className="h-[46px] px-4 flex items-center justify-center rounded-xl border-2 border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white dark:hover:bg-[#0f1419]"
            >
              Mes actual
            </Link>
          ) : (
            <span className="hidden md:block h-[46px]" aria-hidden />
          )}
        </div>
      </div>
    </form>
  )
}