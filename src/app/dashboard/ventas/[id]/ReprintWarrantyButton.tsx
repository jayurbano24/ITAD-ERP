'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { getWarrantyPrintPayloadForOrder } from '../actions'
import { printWarrantyPolicy } from '@/lib/ventas/printWarrantyPolicy'

export default function ReprintWarrantyButton({
  orderId,
  latestPolicyNumber,
}: {
  orderId: string
  latestPolicyNumber?: string | null
}) {
  const [loading, setLoading] = useState(false)

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        void (async () => {
          setLoading(true)
          try {
            const { payload } = await getWarrantyPrintPayloadForOrder(orderId, {
              registerIfMissing: true,
            })
            if (payload) await printWarrantyPolicy(payload)
          } finally {
            setLoading(false)
          }
        })()
      }}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#274b7a] disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Reimprimir política
      {latestPolicyNumber ? (
        <span className="font-mono text-[10px] opacity-90">{latestPolicyNumber}</span>
      ) : null}
    </button>
  )
}
