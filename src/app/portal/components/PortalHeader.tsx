'use client'

import { Bell, Search } from 'lucide-react'

interface PortalHeaderProps {
  userName: string
}

export function PortalHeader({ userName }: PortalHeaderProps) {
  const currentDate = new Date().toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Saludo y fecha */}
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            ¡Hola, {userName.split(' ')[0]}!
          </h1>
          <p className="text-sm text-slate-500 capitalize">{currentDate}</p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar activo o ticket..."
              className="pl-10 pr-4 py-2 w-64 bg-slate-50 border border-slate-200 rounded-xl 
                       text-sm text-slate-700 placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                       transition-all"
            />
          </div>

          {/* Notificaciones */}
          <button className="relative p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}

