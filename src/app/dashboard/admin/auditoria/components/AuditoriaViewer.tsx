'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Search, Filter, Calendar, User, Activity, Box,
    ChevronDown, ChevronUp, Download, Eye, Clock,
    Monitor, Globe, Shield, RefreshCw, X
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { AuditLogDetailed, AuditActionType, AuditModuleType } from '@/lib/types/audit'

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/20',
    UPDATE: 'bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/20',
    DELETE: 'bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/20',
    STATUS_CHANGE: 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/20',
    TRANSFER: 'bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/20',
}

export const AuditoriaViewer: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogDetailed[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedLog, setSelectedLog] = useState<AuditLogDetailed | null>(null)
    const [filters, setFilters] = useState({
        search: '',
        modulo: '',
        accion: '',
        desde: '',
        hasta: ''
    })
    const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 })

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                limit: pagination.limit.toString(),
                offset: pagination.offset.toString(),
                search: filters.search,
                modulo: filters.modulo,
                accion: filters.accion,
                desde: filters.desde,
                hasta: filters.hasta
            })
            const res = await fetch(`/api/auditoria/reporte?${params}`)
            const data = await res.json()
            setLogs(data.data || [])
            setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }))
        } catch (error) {
            console.error('Error fetching audit logs:', error)
        } finally {
            setLoading(false)
        }
    }, [filters, pagination.limit, pagination.offset])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFilters(prev => ({ ...prev, [name]: value }))
        setPagination(prev => ({ ...prev, offset: 0 }))
    }

    const renderDiff = (changes: any) => {
        if (!changes) return null
        return (
            <div className="grid grid-cols-1 gap-4 mt-6">
                {Object.entries(changes).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-gray-50 dark:bg-[#0f1419] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-300">
                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 underline underline-offset-4">{key.replace(/_/g, ' ')}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <span className="text-[11px] text-red-600 dark:text-red-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                                    <X className="w-3.5 h-3.5" /> Anterior
                                </span>
                                <div className="text-sm text-gray-400 dark:text-gray-500 font-mono break-all line-through decoration-2 opacity-80 bg-white dark:bg-[#1a1f2e] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                    {String(value.old ?? 'N/A')}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" /> Nuevo
                                </span>
                                <div className="text-sm text-gray-900 dark:text-white font-mono font-bold break-all bg-emerald-50 dark:bg-emerald-500/5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                                    {String(value.new ?? 'N/A')}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 dark:bg-indigo-600 rounded-[2rem] shadow-lg shadow-indigo-500/20">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Auditoría del Sistema</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Registro completo de trazabilidad</p>
                    </div>
                </div>
                <button
                    onClick={() => {/* Export Logic */ }}
                    className="flex items-center justify-center gap-3 px-8 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-700 rounded-2xl transition-all text-sm font-black uppercase tracking-widest shadow-sm active:scale-95"
                >
                    <Download className="w-4 h-4" />
                    Exportar Datos
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-3xl p-5 grid grid-cols-1 md:grid-cols-5 gap-5 shadow-sm transition-all">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        name="search"
                        placeholder="Buscar log..."
                        value={filters.search}
                        onChange={handleFilterChange}
                        className="w-full bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                </div>
                <select
                    name="modulo"
                    value={filters.modulo}
                    onChange={handleFilterChange}
                    className="bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                    <option value="">Módulos (Todos)</option>
                    <option value="WAREHOUSE">Bodega</option>
                    <option value="TICKETS">Tickets</option>
                    <option value="WORKSHOP">Taller</option>
                </select>
                <select
                    name="accion"
                    value={filters.accion}
                    onChange={handleFilterChange}
                    className="bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                    <option value="">Acciones (Todas)</option>
                    <option value="CREATE">Creación</option>
                    <option value="UPDATE">Actualización</option>
                    <option value="DELETE">Eliminación</option>
                    <option value="STATUS_CHANGE">Cambio de Estado</option>
                </select>
                <input
                    type="date"
                    name="desde"
                    value={filters.desde}
                    onChange={handleFilterChange}
                    className="bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                />
                <input
                    type="date"
                    name="hasta"
                    value={filters.hasta}
                    onChange={handleFilterChange}
                    className="bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                />
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm transition-all">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-[#0f1419] border-b border-gray-100 dark:border-gray-800">
                                <th className="text-left px-6 py-5 text-gray-700 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Fecha</th>
                                <th className="text-left px-6 py-5 text-gray-700 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Usuario</th>
                                <th className="text-left px-6 py-5 text-gray-700 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Acción</th>
                                <th className="text-left px-6 py-5 text-gray-700 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Descripción</th>
                                <th className="text-left px-6 py-5 text-gray-700 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Referencia</th>
                                <th className="text-center px-6 py-5 text-gray-700 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Ver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8 bg-surface-900/50"></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                        No se encontraron registros de auditoría
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#242936] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-900 dark:text-white font-extrabold uppercase tracking-tight">
                                                {format(new Date(log.created_at), 'dd MMM yyyy', { locale: es })}
                                            </span>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-500 font-bold font-mono">
                                                {format(new Date(log.created_at), 'HH:mm:ss')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                                                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 dark:text-white font-black truncate max-w-[150px]">{log.user_name || 'Sistema'}</span>
                                                <span className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase font-black tracking-widest">{log.user_role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black border uppercase tracking-widest shadow-sm ${ACTION_COLORS[log.action] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium line-clamp-2 max-w-sm leading-relaxed">{log.description}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-black font-mono bg-indigo-50 dark:bg-indigo-900/10 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/40 uppercase tracking-wider">
                                            {log.entity_reference || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-2xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20 shadow-sm active:scale-90"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed Sidebar/Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="relative h-full w-full max-w-2xl bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-[2.5rem] shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-300 scrollbar-none">
                        <div className="p-8 space-y-10">
                            {/* Close & Title */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-5">
                                    <div className={cn("p-4 rounded-[1.5rem] border-2 shadow-sm transition-all animate-pulse", ACTION_COLORS[selectedLog.action])}>
                                        <Activity className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Detalle de Actividad</h2>
                                        <p className="text-indigo-600 dark:text-indigo-400 text-sm font-black font-mono mt-1">LOG ID: {selectedLog.id.slice(0, 8).toUpperCase()}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm active:scale-90">
                                    <X className="w-7 h-7" />
                                </button>
                            </div>

                            {/* Section: Context */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 dark:bg-[#0f1419] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800/50 space-y-4 shadow-sm group hover:border-indigo-500/20 transition-all">
                                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border-b border-indigo-100 dark:border-indigo-900/30 pb-3">
                                        <User className="w-4 h-4" /> Perfil de Usuario
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-base text-gray-900 dark:text-white font-black">{selectedLog.user_name || 'Sistema'}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">{selectedLog.user_email || 'automático@itad.gt'}</div>
                                        <div className="text-[10px] text-indigo-600/60 dark:text-indigo-400/60 font-black pt-2 flex items-center gap-1.5">
                                            <Globe className="w-3 h-3" /> {selectedLog.ip_address || '0.0.0.0'}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-[#0f1419] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800/50 space-y-4 shadow-sm group hover:border-cyan-500/20 transition-all">
                                    <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-widest border-b border-cyan-100 dark:border-cyan-900/30 pb-3">
                                        <Monitor className="w-4 h-4" /> Huella Digital
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold font-mono break-words leading-relaxed bg-white dark:bg-[#1a1f2e] p-2 rounded-lg border border-gray-100 dark:border-gray-800">{selectedLog.user_agent || 'Desconocido'}</div>
                                        <div className="flex gap-3 pt-3">
                                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl text-indigo-800 dark:text-indigo-400 font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800/40 shadow-sm">{selectedLog.http_method || 'N/A'}</span>
                                            <span className="text-[10px] bg-cyan-100 dark:bg-cyan-900/20 px-3 py-1.5 rounded-xl text-cyan-800 dark:text-cyan-400 font-black font-mono truncate max-w-[120px] border border-cyan-200 dark:border-cyan-800/40 shadow-sm">{selectedLog.endpoint || '/'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Changes */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                    <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Comparativa de Cambios
                                </h3>
                                <div className="space-y-4">
                                    {selectedLog.changes_summary ? (
                                        renderDiff(selectedLog.changes_summary)
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-[#0f1419] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] p-12 text-center">
                                            <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">No se detectaron cambios de estado durante esta actividad.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section: Timeline metadata */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-8 mt-10">
                                <div className="flex flex-wrap items-center gap-6 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-indigo-500" />
                                        {format(new Date(selectedLog.created_at), "eeee, d 'de' MMMM 'a' 'las' HH:mm", { locale: es })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-emerald-500" />
                                        Módulo {selectedLog.module}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
