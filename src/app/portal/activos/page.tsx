import Link from 'next/link'
import { 
  Package, 
  ArrowLeft,
  Search,
  Laptop,
  Monitor,
  Smartphone,
  HardDrive,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  ShoppingCart
} from 'lucide-react'
import { getClientAssets } from '../actions'

export const dynamic = 'force-dynamic'

export default async function ActivosPage() {
  const { data: assets, total } = await getClientAssets()

  const getAssetIcon = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'laptop':
        return Laptop
      case 'monitor':
        return Monitor
      case 'phone':
      case 'smartphone':
        return Smartphone
      default:
        return HardDrive
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Recibido
          </span>
        )
      case 'diagnosing':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">
            <Loader2 className="w-3 h-3" />
            En Diagnóstico
          </span>
        )
      case 'wiping':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Borrando Datos
          </span>
        )
      case 'wiped':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Datos Borrados
          </span>
        )
      case 'ready_for_sale':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium">
            <ShoppingCart className="w-3 h-3" />
            Listo para Venta
          </span>
        )
      case 'sold':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Vendido
          </span>
        )
      case 'scrapped':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Scrap
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
            {status}
          </span>
        )
    }
  }

  const getConditionBadge = (condition: string | null) => {
    if (!condition) return null
    
    const colors: Record<string, string> = {
      'grade_a': 'bg-emerald-100 text-emerald-700',
      'grade_b': 'bg-blue-100 text-blue-700',
      'grade_c': 'bg-amber-100 text-amber-700',
      'for_parts': 'bg-red-100 text-red-700'
    }
    
    const labels: Record<string, string> = {
      'grade_a': 'Grado A',
      'grade_b': 'Grado B',
      'grade_c': 'Grado C',
      'for_parts': 'Para Partes'
    }
    
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[condition] || 'bg-slate-100 text-slate-600'}`}>
        {labels[condition] || condition}
      </span>
    )
  }

  // Contar por estado
  const stateCounts = assets.reduce((acc, asset) => {
    acc[asset.status] = (acc[asset.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/portal"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 
                   transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Package className="w-7 h-7 text-blue-500" />
          Mis Activos
        </h1>
        <p className="text-slate-500 mt-1">
          Consulta el estado de todos tus equipos
        </p>
      </div>

      {/* Stats por estado */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium whitespace-nowrap">
          Todos ({total})
        </button>
        {Object.entries(stateCounts).map(([status, count]) => (
          <button 
            key={status}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 
                     text-slate-600 rounded-lg text-sm font-medium whitespace-nowrap
                     hover:border-slate-300 transition-colors"
          >
            {status === 'received' && 'Recibidos'}
            {status === 'diagnosing' && 'En Diagnóstico'}
            {status === 'wiping' && 'Borrando'}
            {status === 'wiped' && 'Borrados'}
            {status === 'ready_for_sale' && 'Listos'}
            {status === 'sold' && 'Vendidos'}
            {status === 'scrapped' && 'Scrap'}
            {' '}({count})
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por serial, tag o modelo..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl 
                   text-slate-700 placeholder:text-slate-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Tabla de Activos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {assets.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                  Tag
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                  Serial
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                  Equipo
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                  Estado
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                  Condición
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                  Borrado
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                  Ingreso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((asset) => {
                const AssetIcon = getAssetIcon(asset.asset_type)
                return (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    {/* Tag */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <AssetIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="font-mono font-semibold text-slate-700">
                          {asset.internal_tag}
                        </span>
                      </div>
                    </td>

                    {/* Serial */}
                    <td className="px-6 py-4">
                      <span className="text-slate-600 font-mono text-sm">
                        {asset.serial_number || '-'}
                      </span>
                    </td>

                    {/* Equipo */}
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">
                        {asset.manufacturer || 'Sin marca'}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {asset.model || 'Sin modelo'}
                      </p>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(asset.status)}
                    </td>

                    {/* Condición */}
                    <td className="px-6 py-4 text-center">
                      {getConditionBadge(asset.condition)}
                    </td>

                    {/* Borrado */}
                    <td className="px-6 py-4 text-center">
                      {asset.data_wipe_status === 'completed' ? (
                        <span className="flex items-center justify-center gap-1.5 text-emerald-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Completado
                        </span>
                      ) : asset.data_wipe_status === 'in_progress' ? (
                        <span className="flex items-center justify-center gap-1.5 text-amber-600 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          En proceso
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">Pendiente</span>
                      )}
                    </td>

                    {/* Fecha Ingreso */}
                    <td className="px-6 py-4 text-right text-slate-500 text-sm">
                      {new Date(asset.created_at).toLocaleDateString('es-GT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-16 text-center">
            <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Sin activos registrados
            </h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Tus equipos aparecerán aquí una vez que los recibamos en nuestras instalaciones.
            </p>
            <Link
              href="/portal/solicitud"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white 
                       rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              Solicitar Recolección
            </Link>
          </div>
        )}
      </div>

      {/* Pagination placeholder */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-slate-500 text-sm">
            Mostrando 1-{Math.min(20, total)} de {total}
          </span>
        </div>
      )}
    </div>
  )
}

