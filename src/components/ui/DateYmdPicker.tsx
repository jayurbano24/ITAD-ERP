'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const DATE_YMD_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidYmd(value: string): boolean {
  if (!DATE_YMD_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

export function formatYmdLabel(ymd: string): string {
  if (!isValidYmd(ymd)) return 'Elegir fecha'
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  if (!isValidYmd(ymd)) return null
  const [y, m, d] = ymd.split('-').map(Number)
  return { y, m, d }
}

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

type Props = {
  value: string
  onChange: (ymd: string) => void
  disabled?: boolean
  min?: string
  max?: string
  className?: string
  'aria-label'?: string
}

export default function DateYmdPicker({
  value,
  onChange,
  disabled,
  min,
  max,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const today = useMemo(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }
  }, [])

  const initial = parseYmd(value) || today
  const [viewYear, setViewYear] = useState(initial.y)
  const [viewMonth, setViewMonth] = useState(initial.m)

  useEffect(() => {
    const p = parseYmd(value)
    if (p) {
      setViewYear(p.y)
      setViewMonth(p.m)
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay()

  function shiftMonth(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    while (m < 1) {
      m += 12
      y -= 1
    }
    while (m > 12) {
      m -= 12
      y += 1
    }
    setViewMonth(m)
    setViewYear(y)
  }

  function dayDisabled(ymd: string): boolean {
    if (min && isValidYmd(min) && ymd < min) return true
    if (max && isValidYmd(max) && ymd > max) return true
    return false
  }

  function pickDay(d: number) {
    const ymd = toYmd(viewYear, viewMonth, d)
    if (dayDisabled(ymd)) return
    onChange(ymd)
    setOpen(false)
  }

  const yearOptions = useMemo(() => {
    const start = today.y - 12
    const end = today.y + 1
    const out: number[] = []
    for (let y = start; y <= end; y++) out.push(y)
    return out
  }, [today.y])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 min-w-[9.5rem] max-w-[11.5rem] px-2 rounded-lg border text-xs font-semibold transition-colors',
          disabled
            ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-surface-700 bg-gray-100 dark:bg-surface-900 text-gray-400'
            : 'border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 text-gray-900 dark:text-white hover:border-brand-400 dark:hover:border-brand-500'
        )}
      >
        <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-400" />
        <span className="truncate">{formatYmdLabel(value)}</span>
      </button>

      {open ? (
        <div
          className={cn(
            'absolute right-0 z-50 mt-1 w-[17.5rem] rounded-xl border shadow-xl',
            'border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-3'
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <button
              type="button"
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-surface-800"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 flex-1 justify-center">
              <select
                className="h-7 max-w-[6.5rem] rounded-md border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-1 text-[11px] font-bold capitalize"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {MONTHS.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="h-7 w-[4.5rem] rounded-md border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-1 text-[11px] font-bold"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-surface-800"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-gray-400 mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-0.5">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDow }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const ymd = toYmd(viewYear, viewMonth, d)
              const selected = value === ymd
              const isToday =
                today.y === viewYear && today.m === viewMonth && today.d === d
              const off = dayDisabled(ymd)
              return (
                <button
                  key={d}
                  type="button"
                  disabled={off}
                  onClick={() => pickDay(d)}
                  className={cn(
                    'h-8 rounded-lg text-xs font-semibold tabular-nums transition-colors',
                    off && 'opacity-30 cursor-not-allowed',
                    selected
                      ? 'bg-brand-600 text-white'
                      : isToday
                        ? 'ring-1 ring-brand-400 text-brand-700 dark:text-brand-300'
                        : 'hover:bg-gray-100 dark:hover:bg-surface-800 text-gray-800 dark:text-surface-200'
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}