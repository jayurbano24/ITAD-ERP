'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  ChevronRight,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  User,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  RECEPTION_SERVICE_OPTIONS,
  type ReceptionServiceKind,
} from '@/lib/tickets/receptionService'

type ReceptionClient = {
  id: string
  commercial_name: string
  tax_id_nit: string
  account_class?: string | null
}

type CatalogRow = {
  id: string
  name: string
  brand_id?: string | null
}

type ManualLine = {
  id: string
  brand_id: string
  model_id: string
  product_type_id: string
  quantity: number
}

type Props = {
  clients: ReceptionClient[]
  loadingClients: boolean
  onCreated: (readableId: string, options?: { focusLineKey?: string }) => void
  onServiceKindChange?: (kind: ReceptionServiceKind) => void
  onRefreshClients?: () => Promise<void>
  compact?: boolean
}

const kindIcon: Record<ReceptionServiceKind, typeof Building2> = {
  itad: Building2,
  post_venta: Wrench,
  cliente_final: User,
}

export default function ReceptionQuickCreateTicket({
  clients,
  loadingClients,
  onCreated,
  onServiceKindChange,
  onRefreshClients,
  compact,
}: Props) {
  const [serviceKind, setServiceKind] = useState<ReceptionServiceKind>('itad')
  const [clientId, setClientId] = useState('')
  const [expectedUnits, setExpectedUnits] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [brands, setBrands] = useState<CatalogRow[]>([])
  const [models, setModels] = useState<CatalogRow[]>([])
  const [productTypes, setProductTypes] = useState<CatalogRow[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

  const [draft, setDraft] = useState({
    brand_id: '',
    model_id: '',
    product_type_id: '',
    quantity: 1,
  })
  const [manualLines, setManualLines] = useState<ManualLine[]>([])
  const [editingDraftLineId, setEditingDraftLineId] = useState<string | null>(null)
  const [draftLineQty, setDraftLineQty] = useState('1')
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientNit, setNewClientNit] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [savingClient, setSavingClient] = useState(false)
  const [clientFormError, setClientFormError] = useState<string | null>(null)

  const loadCatalogs = useCallback(async () => {
    setLoadingCatalogs(true)
    try {
      const [bRes, mRes, tRes] = await Promise.all([
        fetch('/api/maestros?tipo=marca'),
        fetch('/api/maestros?tipo=modelo'),
        fetch('/api/maestros?tipo=tipo_producto'),
      ])
      const [bData, mData, tData] = await Promise.all([
        bRes.json(),
        mRes.json(),
        tRes.json(),
      ])
      setBrands(bData.items || [])
      setModels(mData.items || [])
      setProductTypes(tData.items || [])
    } catch (e) {
      console.error('Error loading catalogs for reception:', e)
    } finally {
      setLoadingCatalogs(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalogs()
  }, [loadCatalogs])

  useEffect(() => {
    onServiceKindChange?.(serviceKind)
  }, [serviceKind, onServiceKindChange])

  const filteredClients = useMemo(() => {
    if (serviceKind === 'cliente_final') {
      const finals = clients.filter((c) => c.account_class === 'cliente_final')
      return finals.length > 0 ? finals : clients
    }
    if (serviceKind === 'itad' || serviceKind === 'post_venta') {
      const empresas = clients.filter(
        (c) => !c.account_class || c.account_class === 'empresa'
      )
      return empresas.length > 0 ? empresas : clients
    }
    return clients
  }, [clients, serviceKind])

  const filteredModels = useMemo(() => {
    if (!draft.brand_id) return []
    return models.filter((m) => m.brand_id === draft.brand_id)
  }, [models, draft.brand_id])

  const unitsFromLines = useMemo(
    () => manualLines.reduce((sum, line) => sum + line.quantity, 0),
    [manualLines]
  )

  useEffect(() => {
    if (clientId && !filteredClients.some((c) => c.id === clientId)) {
      setClientId('')
    }
  }, [filteredClients, clientId])

  useEffect(() => {
    if (serviceKind !== 'post_venta') {
      setManualLines([])
      setDraft({
        brand_id: '',
        model_id: '',
        product_type_id: '',
        quantity: 1,
      })
    }
  }, [serviceKind])

  useEffect(() => {
    if (serviceKind === 'post_venta' && unitsFromLines > 0) {
      setExpectedUnits(String(unitsFromLines))
    }
  }, [serviceKind, unitsFromLines])

  const lineKey = (line: Pick<ManualLine, 'brand_id' | 'model_id' | 'product_type_id'>) =>
    [line.brand_id, line.model_id, line.product_type_id].join('|').toLowerCase()

  const canAddLine =
    Boolean(draft.brand_id && draft.model_id && draft.product_type_id && draft.quantity >= 1) &&
    !loadingCatalogs

  const addLine = () => {
    if (!canAddLine) {
      setError('Seleccione tipo, marca, modelo y cantidad')
      return
    }
    setError(null)
    const key = lineKey(draft)
    setManualLines((prev) => {
      const existing = prev.find((l) => lineKey(l) === key)
      if (existing) {
        return prev.map((l) =>
          l.id === existing.id ? { ...l, quantity: l.quantity + draft.quantity } : l
        )
      }
      return [
        ...prev,
        {
          id: `line-${Date.now()}`,
          brand_id: draft.brand_id,
          model_id: draft.model_id,
          product_type_id: draft.product_type_id,
          quantity: draft.quantity,
        },
      ]
    })
    setDraft((d) => ({
      ...d,
      quantity: 1,
    }))
  }

  const removeLine = (id: string) => {
    setManualLines((prev) => prev.filter((l) => l.id !== id))
    if (editingDraftLineId === id) setEditingDraftLineId(null)
  }

  const saveDraftLineQuantity = (lineId: string) => {
    const qty = Math.floor(Number(draftLineQty))
    if (!Number.isFinite(qty) || qty < 1) {
      setError('Cantidad cerrada: entero mayor o igual a 1')
      return
    }
    setManualLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, quantity: qty } : l))
    )
    setEditingDraftLineId(null)
    setError(null)
  }

  const handleCreate = async (focusLineKey?: string) => {
    setError(null)
    if (!clientId) {
      setError('Seleccione un cliente')
      return
    }
    if (serviceKind === 'post_venta' && manualLines.length === 0) {
      setError('Agregue al menos un equipo (marca, modelo y tipo de producto)')
      return
    }

    const items =
      serviceKind === 'post_venta'
        ? manualLines.map((line) => {
            const brand = brands.find((b) => b.id === line.brand_id)
            const model = models.find((m) => m.id === line.model_id)
            const ptype = productTypes.find((t) => t.id === line.product_type_id)
            return {
              brandId: line.brand_id,
              modelId: line.model_id,
              productTypeId: line.product_type_id,
              quantity: line.quantity,
              brand: brand?.name,
              model: model?.name,
              productType: ptype?.name,
            }
          })
        : undefined

    setBusy(true)
    try {
      const res = await fetch('/api/recepcion/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          serviceKind,
          expectedUnits:
            serviceKind === 'post_venta'
              ? unitsFromLines || (expectedUnits ? Number(expectedUnits) : 0)
              : expectedUnits
                ? Number(expectedUnits)
                : 0,
          items,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'No se pudo crear el ticket')
        return
      }
      const readableId = data.ticket?.readableId as string | undefined
      if (!readableId) {
        setError('Ticket creado sin identificador')
        return
      }
      setExpectedUnits('')
      setManualLines([])
      onCreated(readableId, focusLineKey ? { focusLineKey } : undefined)
    } catch {
      setError('Error de red al crear el ticket')
    } finally {
      setBusy(false)
    }
  }

  const defaultAccountClass = (): 'empresa' | 'cliente_final' =>
    serviceKind === 'cliente_final' ? 'cliente_final' : 'empresa'

  const handleCreateClient = async () => {
    setClientFormError(null)
    setSavingClient(true)
    try {
      const res = await fetch('/api/recepcion/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commercial_name: newClientName,
          tax_id_nit: newClientNit || 'CF',
          phone: newClientPhone || null,
          email: newClientEmail || null,
          account_class: defaultAccountClass(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setClientFormError((data.error as string) || 'No se pudo crear el cliente')
        return
      }
      const created = data.client as ReceptionClient | undefined
      if (created?.id) {
        setClientId(created.id)
      }
      await onRefreshClients?.()
      setClientModalOpen(false)
      setNewClientName('')
      setNewClientNit('')
      setNewClientPhone('')
      setNewClientEmail('')
    } catch {
      setClientFormError('Error de red al crear cliente')
    } finally {
      setSavingClient(false)
    }
  }

  const clientSelector = (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <div className="flex-1 space-y-1.5 min-w-0">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Cliente</label>
        <select
          value={clientId}
          disabled={loadingClients || busy}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 text-sm font-semibold disabled:opacity-50"
        >
          <option value="">{loadingClients ? 'Cargando clientes…' : 'Seleccionar cliente'}</option>
          {filteredClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.commercial_name} · {c.tax_id_nit}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={busy || savingClient}
        onClick={() => {
          setClientFormError(null)
          setClientModalOpen(true)
        }}
        className="shrink-0 h-[50px] px-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        Agregar cliente
      </button>
    </div>
  )

  if (compact) {
    return null
  }

  return (
    <div className="rounded-[2rem] border-2 border-purple-100 dark:border-purple-500/20 bg-white dark:bg-surface-950 p-6 shadow-inner space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-purple-600 dark:text-purple-400">
          {serviceKind === 'post_venta' ? 'Recepción Post-Venta' : 'Nuevo ticket en recepción'}
        </p>
        <p className="text-xs text-gray-500 dark:text-surface-500">
          {serviceKind === 'post_venta'
            ? 'Proceso independiente: defina equipos, cree el ticket y pistolee series.'
            : 'Elija el tipo de servicio y el cliente; se cargará automáticamente.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {RECEPTION_SERVICE_OPTIONS.map((opt) => {
          const Icon = kindIcon[opt.kind]
          const active = serviceKind === opt.kind
          return (
            <button
              key={opt.kind}
              type="button"
              onClick={() => setServiceKind(opt.kind)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all',
                active
                  ? 'border-purple-500 bg-purple-500/10 shadow-md shadow-purple-500/10'
                  : 'border-gray-100 dark:border-surface-800 hover:border-purple-300/60'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-purple-600' : 'text-gray-400')} />
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-[10px] text-gray-500 dark:text-surface-500">{opt.titlePrefix}</p>
              </div>
            </button>
          )
        })}
      </div>

      {serviceKind === 'post_venta' ? (
        <div className="space-y-1.5">
          {clientSelector}
          <p className="text-[10px] text-gray-500 dark:text-surface-500 px-1">
            Agregue equipos y pulse el número en <span className="font-black text-cyan-600">Cant.</span> para
            registrar el ticket y pistolear series.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-end">
          <div className="md:col-span-1">{clientSelector}</div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Unidades</label>
            <input
              type="number"
              min={0}
              value={expectedUnits}
              onChange={(e) => setExpectedUnits(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-3 rounded-2xl border-2 border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 text-sm font-mono"
            />
          </div>
          <button
            type="button"
            disabled={busy || loadingClients}
            onClick={() => void handleCreate()}
            className="h-[50px] px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Crear y cargar
          </button>
        </div>
      )}

      {serviceKind === 'post_venta' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(360px,100%)] gap-4 items-start">
          {/* Listado preliminar (sin series) */}
          <div className="order-2 lg:order-1 rounded-[1.75rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-lg shadow-gray-200/30 dark:shadow-black/20 min-h-[320px] flex flex-col">
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 dark:border-surface-800">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
                  2
                </span>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-700 dark:text-surface-200">
                  Listado de equipos
                </p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                {manualLines.length} ítem(s) · {unitsFromLines} u.
              </span>
            </div>
            {manualLines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <Package className="w-12 h-12 text-gray-200 dark:text-surface-700 mb-3" strokeWidth={1.25} />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  El manifiesto está vacío
                </p>
                <p className="text-[10px] text-gray-400 dark:text-surface-500 mt-2 max-w-xs">
                  Use definición de equipos y pulse Agregar para cada línea y cantidad.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <tr>
                      <th className="pb-2 pr-2">Tipos</th>
                      <th className="pb-2 pr-2">Marca</th>
                      <th className="pb-2 pr-2">Modelo</th>
                      <th className="pb-2 text-center">Cant.</th>
                      <th className="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {manualLines.map((line) => {
                      const brand = brands.find((b) => b.id === line.brand_id)
                      const model = models.find((m) => m.id === line.model_id)
                      const ptype = productTypes.find((t) => t.id === line.product_type_id)
                      return (
                        <tr key={line.id} className="border-t border-gray-50 dark:border-surface-800">
                          <td className="py-2.5 pr-2 font-bold text-gray-800 dark:text-white">{ptype?.name}</td>
                          <td className="py-2.5 pr-2">{brand?.name}</td>
                          <td className="py-2.5 pr-2">{model?.name}</td>
                          <td className="py-2.5 text-center">
                            {editingDraftLineId === line.id ? (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  inputMode="numeric"
                                  value={draftLineQty}
                                  onChange={(e) =>
                                    setDraftLineQty(e.target.value.replace(/[^\d]/g, ''))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveDraftLineQuantity(line.id)
                                    if (e.key === 'Escape') setEditingDraftLineId(null)
                                  }}
                                  className="w-14 px-1 py-1 rounded-lg border border-cyan-500/40 font-mono font-black text-center text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveDraftLineQuantity(line.id)}
                                  className="p-1 rounded-lg bg-emerald-600 text-white"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDraftLineId(null)}
                                  className="p-1 rounded-lg border border-gray-200 text-gray-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 justify-center">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleCreate(lineKey(line))}
                                  className="min-w-[2.5rem] px-2 py-1 rounded-lg font-mono font-black text-base text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 ring-1 ring-cyan-500/30 disabled:opacity-50"
                                  title="Abrir pistoleo de series"
                                >
                                  {busy ? (
                                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                  ) : (
                                    line.quantity
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditingDraftLineId(line.id)
                                    setDraftLineQty(String(line.quantity))
                                  }}
                                  className="p-1 rounded-lg text-gray-400 hover:text-cyan-700"
                                  title="Editar cantidad"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-500"
                              aria-label="Quitar línea"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Definición — estilo manifiesto logística */}
          <div className="order-1 lg:order-2 rounded-[1.75rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-xl shadow-gray-200/40 dark:shadow-black/30 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white dark:bg-white dark:text-gray-900">
                  1
                </span>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 truncate">
                  Definición de equipos
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" aria-hidden />
            </div>

            {loadingCatalogs ? (
              <p className="text-xs text-gray-500 flex items-center gap-2 py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando catálogos…
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Tipos
                    </label>
                    <select
                      value={draft.product_type_id}
                      onChange={(e) => setDraft({ ...draft, product_type_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-950 text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar…</option>
                      {productTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Marca</label>
                    <select
                      value={draft.brand_id}
                      onChange={(e) =>
                        setDraft({ ...draft, brand_id: e.target.value, model_id: '' })
                      }
                      disabled={!draft.product_type_id}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-950 text-sm font-semibold disabled:opacity-50"
                    >
                      <option value="">
                        {draft.product_type_id ? 'Seleccionar marca…' : 'Tipo primero'}
                      </option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Modelo</label>
                    <select
                      value={draft.model_id}
                      disabled={!draft.brand_id}
                      onChange={(e) => setDraft({ ...draft, model_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-950 text-sm font-semibold disabled:opacity-50"
                    >
                      <option value="">{draft.brand_id ? 'Seleccionar modelo…' : 'Marca primero'}</option>
                      {filteredModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[9px] text-gray-400 leading-snug">
                  Las series se capturan después en recepción (pitoleo). Aquí solo define cantidades por
                  combinación.
                </p>

                <div className="flex gap-2 items-stretch pt-1">
                  <div className="space-y-1 w-[88px] shrink-0">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Cant.</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.quantity}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-full h-[46px] px-2 py-2 rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm font-mono font-black text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addLine}
                    disabled={!canAddLine}
                    className="flex-1 mt-[18px] h-[46px] rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-xl">{error}</p>
      ) : null}

      {clientModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-surface-800 bg-emerald-600 px-4 py-3 text-white">
              <p className="text-sm font-black uppercase tracking-wide">Agregar cliente</p>
              <button
                type="button"
                onClick={() => setClientModalOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/20"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">
                  Nombre o razón social
                </label>
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-950 px-3 py-2.5 text-sm font-semibold"
                  placeholder="Ej. Empresa SA"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">NIT</label>
                <input
                  value={newClientNit}
                  onChange={(e) => setNewClientNit(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-950 px-3 py-2.5 text-sm font-semibold"
                  placeholder="CF si no aplica"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Teléfono</label>
                  <input
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-950 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Correo</label>
                  <input
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-950 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
              <p className="text-[9px] text-gray-400">
                Clase de cuenta:{' '}
                <span className="font-bold uppercase">
                  {defaultAccountClass() === 'cliente_final' ? 'Cliente final' : 'Empresa'}
                </span>{' '}
                (según tipo de recepción)
              </p>
              {clientFormError ? (
                <p className="text-xs font-bold text-rose-600">{clientFormError}</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setClientModalOpen(false)}
                  className="rounded-xl border border-gray-200 dark:border-surface-700 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingClient || !newClientName.trim()}
                  onClick={() => void handleCreateClient()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {savingClient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Guardar cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
