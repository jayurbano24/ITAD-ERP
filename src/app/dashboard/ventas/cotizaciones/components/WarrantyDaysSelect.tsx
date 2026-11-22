'use client'

import {
  DEFAULT_WARRANTY_DAYS,
  formatWarrantyPeriodEs,
  WARRANTY_DAY_OPTIONS,
} from '@/lib/ventas/warrantyOptions'
import { cn } from '@/lib/utils'

type Props = {
  value: number
  onChange: (days: number) => void
  disabled?: boolean
  className?: string
  labelClassName?: string
}

export default function WarrantyDaysSelect({
  value,
  onChange,
  disabled,
  className,
  labelClassName,
}: Props) {
  const days = value || DEFAULT_WARRANTY_DAYS

  return (
    <div className={className}>
      <p
        className={cn(
          'text-[11px] font-semibold text-gray-600 dark:text-surface-400 mb-1',
          labelClassName
        )}
      >
        Vigencia de garantía (política PDF)
      </p>
      <select
        value={days}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-white px-3 py-2 text-sm text-gray-900"
      >
        {WARRANTY_DAY_OPTIONS.map((d) => (
          <option key={d} value={d}>
            {formatWarrantyPeriodEs(d)} ({d} días)
          </option>
        ))}
      </select>
      <p className="text-[10px] text-gray-500 dark:text-surface-500 mt-1">
        Se refleja en el anexo de política de garantía al imprimir o vender.
      </p>
    </div>
  )
}
