'use client'

import React, { useState, useCallback } from 'react'
import { Activity, Search, Clock, Package } from 'lucide-react'
import { AuditoriaViewer } from '../dashboard/admin/auditoria/components/AuditoriaViewer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface EstadoActual {
  serie: string
  estatus: string
  bodega: string
  ubicacion: string
  fechaUltimoMovimiento: string
  fechaEnBodega: string
  caja: number | null
  numeroLote: string
  ticket: string
}

interface HistorialItem {
  timestamp: string | null
  status: string
  action: string
  module: string
  user_name: string
  bodega?: string
  location?: string
}

export default function AuditoriaHistorialPage() {
  const [activeTab, setActiveTab] = useState<'auditoria' | 'historial'>('auditoria')
  const [serieInput, setSerieInput] = useState('')
  const [serieBusqueda, setSerieBusqueda] = useState('')
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [estadoActual, setEstadoActual] = useState<EstadoActual | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [loadingEstado, setLoadingEstado] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const buscarPorSerie = useCallback(async () => {
    const serie = (serieInput || '').trim().toUpperCase().replace(/\s+/g, '')
    if (!serie) {
      setMensaje('Ingresa un número de serie o IMEI para buscar.')
      setEstadoActual(null)
      setHistorial([])
      return
    }
    setSerieBusqueda(serie)
    setMensaje(null)
    setLoadingHistorial(true)
    setLoadingEstado(true)
    try {
      const [histRes, estadoRes] = await Promise.all([
        fetch(`/api/auditoria?serie=${encodeURIComponent(serie)}`),
        fetch(`/api/auditoria/estado-actual?serie=${encodeURIComponent(serie)}`)
      ])
      const historialData = histRes.ok ? await histRes.json() : []
      const estadoData = estadoRes.ok ? await estadoRes.json() : null
      setHistorial(Array.isArray(historialData) ? historialData : [])
      const tieneEstado = estadoData && (estadoData.serie || estadoData.estatus !== undefined)
      setEstadoActual(tieneEstado ? estadoData : null)
      if (historialData.length === 0 && !tieneEstado) {
        setMensaje('No hay registros ni estado actual para esta serie/IMEI.')
      }
    } catch (e) {
      console.error('Error buscando por serie:', e)
      setMensaje('Error al consultar. Intenta de nuevo.')
      setHistorial([])
      setEstadoActual(null)
    } finally {
      setLoadingHistorial(false)
      setLoadingEstado(false)
    }
  }, [serieInput])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-indigo-500" /> Auditoría General
        </h1>
      </div>

      <div className="flex gap-4 border-b border-surface-800 pb-1">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'auditoria' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setActiveTab('auditoria')}
        >
          Bitácora Global Mejorada
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'historial' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setActiveTab('historial')}
        >
          Historial por Serie
        </button>
      </div>

      {activeTab === 'auditoria' ? (
        <AuditoriaViewer />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-2">
              Número de serie o IMEI
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={serieInput}
                onChange={(e) => setSerieInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarPorSerie()}
                placeholder="Ej: 3151323165510"
                className="flex-1 bg-[#1A1A1A] border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-surface-500 font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={buscarPorSerie}
                disabled={loadingHistorial || loadingEstado}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>
          </div>

          {mensaje && !estadoActual && historial.length === 0 && !loadingHistorial && (
            <div className="bg-surface-900 border border-surface-700 rounded-2xl p-8 text-center">
              <p className="text-surface-400">{mensaje}</p>
            </div>
          )}

          {estadoActual && (
            <div className="bg-[#1A1A1A] border border-surface-700 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Estado actual de la serie
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Serie / IMEI</p>
                  <p className="text-sm font-bold text-white">{estadoActual.serie || serieBusqueda}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Estatus</p>
                  <p className="text-sm font-bold text-white">{estadoActual.estatus || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Bodega</p>
                  <p className="text-sm font-bold text-white">{estadoActual.bodega || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Ubicación</p>
                  <p className="text-sm font-bold text-white">{estadoActual.ubicacion || 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Caja</p>
                  <p className="text-sm font-bold text-white">{estadoActual.caja ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Número de lote</p>
                  <p className="text-sm font-bold text-white">{estadoActual.numeroLote || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Ticket</p>
                  <p className="text-sm font-bold text-white">{estadoActual.ticket || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1">Fecha en bodega</p>
                  <p className="text-sm font-bold text-white">
                    {estadoActual.fechaEnBodega
                      ? format(new Date(estadoActual.fechaEnBodega), "dd/MM/yyyy HH:mm", { locale: es })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {historial.length > 0 && (
            <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
              <h2 className="text-lg font-bold text-white px-6 py-4 border-b border-surface-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Historial de eventos
              </h2>
              <div className="divide-y divide-surface-800 max-h-[400px] overflow-y-auto">
                {historial.map((item, idx) => (
                  <div key={idx} className="px-6 py-4 hover:bg-surface-800/50 transition-colors">
                    <div className="flex flex-wrap items-center gap-2 text-surface-400 text-xs mb-1">
                      <span>
                        {item.timestamp
                          ? format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: es })
                          : '—'}
                      </span>
                      <span>•</span>
                      <span>{item.module}</span>
                      <span>•</span>
                      <span>{item.user_name}</span>
                    </div>
                    <p className="text-white font-medium">{item.action}</p>
                    {(item.status || item.bodega || item.location) && (
                      <p className="text-surface-400 text-xs mt-1">
                        {[item.status, item.bodega, item.location].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
