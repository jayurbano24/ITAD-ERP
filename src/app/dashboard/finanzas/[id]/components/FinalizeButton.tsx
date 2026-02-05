'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, Lock } from 'lucide-react'
import { finalizeSettlement } from '../../actions'

interface FinalizeButtonProps {
  settlementId: string
}

export function FinalizeButton({ settlementId }: FinalizeButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleFinalize = async () => {
    setIsLoading(true)
    const result = await finalizeSettlement(settlementId)
    setIsLoading(false)
    
    if (result.success) {
      router.refresh()
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-surface-400 text-sm">¿Confirmar?</span>
        <button
          onClick={handleFinalize}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 
                   text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finalizando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Sí, Finalizar
            </>
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 
               text-white font-semibold rounded-lg transition-colors"
    >
      <Lock className="w-4 h-4" />
      Finalizar Liquidación
    </button>
  )
}

