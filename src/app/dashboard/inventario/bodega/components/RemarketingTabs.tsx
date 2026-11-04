'use client'

import Link from 'next/link'
import { ShoppingBag, Package, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RemarketingTab = 'venta' | 'comprados' | 'procesados'

export default function RemarketingTabs({
  activeTab,
  forSaleCount,
  purchasedCount,
  processedCount,
  search,
}: {
  activeTab: RemarketingTab
  forSaleCount: number
  purchasedCount: number
  processedCount: number
  search?: string
}) {
  const qs = (tab: string) => {
    const p = new URLSearchParams()
    p.set('warehouse', 'BOD-REM')
    p.set('tab', tab)
    if (search) p.set('search', search)
    return `/dashboard/inventario/bodega?${p.toString()}`
  }

  const tabs: {
    id: RemarketingTab
    label: string
    count: number
    icon: typeof Package
    activeClass: string
  }[] = [
    {
      id: 'venta',
      label: 'Para venta',
      count: forSaleCount,
      icon: Package,
      activeClass: 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20',
    },
    {
      id: 'comprados',
      label: 'Comprados',
      count: purchasedCount,
      icon: ShoppingBag,
      activeClass: 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20',
    },
    {
      id: 'procesados',
      label: 'Procesados',
      count: processedCount,
      icon: Wrench,
      activeClass: 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20',
    },
  ]

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
        Remarketing · disponibles / comprados / que ya pasaron el proceso
      </p>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <Link
              key={tab.id}
              href={qs(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all',
                active
                  ? tab.activeClass
                  : 'bg-white dark:bg-[#1a1f2e] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px]',
                  active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                )}
              >
                {tab.count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
