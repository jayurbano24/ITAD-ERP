'use client'

import { Bell, Menu, Search } from 'lucide-react'

interface PortalHeaderProps {
  userName: string
  showMenuButton?: boolean
  onOpenMenu?: () => void
}

export function PortalHeader({ userName, showMenuButton, onOpenMenu }: PortalHeaderProps) {
  const currentDate = new Date().toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shrink-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {showMenuButton && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="lg:hidden p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100 truncate">
              ¡Hola, {userName.split(' ')[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 capitalize line-clamp-2">
              {currentDate}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
          <div className="relative w-full sm:w-auto sm:min-w-[12rem] lg:min-w-[16rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar activo o ticket..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl
                       text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                       transition-all"
            />
          </div>

          <button
            type="button"
            className="relative p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors self-end sm:self-auto shrink-0"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}

