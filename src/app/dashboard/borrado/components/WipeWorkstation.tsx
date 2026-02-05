'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Shield,
  Play,
  ShieldCheck,
  HardDrive,
  Laptop,
  Monitor,
  Smartphone,
  Server,
  Package,
  Clock,
  AlertTriangle,
  Zap,
  ScanLine,
  X,
  Loader2,
  CheckCircle,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type WipeAsset, searchAssetBySerial } from '../actions'
import { CertificationModal } from './CertificationModal'

// Mapeo de iconos por tipo de activo
const assetTypeIcons: Record<string, React.ElementType> = {
  laptop: Laptop,
  desktop: Monitor,
  smartphone: Smartphone,
  tablet: Smartphone,
  server: Server,
  monitor: Monitor,
  other: Package,
}

interface WipeWorkstationProps {
  initialAssets: WipeAsset[]
}

export function WipeWorkstation({ initialAssets }: WipeWorkstationProps) {
  // ✅ CORRECCIÓN: Usar directamente los props para reflejar cambios del servidor
  const assets = initialAssets
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<WipeAsset | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Modal state
  const [selectedAsset, setSelectedAsset] = useState<WipeAsset | null>(null)
  const [modalMode, setModalMode] = useState<'start' | 'certify'>('start')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Auto-focus en el buscador
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Buscar activo
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResult(null)

    const { data, error } = await searchAssetBySerial(searchQuery.trim())

    if (error) {
      setSearchError(error)
    } else if (data) {
      setSearchResult(data)
    }

    setIsSearching(false)
  }

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResult(null)
    setSearchError(null)
    searchInputRef.current?.focus()
  }

  // Abrir modal de inicio de borrado
  const handleOpenStart = (asset: WipeAsset) => {
    setSelectedAsset(asset)
    setModalMode('start')
    setIsModalOpen(true)
  }

  // Abrir modal de certificación
  const handleOpenCertify = (asset: WipeAsset) => {
    setSelectedAsset(asset)
    setModalMode('certify')
    setIsModalOpen(true)
  }

  // Cerrar modal y refrescar
  const handleModalComplete = () => {
    setIsModalOpen(false)
    setSelectedAsset(null)
    clearSearch()
    router.refresh()
  }

  // Renderizar estado badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'wiping':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-500"></span>
            </span>
            <span className="text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">En Proceso</span>
          </div>
        )
      case 'wiped':
      case 'ready_for_sale':
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 dark:border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            Certificado
          </span>
        )
      case 'received':
      default:
        return (
          <span className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100 dark:border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pendiente
          </span>
        )
    }
  }

  // Renderizar botón de acción
  const renderActionButton = (asset: WipeAsset) => {
    switch (asset.status) {
      case 'wiping':
        return (
          <button
            onClick={() => handleOpenCertify(asset)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 
                     text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            Certificar
          </button>
        )
      case 'wiped':
      case 'ready_for_sale':
        return (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 
                     text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Ver Reporte
          </button>
        )
      case 'received':
      default:
        return (
          <button
            onClick={() => handleOpenStart(asset)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 
                     text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Play className="w-4 h-4" />
            Iniciar
          </button>
        )
    }
  }

  // Renderizar fila de activo
  const renderAssetRow = (asset: WipeAsset) => {
    const AssetIcon = assetTypeIcons[asset.asset_type] || Package
    const isWiping = asset.status === 'wiping'
    const isCertified = asset.status === 'wiped' || asset.status === 'ready_for_sale'

    return (
      <tr
        key={asset.id}
        className={cn(
          "border-b border-gray-100 dark:border-gray-800 transition-all duration-300",
          isWiping && "bg-blue-50/50 dark:bg-blue-500/5",
          isCertified && "bg-emerald-50/50 dark:bg-emerald-500/5",
          "hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 group"
        )}
      >
        {/* Tag e Icono */}
        <td className="py-6 px-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl shadow-sm border transition-all duration-300",
              isWiping ? "bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30" :
                isCertified ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30" :
                  "bg-gray-100 dark:bg-surface-950 border-gray-200 dark:border-surface-800"
            )}>
              <AssetIcon className={cn(
                "w-5 h-5",
                isWiping ? "text-blue-700 dark:text-blue-400" :
                  isCertified ? "text-emerald-700 dark:text-emerald-400" :
                    "text-gray-500 dark:text-gray-400"
              )} />
            </div>
            <div>
              <p className="font-mono text-gray-900 dark:text-white font-black text-sm tracking-tight">{asset.internal_tag}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">{asset.asset_type}</p>
            </div>
          </div>
        </td>

        {/* Serial */}
        <td className="py-6 px-6">
          <p className="text-gray-900 dark:text-gray-200 font-mono text-xs font-black tracking-tight">{asset.serial_number || 'N/A'}</p>
        </td>

        {/* Marca/Modelo */}
        <td className="py-6 px-6">
          <p className="text-gray-900 dark:text-gray-200 text-sm font-black uppercase">
            {asset.manufacturer || ''}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
            {asset.model || ''}
          </p>
        </td>

        {/* Cliente */}
        <td className="py-6 px-6">
          <p className="text-gray-900 dark:text-gray-300 text-sm font-black">{asset.client_name}</p>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest mt-1 opacity-70">{asset.batch_code}</p>
        </td>

        {/* Estado - USANDO LA NUEVA FUNCIÓN */}
        <td className="py-6 px-6">
          {renderStatusBadge(asset.status)}
        </td>

        {/* Tiempo */}
        <td className="py-6 px-6 text-gray-400 dark:text-gray-500 text-xs font-bold font-mono">
          {asset.wipe_started_at ? (
            <span className={cn(
              "px-2.5 py-1 rounded-lg border",
              isCertified ? "bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" :
                "bg-blue-50 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20"
            )}>
              {formatDateTime(asset.wipe_started_at)}
            </span>
          ) : (
            '-'
          )}
        </td>

        {/* Acciones - USANDO LA NUEVA FUNCIÓN */}
        <td className="py-6 px-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              {renderActionButton(asset)}
              <div className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Fotos</span>
                  <span className={cn("text-xs font-black", asset.photoEvidenceCount > 0 ? "text-indigo-600" : "text-gray-300")}>{asset.photoEvidenceCount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">XML</span>
                  <span className={cn("text-xs font-black", asset.xmlEvidenceCount > 0 ? "text-emerald-600" : "text-gray-300")}>{asset.xmlEvidenceCount}</span>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  // Assets en proceso (wiping) primero
  const sortedAssets = [...assets].sort((a, b) => {
    if (a.status === 'wiping' && b.status !== 'wiping') return -1
    if (a.status !== 'wiping' && b.status === 'wiping') return 1
    return 0
  })

  return (
    <>
      <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-[2.5rem] overflow-hidden shadow-sm transition-all duration-300">
        {/* Buscador de Alto Impacto */}
        <div className="p-8 border-b border-gray-100 dark:border-surface-800 bg-gray-50/50 dark:bg-surface-950/50">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <ScanLine className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-500 group-focus-within:scale-110 transition-transform" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escanear activo o escribir serie..."
                className="w-full pl-16 pr-12 py-5 bg-white dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 
                         rounded-3xl text-gray-900 dark:text-white placeholder-gray-400 text-xl font-black tracking-tight
                         focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10
                         transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 
                           hover:text-rose-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs
                       rounded-3xl transition-all flex items-center justify-center gap-3
                       disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Buscar Equipo
            </button>
          </form>

          {/* Resultado de búsqueda */}
          {searchError && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{searchError}</p>
            </div>
          )}

          {searchResult && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Zap className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-semibold">
                      Activo encontrado: {searchResult.internal_tag}
                    </p>
                    <p className="text-surface-400 text-sm">
                      {searchResult.serial_number} • {searchResult.manufacturer} {searchResult.model}
                    </p>
                    <p className="text-xs mt-1">
                      {renderStatusBadge(searchResult.status)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-surface-300">
                      <span>Fotos: {searchResult.photoEvidenceCount}</span>
                      <span>XML: {searchResult.xmlEvidenceCount}</span>
                      <span>PDF: {searchResult.pdfEvidenceCount}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {searchResult.status === 'received' && (
                    <button
                      onClick={() => handleOpenStart(searchResult)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 
                               text-white font-semibold rounded-xl transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Iniciar Borrado
                    </button>
                  )}
                  {searchResult.status === 'wiping' && (
                    <button
                      onClick={() => handleOpenCertify(searchResult)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 
                               text-white font-semibold rounded-xl transition-colors"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Certificar
                    </button>
                  )}
                  {(searchResult.status === 'wiped' || searchResult.status === 'ready_for_sale') && (
                    <span className="flex items-center gap-2 px-4 py-2 bg-surface-700 
                                   text-emerald-400 font-semibold rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                      Ya Certificado
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Header de la Cola de Trabajo */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl shadow-sm">
              <HardDrive className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                Cola de Trabajo
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mt-0.5">
                {assets.length} equipos en espera de certificación
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                {assets.filter(a => a.status === 'received').length}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600/60">Pendientes</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
              <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-500 animate-spin" />
              <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                {assets.filter(a => a.status === 'wiping').length}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-600/60">En Procesos</span>
            </div>
          </div>
        </div>

        {/* Tabla Vacía */}
        {assets.length === 0 && (
          <div className="p-20 text-center bg-white dark:bg-surface-900">
            <div className="w-24 h-24 bg-gray-50 dark:bg-surface-950 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100 dark:border-surface-800">
              <Shield className="w-12 h-12 text-gray-200 dark:text-gray-700" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight uppercase">Cola de Trabajo Vacía</h3>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-sm max-w-sm mx-auto leading-relaxed">
              No hay activos pendientes de borrado en este momento. Utiliza el buscador superior para procesar nuevos equipos.
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 text-gray-500 dark:text-gray-400">
                <th className="py-5 px-6 text-left text-[10px] font-black uppercase tracking-widest">Activo</th>
                <th className="py-5 px-6 text-left text-[10px] font-black uppercase tracking-widest">Serial</th>
                <th className="py-5 px-6 text-left text-[10px] font-black uppercase tracking-widest">Dispositivo</th>
                <th className="py-5 px-6 text-left text-[10px] font-black uppercase tracking-widest">Cliente / Lote</th>
                <th className="py-5 px-6 text-left text-[10px] font-black uppercase tracking-widest">Estado</th>
                <th className="py-5 px-6 text-left text-[10px] font-black uppercase tracking-widest">Últ. Cambio</th>
                <th className="py-5 px-6 text-left text-[10px] font-black uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map(asset => renderAssetRow(asset))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Certificación */}
      {selectedAsset && (
        <CertificationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          asset={selectedAsset}
          onComplete={handleModalComplete}
          mode={modalMode}
        />
      )}
    </>
  )
}

// Helper para formatear tiempo transcurrido
function formatDateTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString('es-gt', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (err) {
    return '-'
  }
}
