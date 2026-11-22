'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, GitBranchPlus, Loader2, Download, Trash2, Eye, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'
import ExcelColumnFilter from '@/app/dashboard/inventario/bodega/components/ExcelColumnFilter'
import type { QuotationStatus, SalesQuotation } from './actions'
import {
  addQuotationApprovalAdvance,
  deleteQuotation,
  getQuotationById,
  updateQuotationDiscount,
} from './actions'
import {
  QUOTATION_STATUS_STYLES,
  formatQuotationStatus,
} from '@/lib/ventas/quotationStatus'
import { formatQuotationPaymentMethod } from '@/lib/ventas/quotationMeta'
import { listedTotalFromItems, resolveQuotationTotals } from '@/lib/ventas/quotationIva'
import {
  buildQuotationPrintPayload,
  downloadQuotationPdf,
  type QuotationPrintPayload,
} from '@/lib/ventas/printQuotationPdf'
import QuotationPdfViewerModal from './components/QuotationPdfViewerModal'
import QuotationBarcode from './components/QuotationBarcode'
import QuotationAvanceModal from './components/QuotationAvanceModal'
import QuotationDiscountModal, { type DiscountFormValue } from './components/QuotationDiscountModal'

const EMPTY = '(Vacío)'

const ICON_ACTION =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50'

const EXCEL_HEADER_LABEL =
  'text-[11px] font-bold uppercase tracking-wide text-gray-900 dark:text-white'
const EXCEL_HEADER_FILTER =
  'border-gray-400 dark:border-surface-500 text-indigo-600 dark:text-indigo-300 hover:border-indigo-500 hover:bg-indigo-500/10'

type ColumnId = 'numero' | 'creado' | 'solicitante' | 'pago' | 'monto' | 'estado' | 'fecha'

function creatorLabel(row: SalesQuotation): string {
  return row.creator?.full_name?.trim() || '—'
}

function formatMoney(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount)
}

function solicitanteLabel(row: SalesQuotation): string {
  if (row.solicitante_tipo === 'empresa') {
    const company = row.solicitante_empresa?.trim()
    const contact = row.solicitante_contacto?.trim()
    if (company && contact) return `${company} · ${contact}`
    return company || contact || 'Empresa'
  }
  if (row.solicitante_tipo === 'cliente_final') {
    return row.customer?.commercial_name
      ? `Cliente final · ${row.customer.commercial_name}`
      : 'Cliente final'
  }
  return row.customer?.commercial_name || '—'
}

