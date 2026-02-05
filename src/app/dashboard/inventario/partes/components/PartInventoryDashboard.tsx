'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Plus, Minus, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  GoodInventoryPart,
  HarvestInventoryPart,
  CatalogBrand,
  CatalogModel,
  CatalogProductType
} from '../actions'
import type { PartRequestWithDetails } from '../../solicitudes/actions'
import { PartRequestsTable } from '../../solicitudes/components/PartRequestsTable'

const tabConfig = [
  {
    key: 'good',
    label: 'Good Warehouse',
    description: 'Partes buenas listas para despacho',
  },
  {
    key: 'harvest',
    label: 'Harvesting Warehouse',
    description: 'Partes recuperadas o defectuosas en espera de clasificación',
  },
] as const

type TabKey = (typeof tabConfig)[number]['key']
type PanelKey = 'inventory' | 'requests'

interface PartInventoryDashboardProps {
  goodParts: GoodInventoryPart[]
  harvestParts: HarvestInventoryPart[]
  goodError?: string | null
  harvestError?: string | null
  catalogBrands: CatalogBrand[]
  catalogModels: CatalogModel[]
  catalogProductTypes: CatalogProductType[]
  pendingRequests?: PartRequestWithDetails[]
  requestsError?: string | null
}

const currencyFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
})

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  return currencyFormatter.format(value)
}

const deriveGoodStatus = (part: GoodInventoryPart) => {
  if (part.stock_quantity <= 0) {
    return { label: 'Sin stock', tone: 'red' as const }
  }
  if (part.stock_quantity <= (part.min_stock_level ?? 5)) {
    return { label: 'Stock bajo', tone: 'amber' as const }
  }
  return { label: 'En stock', tone: 'emerald' as const }
}

const deriveHarvestTone = (conditionSummary: string) => {
  const lowered = conditionSummary.toLowerCase()
  if (lowered.includes('defect')) return 'red' as const
  if (lowered.includes('recycled') || lowered.includes('recuper')) return 'emerald' as const
  if (lowered.includes('returned') || lowered.includes('return')) return 'amber' as const
  return 'slate' as const
}

const deriveBrandModelFromName = (name?: string | null) => {
  if (!name) return { brand: '—', model: '—' }
  const segments = name.split(/\s+/).filter(Boolean)
  if (segments.length === 0) return { brand: '—', model: '—' }
  return {
    brand: segments[0],
    model: segments.slice(1).join(' ') || '—',
  }
}

const matchCatalogBrand = (name: string | null, brands: CatalogBrand[]) => {
  if (!name || brands.length === 0) return null
  const normalized = name.toLowerCase()
  return brands.find((brand) => normalized.includes(brand.name.toLowerCase()))
}

const matchCatalogModel = (name: string | null, models: CatalogModel[], brand?: CatalogBrand | null) => {
  if (!name || models.length === 0) return null
  const normalized = name.toLowerCase()
  const checked = brand ? models.filter((model) => model.brand?.id === brand.id) : models
  return checked.find((model) => normalized.includes(model.name.toLowerCase()))
}

const parseShelfAndLevel = (location?: string | null) => {
  if (!location) return { shelf: '—', level: '—' }
  const parts = location.split('-').map((segment) => segment.trim()).filter(Boolean)
  if (parts.length === 0) return { shelf: '—', level: '—' }
  const level = parts[parts.length - 1]
  const shelf = parts.length > 1 ? parts.slice(0, -1).join('-') : parts[0]
  return { shelf: shelf || '—', level: level || '—' }
}

type AddPieceForm = {
  sku: string
  productType: string
  brand: string
  model: string
  description: string
  quantity: number
  cost: string
  price: string
  shelf: string
  level: string
  position: string
  warehouse: string
  notes: string
}

const initialAddPieceForm: AddPieceForm = {
  sku: '',
  productType: '',
  brand: '',
  model: '',
  description: '',
  quantity: 0,
  cost: '',
  price: '',
  shelf: '',
  level: '',
  position: '',
  warehouse: 'Almacén Principal',
  notes: '',
}

