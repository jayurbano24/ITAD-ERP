'use client'

import { useState } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { Text } from '@/components/ui/Text'
import { NewWorkOrderModal } from './NewWorkOrderModal'

export function TallerHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-100 dark:border-surface-800 pb-10">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-amber-600 dark:bg-amber-600 rounded-[2.5rem] shadow-xl shadow-amber-500/20 active:scale-95 transition-transform cursor-pointer">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <div>
            <Text variant="h1" as="h1" className="leading-none tracking-tighter uppercase font-black">
              Taller de Reparación
            </Text>
            <Text variant="muted" className="mt-2 block font-black uppercase tracking-[0.4em]">
              Gestión de órdenes de trabajo y reparaciones
            </Text>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-8 py-5 bg-amber-600 hover:bg-amber-700 
                   text-white text-xs font-black uppercase tracking-widest rounded-3xl transition-all shadow-2xl shadow-amber-500/30 active:scale-95 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Nueva Orden de Trabajo
        </button>
      </div>

      <NewWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

