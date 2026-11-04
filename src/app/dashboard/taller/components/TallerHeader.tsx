'use client'

import { useState } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { Text } from '@/components/ui/Text'
import { NewWorkOrderModal } from './NewWorkOrderModal'

export function TallerHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 dark:border-surface-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-600 rounded-xl shadow-md shadow-amber-500/20">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <Text variant="h1" as="h1" className="text-xl leading-none tracking-tight uppercase font-black">
              Taller de Reparación
            </Text>
            <Text variant="muted" className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider">
              Órdenes · Diagnóstico · Reparación · QC
            </Text>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 
                   text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva OS
        </button>
      </div>

      <NewWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
