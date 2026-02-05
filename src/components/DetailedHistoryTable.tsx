import React from 'react';

interface AuditLog {
    id: string;
    created_at: string;
    user_name?: string;
    user_role?: string;
    description: string;
    action: string;
    module: string;
    changes_summary?: {
        status?: { old: string; new: string };
        repair_mode?: { old: string; new: string };
        repair_option?: { old: string; new: string };
        [key: string]: any;
    };
    [key: string]: any;
}

interface DetailedHistoryTableProps {
    logs: AuditLog[];
    sortOrder?: 'asc' | 'desc';
}

export default function DetailedHistoryTable({ logs, sortOrder = 'asc' }: DetailedHistoryTableProps) {
    const sortedLogs = [...logs].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-GT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('es-GT', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    };

    const formatValue = (val: any) => {
        if (val === null || val === undefined) return 'N/A';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const getStatusStyles = (statusRaw: string) => {
        const s = statusRaw.toLowerCase();
        if (s.includes('reparada') || s.includes('completed') || s.includes('repaired') || s.includes('listo') || s.includes('ship') || s.includes('passed') || s.includes('finaliz')) {
            return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
        }
        if (s.includes('diagnos') || s.includes('progress') || s.includes('pending') || s.includes('abierta') || s.includes('open') || s.includes('espera')) {
            return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
        }
        if (s.includes('fail') || s.includes('rechaz') || s.includes('cancel')) {
            return 'bg-red-500/10 border-red-500/20 text-red-400';
        }
        return 'bg-slate-800 border-slate-700 text-slate-400';
    };

    return (
        <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden shadow-sm mt-4 flex flex-col max-h-[600px]">
            <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left text-slate-400 relative">
                    <thead className="bg-surface-950 text-slate-300 uppercase text-xs font-semibold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 min-w-[120px] bg-surface-950">Fecha</th>
                            <th className="px-4 py-3 min-w-[150px] bg-surface-950">Estado</th>
                            <th className="px-4 py-3 min-w-[150px] bg-surface-950">Diagnóstico</th>
                            <th className="px-4 py-3 min-w-[150px] bg-surface-950">Reparación</th>
                            <th className="px-4 py-3 min-w-[150px] bg-surface-950">Técnico</th>
                            <th className="px-4 py-3 min-w-[150px] bg-surface-950">Bodega</th>
                            <th className="px-4 py-3 min-w-[200px] bg-surface-950">Detalles</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                        {sortedLogs.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay registros encontrados</td></tr>
                        )}
                        {sortedLogs.map((log) => {
                            const changes = log.changes_summary || {};
                            const usedKeys = new Set<string>();

                            const fecha = `${formatDate(log.created_at)} ${formatTime(log.created_at)}`;

                            // ESTADO (Con transición y colores)
                            let estadoNode: React.ReactNode = <span className="text-slate-500">-</span>;
                            if (changes.status) {
                                const newStatus = String(changes.status.new).replace(/_/g, ' ').toUpperCase();
                                const oldStatus = changes.status.old ? String(changes.status.old).replace(/_/g, ' ').toUpperCase() : null;
                                const badgeStyle = getStatusStyles(newStatus);

                                estadoNode = (
                                    <div className="flex flex-col items-start gap-1">
                                        <span className={`px-2.5 py-0.5 rounded border text-[11px] font-bold tracking-wide ${badgeStyle}`}>
                                            {newStatus}
                                        </span>
                                        {oldStatus && oldStatus !== newStatus && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <span className="opacity-50">de:</span> {oldStatus}
                                            </span>
                                        )}
                                    </div>
                                );
                                usedKeys.add('status');
                            } else if (log.action === 'CREATE') {
                                estadoNode = <span className="px-2.5 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[11px] font-bold tracking-wide">CREADO</span>;
                            }

                            // DIAGNÓSTICO
                            let diagnostico = '';
                            ['diagnosis_action', 'diagnostic', 'diagnosis'].forEach(k => {
                                if (changes[k]) { diagnostico += `${changes[k].new} `; usedKeys.add(k); }
                            });
                            if (!diagnostico && log.module === 'DIAGNOSTIC') diagnostico = log.description;

                            // REPARACIÓN
                            let reparacion = '';
                            if (changes.repair_mode) {
                                reparacion = `${changes.repair_mode.new} ${changes.repair_option ? '- ' + changes.repair_option.new : ''}`;
                                usedKeys.add('repair_mode'); usedKeys.add('repair_option');
                            }

                            // BODEGA
                            let bodega = '';
                            ['bodega', 'warehouse', 'location', 'ubicacion', 'current_warehouse_id'].forEach(k => {
                                if (changes[k]) { bodega = String(changes[k].new); usedKeys.add(k); }
                            });
                            if (!bodega && log.module === 'WAREHOUSE') bodega = log.description;

                            // COMENTARIO / DETALLES
                            let comentario = log.description;
                            const extraDetails: string[] = [];
                            Object.entries(changes).forEach(([key, value]: [string, any]) => {
                                if (!usedKeys.has(key)) {
                                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    const oldV = formatValue(value.old);
                                    const newV = formatValue(value.new);
                                    // Ignorar updated_at si es el único cambio
                                    if (key === 'updated_at') return;

                                    if (oldV !== newV) extraDetails.push(`• ${label}: ${oldV} → ${newV}`);
                                    else extraDetails.push(`• ${label}: ${newV}`);
                                }
                            });

                            const tecnico = log.user_name || 'Sistema';
                            const rol = log.user_role !== 'system' && log.user_role ? log.user_role : null;

                            return (
                                <tr key={log.id} className="hover:bg-surface-800/50 transition-colors bg-surface-900 border-b border-surface-800">
                                    <td className="px-4 py-3 font-mono text-xs text-white align-top whitespace-nowrap">{fecha}</td>
                                    <td className="px-4 py-3 align-top">
                                        {estadoNode}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300 align-top">{diagnostico}</td>
                                    <td className="px-4 py-3 text-sm text-slate-300 align-top">{reparacion}</td>
                                    <td className="px-4 py-3 font-medium text-blue-400 align-top">
                                        <div>{tecnico}</div>
                                        {rol && <div className="text-[10px] text-slate-500 uppercase">{rol}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300 align-top">{bodega}</td>
                                    <td className="px-4 py-3 text-xs text-slate-400 align-top">
                                        <div className="font-medium text-slate-300 mb-1">{comentario}</div>
                                        {extraDetails.map((det, idx) => (
                                            <div key={idx} className="text-slate-500 font-mono text-[10px]">{det}</div>
                                        ))}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
