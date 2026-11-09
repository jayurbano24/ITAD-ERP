'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownAZ, ArrowUpAZ, Check, Filter, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ExcelColumnFilterProps = {
  label: string
  options: string[]
  /** null = sin filtro (mostrar todos) */
  selected: Set<string> | null
  onChange: (next: Set<string> | null) => void
  /** Dirección de orden activa para esta columna */
  sortDir?: 'asc' | 'desc' | null
  onSort?: (dir: 'asc' | 'desc') => void
  className?: string
  labelClassName?: string
  inactiveFilterClassName?: string
  align?: 'left' | 'center'
}

export default function ExcelColumnFilter({
  label,
  options,
  selected,
  onChange,
  sortDir = null,
  onSort,
  className,
  labelClassName,
  inactiveFilterClassName,
  align = 'left',
}: ExcelColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Set<string>>(new Set())

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })),
    [options]
  )

  const isActive = selected !== null && selected.size < sortedOptions.length

  useEffect(() => {
    if (!open) return
    setQuery('')
    setDraft(selected ? new Set(selected) : new Set(sortedOptions))
  }, [open, selected, sortedOptions])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedOptions
    return sortedOptions.filter((opt) => opt.toLowerCase().includes(q))
  }, [sortedOptions, query])

  const allDraftSelected =
    sortedOptions.length > 0 && sortedOptions.every((opt) => draft.has(opt))

  const toggleValue = (value: string) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const selectAll = () => setDraft(new Set(sortedOptions))
  const clearAll = () => setDraft(new Set())

  const apply = () => {
    if (draft.size === 0) {
      onChange(new Set())
    } else if (draft.size === sortedOptions.length) {
      onChange(null)
    } else {
      onChange(new Set(draft))
    }
    setOpen(false)
  }

  const clearFilter = () => {
    onChange(null)
    setOpen(false)
  }

  return (
    <div
      className={cn(
        'relative inline-flex max-w-full items-center gap-0.5 whitespace-nowrap',
        align === 'center' && 'justify-center',
        className
      )}
    >
      <span
        className={cn('truncate leading-none', labelClassName ?? 'text-inherit')}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
          isActive || sortDir
            ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
            : inactiveFilterClassName ??
                'border-transparent text-gray-400 hover:border-gray-500 hover:text-white'
        )}
        title={`Filtrar / ordenar ${label}`}
        aria-label={`Filtrar / ordenar ${label}`}
      >
        <Filter className="h-2.5 w-2.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-[110] mt-1 w-56 rounded-xl border border-gray-700 bg-[#0f1419] shadow-2xl">
            {onSort && (
              <div className="flex gap-1 border-b border-gray-800 p-2">
                <button
                  type="button"
                  onClick={() => {
                    onSort('asc')
                    setOpen(false)
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors',
                    sortDir === 'asc'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-700 text-gray-300 hover:bg-white/5'
                  )}
                  title="Ordenar A → Z"
                >
                  <ArrowDownAZ className="h-3.5 w-3.5" />
                  A → Z
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSort('desc')
                    setOpen(false)
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors',
                    sortDir === 'desc'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-700 text-gray-300 hover:bg-white/5'
                  )}
                  title="Ordenar Z → A"
                >
                  <ArrowUpAZ className="h-3.5 w-3.5" />
                  Z → A
                </button>
              </div>
            )}

            <div className="border-b border-gray-800 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full rounded-lg border border-gray-700 bg-[#1a2030] py-1.5 pl-7 pr-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-gray-800 px-2 py-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 hover:text-indigo-300"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-white"
              >
                Ninguno
              </button>
              {isActive && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-400 hover:text-rose-300"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <p className="px-2 py-3 text-center text-[11px] text-gray-500">Sin valores</p>
              ) : (
                filteredOptions.map((opt) => {
                  const checked = draft.has(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleValue(opt)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-gray-200 hover:bg-white/5"
                    >
                      <span
                        className={cn(
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                          checked
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-gray-600'
                        )}
                      >
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="truncate font-mono" title={opt}>
                        {opt}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-800 p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-gray-700 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={draft.size === 0 && !allDraftSelected}
                className="flex-1 rounded-lg bg-indigo-600 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
