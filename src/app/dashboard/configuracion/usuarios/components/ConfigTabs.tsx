'use client'

import { useState } from 'react'
import {
  Users,
  Database,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UsersTab } from './UsersTab'
import { CatalogsTab } from './CatalogsTab'
import { CompanyTab } from './CompanyTab'
import { type SystemUser, type AllCatalogs, type CompanySettings } from '../actions'
import { Text } from '@/components/ui/Text'

interface ConfigTabsProps {
  users: SystemUser[]
  catalogs: AllCatalogs
  companySettings: CompanySettings | null
  isConfigured?: boolean
}

const tabs = [
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'catalogs', label: 'Maestros / Catálogos', icon: Database },
  { id: 'company', label: 'Empresa', icon: Building2 },
]

export function ConfigTabs({ users, catalogs, companySettings, isConfigured = true }: ConfigTabsProps) {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all",
              activeTab === tab.id
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1f2e] hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <Text variant="body" className="font-bold">{tab.label}</Text>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UsersTab users={users} isConfigured={isConfigured} />}
        {activeTab === 'catalogs' && <CatalogsTab catalogs={catalogs} />}
        {activeTab === 'company' && <CompanyTab settings={companySettings} />}
      </div>
    </div>
  )
}

