import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText, ShoppingCart } from 'lucide-react'
import { getSalesOrderById, getSaleExchangesForOrder, getLatestWarrantyPolicyNumber } from '../actions'
import ReprintWarrantyButton from './ReprintWarrantyButton'
import SalePostSaleActions from './SalePostSaleActions'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }> | { id: string }
  searchParams?: Promise<{ accion?: string }> | { accion?: string }
}

export default async function VentaDetallePage({ params, searchParams }: PageProps) {
  const resolved = await Promise.resolve(params)
  const sp = await Promise.resolve(searchParams || {})
  const accionRaw = (sp.accion || '').trim().toLowerCase()
  const initialAction =
    accionRaw === 'garantia' || accionRaw === 'devolucion' ? accionRaw : undefined
  const { data: order, error } = await getSalesOrderById(resolved.id)

  if (error || !order) {
    notFound()
  }

  const { data: exchanges } = await getSaleExchangesForOrder(order.id)
  const latestPolicyNumber = await getLatestWarrantyPolicyNumber(order.id)

  const customer = order.customer as {
    commercial_name?: string
    tax_id_nit?: string
    phone?: string | null
    email?: string | null
  } | null

  const items = (order.items || []) as Array<{
    id: string
    product_description: string
    serial_number: string | null
    condition_grade: string | null
    unit_price: number
    warranty_end_date: string | null
    line_status?: string | null
    asset_id?: string | null
    asset?: {
      id?: string
      manufacturer?: string | null
      model?: string | null
      serial_number?: string | null
      internal_tag?: string | null
      condition?: string | null
      condition_grade?: string | null
      specifications?: Record<string, unknown> | null
    } | null
  }>

  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    confirmed: 'Confirmada',
    paid: 'Pagada',
    shipped: 'Enviada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
    partially_refunded: 'Devolución parcial',
    refunded: 'Reembolsada',
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-surface-950 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/ventas"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Historial de ventas
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-emerald-600" />
            Detalle de venta
          </h1>
          <p className="text-gray-500 dark:text-surface-400 text-sm font-medium mt-1">
            Invoice {order.invoice_number || '—'}
            {order.sat_invoice_number ? ` · SAT ${order.sat_invoice_number}` : ''} · Orden {order.order_number}
          </p>
        </div>
        <ReprintWarrantyButton orderId={order.id} latestPolicyNumber={latestPolicyNumber} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Cliente</h2>
            <p className="text-lg font-black text-gray-900 dark:text-white">{customer?.commercial_name || 'N/A'}</p>
            <p className="text-sm font-mono text-gray-500">{customer?.tax_id_nit || '—'}</p>
            {customer?.phone && <p className="text-sm text-gray-500">Tel: {customer.phone}</p>}
            {customer?.email && <p className="text-sm text-gray-500">{customer.email}</p>}
          </div>
          <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-2xl p-5 space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Facturación</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{order.invoice_number || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Factura SAT</span>
              <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{order.sat_invoice_number || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Orden</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{order.order_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estado</span>
              <span className="font-bold text-emerald-600">{statusLabels[order.status] || order.status}</span>
            </div>
            {latestPolicyNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">No. política</span>
                <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{latestPolicyNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fecha</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {new Date(order.created_at).toLocaleString('es-GT')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pago</span>
              <span className="font-bold text-gray-900 dark:text-white capitalize">
                {order.payment_method || '—'}
              </span>
            </div>
            {order.customer_notes && (
              <div className="flex justify-between text-sm gap-3">
                <span className="text-gray-500 shrink-0">Detalle garantía</span>
                <span className="font-bold text-gray-900 dark:text-white text-right">
                  {order.customer_notes}
                </span>
              </div>
            )}
            {order.internal_notes && (
              <div className="flex justify-between text-sm gap-3">
                <span className="text-gray-500 shrink-0">Notas internas</span>
                <span className="font-bold text-gray-900 dark:text-white text-right whitespace-pre-line text-xs">
                  {order.internal_notes}
                </span>
              </div>
            )}
            {exchanges && exchanges.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-surface-800 space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                  Cambios de serie (garantía)
                </h3>
                <ul className="space-y-2 text-xs">
                  {exchanges.map((ex) => (
                    <li
                      key={ex.id}
                      className="rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 px-2 py-1.5"
                    >
                      <p className="font-mono font-bold text-gray-900 dark:text-white">
                        {ex.from_serial || '—'} → {ex.to_serial || '—'}
                      </p>
                      <p className="text-gray-600 dark:text-surface-400 mt-0.5">{ex.reason || '—'}</p>
                      {ex.upgrade_total != null && Number(ex.upgrade_total) > 0 && (
                        <p className="text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                          Diferencia cobrada: Q{Number(ex.upgrade_total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          {ex.upgrade_payment_method ? ` · ${ex.upgrade_payment_method}` : ''}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Ingreso {ex.return_warehouse_code || 'BOD-RPL'} ·{' '}
                        {new Date(ex.created_at).toLocaleString('es-GT')}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-surface-800">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold">Q{Number(order.subtotal || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">IVA</span>
              <span className="font-bold">Q{Number(order.tax_amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base pt-1">
              <span className="font-black text-gray-900 dark:text-white">Total</span>
              <span className="font-black text-emerald-600">
                Q{Number(order.total_amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-surface-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
              Equipos ({items.length})
            </h2>
          </div>
          <SalePostSaleActions
            orderId={order.id}
            orderStatus={order.status}
            paymentMethod={order.payment_method}
            initialAction={initialAction}
            items={items.map((i) => ({
              id: i.id,
              serial_number: i.serial_number || i.asset?.serial_number || null,
              line_status: i.line_status,
              asset_id: i.asset_id ?? i.asset?.id ?? null,
              unit_price: Number(i.unit_price) || 0,
              product_label: [
                i.asset?.manufacturer,
                i.asset?.model || i.product_description,
              ]
                .filter(Boolean)
                .join(' ')
                .trim(),
              condition_grade: i.condition_grade || i.asset?.condition_grade || null,
            }))}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-surface-850 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="text-left px-4 py-3">Serie</th>
                  <th className="text-left px-4 py-3">Marca / Modelo</th>
                  <th className="text-left px-4 py-3">Condición</th>
                  <th className="text-right px-4 py-3">Precio</th>
                  <th className="text-left px-4 py-3">Garantía hasta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-surface-800">
                {items.map((item) => (
                  <tr key={item.id} className={item.line_status === 'refunded' ? 'opacity-60' : undefined}>
                    <td className="px-4 py-3 font-mono text-emerald-600 font-bold text-xs">
                      {item.serial_number || item.asset?.serial_number || '—'}
                      {item.line_status === 'refunded' && (
                        <span className="ml-2 text-[9px] font-black uppercase text-red-600">Reembolsado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                      {(item.asset?.manufacturer || '') + ' ' + (item.asset?.model || item.product_description || '')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.condition_grade || '—'}</td>
                    <td className="px-4 py-3 text-right font-black tabular-nums">
                      Q{Number(item.unit_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.warranty_end_date
                        ? new Date(item.warranty_end_date).toLocaleDateString('es-GT')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
