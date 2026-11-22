'use client'

import { cn } from '@/lib/utils'

type Props = {
  expectedFromReceipt?: string
  draftSerial: string
  className?: string
}

export function ReceiptSerialMatchHint({ expectedFromReceipt, draftSerial, className }: Props) {
  const expected = (expectedFromReceipt || '').trim().toUpperCase()
  const draft = draftSerial.trim().toUpperCase()

  if (!expected) {
    return (
      <p className={cn('text-[10px] text-gray-500 dark:text-gray-400', className)}>
        Este cupo no trae serie en el Receipt — pistolee la etiqueta del equipo.
      </p>
    )
  }

  if (!draft) {
    return (
      <p className={cn('text-[10px]', className)}>
        <span className="text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wide text-[9px]">
          Receipt of Equipment ·{' '}
        </span>
        <span className="font-mono font-black text-purple-600 dark:text-purple-300">{expected}</span>
      </p>
    )
  }

  if (draft === expected) {
    return (
      <p
        className={cn(
          'text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400',
          className
        )}
      >
        ✓ Coincide con el Receipt of Equipment ({expected})
      </p>
    )
  }

  return (
    <p
      className={cn(
        'text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-snug',
        className
      )}
    >
      ⚠ Pistoleó <span className="font-mono">{draft}</span> — el recibo indica{' '}
      <span className="font-mono text-purple-600 dark:text-purple-300">{expected}</span>
    </p>
  )
}

export function receiptInputBorderClass(
  expectedFromReceipt: string | undefined,
  draftSerial: string
): string {
  const expected = (expectedFromReceipt || '').trim().toUpperCase()
  const draft = draftSerial.trim().toUpperCase()
  if (!expected || !draft) return ''
  return draft === expected
    ? 'border-emerald-500 dark:border-emerald-500'
    : 'border-amber-500 dark:border-amber-500'
}