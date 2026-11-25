'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  updateQuotation,
  type QuotationLineInput,
  type SalesQuotation,
} from '../../actions'
import {
  QUOTATION_PAYMENT_LABELS,
  type QuotationPaymentMethod,
  type QuotationRequesterType,
} from '@/lib/ventas/quotationMeta'
import { computeQuotationIva, QUOTATION_IVA_RATE } from '@/lib/ventas/quotationIva'
import { DEFAULT_WARRANTY_DAYS } from '@/lib/ventas/warrantyOptions'
import WarrantyDaysSelect from '../../components/WarrantyDaysSelect'

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

function splitClientName(commercial?: string | null, legal?: string | null) {
  const full = (commercial || '').trim()
  if (!full) return { nombre: '', apellido: legal?.trim() || '' }
  const parts = full.split(/\s+/)
  if (parts.length === 1) return { nombre: parts[0], apellido: legal?.trim() || '' }
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') }
}

function lineDetailFromStored(item: NonNullable<SalesQuotation['items']>[number]): string {
  const marca = item.manufacturer?.trim() || ''
  const modelo = item.model?.trim() || ''
  const composed = [marca, modelo].filter(Boolean).join(' — ')
  const raw = item.description.trim()
  if (!raw || raw === composed) return ''
  return raw
}

