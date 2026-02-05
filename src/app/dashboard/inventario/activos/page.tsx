import { Package, ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { getFilteredAssets, type FilteredAsset } from './actions'

export const dynamic = 'force-dynamic'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getWorkshopClassifications = (specifications?: Record<string, unknown> | null) => {
  if (!isRecord(specifications)) return {}
  const raw = specifications.workshop_classifications
  if (!isRecord(raw)) return {}
  return {
    rec: typeof raw.rec === 'string' ? raw.rec : undefined,
    f: typeof raw.f === 'string' ? raw.f : undefined,
    c: typeof raw.c === 'string' ? raw.c : undefined
  }
}

const summarizeHardwareSpecs = (specifications?: Record<string, unknown> | null) => {
  if (!isRecord(specifications)) return null
  const raw = specifications.hardware_specs
  if (!isRecord(raw)) return null
  const pieces: string[] = []

  if (typeof raw.processor === 'string' && raw.processor.trim()) {
    pieces.push(raw.processor.trim())
  }
  if (typeof raw.ram_capacity === 'string' && raw.ram_capacity.trim()) {
    const type = typeof raw.ram_type === 'string' && raw.ram_type.trim()
      ? ` (${raw.ram_type.trim()})`
      : ''
    pieces.push(`${raw.ram_capacity.trim()}${type}`)
  }
  if (typeof raw.disk_capacity === 'string' && raw.disk_capacity.trim()) {
    const type = typeof raw.disk_type === 'string' && raw.disk_type.trim()
      ? ` (${raw.disk_type.trim()})`
      : ''
    pieces.push(`${raw.disk_capacity.trim()}${type}`)
  }
  if (typeof raw.keyboard_type === 'string' && raw.keyboard_type.trim()) {
    pieces.push(raw.keyboard_type.trim())
  }

  return pieces.length > 0 ? pieces.join(' • ') : null
}

interface PageProps {
  searchParams: Promise<{ brand?: string; model?: string; type?: string }>
}

export default async function ActivosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { brand, model, type } = params

  const { data: assets, error } = await getFilteredAssets(brand, model, type)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const statusStyles: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    received: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    diagnosing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    waiting_parts: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    waiting_seedstock: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    waiting_quote: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    quote_approved: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    quote_rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    qc_pending: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    qc_passed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    qc_failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    ready_to_ship: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    wiped: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    wiping: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ready_for_sale: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    sold: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    scrapped: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const statusLabels: Record<string, string> = {
    open: 'EN BODEGA',
    received: 'EN BODEGA',
    in_stock: 'EN BODEGA',
    diagnosing: 'EN DIAGNÓSTICO',
    in_progress: 'EN REPARACIÓN',
    waiting_parts: 'EN REPARACIÓN',
    waiting_seedstock: 'EN REPARACIÓN',
    waiting_quote: 'COTIZACIÓN PENDIENTE',
    quote_approved: 'COTIZACIÓN APROBADA',
    quote_rejected: 'COTIZACIÓN RECHAZADA',
    qc_pending: 'EN CQ',
    qc_passed: 'QC APROBADO',
    qc_failed: 'QC FALLIDO',
    ready_to_ship: 'LISTO PARA ENTREGA',
    completed: 'COMPLETADA',
    cancelled: 'CANCELADA',
    wiped: 'BORRADO DE DATOS',
    wiping: 'BORRANDO',
    ready_for_sale: 'LISTO PARA VENTA',
    sold: 'VENDIDO',
    scrapped: 'DESECHADO',
  }

  const defaultStatusClasses = 'bg-surface-700 text-surface-400 border border-surface-700/50'

  const getBadgeKey = (asset: FilteredAsset) => asset.work_order_status || asset.status

  const gradeColors: Record<string, string> = {
    C1: 'bg-red-500/20 text-red-400',
    C2: 'bg-orange-500/20 text-orange-400',
    C3: 'bg-amber-500/20 text-amber-400',
    C4: 'bg-yellow-500/20 text-yellow-400',
    C5: 'bg-lime-500/20 text-lime-400',
    C6: 'bg-green-500/20 text-green-400',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/inventario"
            className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Inventario
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-indigo-500" />
            {brand || 'Todos'} {model || ''}
          </h1>
          <p className="text-surface-400 mt-1">
            {type && <span className="text-surface-500">{type} • </span>}
            {assets.length} unidades encontradas
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          Error: {error}
        </div>
      )}

      {/* Tabla de Activos */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-850 border-b border-surface-700">
              <th className="text-left px-3 py-4 text-surface-400 text-xs font-semibold uppercase">
                Serial / Tag
              </th>
              <th className="text-left px-3 py-4 text-surface-400 text-xs font-semibold uppercase">
                Producto
              </th>
              <th className="text-center px-3 py-4 text-amber-400 text-xs font-semibold uppercase">
                Caja
              </th>
              <th className="text-center px-3 py-4 text-purple-400 text-xs font-semibold uppercase">
                Ubicación
              </th>
              <th className="text-center px-3 py-4 text-green-400 text-xs font-semibold uppercase">
                Transporte
              </th>
              <th className="text-left px-3 py-4 text-surface-400 text-xs font-semibold uppercase">
                Lote
              </th>
              <th className="text-center px-3 py-4 text-surface-400 text-xs font-semibold uppercase">
                Clasif. REC
              </th>
              <th className="text-left px-3 py-4 text-surface-400 text-xs font-semibold uppercase">
                Estado
              </th>
              <th className="text-center px-3 py-4 text-surface-400 text-xs font-semibold uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <Package className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                  <p className="text-surface-400">No se encontraron activos</p>
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-surface-800/50 transition-colors">
                  {/* Serial / Tag */}
                  <td className="px-3 py-3">
                    <div>
                      <p className="text-white font-mono text-sm">
                        {asset.serial_number || 'Sin serial'}
                      </p>
                      <p className="text-surface-500 text-xs">
                        {asset.internal_tag}
                      </p>
                    </div>
                  </td>

                  {/* Producto */}
                  <td className="px-3 py-3">
                    <p className="text-white text-sm">{asset.manufacturer} {asset.model}</p>
                    <p className="text-surface-500 text-xs">{asset.asset_type}</p>
                  </td>

                  {/* Caja */}
                  <td className="px-3 py-3 text-center">
                    {asset.box_number && asset.box_number > 0 ? (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        📦 {asset.box_number}
                      </span>
                    ) : (
                      <span className="text-surface-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Ubicación */}
                  <td className="px-3 py-3 text-center">
                    {asset.batch_location ? (
                      <span className="text-purple-400 text-xs font-mono font-semibold">
                        {asset.batch_location}
                      </span>
                    ) : (
                      <span className="text-surface-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Transporte */}
                  <td className="px-3 py-3 text-center">
                    {asset.driver_name ? (
                      <div className="flex flex-col items-center text-[11px]">
                        <span className="text-green-400 font-medium">{asset.driver_name}</span>
                        <span className="text-surface-400">{asset.vehicle_plate || '-'}</span>
                        {asset.transport_guide && (
                          <span className="text-blue-400 font-mono">{asset.transport_guide}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-surface-500 text-xs">-</span>
                    )}
                  </td>

                  {/* Lote */}
                  <td className="px-3 py-3">
                    {asset.batch_code && asset.batch_id ? (
                      <Link
                        href={`/dashboard/logistica/${asset.batch_id}`}
                        className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                      >
                        {asset.batch_code}
                      </Link>
                    ) : (
                      <span className="text-surface-500 text-sm">-</span>
                    )}
                  </td>

                  {/* Clasificación REC */}
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const classifications = getWorkshopClassifications(asset.specifications)
                      const hardwareSummary = summarizeHardwareSpecs(asset.specifications)
                      const recLabel = classifications.rec || asset.condition_grade
                      if (!recLabel) {
                        return <span className="text-surface-500 text-xs">-</span>
                      }

                      return (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-surface-700 bg-surface-800 text-white">
                            {recLabel}
                          </span>
                          {classifications.f && (
                            <span className="text-[11px] text-sky-300">F: {classifications.f}</span>
                          )}
                          {classifications.c && (
                            <span className="text-[11px] text-amber-300">C: {classifications.c}</span>
                          )}
                          {!!hardwareSummary && (
                            <span className="text-[10px] text-surface-400 italic text-center">
                              {hardwareSummary}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    {(() => {
                      const badgeKey = getBadgeKey(asset)
                      const badgeLabel = statusLabels[badgeKey] || asset.status
                      const badgeClasses = `${statusStyles[badgeKey] || defaultStatusClasses}`

                      return (
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${badgeClasses}`}>
                          {badgeLabel}
                        </span>
                      )
                    })()}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <button
                      className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                      title="Imprimir Etiqueta"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

