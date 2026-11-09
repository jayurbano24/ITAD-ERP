import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getQuotationById, getQuotationComments } from '../actions'
import QuotationDetailClient from './QuotationDetailClient'
import QuotationLetterhead from '../components/QuotationLetterhead'
import QuotationWatermark from '../components/QuotationWatermark'
import QuotationInfoCompact from '../components/QuotationInfoCompact'
import {
  QUOTATION_STATUS_STYLES,
  formatQuotationStatus,
} from '@/lib/ventas/quotationStatus'
import type { QuotationStatus } from '../actions'
import { cn } from '@/lib/utils'
import {
  formatQuotationPaymentMethod,
  formatQuotationRequesterType,
} from '@/lib/ventas/quotationMeta'
import {
  listedTotalFromItems,
  QUOTATION_IVA_RATE,
  resolveQuotationTotals,
} from '@/lib/ventas/quotationIva'

export const dynamic = 'force-dynamic'

function formatMoney(amount: number | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount)
}

const TFOOT_PAD = 'py-1.5 px-2'
const TFOOT_LABEL = `${TFOOT_PAD} text-center text-xs align-middle`
const TFOOT_AMOUNT = `${TFOOT_PAD} text-center text-xs tabular-nums whitespace-nowrap align-middle w-[7.25rem] max-w-[7.25rem]`
const TFOOT_SPACER = 'p-0 border-0 bg-inherit'

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: quotation, error } = await getQuotationById(id)
  if (!quotation || error) notFound()

  const { data: comments } = await getQuotationComments(id)

  const listedSum = listedTotalFromItems(quotation.items, quotation.amount ?? 0)
  const includesIva = quotation.prices_include_iva ?? false
  const iva = resolveQuotationTotals(listedSum, includesIva, quotation)

  return (
    <div className="p-3 sm:p-4 pb-8 max-w-4xl mx-auto min-h-[calc(100dvh-4rem)] print:p-0">
      <Link
        href="/dashboard/ventas/cotizaciones"
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-surface-400 hover:text-gray-900 mb-4 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        Cotizaciones
      </Link>

      <QuotationLetterhead className="mb-4" />

      <div className="relative rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 mb-4 overflow-hidden print:shadow-none shadow-sm">
        <QuotationWatermark />
        <div className="relative z-[1] p-4 sm:p-5 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-surface-800">
            <div className="min-w-0 flex-1 pr-2">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                {quotation.title}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
                {quotation.quote_number}
              </p>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase px-2 py-0.5 rounded border',
                  QUOTATION_STATUS_STYLES[quotation.status as QuotationStatus]
                )}
              >
                {formatQuotationStatus(quotation.status)}
              </span>
            </div>
          </div>

          <QuotationInfoCompact
            cliente={[
              { label: 'Nombre', value: quotation.customer?.commercial_name || '—' },
              { label: 'NIT', value: quotation.customer?.tax_id_nit || '—' },
              { label: 'Teléfono', value: quotation.customer?.phone || '—' },
              {
                label: 'Correo envío',
                value: quotation.recipient_email ? (
                  <a
                    href={`mailto:${quotation.recipient_email}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {quotation.recipient_email}
                  </a>
                ) : (
                  quotation.customer?.email || '—'
                ),
              },
              { label: 'Dirección', value: quotation.customer?.address || '—' },
            ]}
            operacion={[
              {
                label: 'Creado',
                value: new Date(quotation.created_at).toLocaleString('es-GT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
              { label: 'Vendedor', value: quotation.creator?.full_name || '—' },
              {
                label: 'Solicitante',
                value:
                  quotation.solicitante_tipo === 'empresa'
                    ? [quotation.solicitante_empresa, quotation.solicitante_contacto]
                        .filter(Boolean)
                        .join(' · ') || 'Empresa'
                    : formatQuotationRequesterType(quotation.solicitante_tipo),
              },
              { label: 'Pago', value: formatQuotationPaymentMethod(quotation.payment_method) },
            ]}
          />

          {quotation.description && (
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-surface-800">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Notas</p>
              <p className="text-xs whitespace-pre-wrap text-gray-800 dark:text-surface-200">
                {quotation.description}
              </p>
            </div>
          )}

          {quotation.items && quotation.items.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-surface-700 min-w-0">
              <p className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                Equipos cotizados
              </p>
              <div className="min-w-0 overflow-hidden rounded-lg border border-gray-100 dark:border-surface-800 bg-white/60 dark:bg-surface-900/40">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-surface-400 border-b border-gray-200 dark:border-surface-700 bg-gray-50/80 dark:bg-surface-950/50">
                        <th className="py-2.5 px-2 text-left align-middle">Descripción</th>
                        <th className="py-2.5 px-2 text-center align-middle">Serie</th>
                        <th className="py-2.5 px-2 text-center align-middle">Marca / modelo</th>
                        <th className="py-2.5 px-2 text-center align-middle">Cant.</th>
                        <th className="py-2.5 px-2 text-center align-middle whitespace-nowrap w-[7rem]">Precio</th>
                        <th className="py-2.5 px-2 text-center align-middle whitespace-nowrap w-[7.25rem]">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={cn(
                            'border-b border-gray-100 dark:border-surface-800/80',
                            idx % 2 === 1 && 'bg-gray-50/50 dark:bg-surface-950/30'
                          )}
                        >
                          <td className="py-2.5 px-2 align-middle text-left text-gray-900 dark:text-white break-words">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-center font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 break-all">
                            {item.serial_number || '—'}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-center text-gray-700 dark:text-surface-300 break-words">
                            {[item.manufacturer, item.model].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-center tabular-nums font-medium">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-center tabular-nums whitespace-nowrap">
                            {formatMoney(item.unit_price)}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-center tabular-nums font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {formatMoney(item.line_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/50 dark:bg-surface-950/40 border-t border-gray-200 dark:border-surface-700">
                      {iva.discountApplied > 0 ? (
                        <>
                          <tr>
                            <td colSpan={4} className={TFOOT_SPACER} />
                            <td className={cn(TFOOT_LABEL, 'pt-2 text-gray-500')}>
                              Subtotal equipos (sin IVA)
                            </td>
                            <td className={cn(TFOOT_AMOUNT, 'pt-2 font-medium')}>
                              {formatMoney(iva.subtotalBeforeDiscount)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={4} className={TFOOT_SPACER} />
                            <td className={cn(TFOOT_LABEL, 'text-red-600')}>
                              <span className="block">Descuento</span>
                              {quotation.discount_note?.trim() ? (
                                <span
                                  className="block text-[10px] text-gray-500 font-normal truncate max-w-[11rem] mx-auto"
                                  title={quotation.discount_note.trim()}
                                >
                                  {quotation.discount_note.trim()}
                                </span>
                              ) : null}
                            </td>
                            <td className={cn(TFOOT_AMOUNT, 'font-medium text-red-600')}>
                              - {formatMoney(iva.discountApplied)}
                            </td>
                          </tr>
                        </>
                      ) : null}
                      <tr>
                        <td colSpan={4} className={TFOOT_SPACER} />
                        <td className={cn(TFOOT_LABEL, 'pt-2 text-gray-500 dark:text-surface-400')}>
                          Subtotal sin IVA
                        </td>
                        <td className={cn(TFOOT_AMOUNT, 'pt-2 font-medium')}>{formatMoney(iva.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className={TFOOT_SPACER} />
                        <td className={cn(TFOOT_LABEL, 'text-gray-500 dark:text-surface-400')}>
                          IVA ({Math.round(QUOTATION_IVA_RATE * 100)}%)
                        </td>
                        <td className={cn(TFOOT_AMOUNT, 'font-medium')}>{formatMoney(iva.tax_amount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className={TFOOT_SPACER} />
                        <td className={cn(TFOOT_LABEL, 'pb-2 text-sm font-bold text-gray-800 dark:text-white')}>
                          Total con IVA
                        </td>
                        <td
                          className={cn(
                            TFOOT_AMOUNT,
                            'pb-2 text-sm font-extrabold text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {formatMoney(iva.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="print:hidden">
        <QuotationDetailClient
          quotation={quotation}
          initialComments={comments ?? []}
          includesIva={includesIva}
          iva={iva}
        />
      </div>

      <footer className="mt-6 pt-4 border-t border-gray-200 dark:border-surface-700 text-center text-[11px] text-gray-500 dark:text-surface-500 print:mt-4">
        <p className="font-semibold text-gray-800 dark:text-surface-300">TECHCORPS GUATEMALA</p>
        <p>+502 2436 0336 · +502 2254 0430 · info@techcommwireless.com</p>
      </footer>
    </div>
  )
}
