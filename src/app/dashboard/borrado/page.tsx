import { Suspense } from 'react'
import {
  Shield,
  ShieldCheck,
  XCircle,
  FileDown
} from 'lucide-react'
import { getPendingWipeAssets, getWipeStats, getWipeStatusDetails, getWipedAssets } from './actions'
import { WipeWorkstation } from './components/WipeWorkstation'
import { CertificateGenerator } from './components/CertificateGenerator'
import { StatsCardsClient } from './components/StatsCardsClient'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Componente de Stats Cards
async function StatsCards() {
  const [stats, statusDetails] = await Promise.all([
    getWipeStats(),
    getWipeStatusDetails(),
  ])

  return <StatsCardsClient stats={stats} details={statusDetails} />
}

// Loading skeleton para stats
function StatsLoading() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-surface-700 rounded mb-2" />
              <div className="h-8 w-12 bg-gray-200 dark:bg-surface-700 rounded" />
            </div>
            <div className="p-3 bg-gray-200 dark:bg-surface-700 rounded-xl w-12 h-12" />
          </div>
          <div className="h-3 w-24 bg-gray-200 dark:bg-surface-700 rounded mt-3" />
        </div>
      ))}
    </div>
  )
}

// Componente de la cola de trabajo
async function WipeQueue() {
  const { data: assets, error } = await getPendingWipeAssets()

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-medium">Error al cargar la cola de trabajo</p>
        <p className="text-red-400/60 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return <WipeWorkstation initialAssets={assets || []} />
}

// Loading skeleton para la cola
function QueueLoading() {
  return (
    <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 animate-pulse">
      <div className="h-12 bg-gray-100 dark:bg-surface-800 rounded-xl mb-6" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-surface-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// Sección de certificados
async function CertificateSection() {
  // Obtener activos borrados hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: wipedAssets } = await getWipedAssets(today.toISOString())
  const supabase = await createClient()
  const { data: company } = await supabase
    .from('company_settings')
    .select('name, nit, address, phone, email, website, logo_url, primary_color, secondary_color')
    .limit(1)
    .single()

  return (
    <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
            <FileDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Certificados de Sanitización</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Genera certificados R2v3 para equipos borrados</p>
          </div>
        </div>
        <CertificateGenerator assets={wipedAssets || []} company={company || undefined} />
      </div>

      {wipedAssets && wipedAssets.length > 0 ? (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-surface-800/50 rounded-xl">
          <p className="text-gray-600 dark:text-surface-400 text-sm mb-2">
            Equipos certificados disponibles para incluir:
          </p>
          <div className="flex flex-wrap gap-2">
            {wipedAssets.slice(0, 10).map(asset => (
              <span
                key={asset.id}
                className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-mono rounded"
              >
                {asset.internal_tag}
              </span>
            ))}
            {wipedAssets.length > 10 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-surface-400 text-xs rounded">
                +{wipedAssets.length - 10} más
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-surface-500 text-sm mt-2">
          No hay equipos certificados hoy. Certifica activos para generar el documento.
        </p>
      )}
    </div>
  )
}

export default function BorradoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1419] transition-colors">
      {/* Header con gradiente de seguridad */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-cyan-50 dark:from-emerald-900/20 dark:via-[#1a1f2e] dark:to-cyan-900/20 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-500/20 dark:to-cyan-500/20 rounded-2xl border border-emerald-200 dark:border-emerald-500/30">
              <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                Borrado de Datos
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-500/30">
                  R2v3 Compliant
                </span>
              </h1>
              <p className="text-gray-600 dark:text-surface-400 mt-1">
                Estación de trabajo para sanitización de datos certificada NIST 800-88
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <Suspense fallback={<StatsLoading />}>
          <StatsCards />
        </Suspense>

        {/* Sección de Certificados */}
        <Suspense fallback={
          <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl p-6 animate-pulse">
            <div className="h-20 bg-gray-100 dark:bg-surface-800 rounded-xl" />
          </div>
        }>
          <CertificateSection />
        </Suspense>

        {/* Workstation */}
        <Suspense fallback={<QueueLoading />}>
          <WipeQueue />
        </Suspense>

        {/* Info de cumplimiento */}
        <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/10 dark:to-cyan-900/10 border border-emerald-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-emerald-700 dark:text-emerald-400 font-semibold">Cumplimiento R2v3 - Sanitización de Datos</h3>
              <p className="text-gray-600 dark:text-surface-400 text-sm mt-2">
                Este módulo cumple con los requisitos de R2v3 Core Requirement 6 para la sanitización de datos.
                Todos los borrados deben ser certificados con un ID de reporte del software de borrado utilizado
                (Blancco, KillDisk, etc.) o documentar la destrucción física del dispositivo de almacenamiento.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="px-3 py-1 bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-300 text-xs rounded-full">
                  NIST 800-88
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-300 text-xs rounded-full">
                  DoD 5220.22-M
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-300 text-xs rounded-full">
                  HIPAA Compliant
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-300 text-xs rounded-full">
                  GDPR Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
