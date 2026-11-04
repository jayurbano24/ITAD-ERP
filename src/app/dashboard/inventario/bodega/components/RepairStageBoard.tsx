'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { RepairStageTab } from './RepairStageTabs'

export type RepairBoardRow = {
  assetId: string
  serial: string
  manufacturer: string
  model: string
  assetType: string
  workOrderId: string | null
  workOrderNumber: string | null
  status: string
  stage: RepairStageTab
  updatedAt: string | null
}

const stageLabels: Record<RepairStageTab, string> = {
  diagnostico: 'Diagnóstico',
  reparacion: 'Reparación',
  control_calidad: 'Control de Calidad',
}

const statusLabels: Record<string, string> = {
  open: 'Por diagnosticar',
  waiting_quote: 'Cotizando',
  quote_rejected: 'Cotización rechazada',
  in_progress: 'En reparación',
  waiting_parts: 'Esperando piezas',
  waiting_seedstock: 'Seedstock',
  quote_approved: 'Cotización aprobada',
  qc_pending: 'QC pendiente',
  qc_failed: 'QC fallido',
  qc_passed: 'QC aprobado',
  diagnosing: 'En diagnóstico',
}

export default function RepairStageBoard({
  rows,
  stage,
}: {
  rows: RepairBoardRow[]
  stage: RepairStageTab
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center">
        <p className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
          Sin equipos en {stageLabels[stage]}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Traslada equipos a Por Reparación o avanza la etapa desde el Taller.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#0f1419] text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-4 py-3">Serie</th>
              <th className="text-left px-4 py-3">Marca / Modelo</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">OS</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Etapa</th>
              <th className="text-right px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.assetId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                  {row.serial}
                </td>
                <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                  {row.manufacturer} {row.model}
                </td>
                <td className="px-4 py-3 text-gray-500 uppercase text-xs font-bold">{row.assetType}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                  {row.workOrderNumber || 'Sin OS'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    {statusLabels[row.status] || row.status || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                  {stageLabels[row.stage]}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.workOrderId ? (
                    <Link
                      href={`/dashboard/taller?wo=${row.workOrderId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
                    >
                      Taller
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/taller"
                      className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600"
                    >
                      Crear OS
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