function formatFechaFilterLabel(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Etiqueta corta en fila (filtros usan la versión larga). */
function formatFechaRow(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusShort(status: QuotationStatus): string {
  switch (status) {
    case 'pendiente_aprobacion':
      return 'Pend. aprob.'
    case 'aprobada':
      return 'Aprobada'
    case 'rechazada':
      return 'Rechazada'
    case 'aceptada':
      return 'Aceptada'
    default:
      return formatQuotationStatus(status)
  }
}

function getColumnValue(row: SalesQuotation, columnId: ColumnId): string {
  switch (columnId) {
    case 'numero':
      return row.quote_number || EMPTY
    case 'creado':
      return creatorLabel(row)
    case 'solicitante':
      return solicitanteLabel(row) || EMPTY
    case 'pago':
      return formatQuotationPaymentMethod(row.payment_method) || EMPTY
    case 'monto':
      return formatMoney(row.amount)
    case 'estado':
      return formatQuotationStatus(row.status)
    case 'fecha':
      return formatFechaFilterLabel(row.created_at)
    default:
      return EMPTY
  }
}

function collectOptions(rows: SalesQuotation[], columnId: ColumnId): string[] {
  const values = new Set<string>()
  for (const row of rows) {
    values.add(getColumnValue(row, columnId))
  }
  return Array.from(values)
}

function compareRows(a: SalesQuotation, b: SalesQuotation, columnId: ColumnId, dir: 'asc' | 'desc'): number {
  let cmp = 0
  if (columnId === 'monto') {
    cmp = (a.amount ?? 0) - (b.amount ?? 0)
  } else if (columnId === 'fecha') {
    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  } else {
    cmp = getColumnValue(a, columnId).localeCompare(getColumnValue(b, columnId), 'es', {
      numeric: true,
      sensitivity: 'base',
    })
  }
  return dir === 'asc' ? cmp : -cmp
}

function matchesFilters(row: SalesQuotation, filters: Record<ColumnId, Set<string> | null>): boolean {
  for (const [columnId, selected] of Object.entries(filters) as [ColumnId, Set<string> | null][]) {
    if (!selected) continue
    if (!selected.has(getColumnValue(row, columnId))) return false
  }
  return true
}

type Props = {
  rows: SalesQuotation[]
  emptyMessage?: string
  caption?: string
  className?: string
}

const INITIAL_FILTERS: Record<ColumnId, Set<string> | null> = {
  numero: null,
  creado: null,
  solicitante: null,
  pago: null,
  monto: null,
  estado: null,
  fecha: null,
}

const COLUMN_LABELS: Record<ColumnId, string> = {
  numero: 'Número',
  creado: 'Creado por',
  solicitante: 'Solicitante',
  pago: 'Método pago',
  monto: 'Monto',
  estado: 'Estado',
  fecha: 'Fecha',
}

const PAGE_SIZE_OPTIONS = [15, 18, 20] as const
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]
/** Altura por fila de datos (rem) para viewport fijo */
const ROW_HEIGHT_REM = 2.125
const TABLE_HEAD_REM = 2.75
const TABLE_CAPTION_REM = 1.75

export default function QuotationsTable({
  rows,
  emptyMessage = 'Sin cotizaciones.',
  caption,
  className,
}: Props) {
  const router = useRouter()
  const [avanceFor, setAvanceFor] = useState<SalesQuotation | null>(null)
  const [discountFor, setDiscountFor] = useState<SalesQuotation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [columnFilters, setColumnFilters] = useState(INITIAL_FILTERS)
  const [sort, setSort] = useState<{ columnId: ColumnId; dir: 'asc' | 'desc' } | null>(null)
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null)
  const [deleteFor, setDeleteFor] = useState<SalesQuotation | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewPayload, setPdfPreviewPayload] = useState<QuotationPrintPayload | null>(null)
  const [viewBusyId, setViewBusyId] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState<PageSize>(18)
  const [page, setPage] = useState(1)

  const displayedRows = useMemo(() => {
    let list = rows.filter((row) => matchesFilters(row, columnFilters))
    if (sort) {
      list = [...list].sort((a, b) => compareRows(a, b, sort.columnId, sort.dir))
    }
    return list
  }, [rows, columnFilters, sort])

  const totalPages = Math.max(1, Math.ceil(displayedRows.length / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [rows, columnFilters, sort, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return displayedRows.slice(start, start + pageSize)
  }, [displayedRows, pageSize, safePage])

  const pageFrom = displayedRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const pageTo = Math.min(safePage * pageSize, displayedRows.length)

  const tableViewportHeightRem =
    (caption ? TABLE_CAPTION_REM : 0) + TABLE_HEAD_REM + pageSize * ROW_HEIGHT_REM

  const setFilter = (columnId: ColumnId, next: Set<string> | null) => {
    setColumnFilters((prev) => ({ ...prev, [columnId]: next }))
  }

  const handleSort = (columnId: ColumnId, dir: 'asc' | 'desc') => {
    setSort({ columnId, dir })
  }

  const handleViewPdf = async (row: SalesQuotation) => {
    setViewBusyId(row.id)
    setError(null)
    try {
      const { data, error: fetchErr } = await getQuotationById(row.id)
      if (!data || fetchErr) {
        setError(fetchErr || 'No se pudo cargar la cotización')
        return
      }
      const listedSum = listedTotalFromItems(data.items, data.amount ?? 0)
      const includesIva = data.prices_include_iva ?? false
      const iva = resolveQuotationTotals(listedSum, includesIva, data)
      setPdfPreviewPayload(buildQuotationPrintPayload(data, includesIva, iva))
      setPdfPreviewOpen(true)
    } catch {
      setError('No se pudo abrir el visor PDF')
    } finally {
      setViewBusyId(null)
    }
  }

  const handleDownloadPdf = async (row: SalesQuotation) => {
    setPdfBusyId(row.id)
    setError(null)
    try {
      const { data, error: fetchErr } = await getQuotationById(row.id)
      if (!data || fetchErr) {
        setError(fetchErr || 'No se pudo cargar la cotización')
        return
      }
      const listedSum = listedTotalFromItems(data.items, data.amount ?? 0)
      const includesIva = data.prices_include_iva ?? false
      const iva = resolveQuotationTotals(listedSum, includesIva, data)
      await downloadQuotationPdf(buildQuotationPrintPayload(data, includesIva, iva))
    } catch {
      setError('No se pudo generar el PDF')
    } finally {
      setPdfBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteFor) return
    setDeleteBusy(true)
    setError(null)
    const res = await deleteQuotation(deleteFor.id)
    setDeleteBusy(false)
    if (!res.success) {
      setError(res.error || 'No se pudo eliminar')
      return
    }
    setDeleteFor(null)
    router.refresh()
  }

  const saveDiscount = async (payload: DiscountFormValue) => {
    if (!discountFor) return
    setBusy(true)
    setError(null)
    const res = await updateQuotationDiscount(discountFor.id, payload)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'No se pudo guardar el descuento')
      return
    }
    setDiscountFor(null)
    router.refresh()
  }

  const saveAvance = async (body: string, file: File | null) => {
    if (!avanceFor) return
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.set('quotationId', avanceFor.id)
    fd.set('body', body)
    if (file) fd.set('attachment', file)
    const res = await addQuotationApprovalAdvance(fd)
    setBusy(false)
    if (!res.success) {
      setError(res.error || 'Error')
      return
    }
    setAvanceFor(null)
    router.refresh()
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-surface-600 p-6 text-center text-sm text-gray-600 dark:text-surface-400">
        {emptyMessage}
      </div>
    )
  }

  const headerCell = (columnId: ColumnId, align?: 'left' | 'center') => (
    <th
      className={cn(
        'px-1.5 py-1.5 bg-slate-100 dark:bg-surface-800/90',
        columnId === 'monto' && 'text-right',
        columnId === 'fecha' && 'whitespace-nowrap'
      )}
    >
      <ExcelColumnFilter
        label={COLUMN_LABELS[columnId]}
        options={collectOptions(rows, columnId)}
        selected={columnFilters[columnId]}
        onChange={(next) => setFilter(columnId, next)}
        sortDir={sort?.columnId === columnId ? sort.dir : null}
        onSort={(dir) => handleSort(columnId, dir)}
        align={align}
        labelClassName={EXCEL_HEADER_LABEL}
        inactiveFilterClassName={EXCEL_HEADER_FILTER}
      />
    </th>
  )

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg mb-2">{error}</p>
      )}

      <div className="flex flex-col flex-1 min-h-0 max-w-full rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm overflow-hidden">
        <div
          className="min-h-0 max-w-full overflow-x-auto overflow-y-auto"
          style={{
            height: `${tableViewportHeightRem}rem`,
            maxHeight: `${tableViewportHeightRem}rem`,
          }}
        >
        <table className="w-full min-w-[920px] max-w-full table-fixed text-[12px] leading-tight">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
          </colgroup>
          {caption ? (
            <caption className="text-left px-2 py-1.5 text-xs font-bold text-gray-700 dark:text-surface-300 caption-top border-b border-gray-100 dark:border-surface-800">
              {caption}
              {displayedRows.length !== rows.length ? (
                <span className="font-normal text-gray-500 ml-2">
                  (mostrando {displayedRows.length} de {rows.length})
                </span>
              ) : null}
            </caption>
          ) : null}
          <thead className="border-b-2 border-indigo-200 dark:border-indigo-500/40 sticky top-0 z-[2]">
            <tr className="text-left">
              {headerCell('numero')}
              {headerCell('creado')}
              {headerCell('solicitante')}
              {headerCell('pago')}
              {headerCell('monto')}
              {headerCell('estado')}
              {headerCell('fecha')}
              <th className="sticky right-0 z-[3] px-1.5 py-1.5 text-right bg-slate-100 dark:bg-surface-800/95 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.12)]">
                <span className={EXCEL_HEADER_LABEL}>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                  Sin coincidencias con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-gray-200 dark:border-surface-700 hover:bg-gray-50/60 dark:hover:bg-surface-800/30',
                    row.status === 'pendiente_aprobacion'
                      ? 'bg-amber-50/70 dark:bg-amber-500/10'
                      : 'bg-white dark:bg-surface-900'
                  )}
                >
                  <td className="px-1.5 py-1 align-middle overflow-hidden max-w-0">
                    <QuotationBarcode quoteNumber={row.quote_number} numberOnly />
                  </td>
                  <td className="px-1.5 py-1 text-gray-800 dark:text-surface-200 truncate font-medium" title={creatorLabel(row)}>
                    {creatorLabel(row)}
                  </td>
                  <td className="px-1.5 py-1 text-gray-800 dark:text-surface-200 truncate" title={solicitanteLabel(row)}>
                    {solicitanteLabel(row)}
                  </td>
                  <td className="px-1.5 py-1 font-semibold text-violet-700 dark:text-violet-300 truncate" title={formatQuotationPaymentMethod(row.payment_method)}>
                    {formatQuotationPaymentMethod(row.payment_method)}
                  </td>
                  <td className="px-1.5 py-1 text-right tabular-nums font-extrabold text-emerald-700 dark:text-emerald-400 truncate">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-1.5 py-1">
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border truncate inline-block max-w-full',
                        QUOTATION_STATUS_STYLES[row.status as QuotationStatus]
                      )}
                      title={formatQuotationStatus(row.status)}
                    >
                      {statusShort(row.status as QuotationStatus)}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 text-[11px] font-medium text-gray-700 dark:text-surface-300 truncate" title={formatFechaFilterLabel(row.created_at)}>
                    {formatFechaRow(row.created_at)}
                  </td>
                  <td
                    className={cn(
                      'sticky right-0 z-[1] px-1 py-1 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]',
                      row.status === 'pendiente_aprobacion'
                        ? 'bg-amber-50/95 dark:bg-amber-500/10'
                        : 'bg-white dark:bg-surface-900'
                    )}
                  >
                    <div className="flex flex-nowrap items-center justify-end gap-0.5">
                      <button
                        type="button"
                        disabled={viewBusyId === row.id}
                        onClick={() => handleViewPdf(row)}
                        className={cn(
                          ICON_ACTION,
                          'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200'
                        )}
                        title="Ver PDF"
                        aria-label="Ver PDF"
                      >
                        {viewBusyId === row.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={pdfBusyId === row.id}
                        onClick={() => handleDownloadPdf(row)}
                        className={cn(
                          ICON_ACTION,
                          'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20'
                        )}
                        title="Descargar PDF"
                        aria-label="Descargar PDF"
                      >
                        {pdfBusyId === row.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <Link
                        href={`/dashboard/ventas/cotizaciones/${row.id}`}
                        className={cn(
                          ICON_ACTION,
                          'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-500/15'
                        )}
                        title="Detalle"
                        aria-label="Detalle"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Link>
                      {(row.status === 'pendiente_aprobacion' || row.status === 'aprobada') && (
                        <button
                          type="button"
                          onClick={() => {
                            setError(null)
                            setDiscountFor(row)
                          }}
                          className={cn(
                            ICON_ACTION,
                            'border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:bg-violet-500/15'
                          )}
                          title="Descuento"
                          aria-label="Descuento"
                        >
                          <Percent className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {row.status === 'pendiente_aprobacion' && (
                        <button
                          type="button"
                          onClick={() => {
                            setError(null)
                            setAvanceFor(row)
                          }}
                          className={cn(
                            ICON_ACTION,
                            'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-500/15'
                          )}
                          title="Avance aprobación"
                          aria-label="Avance aprobación"
                        >
                          <GitBranchPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setDeleteFor(row)
                        }}
                        className={cn(
                          ICON_ACTION,
                          'border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-500/15'
                        )}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-200 dark:border-surface-700 px-2 py-1.5 bg-gray-50/90 dark:bg-surface-950/60 shrink-0">
          <p className="text-xs font-medium text-gray-600 dark:text-surface-400 tabular-nums">
            {displayedRows.length === 0
              ? '0 cotizaciones'
              : `Mostrando ${pageFrom}–${pageTo} de ${displayedRows.length}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="cotizaciones-page-size">
              Filas por página
            </label>
            <select
              id="cotizaciones-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
              className="h-8 rounded-lg border border-gray-200 dark:border-surface-600 bg-white dark:bg-surface-900 px-2 text-xs font-semibold text-gray-800 dark:text-surface-200"
              title="Filas por página"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / página
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-surface-600 text-xs font-semibold disabled:opacity-40 hover:bg-white dark:hover:bg-surface-800"
            >
              Anterior
            </button>
            <span className="text-xs font-bold text-gray-700 dark:text-surface-300 tabular-nums min-w-[96px] text-center">
              Página {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-surface-600 text-xs font-semibold disabled:opacity-40 hover:bg-white dark:hover:bg-surface-800"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {deleteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 p-4 shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Eliminar cotización</h3>
            <p className="text-sm text-gray-600 dark:text-surface-400 mb-3">
              ¿Eliminar <span className="font-mono font-semibold">{deleteFor.quote_number}</span>? Esta acción no
              se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteFor(null)}
                disabled={deleteBusy}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy}
                className="flex-1 rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-semibold flex justify-center items-center gap-2"
              >
                {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <QuotationAvanceModal
        open={!!avanceFor}
        quoteNumber={avanceFor?.quote_number}
        title="Avance de aprobación"
        busy={busy}
        onClose={() => setAvanceFor(null)}
        onSave={saveAvance}
      />

      <QuotationDiscountModal
        open={!!discountFor}
        quoteNumber={discountFor?.quote_number}
        initialPercent={discountFor?.discount_percent ?? 0}
        initialAmount={discountFor?.discount_amount ?? 0}
        initialNote={discountFor?.discount_note}
        busy={busy}
        onClose={() => setDiscountFor(null)}
        onSave={saveDiscount}
      />

      <QuotationPdfViewerModal
        open={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false)
          setPdfPreviewPayload(null)
        }}
        payload={pdfPreviewPayload}
      />
    </div>
  )
}
