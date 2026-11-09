'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchAssetsForSale, type AssetForSale } from '../../actions'
import { createQuotation, type QuotationLineInput } from '../actions'
import {
  QUOTATION_PAYMENT_LABELS,
  type QuotationPaymentMethod,
  type QuotationRequesterType,
} from '@/lib/ventas/quotationMeta'
import { computeQuotationIva, QUOTATION_IVA_RATE } from '@/lib/ventas/quotationIva'

/** Campos con fondo claro: texto siempre oscuro (evita heredar blanco en dark mode). */
const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 caret-gray-900'
const inputClassSm =
  'w-full rounded border border-gray-300 dark:border-surface-600 bg-white dark:bg-white px-2 py-1 text-sm text-gray-900 placeholder:text-gray-500 caret-gray-900'
const textareaClass =
  'w-full rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500'

type DraftLine = QuotationLineInput & { key: string }

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function assetLabel(a: AssetForSale): string {
  const parts = [a.manufacturer, a.model].filter(Boolean).join(' ')
  const sn = a.serial_number ? ` · S/N ${a.serial_number}` : ''
  return `${parts || a.internal_tag}${sn}`
}

function lineFromAsset(asset: AssetForSale): DraftLine {
  const desc = [asset.manufacturer, asset.model, asset.condition].filter(Boolean).join(' · ') || asset.internal_tag
  const defaultPrice = asset.sales_price != null && asset.sales_price > 0 ? asset.sales_price : 0
  return {
    key: `asset-${asset.id}-${Date.now()}`,
    asset_id: asset.id,
    description: desc,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serial_number: asset.serial_number,
    condition: asset.condition,
    asset_type: asset.asset_type,
    quantity: 1,
    unit_price: roundMoney(defaultPrice),
  }
}

function emptyManualLine(): DraftLine {
  return {
    key: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    asset_id: null,
    description: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    condition: '',
    asset_type: '',
    quantity: 1,
    unit_price: 0,
  }
}