interface AddPieceModalProps {
  open: boolean
  onClose: () => void
  productTypes: CatalogProductType[]
  brands: CatalogBrand[]
  models: CatalogModel[]
}

function AddPieceModal({ open, onClose, productTypes, brands, models }: AddPieceModalProps) {
  const [form, setForm] = useState<AddPieceForm>(initialAddPieceForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) setForm(initialAddPieceForm)
  }, [open])

  const handleChange = (key: keyof AddPieceForm, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'brand') next.model = ''
      return next
    })
  }

  const adjustQuantity = (delta: number) => {
    setForm((prev) => ({ ...prev, quantity: Math.max(0, prev.quantity + delta) }))
  }

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      if (!form.brand) return true
      return model.brand?.name === form.brand
    })
  }, [models, form.brand])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    const payload = {
      sku: form.sku,
      productType: form.productType,
      brand: form.brand,
      model: form.model,
      description: form.description,
      quantity: form.quantity,
      cost: Number(form.cost) || null,
      price: Number(form.price) || null,
      warehouse: form.warehouse,
      shelf: form.shelf,
      level: form.level,
      position: form.position,
      notes: form.notes,
    }

    try {
      const response = await fetch('/api/parts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo crear la pieza')
      }

      router.refresh()
      onClose()
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white dark:bg-[#1a1f2e] p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
        <header className="mb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Añadir Nueva Pieza al Inventario</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            ✕
          </button>
        </header>
        <div className="max-h-[85vh] overflow-y-auto pr-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  SKU *
                </label>
                <input
                  value={form.sku}
                  onChange={(event) => handleChange('sku', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Tipo de producto *
                </label>
                <select
                  value={form.productType}
                  onChange={(event) => handleChange('productType', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="">
                    Seleccione...
                  </option>
                  {productTypes.map((type) => (
                    <option key={type.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Marca *
                </label>
                <select
                  value={form.brand}
                  onChange={(event) => handleChange('brand', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="">
                    Seleccione...
                  </option>
                  {brands.map((brand) => (
                    <option key={brand.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.name}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Modelo
                </label>
                <select
                  value={form.model}
                  onChange={(event) => handleChange('model', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="">
                    Seleccione...
                  </option>
                  {filteredModels.map((model) => (
                    <option key={model.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Descripción
                </label>
                <input
                  value={form.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Cantidad
                </label>
                <div className="grid grid-cols-[48px_1fr_48px] gap-3">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-1)}
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Minus className="h-4 w-4 mx-auto" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(event) => handleChange('quantity', Number(event.target.value))}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQuantity(1)}
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Costo unitario
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.cost}
                  onChange={(event) => handleChange('cost', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Precio de venta
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(event) => handleChange('price', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Almacén
                </label>
                <select
                  value={form.warehouse}
                  onChange={(event) => handleChange('warehouse', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Almacén Principal">Almacén Principal</option>
                  <option value="Harvesting Warehouse">Harvesting Warehouse</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Estantería
                </label>
                <input
                  value={form.shelf}
                  onChange={(event) => handleChange('shelf', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Nivel
                </label>
                <input
                  value={form.level}
                  onChange={(event) => handleChange('level', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Posición
                </label>
                <input
                  value={form.position}
                  onChange={(event) => handleChange('position', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </section>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Notas
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-100 dark:bg-red-900/10 p-4 text-sm text-red-800 dark:text-red-300 font-bold">
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <button
                type="button"
                className="rounded-2xl border border-gray-300 dark:border-gray-600 px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-indigo-600 px-8 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Añadir pieza'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface EditInventoryModalProps {
  open: boolean
  onClose: () => void
  skus: string[]
}

function EditInventoryModal({ open, onClose, skus }: EditInventoryModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white dark:bg-[#1a1f2e] p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
        <header className="mb-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inventario Registrado</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            ✕
          </button>
        </header>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 font-medium">
          Esta vista es informativa. Muestra los SKUs actualmente registrados en el sistema para referencia rápida.
        </p>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 underline underline-offset-4">SKUs en catálogo</p>
          <div className="max-h-60 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {skus.length === 0 ? (
              <p className="italic text-gray-500">No hay SKUs registrados.</p>
            ) : (
              skus.slice(0, 500).map((sku) => (
                <div key={sku} className="font-mono bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-sm">{sku}</div>
              ))
            )}
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-indigo-600 px-8 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md hover:bg-indigo-500 transition-all active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

const panelOptions: { key: PanelKey; label: string }[] = [
  { key: 'inventory', label: 'Inventario' },
  { key: 'requests', label: 'Solicitudes' },
]

export default function PartInventoryDashboard({
  goodParts,
  harvestParts,
  goodError,
  harvestError,
  catalogBrands,
  catalogModels,
  catalogProductTypes,
  pendingRequests,
  requestsError
}: PartInventoryDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('good')
  const [showAddPieceModal, setShowAddPieceModal] = useState(false)
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelKey>('inventory')

  const searchLower = searchQuery.trim().toLowerCase()
  const safePendingRequests = pendingRequests ?? []

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>()
    catalogProductTypes.forEach((type) => unique.add(type.name))
    goodParts.forEach((part) => {
      if (part.category) unique.add(part.category)
    })
    return Array.from(unique)
  }, [catalogProductTypes, goodParts])

  const filteredGoodParts = useMemo(() => {
    return goodParts.filter((part) => {
      if (categoryFilter && part.category !== categoryFilter) {
        return false
      }
      if (!searchLower) return true
      const { brand, model } = deriveBrandModelFromName(part.name)
      const haystack = [
        part.sku,
        part.name,
        part.description,
        part.location,
        brand,
        model
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(searchLower))
      return haystack
    })
  }, [goodParts, categoryFilter, searchLower])

  const filteredHarvestParts = useMemo(() => {
    if (!searchLower) return harvestParts
    return harvestParts.filter((part) => {
      const haystack = [
        part.sku,
        part.partName,
        part.conditionSummary,
        part.receivedFrom,
        part.disposition,
        part.notes
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(searchLower))
      return haystack
    })
  }, [harvestParts, searchLower])

  const goodStats = useMemo(
    () => ({
      totalItems: goodParts.length,
      totalUnits: goodParts.reduce((sum, part) => sum + part.stock_quantity, 0),
      totalValue: goodParts.reduce((sum, part) => sum + (part.unit_cost ?? 0) * part.stock_quantity, 0)
    }),
    [goodParts]
  )

  const harvestStats = useMemo(
    () => ({
      totalItems: harvestParts.length,
      totalUnits: harvestParts.reduce((sum, part) => sum + part.totalQuantity, 0)
    }),
    [harvestParts]
  )

  return (
    <>
      <section className="space-y-6 rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f2e] p-6 shadow-sm dark:shadow-none transition-colors duration-300">
        <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Inventario de Partes</p>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Catálogo y sub-bodegas</h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Good Warehouse y Harvesting Warehouse en una sola vista analítica.</p>
          </div>
          <div
            className={cn('flex flex-wrap items-center gap-3', activePanel !== 'inventory' && 'hidden')}
          >
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-5 py-2.5 text-sm font-bold text-gray-900 dark:text-white transition hover:border-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button
              type="button"
              onClick={() => setIsEditInventoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-5 py-2.5 text-sm font-bold text-gray-900 dark:text-white transition hover:border-gray-600 dark:hover:border-gray-400"
            >
              <Edit3 className="w-4 h-4" />
              Editar inventario
            </button>
            <button
              type="button"
              onClick={() => setShowAddPieceModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md hover:bg-indigo-500 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Añadir Pieza
            </button>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
          {panelOptions.map((panel) => (
            <button
              key={panel.key}
              type="button"
              onClick={() => setActivePanel(panel.key)}
              className={cn(
                'text-xs font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-2xl transition-all',
                panel.key === activePanel
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {panel.label}
            </button>
          ))}
        </div>

        {activePanel === 'inventory' ? (
          <>
            {(goodError || harvestError) && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {goodError && <p>Good Warehouse · {goodError}</p>}
                {harvestError && <p>Harvesting Warehouse · {harvestError}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-blue-100 dark:border-blue-900/20 bg-blue-50 dark:bg-blue-900/10 p-5 shadow-sm dark:shadow-none">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Good Warehouse</p>
                <p className="text-2xl font-extrabold text-blue-900 dark:text-white mt-1">{goodStats.totalItems} referencias</p>
                <p className="text-sm text-blue-800/70 dark:text-blue-400/70 font-medium">{goodStats.totalUnits.toLocaleString()} unidades disponibles</p>
                <p className="text-xs text-blue-700/50 dark:text-blue-400/50 mt-1 font-bold">Valor: {formatCurrency(goodStats.totalValue)}</p>
              </article>
              <article className="rounded-2xl border border-purple-100 dark:border-purple-900/20 bg-purple-50 dark:bg-purple-900/10 p-5 shadow-sm dark:shadow-none">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Harvesting Warehouse</p>
                <p className="text-2xl font-extrabold text-purple-900 dark:text-white mt-1">{harvestStats.totalItems} referencias</p>
                <p className="text-sm text-purple-800/70 dark:text-purple-400/70 font-medium">{harvestStats.totalUnits.toLocaleString()} piezas recuperadas</p>
                <p className="text-xs text-purple-700/50 dark:text-purple-400/50 mt-1 font-bold">En espera de clasificación</p>
              </article>
              <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 shadow-sm dark:shadow-none">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-400">Vista Seleccionada</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                  {activeTab === 'good' ? filteredGoodParts.length : filteredHarvestParts.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">resultados filtrados</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                  {tabConfig.find((tab) => tab.key === activeTab)?.description}
                </p>
              </article>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por SKU, marca o descripción..."
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-12 py-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Todas las categorías</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              {tabConfig.map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'px-5 py-2.5 rounded-2xl text-[13px] font-bold uppercase tracking-wider border transition-all',
                      isActive
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600'
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {activeTab === 'good' ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f2e] shadow-sm overflow-hidden transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0f1419] text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-5 py-4 text-left">SKU</th>
                        <th className="px-5 py-4 text-left">Marca</th>
                        <th className="px-5 py-4 text-left">Modelo</th>
                        <th className="px-5 py-4 text-left">Descripción</th>
                        <th className="px-5 py-4 text-right">Cantidad</th>
                        <th className="px-5 py-4 text-right">Costo</th>
                        <th className="px-5 py-4 text-right">Precio</th>
                        <th className="px-5 py-4 text-left">Estado</th>
                        <th className="px-5 py-4 text-left">Ubicación</th>
                        <th className="px-5 py-4 text-left">Bodega</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredGoodParts.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-6 text-center text-surface-400">
                            No se encontraron partes.
                          </td>
                        </tr>
                      ) : (
                        filteredGoodParts.map((part) => {
                          const status = deriveGoodStatus(part)
                          const shelfData = parseShelfAndLevel(part.location)
                          const catalogBrand = matchCatalogBrand(part.name, catalogBrands)
                          const catalogModel = matchCatalogModel(part.name, catalogModels, catalogBrand || null)
                          const fallback = deriveBrandModelFromName(part.name)
                          const brand = catalogBrand?.name || fallback.brand
                          const model = catalogModel?.name || fallback.model
                          return (
                            <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-[#242936] transition-colors">
                              <td className="px-5 py-4 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">{part.sku}</td>
                              <td className="px-5 py-4 text-gray-900 dark:text-gray-300 font-bold">{brand}</td>
                              <td className="px-5 py-4 text-gray-900 dark:text-gray-300 font-bold">{model}</td>
                              <td className="px-5 py-4 text-gray-600 dark:text-gray-400 font-medium">{part.description ?? part.name}</td>
                              <td className="px-5 py-4 text-right text-gray-900 dark:text-white font-extrabold">{part.stock_quantity}</td>
                              <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-400 font-medium">{formatCurrency(part.unit_cost)}</td>
                              <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-400 font-medium">{formatCurrency(part.selling_price)}</td>
                              <td className="px-5 py-4">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold border uppercase tracking-wider',
                                    status.tone === 'emerald' && 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                                    status.tone === 'amber' && 'border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300',
                                    status.tone === 'red' && 'border-red-300 dark:border-red-500/40 bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-300'
                                  )}
                                >
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col text-xs font-bold text-indigo-700 dark:text-indigo-400">
                                  <span>Est: {shelfData.shelf}</span>
                                  <span>Niv: {shelfData.level}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[11px] text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">
                                GOOD WAREHOUSE<br />
                                {part.location ?? 'SN'}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f2e] shadow-sm overflow-hidden transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0f1419] text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-5 py-4 text-left">SKU</th>
                        <th className="px-5 py-4 text-left">Marca</th>
                        <th className="px-5 py-4 text-left">Modelo</th>
                        <th className="px-5 py-4 text-left">Descripción</th>
                        <th className="px-5 py-4 text-right">Cantidad</th>
                        <th className="px-5 py-4 text-right">Costo</th>
                        <th className="px-5 py-4 text-right">Precio</th>
                        <th className="px-5 py-4 text-left">Estado</th>
                        <th className="px-5 py-4 text-left">Localización</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredHarvestParts.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-6 text-center text-surface-400">
                            No se encontraron piezas recuperadas.
                          </td>
                        </tr>
                      ) : (
                        filteredHarvestParts.map((part) => {
                          const tone = deriveHarvestTone(part.conditionSummary)
                          const brand = part.partName?.split(' ')[0] ?? 'Recuperada'
                          const model = part.partName?.split(' ').slice(1).join(' ') || '—'
                          const locationLabel = part.receivedFrom || part.disposition || 'Harvesting Warehouse'
                          return (
                            <tr key={part.sku} className="hover:bg-gray-50 dark:hover:bg-[#242936] transition-colors">
                              <td className="px-5 py-4 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">{part.sku}</td>
                              <td className="px-5 py-4 text-gray-900 dark:text-gray-300 font-bold">{brand}</td>
                              <td className="px-5 py-4 text-gray-900 dark:text-gray-300 font-bold">{model}</td>
                              <td className="px-5 py-4 text-gray-600 dark:text-gray-400 font-medium">{part.partName ?? 'Pieza registrada'}</td>
                              <td className="px-5 py-4 text-right text-gray-900 dark:text-white font-extrabold">{part.totalQuantity}</td>
                              <td className="px-5 py-4 text-right text-gray-500 dark:text-gray-400 font-medium">—</td>
                              <td className="px-5 py-4 text-right text-gray-500 dark:text-gray-400 font-medium">—</td>
                              <td className="px-5 py-4">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold border uppercase tracking-wider',
                                    tone === 'emerald' && 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                                    tone === 'amber' && 'border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300',
                                    tone === 'red' && 'border-red-300 dark:border-red-500/40 bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-300',
                                    tone === 'slate' && 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                  )}
                                >
                                  {part.conditionSummary}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-[11px] text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">
                                Harvesting Warehouse<br />
                                {locationLabel}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Solicitudes de Partes</p>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">Despacho a Taller</h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Gestiona las solicitudes internas y despacha piezas activas.</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Pendientes</span>
                <span className="rounded-2xl bg-amber-100 dark:bg-amber-900/20 px-5 py-2 text-amber-800 dark:text-amber-400 text-lg font-black border border-amber-200 dark:border-amber-800/40">
                  {safePendingRequests.length}
                </span>
              </div>
            </header>
            {requestsError && (
              <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-100 dark:bg-red-900/10 p-4 text-sm text-red-800 dark:text-red-300 font-bold">
                ⚠️ {requestsError}
              </div>
            )}
            <PartRequestsTable requests={safePendingRequests} />
          </div>
        )}
      </section>
      <AddPieceModal
        open={showAddPieceModal}
        onClose={() => setShowAddPieceModal(false)}
        productTypes={catalogProductTypes}
        brands={catalogBrands}
        models={catalogModels}
      />
      <EditInventoryModal
        open={isEditInventoryOpen}
        onClose={() => setIsEditInventoryOpen(false)}
        skus={goodParts.map((part) => part.sku)}
      />
    </>
  )
}
