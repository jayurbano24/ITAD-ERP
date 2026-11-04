'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  Search,
  ShoppingCart,
  ArrowLeftRight,
  Banknote,
  ExternalLink,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ExcelColumnFilter from '@/app/dashboard/inventario/bodega/components/ExcelColumnFilter'
import DownloadWarrantyButton from './DownloadWarrantyButton'
import DownloadSalesExcelButton from './DownloadSalesExcelButton'
import SatInvoiceEditCell from './SatInvoiceEditCell'
import { formatSaleStatusLabel, formatSalesChannel } from '@/lib/ventas/salesChannel'
import type { SalesExcelRow } from '@/lib/ventas/exportSalesExcel'
import type { SaleExchangeRecord, SaleSerialSearchHint } from './actions'

export type SalesHistoryOrder = {
  id: string
  created_at: string
  invoice_number?: string | null
  sat_invoice_number?: string | null
  status: string
  subtotal?: number | null
  tax_amount?: number | null
  total_amount?: number | null
  payment_method?: string | null
  internal_notes?: string | null
  customer_notes?: string | null
  customer?: {
    commercial_name?: string | null
    tax_id_nit?: string | null
  } | null
  sales_rep?: { full_name?: string | null } | null
  items?: Array<{
    serial_number?: string | null
    product_description?: string | null
    asset?: {
      serial_number?: string | null
      manufacturer?: string | null
      model?: string | null
    } | null
  }> | null
  sale_exchanges?: SaleExchangeRecord[]
  serial_search_hint?: SaleSerialSearchHint | null
  has_warranty_exchange?: boolean
}

type Props = {
  orders: SalesHistoryOrder[]
  searchQuery?: string
  period?: string
  month?: string
  status?: string
  className?: string
}

const EMPTY = '(Vacío)'
const PAGE_SIZE = 25
/** Altura mínima del cuerpo: espacio para hasta PAGE_SIZE filas (~2.75rem c/u) */
const TABLE_MIN_HEIGHT_CLASS = 'min-h-[calc(3rem+2.75rem*25)]'

const statusBadgeStyles: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-300 border-gray-200 dark:border-surface-600',
  confirmed: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  paid: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  shipped: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
  delivered: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30',
  cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
  partially_refunded:
    'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  refunded: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
}

type ColumnId = 'cliente' | 'invoice' | 'sat' | 'canal' | 'total' | 'estado' | 'fecha'

function formatInvoiceLabel(invoiceNumber?: string | null): string {
  const v = (invoiceNumber || '').trim()
  return v || EMPTY
}

function formatSatInvoiceLabel(satNumber?: string | null): string {
  const v = (satNumber || '').trim()
  return v || EMPTY
}

function formatFechaParts(iso: string): { date: string; time: string; filterLabel: string } {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { date, time, filterLabel: `${date} · ${time}` }
}

