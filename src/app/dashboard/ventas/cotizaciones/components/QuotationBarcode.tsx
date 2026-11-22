'use client'

import { cn } from '@/lib/utils'
import { barcodeImageUrl } from '@/lib/ventas/code128Barcode'

type Props = {
  quoteNumber: string
  className?: string
  /** Compacto para modales; mediano para detalle / PDF preview */
  size?: 'sm' | 'md'
  /** Solo número (listados densos, sin imagen) */
  numberOnly?: boolean
}

const SIZE_PX = { sm: 120, md: 168 } as const

export default function QuotationBarcode({
  quoteNumber,
  className,
  size = 'md',
  numberOnly = false,
}: Props) {
  const value = quoteNumber.trim()
  if (!value) return null

  if (numberOnly) {
    return (
      <span
        className={cn(
          'block font-mono font-bold text-indigo-700 dark:text-indigo-300 truncate leading-tight tabular-nums',
          'text-[11px]',
          className
        )}
        title={value}
      >
        {value}
      </span>
    )
  }

  const maxW = SIZE_PX[size]
  const barSrc = barcodeImageUrl(value, {
    includeHumanText: false,
    scale: size === 'sm' ? 2 : 3,
    height: size === 'sm' ? 8 : 9,
  })

  return (
    <div
      className={cn(
        'inline-flex flex-col min-w-0 max-w-full overflow-hidden rounded-md border border-gray-200 dark:border-surface-600 bg-white px-1.5 pt-1 pb-1',
        size === 'sm' ? 'items-start' : 'items-center',
        className
      )}
      title={value}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG dinámico Code 128 */}
      <img
        src={barSrc}
        alt=""
        width={maxW}
        height={size === 'sm' ? 28 : 36}
        className={cn(
          'h-auto w-full object-contain object-center',
          size === 'sm' ? 'max-h-7 min-h-[22px]' : 'max-h-9 min-h-[28px]'
        )}
        style={{ maxWidth: maxW }}
        loading="lazy"
        decoding="async"
      />
      <span
        className={cn(
          'w-full text-center font-mono font-bold text-indigo-800 dark:text-indigo-200 leading-tight tabular-nums mt-1',
          size === 'sm' ? 'text-[10px]' : 'text-xs print:text-sm'
        )}
      >
        {value}
      </span>
    </div>
  )
}
