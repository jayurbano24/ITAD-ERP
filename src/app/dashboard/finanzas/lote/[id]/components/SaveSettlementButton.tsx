'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, CheckCircle } from 'lucide-react'
import { createSettlement, type PnLResult } from '../../../actions'

interface SaveSettlementButtonProps {
  batchId: string
  pnl: PnLResult
}

export function SaveSettlementButton({ batchId, pnl }: SaveSettlementButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    const result = await createSettlement(batchId, pnl)
    setIsLoading(false)
    
    if (result.success && result.data) {
      setSaved(true)
      setTimeout(() => {
        router.push(`/dashboard/finanzas/${result.data.id}`)
      }, 1000)
    }
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2 px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
        <CheckCircle className="w-5 h-5" />
        ¡Guardado!
      </div>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={isLoading}
      className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 
               text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Guardando...
        </>
      ) : (
        <>
          <FileText className="w-5 h-5" />
          Guardar Liquidación
        </>
      )}
    </button>
  )
}

