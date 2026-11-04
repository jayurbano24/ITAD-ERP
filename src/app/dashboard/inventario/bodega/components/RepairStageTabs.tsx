'use client'

import Link from 'next/link'
import { Radar, Wrench, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RepairStageTab = 'diagnostico' | 'reparacion' | 'control_calidad'

const TABS: Array<{
  key: RepairStageTab
  label: string
  Icon: typeof Radar
  activeClass: string
}> = [
  {
    key: 'diagnostico',
    label: 'Diagnóstico',
    Icon: Radar,
    activeClass: 'bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-500/20',
  },
  {
    key: 'reparacion',
    label: 'Reparación',
    Icon: Wrench,
    activeClass: 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20',
  },
  {
    key: 'control_calidad',
    label: 'Control de Calidad',
    Icon: ShieldCheck,
    activeClass: 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20',
  },
]

export default function RepairStageTabs({
  activeTab,
  counts,
  search,
}: {
  activeTab: RepairStageTab
  counts: Record<RepairStageTab, number>
  search?: string
}) {
  const hrefFor = (tab: RepairStageTab) => {
    const p = new URLSearchParams()
    p.set('warehouse', 'BOD-REP')
    p.set('tab', tab)
    if (search) p.set('search', search)
    return `/dashboard/inventario/bodega?${p.toString()}`
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        Flujo: Diagnóstico → Reparación → Control de Calidad. Si QC rechaza, regresa a Diagnóstico o Reparación.
        Si aprueba, el equipo pasa a <strong>Bodega Remarketing</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon, activeClass }) => (
          <Link
            key={key}
            href={hrefFor(key)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all',
              activeTab === key
                ? activeClass
                : 'bg-white dark:bg-[#1a1f2e] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px]',
                activeTab === key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
              )}
            >
              {counts[key] ?? 0}
            </span>
          </Link>
        ))}
        <Link
          href="/dashboard/taller"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10"
        >
          Abrir Taller
        </Link>
      </div>
    </div>
  )
}
