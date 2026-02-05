'use client'

import { PackageCheck } from 'lucide-react'
import RecepcionModule from './components/RecepcionModule'

export default function DashboardRecepcion() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-500">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700 px-10 py-8 sticky top-0 z-40 transition-all shadow-sm">
        <div className="flex items-center gap-6 max-w-[1600px] mx-auto">
          <div className="p-4 bg-purple-500 dark:bg-purple-600 rounded-[2rem] shadow-xl shadow-purple-500/20 active:scale-95 transition-transform cursor-pointer">
            <PackageCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">
              Recepción
            </h1>
            <p className="text-gray-700 dark:text-gray-300 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">
              Módulo de recepción enfocado para monitorear un lote activo.
            </p>
          </div>
        </div>
      </header>

      <main className="p-10 max-w-[1600px] mx-auto">
        <RecepcionModule />
      </main>
    </div>
  )
}
