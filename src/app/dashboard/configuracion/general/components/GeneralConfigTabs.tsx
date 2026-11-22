'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Palette, ShieldCheck, Database, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { AparienciaTab } from './AparienciaTab'
import { FiscalSatTab } from './FiscalSatTab'
import { CatalogsTab } from '../../usuarios/components/CatalogsTab'
import { CompanyTab } from '../../usuarios/components/CompanyTab'
import type { FiscalSatCatalogStatus } from '../actions'
import type { AllCatalogs, CompanySettings } from '../../usuarios/actions'

type GeneralConfigTabsProps = {
  fiscalSat: FiscalSatCatalogStatus | null
  showAdmin: boolean
  catalogs: AllCatalogs | null
  companySettings: CompanySettings | null
}

const TAB_FROM_QUERY: Record<string, string> = {
  apariencia: 'apariencia',
  fiscal: 'fiscal',
  maestros: 'maestros',
  catalogos: 'maestros',
  empresa: 'empresa',
}

export function GeneralConfigTabs({
  fiscalSat,
  showAdmin,
  catalogs,
  companySettings,
}: GeneralConfigTabsProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  const tabs = useMemo(
    () =>
      [
        { id: 'apariencia', label: 'Apariencia', icon: Palette },
        { id: 'maestros', label: 'Catálogo maestros', icon: Database, adminOnly: true },
        { id: 'fiscal', label: 'Fiscal', icon: ShieldCheck, adminOnly: true },
        { id: 'empresa', label: 'Empresa', icon: Building2, adminOnly: true },
      ] as const,
    []
  )

  const visibleTabs = tabs.filter((t) => !('adminOnly' in t && t.adminOnly) || showAdmin)

  const resolvedFromUrl = tabParam ? TAB_FROM_QUERY[tabParam.toLowerCase()] : undefined
  const initialTab =
    resolvedFromUrl && visibleTabs.some((t) => t.id === resolvedFromUrl)
      ? resolvedFromUrl
      : (visibleTabs[0]?.id ?? 'apariencia')

  const [activeTab, setActiveTab] = useState<string>(initialTab)

  useEffect(() => {
    if (resolvedFromUrl && visibleTabs.some((t) => t.id === resolvedFromUrl)) {
      setActiveTab(resolvedFromUrl)
    }
  }, [resolvedFromUrl, visibleTabs])

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
              activeTab === tab.id
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1f2e] hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <tab.icon className="w-5 h-5" />
            <Text variant="body" className="font-bold">
              {tab.label}
            </Text>
          </button>
        ))}
      </div>

      {activeTab === 'apariencia' && <AparienciaTab />}
      {activeTab === 'fiscal' && showAdmin && fiscalSat && <FiscalSatTab initial={fiscalSat} />}
      {activeTab === 'maestros' && showAdmin && catalogs && (
        <CatalogsTab catalogs={catalogs} fiscalCatalog={fiscalSat} />
      )}
      {activeTab === 'empresa' && showAdmin && (
        <CompanyTab settings={companySettings} />
      )}
    </div>
  )
}