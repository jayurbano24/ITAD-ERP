'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EvidenceViewer, type WipeEvidence } from '../components/EvidenceViewer'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Shield, ArrowLeft, Camera, FileCheck } from 'lucide-react'

interface Asset {
  id: string
  serial_number: string
  internal_tag: string
  status: string
}

interface EvidenceData {
  asset: Asset
  evidence: WipeEvidence[]
  count: number
}

export default function EvidencesPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()


  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      const { data: evidenceAssets, error: evidenceError } = await supabase
        .from('asset_wipe_evidence')
        .select('asset_id')

      if (evidenceError) throw evidenceError

      const assetIds = Array.from(new Set(evidenceAssets?.map(e => e.asset_id) || []))

      if (assetIds.length === 0) {
        setAssets([])
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('assets')
        .select('id, serial_number, internal_tag, status')
        .in('id', assetIds)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setAssets(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const fetchEvidence = async (assetId: string) => {
    try {
      const response = await fetch(`/api/wipe/evidence/${assetId}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setSelectedEvidence(data)
      const asset = assets.find((a) => a.id === assetId)
      if (asset) setSelectedAsset(asset)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filteredAssets = assets.filter(
    (asset) =>
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.internal_tag?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedEvidence) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-surface-950 transition-colors">
        <PageHeader
          icon={Camera}
          title={`Evidencias: ${selectedAsset?.serial_number || 'Equipo'}`}
          subtitle="Garantía visual del proceso de borrado seguro"
          actions={
            <button
              onClick={() => {
                setSelectedEvidence(null)
                setSelectedAsset(null)
              }}
              className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-surface-900 text-gray-700 dark:text-white rounded-xl border border-gray-100 dark:border-surface-800 font-bold text-xs shadow-sm hover:bg-gray-50 dark:hover:bg-surface-800 transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Regresar a la Lista
            </button>
          }
        />

        <main className="p-8 max-w-[1600px] mx-auto">
          <div className="bg-white dark:bg-surface-900/40 p-8 rounded-[3rem] border border-gray-100 dark:border-surface-800 shadow-sm transition-all">
            <EvidenceViewer
              evidence={selectedEvidence.evidence}
              assetSerialNumber={selectedEvidence.asset.serial_number}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface-950 transition-colors">
      <PageHeader
        icon={Shield}
        title="Evidencias de Borrado"
        subtitle="Visualiza fotos y certificados de borrado de datos de activos seguros"
        variant="blue"
        actions={
          <div className="w-full md:w-80">
            <SearchInput
              placeholder="Buscar por serie o etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      <main className="p-8 max-w-[1600px] mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400 dark:text-surface-600 bg-white dark:bg-surface-900/30 rounded-[3rem] border border-gray-100 dark:border-surface-800">
            <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-6" />
            <p className="font-bold text-sm tracking-widest uppercase">Escaneando evidencias en repositorio...</p>
          </div>
        )}

        {error && (
          <div className="p-8 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/20 rounded-[2rem] text-rose-600 dark:text-rose-400 shadow-sm mb-8">
            <p className="font-bold">Error al consultar el repositorio</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}

        {!loading && filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => fetchEvidence(asset.id)}
                className="group relative flex flex-col p-6 bg-white dark:bg-surface-900/50 hover:bg-white dark:hover:bg-surface-800 rounded-[2.5rem] border border-gray-100 dark:border-surface-800 hover:border-brand-500/50 transition-all text-left shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 active:scale-95"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-gray-50 dark:bg-surface-950 rounded-2xl group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-400 text-gray-400 transition-colors">
                    <FileCheck className="h-6 w-6" />
                  </div>
                  <Badge variant="completado" size="sm">✓ Certificado</Badge>
                </div>

                <div className="space-y-1 mb-6">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest px-1">Serie del equipo</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
                    {asset.serial_number || 'SIN SERIE'}
                  </p>
                </div>

                <div className="space-y-1 mb-6 flex-1">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest px-1">Tag Interno</p>
                  <p className="text-xs font-bold text-gray-600 dark:text-surface-400 bg-gray-50 dark:bg-surface-950 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-surface-800 w-fit">
                    {asset.internal_tag}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-surface-800/50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">Ver Evidencias</span>
                  <ArrowLeft className="h-3 w-3 text-brand-500 rotate-180" />
                </div>
              </button>
            ))}
          </div>
        ) : !loading && filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-300 dark:text-surface-700 bg-white dark:bg-surface-900/30 rounded-[3rem] border border-gray-100 dark:border-surface-800">
            <Camera className="h-16 w-16 mb-6 opacity-20" />
            <p className="font-bold text-sm tracking-widest uppercase mb-1">Sin evidencias</p>
            <p className="text-xs font-medium opacity-60">
              {searchTerm
                ? 'No hay resultados para esta búsqueda'
                : 'No se han registrado certificados de borrado aún'}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  )
}