function draftFromItem(item: NonNullable<SalesQuotation['items']>[number]): DraftLine {
  return {
    key: item.id,
    asset_id: item.asset_id,
    description: lineDetailFromStored(item),
    manufacturer: item.manufacturer,
    model: item.model,
    serial_number: item.serial_number,
    condition: item.condition,
    asset_type: item.asset_type,
    quantity: item.quantity,
    unit_price: Number(item.unit_price) || 0,
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

export default function EditQuotationClient({ quotation }: { quotation: SalesQuotation }) {
  const router = useRouter()
  const c = quotation.customer
  const nameParts = splitClientName(c?.commercial_name, c?.legal_name)

  const [clientNombre, setClientNombre] = useState(nameParts.nombre)
  const [clientApellido, setClientApellido] = useState(nameParts.apellido)
  const [clientTelefono, setClientTelefono] = useState(c?.phone || '')
  const [clientNit, setClientNit] = useState(c?.tax_id_nit || '')
  const [clientDireccion, setClientDireccion] = useState(c?.address || '')
  const [clientCorreo, setClientCorreo] = useState(
    quotation.recipient_email || c?.email || ''
  )
  const [notes, setNotes] = useState(quotation.description || '')
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (quotation.items ?? []).map(draftFromItem)
  )
  const [solicitanteTipo, setSolicitanteTipo] = useState<QuotationRequesterType>(
    quotation.solicitante_tipo === 'empresa' ? 'empresa' : 'cliente_final'
  )
  const [solicitanteEmpresa, setSolicitanteEmpresa] = useState(quotation.solicitante_empresa || '')
  const [solicitanteContacto, setSolicitanteContacto] = useState(
    quotation.solicitante_contacto || ''
  )
  const [paymentMethod, setPaymentMethod] = useState<QuotationPaymentMethod | ''>(
    quotation.payment_method || ''
  )
  const [pricesIncludeIva, setPricesIncludeIva] = useState(quotation.prices_include_iva ?? false)
  const [warrantyDays, setWarrantyDays] = useState(quotation.warranty_days ?? DEFAULT_WARRANTY_DAYS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linesListedTotal = roundMoney(
    lines.reduce((sum, l) => sum + roundMoney((Number(l.unit_price) || 0) * (Number(l.quantity) || 1)), 0)
  )
  const ivaTotals = computeQuotationIva(linesListedTotal, pricesIncludeIva)

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    if (!paymentMethod) {
      setError('Seleccione el método de pago')
      setSaving(false)
      return
    }

    const items: QuotationLineInput[] = lines.map(({ key: _k, ...rest }) => rest)
    const result = await updateQuotation(quotation.id, {
      client: {
        nombre: clientNombre,
        apellido: clientApellido,
        telefono: clientTelefono || null,
        nit: clientNit || null,
        direccion: clientDireccion || null,
        correo: clientCorreo,
      },
      description: notes || null,
      solicitante_tipo: solicitanteTipo,
      solicitante_empresa: solicitanteTipo === 'empresa' ? solicitanteEmpresa : null,
      solicitante_contacto: solicitanteTipo === 'empresa' ? solicitanteContacto : null,
      payment_method: paymentMethod,
      prices_include_iva: pricesIncludeIva,
      warranty_days: warrantyDays,
      items,
    })

    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Error al guardar')
      return
    }
    router.push(`/dashboard/ventas/cotizaciones/${quotation.id}`)
    router.refresh()
  }

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto min-h-[calc(100dvh-4rem)]">
      <Link
        href={`/dashboard/ventas/cotizaciones/${quotation.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al detalle
      </Link>

      <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">
        Editar cotización
      </h1>
      <p className="text-sm text-gray-600 dark:text-surface-400 mb-4">
        {quotation.quote_number} · solo mientras está{' '}
        <strong>pendiente de aprobación</strong>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Datos del cliente</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              required
              value={clientNombre}
              onChange={(e) => setClientNombre(e.target.value)}
              className={inputClass}
              placeholder="Nombre *"
            />
            <input
              required
              value={clientApellido}
              onChange={(e) => setClientApellido(e.target.value)}
              className={inputClass}
              placeholder="Apellido *"
            />
            <input
              required
              type="tel"
              value={clientTelefono}
              onChange={(e) => setClientTelefono(e.target.value)}
              className={inputClass}
              placeholder="Teléfono *"
            />
            <input
              value={clientNit}
              onChange={(e) => setClientNit(e.target.value)}
              className={inputClass}
              placeholder="NIT"
            />
            <input
              value={clientDireccion}
              onChange={(e) => setClientDireccion(e.target.value)}
              className={cn(inputClass, 'sm:col-span-2')}
              placeholder="Dirección"
            />
            <input
              type="email"
              value={clientCorreo}
              onChange={(e) => setClientCorreo(e.target.value)}
              className={cn(inputClass, 'sm:col-span-2')}
              placeholder="Correo"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Equipos y montos</h2>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyManualLine()])}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"
          >
            <Plus className="w-4 h-4" />
            Agregar línea
          </button>

          {lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-2">Marca</th>
                    <th className="py-2 pr-2">Modelo</th>
                    <th className="py-2 pr-2">Detalle</th>
                    <th className="py-2 pr-2 w-14">Cant.</th>
                    <th className="py-2 pr-2 w-24">Precio (Q)</th>
                    <th className="py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-2">
                        <input
                          value={line.manufacturer || ''}
                          onChange={(e) => updateLine(line.key, { manufacturer: e.target.value })}
                          className={inputClassSm}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={line.model || ''}
                          onChange={(e) => updateLine(line.key, { model: e.target.value })}
                          className={inputClassSm}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(line.key, { description: e.target.value })}
                          className={inputClassSm}
                          placeholder="Notas"
                        />
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
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                          className="p-1 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="pt-3 text-right text-gray-500">
                      Total con IVA
                    </td>
                    <td colSpan={2} className="pt-3 font-bold text-emerald-600 tabular-nums">
                      Q {ivaTotals.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-3">
          <label className="block text-sm font-semibold">Método de pago *</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUOTATION_PAYMENT_LABELS) as QuotationPaymentMethod[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPaymentMethod(id)}
                className={cn(
                  'px-3 py-2 rounded-lg border text-sm font-semibold',
                  paymentMethod === id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-gray-300 text-gray-900'
                )}
              >
                {QUOTATION_PAYMENT_LABELS[id]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold uppercase">Precios:</span>
            <button
              type="button"
              onClick={() => setPricesIncludeIva(false)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-sm font-semibold',
                !pricesIncludeIva ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900'
              )}
            >
              Sin IVA
            </button>
            <button
              type="button"
              onClick={() => setPricesIncludeIva(true)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-sm font-semibold',
                pricesIncludeIva ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900'
              )}
            >
              Con IVA ({Math.round(QUOTATION_IVA_RATE * 100)}%)
            </button>
          </div>

          <WarrantyDaysSelect value={warrantyDays} onChange={setWarrantyDays} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={textareaClass}
            placeholder="Notas generales"
          />
        </div>

        <button
          type="submit"
          disabled={saving || lines.length === 0}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Guardar cambios
        </button>
      </form>
    </div>
  )
}