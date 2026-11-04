'use client'

import { FolderKanban } from 'lucide-react'

export type ProjectCostRow = {
  project: string
  units: number
  totalCost: number
  totalSale?: number
}

function formatQ(n: number) {
  return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProjectCostSummary({
  rows,
  title = 'Total por Project',
}: {
  rows: ProjectCostRow[]
  title?: string
}) {
  if (rows.length === 0) return null

  const grandUnits = rows.reduce((s, r) => s + r.units, 0)
  const grandCost = rows.reduce((s, r) => s + r.totalCost, 0)
  const grandSale = rows.reduce((s, r) => s + (r.totalSale || 0), 0)
  const showSale = rows.some((r) => (r.totalSale || 0) > 0)

  return (
    <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/50 dark:border-amber-500/15">
        <FolderKanban className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-300">
          {title}
        </h3>
        <span className="ml-auto text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80">
          {rows.length} project{rows.length === 1 ? '' : 's'} · {grandUnits} eq.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-[10px] font-black uppercase tracking-wider text-amber-800/70 dark:text-amber-400/70 border-b border-amber-200/40 dark:border-amber-500/10">
              <th className="px-4 py-2">Project #</th>
              <th className="px-4 py-2 text-right">Equipos</th>
              <th className="px-4 py-2 text-right">Costo total</th>
              {showSale && (
                <th className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400">Venta total</th>
              )}
              <th className="px-4 py-2 text-right hidden sm:table-cell">Prom. costo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 dark:divide-amber-500/10">
            {rows.map((row) => (
              <tr key={row.project} className="text-amber-950 dark:text-amber-100">
                <td className="px-4 py-2.5 font-mono font-black text-sky-800 dark:text-sky-300">
                  {row.project}
                </td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{row.units}</td>
                <td className="px-4 py-2.5 text-right font-black tabular-nums text-amber-900 dark:text-amber-200">
                  {formatQ(row.totalCost)}
                </td>
                {showSale && (
                  <td className="px-4 py-2.5 text-right font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatQ(row.totalSale || 0)}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-amber-800/80 dark:text-amber-300/80 hidden sm:table-cell">
                  {row.units > 0 ? formatQ(row.totalCost / row.units) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-amber-300/50 dark:border-amber-500/25 bg-amber-100/50 dark:bg-amber-500/10">
              <td className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">
                Total
              </td>
              <td className="px-4 py-2.5 text-right font-black tabular-nums text-amber-950 dark:text-white">
                {grandUnits}
              </td>
              <td className="px-4 py-2.5 text-right font-black tabular-nums text-amber-950 dark:text-white">
                {formatQ(grandCost)}
              </td>
              {showSale && (
                <td className="px-4 py-2.5 text-right font-black tabular-nums text-emerald-800 dark:text-emerald-300">
                  {formatQ(grandSale)}
                </td>
              )}
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-amber-900/80 dark:text-amber-200/80 hidden sm:table-cell">
                {grandUnits > 0 ? formatQ(grandCost / grandUnits) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
