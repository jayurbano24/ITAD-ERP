'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { ArrowLeftRight, Banknote, Loader2 } from 'lucide-react'
import {
  exchangeSaleOrderItem,
  refundSaleOrderItem,
  getWarrantyPrintPayloadForOrder,
  lookupReplacementAssetForExchange,
  type AssetForSale,
} from '../actions'
import { printWarrantyPolicy } from '@/lib/ventas/printWarrantyPolicy'
import { useToast } from '@/context/ToastContext'

type LineItem = {
  id: string
  serial_number: string | null
  line_status?: string | null
  asset_id?: string | null
  unit_price?: number
  product_label?: string | null
  condition_grade?: string | null
}

function money(n: number) {
  return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function totalWithIvaFromBase(base: number) {
  const b = Math.round(Number(base) * 100) / 100
  const tax = Math.round(b * 0.12 * 100) / 100
  return Math.round((b + tax) * 100) / 100
}

type Props = {
  orderId: string
  orderStatus: string
  paymentMethod?: string | null
  initialAction?: 'garantia' | 'devolucion'
  items: LineItem[]
}

const DEFAULT_CLAIM_REASON = 'Reclamación del Cliente: '

function refundMethodLabel(paymentMethod?: string | null) {
  const raw = (paymentMethod || 'efectivo').toLowerCase()
  if (raw === 'visacuota') return 'mismo canal Visacuota'
  if (raw === 'efectivo' || raw === 'cash') return 'efectivo'
  if (raw === 'transferencia' || raw === 'transfer') return 'transferencia'
  return paymentMethod || 'registrado en venta'
}

export default function SalePostSaleActions({
  orderId,
  orderStatus,
  paymentMethod,
  initialAction,
  items,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [exchangeItemId, setExchangeItemId] = useState<string | null>(null)
  const [refundItemId, setRefundItemId] = useState<string | null>(null)
  const [newSerial, setNewSerial] = useState('')
  const [reason, setReason] = useState('')
  const [chargeUpgradeDifference, setChargeUpgradeDifference] = useState(false)
  const [upgradeDifferenceTotal, setUpgradeDifferenceTotal] = useState('')
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('')
  const [replacementAsset, setReplacementAsset] = useState<AssetForSale | null>(null)
  const [replacementLookupError, setReplacementLookupError] = useState<string | null>(null)
  const [replacementLoading, setReplacementLoading] = useState(false)

  const blocked = ['cancelled', 'refunded'].includes(orderStatus)
  const equipmentLines = items.filter((i) => i.asset_id && (i.line_status || 'active') === 'active')
  const exchangeLine = equipmentLines.find((l) => l.id === exchangeItemId)

  const firstEquipmentLineId = equipmentLines[0]?.id

  useEffect(() => {
    if (!initialAction || blocked || !firstEquipmentLineId) return
    if (initialAction === 'garantia') {
      setExchangeItemId(firstEquipmentLineId)
      setReason(DEFAULT_CLAIM_REASON)
    } else {
      setRefundItemId(firstEquipmentLineId)
      setReason('Devolución de dinero')
    }
  }, [initialAction, blocked, firstEquipmentLineId])

  const reset = () => {
    setExchangeItemId(null)
    setRefundItemId(null)
    setNewSerial('')
    setReason('')
    setChargeUpgradeDifference(false)
    setUpgradeDifferenceTotal('')
    setUpgradePaymentMethod('')
    setReplacementAsset(null)
    setReplacementLookupError(null)
    setReplacementLoading(false)
  }

  const soldBase = Number(exchangeLine?.unit_price) || 0
  const soldTotalIva = totalWithIvaFromBase(soldBase)
  const replacementRetail = replacementAsset
    ? Number(replacementAsset.sales_price ?? replacementAsset.cost_amount) || 0
    : 0
  const replacementTotalIva = totalWithIvaFromBase(replacementRetail)
  const suggestedDifference = Math.max(
    0,
    Math.round((replacementTotalIva - soldTotalIva) * 100) / 100
  )

  useEffect(() => {
    if (!exchangeItemId) {
      setReplacementAsset(null)
      setReplacementLookupError(null)
      return
    }
    const serial = newSerial.trim()
    if (serial.length < 2) {
      setReplacementAsset(null)
      setReplacementLookupError(null)
      return
    }

    let cancelled = false
    setReplacementLoading(true)
    setReplacementLookupError(null)

    const timer = window.setTimeout(() => {
      void lookupReplacementAssetForExchange(serial).then(({ data, error }) => {
        if (cancelled) return
        setReplacementLoading(false)
        if (error || !data) {
          setReplacementAsset(null)
          setReplacementLookupError(error || 'Serial no encontrado en Remarketing')
          return
        }
        setReplacementAsset(data)
        setReplacementLookupError(null)
        const retail = Number(data.sales_price ?? data.cost_amount) || 0
        const replTotal = totalWithIvaFromBase(retail)
        const diff = Math.max(0, Math.round((replTotal - soldTotalIva) * 100) / 100)
        if (diff > 0) {
          setChargeUpgradeDifference(true)
          setUpgradeDifferenceTotal(diff.toFixed(2))
        } else {
          setChargeUpgradeDifference(false)
          setUpgradeDifferenceTotal('')
        }
      })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [newSerial, exchangeItemId, soldTotalIva])

  const runExchange = () => {
    if (!exchangeItemId) return
    const fullReason = reason.trim()
    if (fullReason.length < 8) {
      toast.warning('Falta el motivo', 'Describe por qué se cambió el equipo (reclamación del cliente).')
      return
    }
    const diffRaw = chargeUpgradeDifference ? Number(upgradeDifferenceTotal.replace(',', '.')) : 0
    if (chargeUpgradeDifference && (!Number.isFinite(diffRaw) || diffRaw <= 0)) {
      toast.warning('Diferencia inválida', 'Ingresa el monto adicional que pagó el cliente.')
      return
    }

    startTransition(async () => {
      const res = await exchangeSaleOrderItem({
        orderItemId: exchangeItemId,
        newSerial,
        reason: fullReason,
        upgradeDifferenceTotal: chargeUpgradeDifference ? diffRaw : null,
        upgradePaymentMethod: chargeUpgradeDifference
          ? upgradePaymentMethod || paymentMethod || 'efectivo'
          : null,
      })
      if (!res.success) {
        toast.error('Cambio no registrado', res.error || 'Intenta de nuevo')
        return
      }
      const diffMsg =
        res.data?.upgradeDifferenceTotal && res.data.upgradeDifferenceTotal > 0
          ? ` · +Q${res.data.upgradeDifferenceTotal.toFixed(2)}`
          : ''
      toast.success(
        'Reemplazo por garantía',
        `${res.data?.fromSerial} → ${res.data?.toSerial} · BOD-RPL${diffMsg}`
      )
      try {
        const { payload, error: pdfErr } = await getWarrantyPrintPayloadForOrder(orderId)
        if (payload && !pdfErr) {
          await printWarrantyPolicy(payload)
          toast.info(
            'Política reimpresa',
            payload.policyNumber ? `No. ${payload.policyNumber}` : 'PDF descargado'
          )
        }
      } catch {
        toast.warning(
          'Cambio guardado',
          'No se pudo reimprimir la política; usa Reimprimir en el detalle.'
        )
      }
      reset()
      router.refresh()
    })
  }

  const runRefund = () => {
    if (!refundItemId) return
    startTransition(async () => {
      const res = await refundSaleOrderItem({
        orderItemId: refundItemId,
        reason: reason.trim() || undefined,
        refundMethod: paymentMethod || undefined,
      })
      if (!res.success) {
        toast.error('Devolución no registrada', res.error || 'Intenta de nuevo')
        return
      }
      toast.success(
        'Devolución registrada',
        `Q${Number(res.data?.refundAmount || 0).toFixed(2)}`
      )
      reset()
      router.refresh()
    })
  }

  return (
    <>
      <div className="px-5 py-4 border-b border-amber-200/60 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-500/10">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 mb-1">
          Garantía y post-venta (desde el detalle de la venta)
        </p>
        <p className="text-xs text-amber-900/80 dark:text-amber-200/90 leading-relaxed">
          Cambio de serie o <strong>devolución de dinero</strong>: la serie vendida ingresa a{' '}
          <strong>Bodega de Remplazo (BOD-RPL)</strong> por reclamación. En garantía registra{' '}
          <strong>motivo</strong> y <strong>serial de entrega</strong>. No uses Nueva venta.
        </p>
      </div>

      {blocked ? (
        <div className="px-5 py-3 text-xs text-gray-500 border-b border-gray-100 dark:border-surface-800">
          Esta venta está cerrada para cambios ({orderStatus}).
        </div>
      ) : equipmentLines.length === 0 ? (
        <div className="px-5 py-3 text-xs text-rose-600 border-b border-gray-100 dark:border-surface-800">
          No hay equipos con serial en esta venta para garantía o devolución.
        </div>
      ) : (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-surface-800 bg-gray-50/80 dark:bg-surface-850/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
            Acciones por serie
          </p>
          <div className="flex flex-wrap gap-2">
            {equipmentLines.map((line) => (
              <div
                key={line.id}
                className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2"
              >
                <span className="font-mono text-xs font-bold text-emerald-600">
                  {line.serial_number || '—'}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    reset()
                    setExchangeItemId(line.id)
                    setReason(DEFAULT_CLAIM_REASON)
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-sky-700 dark:text-sky-400 hover:underline disabled:opacity-50"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Cambio garantía
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    reset()
                    setRefundItemId(line.id)
                    setReason('Devolución de dinero')
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-red-700 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                  <Banknote className="w-3 h-3" />
                  Devolver $
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(exchangeItemId || refundItemId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
              {exchangeItemId ? 'Reemplazo por garantía' : 'Devolución de dinero'}
            </h3>
            {exchangeItemId && (
              <>
                <div className="rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 px-3 py-2 text-xs space-y-1">
                  <p>
                    <span className="font-bold text-gray-500">Serie vendida (regresa a BOD-RPL):</span>{' '}
                    <span className="font-mono font-black text-gray-900 dark:text-white">
                      {exchangeLine?.serial_number || '—'}
                    </span>
                  </p>
                  <p className="text-gray-600 dark:text-surface-400">
                    Motivo de ingreso: <strong>Reclamación del Cliente</strong>
                  </p>
                </div>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500">
                    Serial entregado al cliente (reemplazo)
                  </span>
                  <input
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault()
                    }}
                    className="w-full rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-850 px-3 py-2 text-sm font-mono"
                    placeholder="Escanear serial de Remarketing..."
                    autoFocus
                  />
                </label>
                {(replacementLoading || replacementAsset || replacementLookupError || newSerial.trim().length >= 2) && (
                  <div className="rounded-lg border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-3 text-xs space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                      Precios y venta
                    </p>
                    {replacementLoading && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Consultando inventario…
                      </p>
                    )}
                    {!replacementLoading && replacementLookupError && (
                      <p className="text-rose-600 font-semibold">{replacementLookupError}</p>
                    )}
                    {!replacementLoading && replacementAsset && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md bg-white/80 dark:bg-surface-900/80 p-2 border border-gray-100 dark:border-surface-700">
                            <p className="text-[9px] font-bold uppercase text-gray-400">Vendido (esta factura)</p>
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {exchangeLine?.product_label || exchangeLine?.serial_number || '—'}
                            </p>
                            <p className="font-mono text-[10px] text-gray-500">{exchangeLine?.serial_number}</p>
                            <p className="mt-1 tabular-nums">
                              Base {money(soldBase)} · Total {money(soldTotalIva)}
                            </p>
                          </div>
                          <div className="rounded-md bg-white/80 dark:bg-surface-900/80 p-2 border border-emerald-100 dark:border-emerald-500/20">
                            <p className="text-[9px] font-bold uppercase text-emerald-700">Reemplazo (Remarketing)</p>
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {[replacementAsset.manufacturer, replacementAsset.model].filter(Boolean).join(' ') || '—'}
                            </p>
                            <p className="font-mono text-[10px] text-emerald-700">{replacementAsset.serial_number}</p>
                            <p className="mt-1 tabular-nums">
                              P. venta {money(replacementRetail)} · Total {money(replacementTotalIva)}
                            </p>
                            {replacementAsset.cost_amount > 0 && (
                              <p className="text-[10px] text-gray-500 tabular-nums">
                                Costo inv. {money(Number(replacementAsset.cost_amount))}
                              </p>
                            )}
                          </div>
                        </div>
                        {replacementAsset.specsSummary && (
                          <p className="text-[10px] text-gray-600 dark:text-surface-400">
                            {replacementAsset.specsSummary}
                          </p>
                        )}
                        <p
                          className={
                            suggestedDifference > 0
                              ? 'font-black text-amber-800 dark:text-amber-300'
                              : 'font-semibold text-emerald-700 dark:text-emerald-400'
                          }
                        >
                          {suggestedDifference > 0
                            ? `Diferencia sugerida a cobrar (con IVA): ${money(suggestedDifference)}`
                            : 'Sin diferencia de precio vs. lo facturado (mismo total con IVA).'}
                        </p>
                      </>
                    )}
                  </div>
                )}
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500">
                    Razón del cambio (obligatorio)
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-850 px-3 py-2 text-sm"
                    placeholder="Ej. Reclamación del Cliente: no enciende / pantalla..."
                  />
                </label>
                <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-3 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chargeUpgradeDifference}
                      onChange={(e) => setChargeUpgradeDifference(e.target.checked)}
                      className="h-4 w-4 rounded accent-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Cliente pagó diferencia por equipo de mayor valor
                    </span>
                  </label>
                  {chargeUpgradeDifference && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block space-y-1 sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase text-gray-500">
                          Monto adicional cobrado (Q, incluye IVA 12%)
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={upgradeDifferenceTotal}
                          onChange={(e) => setUpgradeDifferenceTotal(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm font-mono font-bold"
                          placeholder="Ej. 350.00"
                        />
                      </label>
                      <label className="block space-y-1 sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase text-gray-500">
                          Forma de pago de la diferencia
                        </span>
                        <select
                          value={upgradePaymentMethod || paymentMethod || 'efectivo'}
                          onChange={(e) => setUpgradePaymentMethod(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="visacuota">Visacuota</option>
                          <option value="transferencia">Transferencia</option>
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}
            {refundItemId && (
              <>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3 py-2 text-xs space-y-1">
                  <p>
                    <span className="font-bold text-gray-500">Serie devuelta → BOD-RPL</span>{' '}
                    <span className="font-mono font-black">
                      {equipmentLines.find((l) => l.id === refundItemId)?.serial_number || '—'}
                    </span>
                  </p>
                  <p className="text-gray-600 dark:text-surface-400">
                    Reembolso: precio de línea + IVA 12% ({refundMethodLabel(paymentMethod)}).
                  </p>
                </div>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Motivo</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-850 px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={pending}
                onClick={reset}
                className="px-4 py-2 text-xs font-bold uppercase text-gray-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  pending ||
                  (exchangeItemId
                    ? newSerial.trim().length < 2 || reason.trim().length < 8
                    : false)
                }
                onClick={exchangeItemId ? runExchange : runRefund}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black uppercase disabled:opacity-50"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
