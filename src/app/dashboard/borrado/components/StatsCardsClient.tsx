'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { Text } from '@/components/ui/Text'

export type WipeStats = {
  pending: number
  inProgress: number
  completedToday: number
  failedToday: number
}

export type WipeStatusDetails = {
  pending: Array<{ id: string; internal_tag: string; serial_number: string | null }>
  inProgress: Array<{ id: string; internal_tag: string; serial_number: string | null }>
  completedToday: Array<{ id: string; internal_tag: string; serial_number: string | null }>
  failedToday: Array<{ id: string; internal_tag: string; serial_number: string | null }>
}

type StatusKey = keyof WipeStats

type StatusConfig = {
  key: StatusKey
  title: string
  description: string
  bg: string
  border: string
  text: string
  number: string
  pill: string
  accent: string
  icon: typeof Clock
}

const STATUS_CONFIG: StatusConfig[] = [
  {
    key: 'pending',
    title: 'Pendientes',
    description: 'Esperando borrado',
    bg: 'bg-white dark:bg-[#1a1f2e] hover:bg-amber-50 dark:hover:bg-amber-500/5',
    border: 'border border-gray-100 dark:border-gray-800',
    text: 'text-amber-700 dark:text-amber-400',
    number: 'text-gray-900 dark:text-white',
    pill: 'text-amber-600/80 dark:text-amber-500/60',
    accent: 'bg-amber-100 dark:bg-amber-500/20',
    icon: Clock,
  },
  {
    key: 'inProgress',
    title: 'En Proceso',
    description: 'Borrándose ahora',
    bg: 'bg-white dark:bg-[#1a1f2e] hover:bg-blue-50 dark:hover:bg-blue-500/5',
    border: 'border border-gray-100 dark:border-gray-800',
    text: 'text-blue-700 dark:text-blue-400',
    number: 'text-gray-900 dark:text-white',
    pill: 'text-blue-600/80 dark:text-blue-500/60',
    accent: 'bg-blue-100 dark:bg-blue-500/20',
    icon: Loader2,
  },
  {
    key: 'completedToday',
    title: 'Completados Hoy',
    description: 'Certificados R2v3',
    bg: 'bg-white dark:bg-[#1a1f2e] hover:bg-emerald-50 dark:hover:bg-emerald-500/5',
    border: 'border border-gray-100 dark:border-gray-800',
    text: 'text-emerald-700 dark:text-emerald-400',
    number: 'text-gray-900 dark:text-white',
    pill: 'text-emerald-600/80 dark:text-emerald-500/60',
    accent: 'bg-emerald-100 dark:bg-emerald-500/20',
    icon: CheckCircle2,
  },
  {
    key: 'failedToday',
    title: 'Fallidos Hoy',
    description: 'Requieren atención',
    bg: 'bg-white dark:bg-[#1a1f2e] hover:bg-rose-50 dark:hover:bg-rose-500/5',
    border: 'border border-gray-100 dark:border-gray-800',
    text: 'text-rose-700 dark:text-rose-400',
    number: 'text-gray-900 dark:text-white',
    pill: 'text-rose-600/80 dark:text-rose-500/60',
    accent: 'bg-rose-100 dark:bg-rose-500/20',
    icon: XCircle,
  },
]

interface StatsCardsClientProps {
  stats: WipeStats
  details: WipeStatusDetails
}

export function StatsCardsClient({ stats, details }: StatsCardsClientProps) {
  const [openKey, setOpenKey] = useState<StatusKey | null>(null)

  const toggle = (key: StatusKey) => {
    setOpenKey((current) => (current === key ? null : key))
  }

  const currentItems = openKey ? details[openKey] || [] : []
  const currentConfig = openKey ? STATUS_CONFIG.find((c) => c.key === openKey) : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {STATUS_CONFIG.map((status) => {
          const Icon = status.icon
          const value = stats[status.key]
          const isOpen = openKey === status.key

          return (
            <button
              key={status.key}
              type="button"
              onClick={() => toggle(status.key)}
              className={`text-left rounded-[2.5rem] p-6 transition-all duration-300 shadow-sm ${status.bg} ${status.border} hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 ${isOpen ? 'ring-4 ring-indigo-500/20 border-indigo-300 dark:border-indigo-500' : ''
                }`}
              aria-pressed={isOpen}
            >
              <div className="flex items-center justify-between">
                <div>
                  <Text variant="label" className={status.text}>{status.title}</Text>
                  <Text variant="h2" as="p" className={`${status.number} mt-2 tracking-tighter`}>{value}</Text>
                </div>
                <div className={`p-4 rounded-2xl shadow-inner ${status.accent}`}>
                  <Icon className={`w-6 h-6 ${status.text} ${status.key === 'inProgress' ? 'animate-spin' : ''}`} />
                </div>
              </div>
              <Text variant="muted" className={`${status.pill} mt-4 block uppercase tracking-wider font-bold`}>{status.description}</Text>
            </button>
          )
        })}
      </div>

      {openKey && currentConfig && (
        <div className="bg-gray-50 dark:bg-[#1a1f2e] border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <Text variant="label" className={currentConfig.text}>{currentConfig.title}</Text>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <Text variant="muted" className="text-xs uppercase tracking-wider font-bold">Series en este estado: {currentItems.length}</Text>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500 transition-colors border border-gray-100 dark:border-gray-700 shadow-sm"
            >
              Cerrar
            </button>
          </div>

          {currentItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0f1419] rounded-3xl border border-gray-100 dark:border-gray-800">
              <Text variant="label" className="text-gray-400 dark:text-gray-500">No hay series registradas</Text>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#0f1419] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all"
                >
                  <Text variant="body" className="font-black tracking-tight group-hover:text-indigo-600 transition-colors uppercase block">{item.internal_tag || 'Sin tag'}</Text>
                  <Text variant="muted" className="text-[10px] font-bold uppercase tracking-widest mt-1 block">{item.serial_number || 'Sin serie'}</Text>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
