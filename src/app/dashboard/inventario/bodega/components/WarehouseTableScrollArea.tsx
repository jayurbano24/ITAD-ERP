'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  className?: string
}

export default function WarehouseTableScrollArea({ children, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)
  const [maxScroll, setMaxScroll] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const refreshMetrics = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const overflow = Math.ceil(el.scrollWidth - el.clientWidth)
    setCanScroll(overflow > 4)
    setMaxScroll(Math.max(0, overflow))
    setScrollLeft(el.scrollLeft)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    refreshMetrics()

    const onScroll = () => setScrollLeft(el.scrollLeft)
    el.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => refreshMetrics())
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)

    window.addEventListener('resize', refreshMetrics)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      window.removeEventListener('resize', refreshMetrics)
    }
  }, [refreshMetrics, children])

  const setScroll = (next: number) => {
    const el = scrollRef.current
    if (!el) return
    const clamped = Math.min(maxScroll, Math.max(0, next))
    el.scrollTo({ left: clamped, behavior: 'auto' })
    setScrollLeft(clamped)
  }

  const scrollToEnd = () => {
    const el = scrollRef.current
    if (!el) return
    const end = Math.max(0, Math.ceil(el.scrollWidth - el.clientWidth))
    el.scrollTo({ left: end, behavior: 'smooth' })
    setScrollLeft(end)
    setMaxScroll(end)
  }

  const nudge = (delta: number) => {
    setScroll(Math.min(maxScroll, Math.max(0, scrollLeft + delta)))
  }

  return (
  <div className={cn('min-w-0 max-w-full', className)}>
    <div
      ref={scrollRef}
      className="bodega-table-xscroll w-full max-w-full overflow-x-scroll overflow-y-visible overscroll-x-contain"
      tabIndex={0}
      role="region"
      aria-label="Tabla de equipos, desplazamiento horizontal"
    >
      <div className="inline-block min-w-full pr-6 sm:pr-10 pb-1">{children}</div>
    </div>
    {canScroll ? (
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t border-gray-200/80 dark:border-gray-700/80 bg-gray-50/60 dark:bg-[#10151c] px-3 sm:px-4 py-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Columnas
        </span>
        <button
          type="button"
          onClick={() => nudge(-Math.max(120, scrollRef.current?.clientWidth ? scrollRef.current.clientWidth * 0.35 : 160))}
          className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1f2e] text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
          title="Desplazar a la izquierda"
          aria-label="Desplazar columnas a la izquierda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="range"
          min={0}
          max={maxScroll}
          value={scrollLeft}
          onChange={(e) => setScroll(Number(e.target.value))}
          className="flex-1 min-w-[120px] h-2 accent-indigo-600 cursor-ew-resize"
          aria-label="Barra para desplazar la tabla horizontalmente"
          title="Desliza para ver más columnas"
        />
        <button
          type="button"
          onClick={() => nudge(Math.max(120, scrollRef.current?.clientWidth ? scrollRef.current.clientWidth * 0.35 : 160))}
          className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1f2e] text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
          title="Desplazar a la derecha"
          aria-label="Desplazar columnas a la derecha"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={scrollToEnd}
          className="h-8 px-2.5 shrink-0 rounded-lg border border-indigo-200 dark:border-indigo-600/50 bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          title="Ir al final de la tabla"
        >
          Final →
        </button>
      </div>
    ) : null}
  </div>
)
}