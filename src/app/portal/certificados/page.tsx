import Link from 'next/link'
import { 
  FileCheck, 
  Download, 
  ArrowLeft,
  Shield,
  Calendar,
  Laptop,
  HardDrive,
  CheckCircle
} from 'lucide-react'
import { getClientCertificates } from '../actions'

export const dynamic = 'force-dynamic'

export default async function CertificadosPage() {
  const certificates = await getClientCertificates()

  const getAssetIcon = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'laptop':
        return Laptop
      case 'desktop':
        return HardDrive
      default:
        return HardDrive
    }
  }

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
          <FileCheck className="w-7 h-7 text-emerald-500" />
          Certificados de Borrado
        </h1>
        <p className="text-slate-500 mt-1">
          Descarga los certificados de borrado seguro de tus equipos
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8 
                    border border-emerald-100 flex items-start gap-4">
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <Shield className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h3 className="font-semibold text-emerald-800 mb-1">
            Borrado Certificado NIST 800-88
          </h3>
          <p className="text-emerald-700 text-sm">
            Todos los equipos son procesados siguiendo el estándar NIST SP 800-88 
            para garantizar la destrucción irreversible de datos.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Certificados Disponibles</p>
              <p className="text-2xl font-bold text-slate-800">{certificates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <HardDrive className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Equipos Borrados</p>
              <p className="text-2xl font-bold text-slate-800">{certificates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-lg">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Método de Borrado</p>
              <p className="text-lg font-bold text-slate-800">NIST 800-88</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Certificados */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Lista de Certificados</h2>
        </div>

        {certificates.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Equipo
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Serial
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Marca / Modelo
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Método
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Fecha Borrado
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Certificado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certificates.map((cert) => {
                const AssetIcon = getAssetIcon(cert.asset_type)
                return (
                  <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                    {/* Equipo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <AssetIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="font-mono text-sm text-slate-700">
                          {cert.internal_tag}
                        </span>
                      </div>
                    </td>

                    {/* Serial */}
                    <td className="px-6 py-4">
                      <span className="text-slate-600 font-mono text-sm">
                        {cert.serial_number || '-'}
                      </span>
                    </td>

                    {/* Marca / Modelo */}
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">
                        {cert.manufacturer || 'Sin marca'}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {cert.model || 'Sin modelo'}
                      </p>
                    </td>

                    {/* Método */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 
                                     rounded-full text-xs font-medium">
                        {cert.wipe_method || 'NIST 800-88'}
                      </span>
                    </td>

                    {/* Fecha Borrado */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        {cert.wiped_at 
                          ? new Date(cert.wiped_at).toLocaleDateString('es-GT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '-'}
                      </div>
                    </td>

                    {/* Descargar */}
                    <td className="px-6 py-4 text-center">
                      {cert.data_wipe_certificate_url ? (
                        <a
                          href={cert.data_wipe_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 
                                   bg-emerald-500 hover:bg-emerald-600 text-white 
                                   rounded-lg transition-colors text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">
                          Generando...
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-16 text-center">
            <FileCheck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Sin certificados disponibles
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Los certificados aparecerán aquí una vez que tus equipos hayan pasado 
              por el proceso de borrado seguro.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

