'use client'

import Link from 'next/link'
import { ArrowLeftRight, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import VoidSaleButton from './VoidSaleButton'
import SalePolicyCommentCell from './SalePolicyCommentCell'
import DownloadWarrantyButton from './DownloadWarrantyButton'
import {
  POST_SALE_REFUND_TOOLTIP,
  POST_SALE_VOID_TOOLTIP,
  POST_SALE_WARRANTY_TOOLTIP,
} from '@/lib/sales/postSaleHelp'

type Props = {
  orderId: string
  orderStatus: string
  customerNotes?: string | null
  canVoidSale: boolean
  isSelected?: boolean
  onSelect?: () => void
  onNotesSaved?: (next: string | null) => void
  /** Columna de tabla o bloque móvil */
  part?: 'post-venta' | 'politica' | 'all'
}

function actionLinkClass(active: boolean, tone: 'sky' | 'rose') {
  const base =
    'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors shrink-0'
  if (active) {
    return cn(
      base,
      tone === 'sky'
        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
        : 'bg-rose-600 text-white border-rose-600 shadow-sm'
    )
  }
  return cn(
    base,
    tone === 'sky'
      ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-500/30 hover:bg-sky-100 dark:hover:bg-sky-500/25'
      : 'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25'
  )
}

export default function SaleRowPostSaleActions({
  orderId,
  orderStatus,
  customerNotes,
  canVoidSale,
  isSelected,
  onSelect,
  onNotesSaved,
  part = 'all',
}: Props) {
  const postVenta = (
    <div className="flex items-center justify-end gap-0.5">
      <Link
        href={`/dashboard/ventas/${orderId}?accion=garantia`}
        onClick={onSelect}
        title={POST_SALE_WARRANTY_TOOLTIP}
        aria-label="Garantía"
        className={actionLinkClass(!!isSelected, 'sky')}
      >
        <ArrowLeftRight className="w-3.5 h-3.5" />
      </Link>
      <Link
        href={`/dashboard/ventas/${orderId}?accion=devolucion`}
        onClick={onSelect}
        title={POST_SALE_REFUND_TOOLTIP}
        aria-label="Devolver"
        className={actionLinkClass(!!isSelected, 'rose')}
      >
        <Banknote className="w-3.5 h-3.5" />
      </Link>
      {canVoidSale ? (
        <VoidSaleButton
          orderId={orderId}
          orderStatus={orderStatus}
          compact
          title={POST_SALE_VOID_TOOLTIP}
        />
      ) : null}
    </div>
  )

  const politica = (
    <div className="flex items-center justify-end gap-0.5">
      <SalePolicyCommentCell
        orderId={orderId}
        value={customerNotes}
        compact
        iconOnly
        onSaved={onNotesSaved}
      />
      <DownloadWarrantyButton orderId={orderId} compact iconOnly />
    </div>
  )

  if (part === 'post-venta') return postVenta
  if (part === 'politica') return politica

  return (
    <div className="flex flex-col gap-1 items-end">
      {postVenta}
      {politica}
    </div>
  )
}