'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Filter, Search, User, Clock, FileText, ArrowRight, Activity, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';

type AuditLog = {
  id: string;
  action: string;
  module: string;
  description: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  entity_type: string;
  entity_reference: string | null;
  created_at: string;
  changes_summary: any;
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState('STANDARD');
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    entityType: '',
    search: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'general' | 'timeline' | 'detailed_history'>('timeline');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (filters.module) params.append('module', filters.module);
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await fetch(`/api/audit/logs?${params}`);
      const result = await response.json();

      if (result.data) {
        setLogs(result.data);
        setTotalPages(result.pagination.totalPages);
        setSearchType(result.metadata?.searchType || 'STANDARD');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, searchQuery]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = formatDate(log.created_at);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    const map: Record<string, BadgeVariant> = {
      'qc_pending': 'auditoria',
      'in_progress': 'en-proceso',
      'en reparacion': 'en-proceso',
      'completed': 'completado',
      'cancelled': 'destruccion',
      'waiting_parts': 'pendiente',
      'esperando partes': 'pendiente',
      'open': 'default',
    };
    const key = status?.toLowerCase() || '';
    return map[key] || 'default';
  };

  const renderDetailedHistoryTable = (sortOrder: 'asc' | 'desc' = 'asc') => {
    const sortedLogs = [...logs].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const formatValue = (val: any) => {
      if (val === null || val === undefined) return 'N/A';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    return (
      <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-[2.5rem] overflow-hidden shadow-sm dark:shadow-none transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-surface-950/50 border-b border-gray-100 dark:border-surface-800 text-gray-400 dark:text-surface-500 uppercase text-[10px] font-bold tracking-widest">
                <th className="px-6 py-4 min-w-[120px]">Fecha</th>
                <th className="px-6 py-4 min-w-[150px]">Estado</th>
                <th className="px-6 py-4 min-w-[150px]">Diagnóstico</th>
                <th className="px-6 py-4 min-w-[150px]">Reparación</th>
                <th className="px-6 py-4 min-w-[150px]">Técnico</th>
                <th className="px-6 py-4 min-w-[150px]">Sucursal</th>
                <th className="px-6 py-4 min-w-[200px]">Comentario / Detalles</th>
                <th className="px-6 py-4 min-w-[100px]">Bodega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
              {sortedLogs.map((log) => {
                const changes = log.changes_summary || {};
                const usedKeys = new Set<string>();
                const fecha = `${formatDate(log.created_at)} ${formatTime(log.created_at)}`;

                let estado = '-';
                if (changes.status) {
                  estado = String(changes.status.new).replace(/_/g, ' ').toUpperCase();
                  usedKeys.add('status');
                } else if (log.action === 'CREATE') {
                  estado = 'CREADO';
                }

                let diagnostico = '';
                const diagKeys = ['diagnosis_action', 'diagnostic', 'diagnosis'];
                diagKeys.forEach(k => {
                  if (changes[k]) {
                    diagnostico += `${changes[k].new} `;
                    usedKeys.add(k);
                  }
                });
                if (!diagnostico && log.module === 'DIAGNOSTIC') diagnostico = log.description;

                let reparacion = '';
                if (changes.repair_mode) {
                  reparacion = `${changes.repair_mode.new} ${changes.repair_option ? '- ' + changes.repair_option.new : ''}`;
                  usedKeys.add('repair_mode');
                  usedKeys.add('repair_option');
                }

                let bodega = '';
                const whKeys = ['bodega', 'warehouse', 'location', 'ubicacion', 'current_warehouse_id'];
                whKeys.forEach(k => {
                  if (changes[k]) {
                    bodega = String(changes[k].new);
                    usedKeys.add(k);
                  }
                });
                if (!bodega && log.module === 'WAREHOUSE') bodega = log.description;

                let comentario = log.description;
                const extraDetails: string[] = [];

                Object.entries(changes).forEach(([key, value]: [string, any]) => {
                  if (!usedKeys.has(key)) {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const oldV = formatValue(value.old);
                    const newV = formatValue(value.new);
                    if (oldV !== newV) {
                      extraDetails.push(`• ${label}: ${oldV} → ${newV}`);
                    } else {
                      extraDetails.push(`• ${label}: ${newV}`);
                    }
                  }
                });

                const tecnico = log.user_name || 'Sistema';
                const sucursal = 'Casa Matriz';

                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-surface-400 align-top">{fecha}</td>
                    <td className="px-6 py-4 align-top">
                      {estado !== '-' && <Badge variant={getStatusBadgeVariant(estado)} size="sm">{estado}</Badge>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-surface-300 align-top font-medium">{diagnostico}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-surface-300 align-top font-medium">{reparacion}</td>
                    <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400 align-top">{tecnico}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-surface-400 align-top font-medium">{sucursal}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-surface-500 align-top">
                      <div className="font-bold text-gray-700 dark:text-surface-300 mb-1">{comentario}</div>
                      {extraDetails.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-gray-100 dark:border-surface-800/50">
                          {extraDetails.map((det, idx) => (
                            <div key={idx} className="text-gray-400 dark:text-surface-500 font-mono text-[10px] bg-gray-50 dark:bg-surface-950/30 px-2 py-0.5 rounded-md inline-block mr-2 mt-1">{det}</div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-surface-300 align-top font-medium">{bodega}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTimelineItem = (log: AuditLog & { asset_snapshot?: any }) => {
    const hasChanges = log.changes_summary && Object.keys(log.changes_summary).length > 0;
    const statusChange = log.changes_summary?.status;
    const isStatusChange = !!statusChange;
    const asset = log.asset_snapshot;

    let Icon = FileText;
    let iconColorClass = "text-gray-400 dark:text-surface-500";
    let iconBgClass = "bg-gray-100 dark:bg-surface-800";

    if (log.action === 'CREATE') { Icon = Activity; iconColorClass = "text-emerald-600 dark:text-emerald-400"; iconBgClass = "bg-emerald-50 dark:bg-emerald-500/10"; }
    else if (log.action === 'DELETE') { Icon = ArrowRight; iconColorClass = "text-rose-600 dark:text-rose-400"; iconBgClass = "bg-rose-50 dark:bg-rose-500/10"; }
    else if (log.action === 'UPDATE') { Icon = ArrowRight; iconColorClass = "text-brand-600 dark:text-brand-400"; iconBgClass = "bg-brand-50 dark:bg-brand-500/10"; }

    return (
      <div key={log.id} className="relative pl-12 pb-10 last:pb-0 group">
        <div className="absolute left-[23px] top-4 bottom-0 w-0.5 bg-gray-100 dark:bg-surface-800 group-last:hidden transition-colors" />

        <div className={cn(
          "absolute left-2 top-1 h-10 w-10 rounded-xl border flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110",
          "bg-white dark:bg-surface-900 border-gray-100 dark:border-surface-800"
        )}>
          <Icon className={cn("h-5 w-5", iconColorClass)} />
        </div>

        <div className="flex justify-between items-start gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex flex-col gap-2">
              {isStatusChange ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(statusChange.new)}>{String(statusChange.new).replace(/_/g, ' ')}</Badge>
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-surface-600" />
                  <span className="text-xs font-bold text-gray-400 dark:text-surface-500 uppercase tracking-tighter">
                    Anterior: <span className="text-gray-500 dark:text-surface-400">{String(statusChange.old).replace(/_/g, ' ')}</span>
                  </span>
                </div>
              ) : (
                <h4 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {log.description}
                </h4>
              )}

              {asset && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-surface-950/30 rounded-[1.25rem] border border-gray-100 dark:border-surface-800/50 w-fit">
                  <div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-surface-900 rounded-lg shadow-sm border border-gray-100 dark:border-surface-800">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{asset.manufacturer}</span>
                    <span className="text-xs text-gray-500 dark:text-surface-400">{asset.model}</span>
                  </div>
                  {asset.serial && (
                    <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                      {asset.serial}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">{asset.type}</span>
                </div>
              )}
            </div>

            {hasChanges && !isStatusChange && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {Object.entries(log.changes_summary)
                  .filter(([k]) => k !== 'status')
                  .map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-white dark:bg-surface-900/50 p-3 rounded-2xl border border-gray-100 dark:border-surface-800 shadow-sm transition-all hover:shadow-md">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest mb-2">{key.replace(/_/g, ' ')}</p>
                      <div className="flex flex-col gap-1">
                        {value.old && <span className="text-xs text-gray-400 dark:text-surface-500 line-through font-medium">{String(value.old)}</span>}
                        <span className="text-sm text-gray-900 dark:text-white font-bold">{String(value.new)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold tracking-tight">
              {log.entity_reference && (
                <span className="font-mono bg-gray-100 dark:bg-surface-800 px-2 py-1 rounded-lg text-gray-600 dark:text-surface-400 border border-gray-200 dark:border-surface-700">
                  {log.entity_reference}
                </span>
              )}
              <div className="flex items-center gap-2 px-2 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 rounded-lg border border-brand-100 dark:border-brand-500/20">
                <User className="h-3 w-3" />
                <span>{log.user_name || 'Sistema'}</span>
              </div>
              {log.user_role && (
                <span className="uppercase text-gray-400 dark:text-surface-500 px-2 py-1 bg-gray-50 dark:bg-surface-800 rounded-lg border border-gray-100 dark:border-surface-700">
                  {log.user_role}
                </span>
              )}
            </div>
          </div>

          <div className="text-xs font-bold font-mono text-gray-400 dark:text-surface-500 whitespace-nowrap pt-2 bg-gray-50 dark:bg-surface-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-surface-700/50">
            {formatTime(log.created_at)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface-950 transition-colors">
      <PageHeader
        icon={Activity}
        title="Bitácora de Auditoría"
        subtitle="Trazabilidad completa de operaciones y cambios de sistema"
        actions={
          <div className="flex bg-white dark:bg-surface-900 p-1.5 rounded-2xl border border-gray-100 dark:border-surface-800 shadow-sm transition-all overflow-hidden">
            <button
              onClick={() => setActiveTab('timeline')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                activeTab === 'timeline' ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" : "text-gray-500 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800"
              )}
            >
              Línea de Tiempo
            </button>
            <button
              onClick={() => setActiveTab('detailed_history')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                activeTab === 'detailed_history' ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" : "text-gray-500 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800"
              )}
            >
              Historial Detallado
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                activeTab === 'general' ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" : "text-gray-500 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800"
              )}
            >
              Tabla General
            </button>
          </div>
        }
      />

      <div className="p-8 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
        {/* Search Panel */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-surface-900/50 dark:backdrop-blur-xl border border-gray-200 dark:border-surface-800 p-8 rounded-[2.5rem] shadow-sm sticky top-24 transition-all">
            <h3 className="text-xs font-bold text-gray-400 dark:text-surface-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros Avanzados
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-widest px-1">Búsqueda rápida</label>
                <SearchInput
                  placeholder="Serie, ticket o entidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e: any) => e.key === 'Enter' && loadLogs()}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-widest px-1">Módulo del sistema</label>
                <select
                  value={filters.module}
                  onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-surface-950 border border-gray-200 dark:border-surface-800 rounded-2xl px-5 py-3 text-sm text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="">Todos los módulos</option>
                  <option value="TICKETS">Tickets</option>
                  <option value="LOGISTICS">Logística</option>
                  <option value="WORKSHOP">Taller</option>
                  <option value="WAREHOUSE">Bodega</option>
                </select>
              </div>

              <button
                onClick={() => { setPage(1); loadLogs(); }}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white rounded-2xl py-4 text-sm font-bold transition-all shadow-xl shadow-brand-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" />
                Aplicar Filtros
              </button>

              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setFilters({ module: '', action: '', entityType: '', search: '' }); loadLogs(); }}
                  className="w-full bg-white dark:bg-surface-800 text-gray-500 dark:text-surface-400 rounded-2xl py-3 text-xs font-bold transition-all border border-gray-100 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700 mt-2"
                >
                  Limpiar Búsqueda
                </button>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-surface-800/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">Motor:</span>
                <Badge variant="default" size="sm" className="font-mono">{searchType}</Badge>
              </div>
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <main className="space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400 dark:text-surface-600 bg-white dark:bg-surface-900/30 rounded-[3rem] border border-gray-100 dark:border-surface-800 transition-all">
              <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-6" />
              <p className="font-bold text-sm tracking-widest uppercase">Consultando bitácora...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-300 dark:text-surface-700 bg-white dark:bg-surface-900/30 rounded-[3rem] border border-gray-100 dark:border-surface-800">
              <FileText className="h-16 w-16 mb-6 opacity-20" />
              <p className="font-bold text-sm tracking-widest uppercase mb-1">Sin movimientos</p>
              <p className="text-xs font-medium opacity-60">No se encontraron registros en este periodo</p>
            </div>
          ) : activeTab === 'timeline' ? (
            <div className="space-y-12">
              {Object.entries(groupedLogs).map(([date, dayLogs]) => (
                <div key={date} className="relative">
                  <div className="sticky top-24 z-20 flex items-center gap-6 mb-10">
                    <div className="bg-white dark:bg-surface-800 text-gray-900 dark:text-white px-6 py-2 rounded-2xl text-xs font-bold border border-gray-200 dark:border-surface-700 shadow-xl flex items-center gap-3 transition-colors">
                      <CalendarDays className="h-4 w-4 text-brand-500" />
                      {date}
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-surface-800 flex-1 transition-colors" />
                  </div>

                  <div className="bg-white dark:bg-surface-900/40 backdrop-blur-sm border border-gray-200 dark:border-surface-800 rounded-[3rem] p-10 shadow-sm transition-all hover:shadow-md dark:shadow-none">
                    {dayLogs.map(log => renderTimelineItem(log))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'detailed_history' ? (
            renderDetailedHistoryTable('asc')
          ) : (
            renderDetailedHistoryTable('desc')
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-surface-900 p-4 rounded-3xl border border-gray-200 dark:border-surface-800 shadow-sm transition-all">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 dark:bg-surface-800 hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-700 dark:text-white rounded-2xl text-xs font-bold disabled:opacity-30 transition-all border border-gray-200 dark:border-surface-700"
              >
                Anterior
              </button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-[0.2em] mb-1">Página</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {page} <span className="text-gray-400 dark:text-surface-600 font-medium mx-1">/</span> {totalPages}
                </span>
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 dark:bg-surface-800 hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-700 dark:text-white rounded-2xl text-xs font-bold disabled:opacity-30 transition-all border border-gray-200 dark:border-surface-700"
              >
                Siguiente
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