export default function NuevaCotizacionPage() {
  const router = useRouter()
  const [clientNombre, setClientNombre] = useState('')
  const [clientApellido, setClientApellido] = useState('')
  const [clientTelefono, setClientTelefono] = useState('')
  const [clientNit, setClientNit] = useState('')
  const [clientDireccion, setClientDireccion] = useState('')
  const [clientCorreo, setClientCorreo] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [solicitanteTipo, setSolicitanteTipo] = useState<QuotationRequesterType>('cliente_final')
  const [solicitanteEmpresa, setSolicitanteEmpresa] = useState('')
  const [solicitanteContacto, setSolicitanteContacto] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<QuotationPaymentMethod | ''>('')
  const [pricesIncludeIva, setPricesIncludeIva] = useState(false)

  const [assetQuery, setAssetQuery] = useState('')
  const [assetResults, setAssetResults] = useState<AssetForSale[]>([])
  const [searchingAssets, setSearchingAssets] = useState(false)
  const assetDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitLock = useRef(false)

  const linesListedTotal = roundMoney(
    lines.reduce((sum, l) => sum + roundMoney((Number(l.unit_price) || 0) * (Number(l.quantity) || 1)), 0)
  )
  const ivaTotals = computeQuotationIva(linesListedTotal, pricesIncludeIva)

  const fetchAssets = useCallback(async (q: string) => {
    setSearchingAssets(true)
    const { data, error: err } = await searchAssetsForSale(q)
    setSearchingAssets(false)
    if (err) {
      setError(err)
      setAssetResults([])
      return
    }
    const usedAssetIds = new Set(lines.filter((l) => l.asset_id).map((l) => l.asset_id))
    setAssetResults((data || []).filter((a) => !usedAssetIds.has(a.id)))
  }, [lines])

  useEffect(() => {
    if (assetDebounce.current) clearTimeout(assetDebounce.current)
    assetDebounce.current = setTimeout(() => {
      void fetchAssets(assetQuery)
    }, 300)
    return () => {
      if (assetDebounce.current) clearTimeout(assetDebounce.current)
    }
  }, [assetQuery, fetchAssets])

  const addAssetLine = (asset: AssetForSale) => {
    setLines((prev) => [...prev, lineFromAsset(asset)])
    setAssetQuery('')
    setAssetResults([])
    setError(null)
  }

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLock.current || saving) return
    submitLock.current = true
    setError(null)
    setSaving(true)
    const items: QuotationLineInput[] = lines.map(({ key: _k, ...rest }) => rest)
    if (!paymentMethod) {
      setError('Seleccione el método de pago')
      setSaving(false)
      submitLock.current = false
      return
    }

    const result = await createQuotation({
      client: {
        nombre: clientNombre,
        apellido: clientApellido,
        telefono: clientTelefono || null,
        nit: clientNit || null,
        direccion: clientDireccion || null,
        correo: clientCorreo,
      },
      description: description || null,
      solicitante_tipo: solicitanteTipo,
      solicitante_empresa: solicitanteTipo === 'empresa' ? solicitanteEmpresa : null,
      solicitante_contacto: solicitanteTipo === 'empresa' ? solicitanteContacto : null,
      payment_method: paymentMethod,
      prices_include_iva: pricesIncludeIva,
      items,
    })
    setSaving(false)
    if (!result.success || !result.id) {
      setError(result.error || 'Error al guardar')
      submitLock.current = false
      return
    }
    router.push(`/dashboard/ventas/cotizaciones/${result.id}`)
  }

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto min-h-[calc(100dvh-4rem)]">
      <Link
        href="/dashboard/ventas/cotizaciones"
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">Nueva cotización</h1>
      <p className="text-sm text-gray-600 dark:text-surface-400 mb-4">
        Cargue los equipos y montos. Quedará en <strong>pendiente de aprobación</strong>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Datos del cliente</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                  Nombre *
                </label>
                <input
                  required
                  value={clientNombre}
                  onChange={(e) => setClientNombre(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                  Apellido *
                </label>
                <input
                  required
                  value={clientApellido}
                  onChange={(e) => setClientApellido(e.target.value)}
                  className={inputClass}
                  placeholder="Apellido"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                  Número de teléfono
                </label>
                <input
                  type="tel"
                  value={clientTelefono}
                  onChange={(e) => setClientTelefono(e.target.value)}
                  className={inputClass}
                  placeholder="Ej. 502 1234 5678"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                  NIT
                </label>
                <input
                  value={clientNit}
                  onChange={(e) => setClientNit(e.target.value)}
                  className={inputClass}
                  placeholder="CF si es consumidor final"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                  Dirección
                </label>
                <input
                  value={clientDireccion}
                  onChange={(e) => setClientDireccion(e.target.value)}
                  className={inputClass}
                  placeholder="Dirección de entrega o facturación"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                  Correo para enviar cotización *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={clientCorreo}
                  onChange={(e) => setClientCorreo(e.target.value)}
                  className={inputClass}
                  placeholder="cliente@empresa.com"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-surface-500 mt-2">
              El cliente se guarda en CRM al crear la cotización. El título se genera automáticamente (número COT-…).
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-surface-800 space-y-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-surface-200">
              ¿Quién solicitó la cotización?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSolicitanteTipo('empresa')}
                className={cn(
                  'px-3 py-2 rounded-lg border text-sm font-semibold transition-colors',
                  solicitanteTipo === 'empresa'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-300 dark:border-surface-600 text-gray-700 dark:text-surface-300'
                )}
              >
                Empresa
              </button>
              <button
                type="button"
                onClick={() => setSolicitanteTipo('cliente_final')}
                className={cn(
                  'px-3 py-2 rounded-lg border text-sm font-semibold transition-colors',
                  solicitanteTipo === 'cliente_final'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-300 dark:border-surface-600 text-gray-700 dark:text-surface-300'
                )}
              >
                Cliente final
              </button>
            </div>
            {solicitanteTipo === 'empresa' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                    Nombre de la empresa *
                  </label>
                  <input
                    required
                    value={solicitanteEmpresa}
                    onChange={(e) => setSolicitanteEmpresa(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Corporación XYZ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-surface-400 mb-1">
                    Contacto en la empresa *
                  </label>
                  <input
                    required
                    value={solicitanteContacto}
                    onChange={(e) => setSolicitanteContacto(e.target.value)}
                    className={inputClass}
                    placeholder="Nombre y cargo / área"
                  />
                </div>
              </div>
            )}
            {solicitanteTipo === 'cliente_final' && (
              <p className="text-xs text-gray-500 dark:text-surface-400">
                La cotización la solicita la persona indicada en datos del cliente.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-surface-800">
            <label className="block text-sm font-semibold text-gray-800 dark:text-surface-200 mb-2">
              Método de pago *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(QUOTATION_PAYMENT_LABELS) as QuotationPaymentMethod[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors',
                    paymentMethod === id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-gray-300 dark:border-surface-600 bg-white dark:bg-white text-gray-900'
                  )}
                >
                  {QUOTATION_PAYMENT_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Equipos y montos</h2>
          <p className="text-xs text-gray-500 dark:text-surface-400">
            Busque en Remarketing por serie, etiqueta o modelo, o agregue una fila manual.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={assetQuery}
              onChange={(e) => setAssetQuery(e.target.value)}
              className={cn(inputClass, 'pl-9')}
              placeholder="Buscar equipo en venta (serie, modelo, tag)..."
            />
          </div>
          {searchingAssets && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando equipos...
            </p>
          )}
          {assetResults.length > 0 && (
            <ul className="border border-gray-200 dark:border-surface-700 rounded-lg divide-y dark:divide-surface-700 max-h-48 overflow-y-auto">
              {assetResults.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => addAssetLine(a)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  >
                    <span className="font-medium">{assetLabel(a)}</span>
                    {a.sales_price != null && a.sales_price > 0 && (
                      <span className="text-xs text-emerald-600 ml-2">
                        Q {a.sales_price.toLocaleString('es-GT')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyManualLine()])}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
          >
            <Plus className="w-4 h-4" />
            Fila manual (equipo no en bodega)
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
            <span className="text-xs font-bold text-gray-700 dark:text-surface-300 uppercase">
              Precios en tabla:
            </span>
            <IvaModeToggle
              pricesIncludeIva={pricesIncludeIva}
              setPricesIncludeIva={setPricesIncludeIva}
            />
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-gray-500 border border-dashed rounded-lg p-4 text-center">
              Sin líneas. Busque un equipo o agregue fila manual.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs sm:text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-surface-700 text-left text-gray-500">
                    <th className="py-2 pr-2">Descripción</th>
                    <th className="py-2 pr-2">Serie</th>
                    <th className="py-2 pr-2">Marca / modelo</th>
                    <th className="py-2 pr-2 w-16">Cant.</th>
                    <th className="py-2 pr-2 w-28">
                      Precio (Q)
                      <span className="block font-normal text-[10px] text-gray-400">
                        {pricesIncludeIva ? 'con IVA incl.' : 'sin IVA (+12%)'}
                      </span>
                    </th>
                    <th className="py-2 pr-2 w-24 text-right">Subtotal</th>
                    <th className="py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const qty = Math.max(1, Number(line.quantity) || 1)
                    const unit = Math.max(0, Number(line.unit_price) || 0)
                    const sub = roundMoney(qty * unit)
                    return (
                      <tr key={line.key} className="border-b border-gray-100 dark:border-surface-800 align-top">
                        <td className="py-2 pr-2">
                          <input
                            value={line.description}
                            onChange={(e) => updateLine(line.key, { description: e.target.value })}
                            className={inputClassSm}
                            placeholder="Descripción"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={line.serial_number || ''}
                            onChange={(e) => updateLine(line.key, { serial_number: e.target.value })}
                            className={inputClassSm}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-col gap-1">
                            <input
                              value={line.manufacturer || ''}
                              onChange={(e) => updateLine(line.key, { manufacturer: e.target.value })}
                              className={inputClassSm}
                              placeholder="Marca"
                            />
                            <input
                              value={line.model || ''}
                              onChange={(e) => updateLine(line.key, { model: e.target.value })}
                              className={inputClassSm}
                              placeholder="Modelo"
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                            className={inputClassSm}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(line.key, { unit_price: Number(e.target.value) })}
                            className={inputClassSm}
                          />
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                          Q {sub.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                            aria-label="Eliminar línea"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="text-sm">
                  <tr>
                    <td colSpan={5} className="pt-3 text-right text-gray-600 dark:text-surface-400">
                      Subtotal (sin IVA)
                    </td>
                    <td className="pt-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                      Q {ivaTotals.subtotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={5} className="pt-1 text-right text-gray-600 dark:text-surface-400">
                      IVA ({Math.round(QUOTATION_IVA_RATE * 100)}%)
                    </td>
                    <td className="pt-1 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                      Q {ivaTotals.tax_amount.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={5} className="pt-2 pb-1 text-right font-bold text-gray-800 dark:text-surface-200">
                      Total cotización (con IVA)
                    </td>
                    <td className="pt-2 pb-1 text-right font-extrabold text-emerald-600 tabular-nums">
                      Q {ivaTotals.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4">
          <label className="block text-sm font-semibold text-gray-800 dark:text-surface-200 mb-1">
            Notas generales
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={textareaClass}
            placeholder="Condiciones comerciales, vigencia, etc."
          />
        </div>

        <button
          type="submit"
          disabled={saving || lines.length === 0}
          className={cn(
            'w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2',
            (saving || lines.length === 0) && 'opacity-70'
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Crear cotización
        </button>
      </form>
    </div>
  )
}

function IvaModeToggle({
  pricesIncludeIva,
  setPricesIncludeIva,
}: {
  pricesIncludeIva: boolean
  setPricesIncludeIva: (v: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setPricesIncludeIva(false)}
        className={cn(
          'px-3 py-2 rounded-lg border text-sm font-semibold',
          !pricesIncludeIva
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white dark:bg-white text-gray-900 border-gray-300'
        )}
      >
        Sin IVA
      </button>
      <button
        type="button"
        onClick={() => setPricesIncludeIva(true)}
        className={cn(
          'px-3 py-2 rounded-lg border text-sm font-semibold',
          pricesIncludeIva
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white dark:bg-white text-gray-900 border-gray-300'
        )}
      >
        Con IVA incluido
      </button>
    </div>
  )
}