function getColumnValue(order: SalesHistoryOrder, columnId: ColumnId): string {
  const channelInfo = formatSalesChannel(
    order.payment_method,
    order.internal_notes,
    order.customer_notes
  )

  switch (columnId) {
    case 'cliente':
      return order.customer?.commercial_name?.trim() || EMPTY
    case 'invoice':
      return formatInvoiceLabel(order.invoice_number)
    case 'sat':
      return formatSatInvoiceLabel(order.sat_invoice_number)
    case 'canal':
      return channelInfo.channel || EMPTY
    case 'total':
      return `Q${Number(order.total_amount || 0).toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    case 'estado':
      return formatSaleStatusLabel(order.status)
    case 'fecha':
      return formatFechaParts(order.created_at).filterLabel
    default:
      return EMPTY
  }
}

function collectOptions(orders: SalesHistoryOrder[], columnId: ColumnId): string[] {
  const values = new Set<string>()
  for (const order of orders) {
    values.add(getColumnValue(order, columnId))
  }
  return Array.from(values)
}

function matchesFilters(
  order: SalesHistoryOrder,
  filters: Record<string, Set<string> | null>
): boolean {
  for (const [columnId, selected] of Object.entries(filters)) {
    if (!selected) continue
    if (!selected.has(getColumnValue(order, columnId as ColumnId))) return false
  }
  return true
}

function toExcelRow(order: SalesHistoryOrder): SalesExcelRow {
  const items = Array.isArray(order.items) ? order.items : []
  const channelInfo = formatSalesChannel(
    order.payment_method,
    order.internal_notes,
    order.customer_notes
  )
  const serials = items
    .map((it) => it.serial_number || it.asset?.serial_number || '')
    .filter(Boolean)
    .join(', ')
  const salesRep =
    order.sales_rep && typeof order.sales_rep === 'object'
      ? String(order.sales_rep.full_name || '')
      : ''

  const invoice = formatInvoiceLabel(order.invoice_number)
  const sat = formatSatInvoiceLabel(order.sat_invoice_number)

  return {
    createdAt: new Date(order.created_at).toLocaleString('es-GT'),
    customerName: order.customer?.commercial_name || 'N/A',
    customerNit: order.customer?.tax_id_nit || '',
    invoiceNumber: invoice === EMPTY ? '' : invoice,
    satInvoiceNumber: sat === EMPTY ? '' : sat,
    itemsCount: items.length,
    serials,
    channel: channelInfo.channel,
    channelDetail: channelInfo.detail,
    subtotal: Number(order.subtotal || 0),
    taxAmount: Number(order.tax_amount || 0),
    totalAmount: Number(order.total_amount || 0),
    status: formatSaleStatusLabel(order.status),
    salesRep,
  }
}

export default function SalesHistoryTable({
  orders,
  searchQuery,
  period = 'month',
  month,
  status,
  className,
}: Props) {
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string> | null>>({})
  const [sort, setSort] = useState<{ columnId: ColumnId; dir: 'asc' | 'desc' } | null>(null)
  const [satOverrides, setSatOverrides] = useState<Record<string, string | null>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [page, setPage] = useState(1)
  const headerCheckboxRef = useRef<HTMLInputElement>(null)

  const mergedOrders = useMemo(
    () =>
      orders.map((order) =>
        order.id in satOverrides
          ? { ...order, sat_invoice_number: satOverrides[order.id] }
          : order
      ),
    [orders, satOverrides]
  )

  const setColumnFilter = useCallback((columnId: string, next: Set<string> | null) => {
    setColumnFilters((prev) => {
      const copy = { ...prev }
      if (next === null) delete copy[columnId]
      else copy[columnId] = next
      return copy
    })
  }, [])

  const clearAllColumnFilters = useCallback(() => setColumnFilters({}), [])

  const activeFilterCount = useMemo(
    () => Object.values(columnFilters).filter((v) => v !== null && v !== undefined).length,
    [columnFilters]
  )

  const filteredOrders = useMemo(() => {
    let rows = mergedOrders.filter((order) => matchesFilters(order, columnFilters))
    if (sort) {
      const { columnId, dir } = sort
      rows = [...rows].sort((a, b) => {
        if (columnId === 'total') {
          const diff = Number(a.total_amount || 0) - Number(b.total_amount || 0)
          return dir === 'asc' ? diff : -diff
        }
        if (columnId === 'fecha') {
          const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          return dir === 'asc' ? diff : -diff
        }
        const va = getColumnValue(a, columnId)
        const vb = getColumnValue(b, columnId)
        const cmp = va.localeCompare(vb, 'es', { numeric: true, sensitivity: 'base' })
        return dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [mergedOrders, columnFilters, sort])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [columnFilters, sort, searchQuery, mergedOrders.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredOrders.slice(start, start + PAGE_SIZE)
  }, [filteredOrders, safePage])

  const pageFrom = filteredOrders.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageTo = Math.min(safePage * PAGE_SIZE, filteredOrders.length)

  const selectedCount = selectedIds.size
  const singleSelectedId =
    selectedCount === 1 ? Array.from(selectedIds)[0] : null
  const singleSelectedOrder = useMemo(() => {
    if (!singleSelectedId) return null
    return mergedOrders.find((o) => o.id === singleSelectedId) ?? null
  }, [singleSelectedId, mergedOrders])
  const allPageSelected =
    paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.has(o.id))
  const somePageSelected =
    paginatedOrders.some((o) => selectedIds.has(o.id)) && !allPageSelected

  useEffect(() => {
    const el = headerCheckboxRef.current
    if (el) el.indeterminate = somePageSelected
  }, [somePageSelected, paginatedOrders, selectedIds])

  const toggleRowSelection = useCallback((orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }, [])

  const toggleSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        for (const o of paginatedOrders) next.delete(o.id)
      } else {
        for (const o of paginatedOrders) next.add(o.id)
      }
      return next
    })
  }, [allPageSelected, paginatedOrders])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const excelRows = useMemo(() => {
    const source =
      selectedCount > 0
        ? filteredOrders.filter((o) => selectedIds.has(o.id))
        : filteredOrders
    return source.map(toExcelRow)
  }, [filteredOrders, selectedIds, selectedCount])

  const options = useMemo(
    () => ({
      cliente: collectOptions(mergedOrders, 'cliente'),
      invoice: collectOptions(mergedOrders, 'invoice'),
      sat: collectOptions(mergedOrders, 'sat'),
      canal: collectOptions(mergedOrders, 'canal'),
      total: collectOptions(mergedOrders, 'total'),
      estado: collectOptions(mergedOrders, 'estado'),
      fecha: collectOptions(mergedOrders, 'fecha'),
    }),
    [mergedOrders]
  )

  const handleSort = useCallback((columnId: ColumnId, dir: 'asc' | 'desc') => {
    setSort({ columnId, dir })
  }, [])

  const padRowCount =
    filteredOrders.length > 0 ? Math.max(0, PAGE_SIZE - paginatedOrders.length) : PAGE_SIZE - 1

  return (
    <div
      className={cn(
        'flex flex-col bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl shadow-sm',
        className
      )}
    >
      <div className="px-3 py-2 border-b border-gray-50 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Historial de ventas
          </h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllColumnFilters}
              className="text-[10px] font-black uppercase tracking-wide text-rose-500 hover:text-rose-400"
            >
              Limpiar filtros ({activeFilterCount})
            </button>
          )}
          <span className="text-[10px] font-bold text-gray-400 dark:text-surface-500 tabular-nums">
            {filteredOrders.length}/{mergedOrders.length}
          </span>
          {selectedCount > 0 && (
            <span className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {selectedCount} seleccionada{selectedCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <form className="relative w-full sm:w-64" action="/dashboard/ventas" method="get">
            <input type="hidden" name="period" value={period} />
            {month ? <input type="hidden" name="month" value={month} /> : null}
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              name="q"
              defaultValue={searchQuery || ''}
              placeholder="Buscar cliente, serie o venta…"
              className="w-full h-8 pl-8 pr-2 rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 text-xs font-medium text-gray-900 dark:text-white"
            />
          </form>
          <DownloadSalesExcelButton
            rows={excelRows}
            exportHint={
              selectedCount > 0
                ? `Exportar ${selectedCount} seleccionada${selectedCount === 1 ? '' : 's'}`
                : 'Exportar listado filtrado'
            }
          />
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="px-3 py-3 border-b border-emerald-200/50 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-500/8 via-sky-500/8 to-transparent dark:from-emerald-500/10 dark:via-sky-500/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              {singleSelectedOrder ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400">
                    Venta seleccionada
                  </p>
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                    {singleSelectedOrder.customer?.commercial_name || 'Cliente'}
                  </p>
                  <p className="text-[10px] font-mono text-gray-500 dark:text-surface-400">
                    {formatInvoiceLabel(singleSelectedOrder.invoice_number)} · Q
                    {Number(singleSelectedOrder.total_amount || 0).toLocaleString('es-GT', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </>
              ) : (
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Selecciona <strong>una sola</strong> venta para cambio de garantía o devolución.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {singleSelectedId && (
                <>
                  <Link
                    href={`/dashboard/ventas/${singleSelectedId}?accion=garantia`}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-wide shadow-sm shadow-sky-600/25 transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Cambio garantía
                  </Link>
                  <Link
                    href={`/dashboard/ventas/${singleSelectedId}?accion=devolucion`}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wide shadow-sm shadow-rose-600/25 transition-colors"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Devolver dinero
                  </Link>
                  <Link
                    href={`/dashboard/ventas/${singleSelectedId}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-surface-600 bg-white dark:bg-surface-900 text-[10px] font-black uppercase tracking-wide text-gray-700 dark:text-surface-200 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Detalle
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn('w-full flex-1 overflow-x-auto', TABLE_MIN_HEIGHT_CLASS)}>
        <table className="w-full min-w-[960px] text-sm table-fixed border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-surface-850 border-b border-gray-100 dark:border-surface-700">
              <th className="w-9 px-2 py-2.5 text-center align-middle">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAllPage}
                  disabled={paginatedOrders.length === 0}
                  className="h-3.5 w-3.5 rounded border-gray-400 accent-emerald-600 cursor-pointer disabled:opacity-40"
                  title="Seleccionar las 25 filas de esta página"
                  aria-label="Seleccionar filas de la página actual"
                />
              </th>
              <th className="relative text-left px-3 py-2.5 align-middle text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                <ExcelColumnFilter
                  label="Cliente"
                  options={options.cliente}
                  selected={columnFilters.cliente ?? null}
                  onChange={(next) => setColumnFilter('cliente', next)}
                  sortDir={sort?.columnId === 'cliente' ? sort.dir : null}
                  onSort={(dir) => handleSort('cliente', dir)}
                />
              </th>
              <th className="relative text-left px-2 py-1.5 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                <ExcelColumnFilter
                  label="Invoice"
                  options={options.invoice}
                  selected={columnFilters.invoice ?? null}
                  onChange={(next) => setColumnFilter('invoice', next)}
                  sortDir={sort?.columnId === 'invoice' ? sort.dir : null}
                  onSort={(dir) => handleSort('invoice', dir)}
                />
              </th>
              <th className="relative text-left px-2 py-1.5 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                <ExcelColumnFilter
                  label="Factura SAT"
                  options={options.sat}
                  selected={columnFilters.sat ?? null}
                  onChange={(next) => setColumnFilter('sat', next)}
                  sortDir={sort?.columnId === 'sat' ? sort.dir : null}
                  onSort={(dir) => handleSort('sat', dir)}
                />
              </th>
              <th className="relative text-left px-3 py-2 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                <ExcelColumnFilter
                  label="Canal"
                  options={options.canal}
                  selected={columnFilters.canal ?? null}
                  onChange={(next) => setColumnFilter('canal', next)}
                  sortDir={sort?.columnId === 'canal' ? sort.dir : null}
                  onSort={(dir) => handleSort('canal', dir)}
                />
              </th>
              <th className="relative text-right px-3 py-2 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                <div className="inline-flex justify-end w-full">
                  <ExcelColumnFilter
                    label="Total"
                    options={options.total}
                    selected={columnFilters.total ?? null}
                    onChange={(next) => setColumnFilter('total', next)}
                    sortDir={sort?.columnId === 'total' ? sort.dir : null}
                    onSort={(dir) => handleSort('total', dir)}
                  />
                </div>
              </th>
              <th className="relative text-center px-3 py-2 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                <ExcelColumnFilter
                  label="Estado"
                  options={options.estado}
                  selected={columnFilters.estado ?? null}
                  onChange={(next) => setColumnFilter('estado', next)}
                  sortDir={sort?.columnId === 'estado' ? sort.dir : null}
                  onSort={(dir) => handleSort('estado', dir)}
                  align="center"
                />
              </th>
              <th className="relative text-left px-3 py-2 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                <ExcelColumnFilter
                  label="Fecha"
                  options={options.fecha}
                  selected={columnFilters.fecha ?? null}
                  onChange={(next) => setColumnFilter('fecha', next)}
                  sortDir={sort?.columnId === 'fecha' ? sort.dir : null}
                  onSort={(dir) => handleSort('fecha', dir)}
                />
              </th>
              <th className="text-right px-2 py-2 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                Post-venta
              </th>
              <th className="text-right px-3 py-2 text-gray-500 dark:text-surface-400 text-[10px] font-bold uppercase tracking-widest">
                Política
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-surface-800 bg-white dark:bg-surface-900 align-top">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="w-8 h-8 text-gray-300 dark:text-surface-700" />
                    <p className="text-gray-600 dark:text-surface-400 font-bold text-sm">
                      {activeFilterCount > 0
                        ? 'Ninguna venta coincide con los filtros'
                        : searchQuery
                          ? `Sin resultados para “${searchQuery}”`
                          : 'Sin ventas en este período'}
                    </p>
                    {activeFilterCount === 0 && (
                      <Link href="/dashboard/ventas/nuevo" className="text-emerald-600 font-bold text-xs">
                        Crear venta →
                      </Link>
                    )}
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={clearAllColumnFilters}
                        className="text-emerald-600 font-bold text-xs"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const channelInfo = formatSalesChannel(
    order.payment_method,
    order.internal_notes,
    order.customer_notes
  )
                const fecha = formatFechaParts(order.created_at)
                const isSelected = selectedIds.has(order.id)
                return (
                  <tr
                    key={order.id}
                    className={cn(
                      'h-11 hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors group',
                      isSelected && 'bg-emerald-500/5 dark:bg-emerald-500/10'
                    )}
                  >
                    <td className="px-2 py-2.5 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(order.id)}
                        className="h-3.5 w-3.5 rounded border-gray-400 accent-emerald-600 cursor-pointer"
                        aria-label={`Seleccionar venta ${order.invoice_number || order.id}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <Link href={`/dashboard/ventas/${order.id}`} className="block min-w-0 hover:opacity-90">
                        <p className="text-gray-900 dark:text-white font-semibold text-xs leading-tight hover:text-emerald-600 dark:hover:text-emerald-400">
                          {order.customer?.commercial_name || 'N/A'}
                        </p>
                        <p className="text-gray-400 dark:text-surface-500 text-[10px] font-medium uppercase tracking-wider">
                          {order.customer?.tax_id_nit}
                        </p>
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-mono font-bold text-[10px] text-gray-900 dark:text-white">
                        {formatInvoiceLabel(order.invoice_number) === EMPTY
                          ? '—'
                          : formatInvoiceLabel(order.invoice_number)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <SatInvoiceEditCell
                        orderId={order.id}
                        value={order.sat_invoice_number}
                        onSaved={(next) =>
                          setSatOverrides((prev) => ({ ...prev, [order.id]: next }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-gray-900 dark:text-white font-bold text-xs leading-tight">
                        {channelInfo.channel}
                      </p>
                      <p
                        className="text-gray-400 dark:text-surface-500 text-[10px] font-medium truncate max-w-[160px]"
                        title={channelInfo.detail}
                      >
                        {channelInfo.detail}
                      </p>
                      {order.customer_notes?.trim() && (
                        <p
                          className="text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold mt-1 line-clamp-2 max-w-[200px]"
                          title={order.customer_notes.trim()}
                        >
                          Nota: {order.customer_notes.trim()}
                        </p>
                      )}
                      {order.serial_search_hint && (
                        <p
                          className="text-sky-700 dark:text-sky-400 text-[10px] font-bold mt-1 line-clamp-2 max-w-[220px]"
                          title={order.serial_search_hint.message}
                        >
                          {order.serial_search_hint.message}
                        </p>
                      )}
                      {!order.serial_search_hint && order.has_warranty_exchange && (
                        <p className="text-sky-700 dark:text-sky-400 text-[10px] font-bold mt-1 line-clamp-1 max-w-[200px]">
                          Con reemplazo por garantía
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">
                        Q
                        {(order.total_amount || 0).toLocaleString('es-GT', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border',
                          statusBadgeStyles[order.status] || statusBadgeStyles.draft
                        )}
                      >
                        {formatSaleStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-1 text-gray-600 dark:text-surface-300">
                        <Clock className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
                        <div className="leading-tight">
                          <p className="text-[11px] font-bold">{fecha.date}</p>
                          <p className="text-[10px] font-semibold text-gray-400 dark:text-surface-500 tabular-nums">
                            {fecha.time}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5 text-right align-middle">
                      <div className="flex flex-col gap-1 items-stretch min-w-[92px]">
                        <Link
                          href={`/dashboard/ventas/${order.id}?accion=garantia`}
                          onClick={() => {
                            setSelectedIds(new Set([order.id]))
                          }}
                          className={cn(
                            'inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wide transition-all',
                            isSelected
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-500/30 hover:bg-sky-100 dark:hover:bg-sky-500/25'
                          )}
                        >
                          <ArrowLeftRight className="w-3 h-3 shrink-0" />
                          Garantía
                        </Link>
                        <Link
                          href={`/dashboard/ventas/${order.id}?accion=devolucion`}
                          onClick={() => {
                            setSelectedIds(new Set([order.id]))
                          }}
                          className={cn(
                            'inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wide transition-all',
                            isSelected
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25'
                          )}
                        >
                          <Banknote className="w-3 h-3 shrink-0" />
                          Devolver
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DownloadWarrantyButton orderId={order.id} compact />
                    </td>
                  </tr>
                )
              })
            )}
            {filteredOrders.length > 0 &&
              Array.from({ length: padRowCount }).map((_, index) => (
                <tr
                  key={`pad-${index}`}
                  className="h-11 border-b border-gray-50/80 dark:border-surface-800/60"
                  aria-hidden
                >
                  <td colSpan={10} className="h-11" />
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-100 dark:border-surface-800 px-3 py-2.5 bg-gray-50/80 dark:bg-surface-950/50">
          <p className="text-[10px] font-bold text-gray-500 dark:text-surface-400 tabular-nums">
            Mostrando {pageFrom}–{pageTo} de {filteredOrders.length} · máx. {PAGE_SIZE} por página
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 rounded-md border border-gray-200 dark:border-surface-700 text-[10px] font-black uppercase tracking-wide disabled:opacity-40 hover:bg-white dark:hover:bg-surface-800"
            >
              Anterior
            </button>
            <span className="text-[10px] font-bold text-gray-600 dark:text-surface-300 tabular-nums min-w-[88px] text-center">
              Página {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 rounded-md border border-gray-200 dark:border-surface-700 text-[10px] font-black uppercase tracking-wide disabled:opacity-40 hover:bg-white dark:hover:bg-surface-800"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
