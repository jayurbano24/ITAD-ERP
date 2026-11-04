'use client'

import { useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'

export default function DownloadLotsExcelButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finanzas/lots-excel', { method: 'GET' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Error ${res.status}`)
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="([^"]+)"/)
      const fileName = match?.[1] || `Finanzas-Lotes-${new Date().toISOString().slice(0, 10)}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo descargar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleDownload()}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        Excel lotes + resumen
      </button>
      {error && <span className="text-[10px] text-red-500 font-bold max-w-xs text-right">{error}</span>}
    </div>
  )
}
