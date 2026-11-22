import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Row = { label: string; value: ReactNode }

function InfoBlock({ title, rows, className }: { title: string; rows: Row[]; className?: string }) {
  return (
    <section
      className={cn(
        'rounded-lg border border-gray-200/80 dark:border-surface-700 bg-white dark:bg-surface-900 h-full min-w-0 overflow-hidden flex flex-col',
        className
      )}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 px-3 py-2 border-b border-gray-200/80 dark:border-surface-700 bg-gray-50/90 dark:bg-surface-950/50">
        {title}
      </h3>
      <dl className="space-y-1 text-xs p-3 pt-2.5 flex-1">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(4.5rem,38%)_1fr] gap-x-2 gap-y-0.5 items-start">
            <dt className="text-gray-500 dark:text-surface-400">{row.label}</dt>
            <dd className="text-right font-semibold text-gray-900 dark:text-white min-w-0 break-words [overflow-wrap:anywhere] leading-snug">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type Props = {
  cliente: Row[]
  operacion: Row[]
}

export default function QuotationInfoCompact({ cliente, operacion }: Props) {
  return (
    <div className="grid gap-2 grid-cols-1 md:grid-cols-2 min-w-0">
      <InfoBlock title="Cliente" rows={cliente} />
      <InfoBlock title="Operación" rows={operacion} />
    </div>
  )
}
