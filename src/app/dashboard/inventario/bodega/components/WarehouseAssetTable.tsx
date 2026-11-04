'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Package, Printer, Warehouse, X, Truck, Trash2, AlertTriangle, Download, FileText, ShieldCheck, Settings, Check, LogOut, CheckSquare, CircleDollarSign, FileSpreadsheet, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { FormLabel } from '@/components/ui/FormLabel'
import ProductLabelModal from './ProductLabelModal'
import BatchDetailModal from './BatchDetailModal'
import ExcelColumnFilter from './ExcelColumnFilter'
import MoveItemsModal from '@/components/MoveItemsModal'
import DestructionModal from '@/components/DestructionModal'
import DestructionDispatchModal from './DestructionDispatchModal'
import { useToast } from '@/context/ToastContext'

type WorkshopClassifications = {
  rec?: string
  f?: string
  c?: string
  r2Applicability?: string
  dataSanitization?: string
}
type HardwareSpecs = {
  processor?: string
  ram_capacity?: string
  ram_type?: string
  disk_capacity?: string
  disk_type?: string
  keyboard_type?: string
  keyboard_version?: string
  bios_version?: string
  accessories?: any[]
}

const AVAILABLE_COLUMNS = [
  { id: 'serial', label: 'Serie / IMEI', fixed: true },
  { id: 'bodega', label: 'Bodega' },
  { id: 'module', label: 'Módulo / Estado' },
  { id: 'project', label: 'Project #' },
  { id: 'manufacturer', label: 'Marca' },
  { id: 'model', label: 'Modelo' },
  { id: 'condition', label: 'Condición' },
  { id: 'asset_type', label: 'Tipo' },
  { id: 'color', label: 'Color' },
  { id: 'qc_out', label: 'QC-OUT' },
  { id: 'rec_in', label: 'R2 / Sanit.' },
  { id: 'specs', label: 'Especificaciones' },
  { id: 'location', label: 'Ubicación' },
  { id: 'cost', label: 'Costo compra' },
  { id: 'price', label: 'Precio base (venta)' },
  { id: 'wipe', label: 'Borrado' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'batch', label: 'Lote (ORD)' },
  { id: 'received', label: 'Recibido' },
  { id: 'transfer', label: 'Traslado' },
  { id: 'status', label: 'Estatus' },
  { id: 'actions', label: 'Acciones', fixed: true }
]

function formatConditionLabel(grade: string | null | undefined): string {
  if (!grade) return ''
  if (grade === 'Scrap') return 'Grade D / Scrap'
  return grade
}

function conditionBadgeClass(grade: string | null | undefined): string {
  switch (grade) {
    case 'Grade A':
      return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
    case 'Grade B':
      return 'border-sky-500/40 bg-sky-500/15 text-sky-300'
    case 'Grade C':
      return 'border-amber-500/40 bg-amber-500/15 text-amber-300'
    case 'Scrap':
      return 'border-rose-500/40 bg-rose-500/15 text-rose-300'
    default:
      return 'border-gray-600 bg-gray-800/50 text-gray-400'
  }
}

function getAssetProjectNumber(asset: { specifications?: any | null }): string | null {
  const specs = asset.specifications
  if (!specs || typeof specs !== 'object') return null
  const raw =
    specs.project_number ??
    specs.project_hash ??
    specs.invoice_ref ??
    specs.Project ??
    null
  if (raw == null || String(raw).trim() === '') return null
  return String(raw).trim()
}

function TableColumnSelector({
  visibleColumns,
  onToggle,
  showBodegaOption = false,
}: {
  visibleColumns: Record<string, boolean>
  onToggle: (id: string) => void
  showBodegaOption?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10"
        title="Configurar columnas"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
              <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mostrar Columnas</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
              {AVAILABLE_COLUMNS.map((col) => {
                if (col.fixed) return null
                if ((col.id === 'bodega' || col.id === 'module') && !showBodegaOption) return null
                return (
                  <button
                    key={col.id}
                    onClick={() => onToggle(col.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors group"
                  >
                    <span>{col.label}</span>
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      visibleColumns[col.id]
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-gray-300 dark:border-gray-600 group-hover:border-indigo-400"
                    )}>
                      {visibleColumns[col.id] && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type WarehouseAssetRow = {
  id: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  color: string | null
  status: string
  batch_id: string | null
  batch_code: string | null
  order_code?: string | null
  batch_location: string | null
  container_type: string | null
  ticket_code: string | null
  warehouse_code?: string | null
  warehouse_name?: string | null
  module_label?: string | null
  inputClassifications: WorkshopClassifications
  outputClassifications: WorkshopClassifications
  hardwareSpecs: HardwareSpecs
  receptionNotes?: string
  formattedReceivedDate: string | null
  formattedTransferDate: string | null
  sales_price: number | null
  cost_amount?: number | null
  condition_grade?: string | null
  box_number?: number | null
  wipe_status?: string | null
  wiped_at?: string | null
  specifications?: any | null
}

const EMPTY_FILTER_LABEL = '(Vacío)'

function getColumnFilterValue(asset: WarehouseAssetRow, columnId: string): string {
  switch (columnId) {
    case 'serial':
      return asset.serial_number || EMPTY_FILTER_LABEL
    case 'bodega':
      return asset.warehouse_code || EMPTY_FILTER_LABEL
    case 'module':
      return asset.module_label || EMPTY_FILTER_LABEL
    case 'project':
      return getAssetProjectNumber(asset) || EMPTY_FILTER_LABEL
    case 'manufacturer':
      return asset.manufacturer || EMPTY_FILTER_LABEL
    case 'model':
      return asset.model || EMPTY_FILTER_LABEL
    case 'condition':
      return formatConditionLabel(asset.condition_grade) || EMPTY_FILTER_LABEL
    case 'asset_type':
      return asset.asset_type || EMPTY_FILTER_LABEL
    case 'color':
      return asset.color || EMPTY_FILTER_LABEL
    case 'rec_in': {
      const parts = [
        asset.inputClassifications?.r2Applicability,
        asset.inputClassifications?.dataSanitization,
      ].filter(Boolean)
      return parts.length > 0 ? parts.join(' / ') : EMPTY_FILTER_LABEL
    }
    case 'qc_out': {
      const parts = [
        asset.outputClassifications?.f,
        asset.outputClassifications?.c,
      ].filter(Boolean)
      return parts.length > 0 ? parts.join(' / ') : EMPTY_FILTER_LABEL
    }
    case 'location':
      return asset.batch_location || EMPTY_FILTER_LABEL
    case 'ticket':
      return asset.ticket_code || EMPTY_FILTER_LABEL
    case 'batch':
      return asset.order_code || asset.batch_code || EMPTY_FILTER_LABEL
    case 'received':
      return asset.formattedReceivedDate || EMPTY_FILTER_LABEL
    case 'transfer':
      return asset.formattedTransferDate || EMPTY_FILTER_LABEL
    case 'status':
      return asset.status || EMPTY_FILTER_LABEL
    case 'wipe':
      return asset.wipe_status === 'wiped' || asset.wiped_at ? 'Borrado' : 'Falta'
    case 'price':
      return asset.sales_price != null ? String(asset.sales_price) : EMPTY_FILTER_LABEL
    case 'cost':
      return asset.cost_amount != null ? String(asset.cost_amount) : EMPTY_FILTER_LABEL
    default:
      return EMPTY_FILTER_LABEL
  }
}

function collectColumnOptions(assets: WarehouseAssetRow[], columnId: string): string[] {
  const values = new Set<string>()
  for (const asset of assets) {
    values.add(getColumnFilterValue(asset, columnId))
  }
  return Array.from(values)
}

function assetMatchesFilters(
  asset: WarehouseAssetRow,
  filters: Record<string, Set<string> | null>
): boolean {
  for (const [columnId, selected] of Object.entries(filters)) {
    if (!selected) continue
    if (!selected.has(getColumnFilterValue(asset, columnId))) return false
  }
  return true
}

const COLOR_OPTIONS = ['Negro', 'Gris', 'Plateado', 'Blanco', 'Azul']
const R2_APPLICABILITY_OPTIONS = [
  { value: 'C', label: 'C — R2 Controlled Streams' },
  { value: 'U', label: 'U — Unrestricted Streams' },
]
const DATA_SANITIZATION_OPTIONS = [
  { value: 'D1', label: 'D1 — Pre-Sanitization' },
  { value: 'D2', label: 'D2 — Non-Data' },
]

type WarehouseSection = {
  key: string
  name: string | null
  code: string | null
  status?: string | null
  assets: WarehouseAssetRow[]
}

type AssetWorkOrder = {
  id: string
  workOrderNumber: string
  status: string | null
  diagnosis: string | null
  resolution: string | null
  failureType: string | null
  failureCategory: string | null
  recClassification: string | null
  qcPassed: boolean | null
  qcNotes: string | null
  qcPerformedAt: string | null
  startedAt: string | null
  completedAt: string | null
  updatedAt: string | null
  technicianName: string | null
  mmiTestOut: Record<string, boolean> | null
}

type AssetHistoryEntry = {
  id: string
  fecha: string
  estado: string | null
  bodega: string
  accion: string
  modulo: string
  comentario: string
  diagnostico?: string
  reparacion?: string
  tecnico?: string
}

type AssetHistoryPayload = {
  assetId: string
  serial: string
  workOrder: AssetWorkOrder | null
  history?: AssetHistoryEntry[]
}

const QC_TESTS = [
  { id: 'display', label: 'Pantalla/Display' },
  { id: 'touch', label: 'Touch/Táctil' },
  { id: 'camera_front', label: 'Cámara Frontal' },
  { id: 'camera_back', label: 'Cámara Trasera' },
  { id: 'speaker', label: 'Altavoz' },
  { id: 'microphone', label: 'Micrófono' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'battery', label: 'Batería' },
  { id: 'charging', label: 'Carga' },
  { id: 'gps', label: 'GPS' },
  { id: 'buttons', label: 'Botones físicos' }
]

type WarehouseAssetTableProps = {
  sections: WarehouseSection[]
  /** Una sola tabla con todos los activos + columna Bodega (Inventario General) */
  unified?: boolean
}

const getQCStatusLabel = (value: boolean | null | undefined) => {
  if (value === true) return 'Pasó'
  if (value === false) return 'Falló'
  return 'Pendiente'
}

const getQCStatusClass = (value: boolean | null | undefined) => {
  if (value === true) return 'text-emerald-400'
  if (value === false) return 'text-red-400'
  return 'text-surface-500'
}

const formatTimestamp = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return date.toLocaleString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function WarehouseAssetTable({ sections, unified = false }: WarehouseAssetTableProps) {
  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach(col => {
      // Compactar fila: ocultar caja y specs por defecto
      // Bodega + módulo: visibles en Inventario General
      if (col.id === 'bodega' || col.id === 'module') {
        initial[col.id] = unified
        return
      }
      initial[col.id] = col.id !== 'box' && col.id !== 'specs'
    });
    return initial;
  });

  const displaySections: WarehouseSection[] = unified
    ? [
        {
          key: 'ALL',
          code: 'TODAS',
          name: 'Inventario General',
          status: 'activa',
          assets: sections.flatMap((s) => s.assets),
        },
      ]
    : sections

  const showBodegaColumn = unified && visibleColumns.bodega !== false
  const showModuleColumn = unified && visibleColumns.module !== false
  const [editingReception, setEditingReception] = useState<WarehouseAssetRow | null>(null)
  const [editColor, setEditColor] = useState('')
  const [editR2Applicability, setEditR2Applicability] = useState('')
  const [editDataSanitization, setEditDataSanitization] = useState('')
  const [savingReception, setSavingReception] = useState(false)

  const handleToggleColumn = useCallback((id: string) => {
    setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const { toast } = useToast()

  const [selectedAsset, setSelectedAsset] = useState<WarehouseAssetRow | null>(null)
  const [isRemovingAsset, setIsRemovingAsset] = useState<string | null>(null)
  const [historyCache, setHistoryCache] = useState<Record<string, AssetHistoryPayload>>({})
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [auditHistory, setAuditHistory] = useState<any[]>([])
  const [auditHistoryLoading, setAuditHistoryLoading] = useState(false)
  const [editingLocation, setEditingLocation] = useState<{ assetId: string; currentLocation: string | null } | null>(null)
  const [newLocation, setNewLocation] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)
  const [editingPrice, setEditingPrice] = useState<{
    assetId: string
    currentPrice: number | null
    field: 'cost_amount' | 'sales_price'
  } | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  const [labelAsset, setLabelAsset] = useState<WarehouseAssetRow | null>(null)
  const [batchDetail, setBatchDetail] = useState<{ id: string; code: string | null } | null>(null)
  const [editingBatchPrice, setEditingBatchPrice] = useState<{ batchId: string; batchCode: string; warehouseCode: string } | null>(null)
  const [newBatchPrice, setNewBatchPrice] = useState('')
  const [batchPriceKind, setBatchPriceKind] = useState<'cost' | 'sale'>('cost')
  const [savingBatchPrice, setSavingBatchPrice] = useState(false)
  const [purchasePasteOpen, setPurchasePasteOpen] = useState(false)
  const [purchasePasteText, setPurchasePasteText] = useState('')
  const [savingPurchasePaste, setSavingPurchasePaste] = useState(false)
  const [selectedSalesPriceOpen, setSelectedSalesPriceOpen] = useState(false)
  const [selectedSalesPrice, setSelectedSalesPrice] = useState('')
  const [savingSelectedSalesPrice, setSavingSelectedSalesPrice] = useState(false)
  const [sendingToRepair, setSendingToRepair] = useState(false)
  const [exportingSelectedExcel, setExportingSelectedExcel] = useState(false)

  // Selection & Modals
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [destructionModalOpen, setDestructionModalOpen] = useState(false)
  const [destructionDispatchModalOpen, setDestructionDispatchModalOpen] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string> | null>>({})
  const [sortState, setSortState] = useState<{ columnId: string; dir: 'asc' | 'desc' } | null>({
    columnId: 'serial',
    dir: 'asc',
  })

  const setColumnFilter = useCallback((columnId: string, next: Set<string> | null) => {
    setColumnFilters((prev) => {
      const copy = { ...prev }
      if (next === null) delete copy[columnId]
      else copy[columnId] = next
      return copy
    })
  }, [])

  const setColumnSort = useCallback((columnId: string, dir: 'asc' | 'desc') => {
    setSortState({ columnId, dir })
  }, [])

  const clearAllColumnFilters = useCallback(() => setColumnFilters({}), [])

  const activeFilterCount = useMemo(
    () => Object.values(columnFilters).filter((v) => v !== null && v !== undefined).length,
    [columnFilters]
  )

  // Detect current warehouse context from sections
  // If all sections are BOD-DES, we enable destruction features
  const isDestructionContext = sections.every(s => s.code === 'BOD-DES')

  const toggleSelection = useCallback((id: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback((assets: WarehouseAssetRow[], checked: boolean) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev)
      assets.forEach(a => {
        if (a.status === 'destroyed') return
        if (checked) next.add(a.id)
        else next.delete(a.id)
      })
      return next
    })
  }, [])

  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false)
      setSelectedAssetIds(new Set())
      setSelectedSalesPriceOpen(false)
      setSelectedSalesPrice('')
    } else {
      setIsSelectionMode(true)
    }
  }

  const openSelectedSalesPriceEditor = useCallback(() => {
    if (selectedAssetIds.size === 0) {
      toast.warning('Sin selección', 'Selecciona al menos un equipo')
      return
    }
    setSelectedSalesPrice('')
    setSelectedSalesPriceOpen(true)
  }, [selectedAssetIds.size, toast])

  const closeSelectedSalesPriceEditor = useCallback(() => {
    setSelectedSalesPriceOpen(false)
    setSelectedSalesPrice('')
  }, [])

  const saveSelectedSalesPrice = useCallback(async () => {
    const price = parseFloat(selectedSalesPrice)
    if (isNaN(price) || price < 0) {
      toast.warning('Precio inválido', 'Ingresa un monto válido (≥ 0)')
      return
    }
    const ids = Array.from(selectedAssetIds)
    if (ids.length === 0) {
      toast.warning('Sin selección', 'Selecciona al menos un equipo')
      return
    }

    setSavingSelectedSalesPrice(true)
    try {
      const response = await fetch('/api/inventario/bodega/set-selected-sales-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds: ids, salesPrice: price }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar precio de venta')
      }
      toast.success(
        'Precio de venta actualizado',
        `Q${price.toFixed(2)} aplicado a ${result.updated ?? ids.length} equipos`
      )
      closeSelectedSalesPriceEditor()
      setSelectedAssetIds(new Set())
      setIsSelectionMode(false)
      window.location.reload()
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSavingSelectedSalesPrice(false)
    }
  }, [selectedSalesPrice, selectedAssetIds, closeSelectedSalesPriceEditor, toast])

  const downloadSelectedExcel = useCallback(
    async (
      assets: WarehouseAssetRow[],
      workOrders?: Array<{ assetId: string; serial: string | null; workOrderNumber: string }>
    ) => {
      if (assets.length === 0) {
        toast.warning('Sin selección', 'Selecciona al menos un equipo')
        return
      }
      setExportingSelectedExcel(true)
      try {
        const XLSX = await import('xlsx')
        const woByAsset = new Map((workOrders || []).map((w) => [w.assetId, w.workOrderNumber]))
        const rows = assets.map((asset) => ({
          Serie: asset.serial_number || '',
          'Project #': getAssetProjectNumber(asset) || '',
          Marca: asset.manufacturer || '',
          Modelo: asset.model || '',
          Condición: formatConditionLabel(asset.condition_grade) || '',
          Tipo: asset.asset_type || '',
          Ubicación: asset.warehouse_code || '',
          'Costo (Q)': asset.cost_amount != null ? Number(asset.cost_amount).toFixed(2) : '',
          'P. Base (Q)': asset.sales_price != null ? Number(asset.sales_price).toFixed(2) : '',
          Lote: asset.order_code || asset.batch_code || '',
          Ticket: asset.ticket_code || '',
          Recibido: asset.formattedReceivedDate || '',
          OS: woByAsset.get(asset.id) || '',
          Destino: 'Por Reparación (BOD-REP)',
        }))
        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Seleccion')
        const stamp = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(workbook, `reporte-seleccion-bodega-${stamp}.xlsx`)
        toast.success('Excel generado', `${assets.length} equipos exportados`)
      } catch (error) {
        toast.error('Error', error instanceof Error ? error.message : 'No se pudo generar el Excel')
      } finally {
        setExportingSelectedExcel(false)
      }
    },
    [toast]
  )

  const sendSelectedToRepair = useCallback(async () => {
    const assets = sections
      .flatMap((s) => s.assets)
      .filter((a) => selectedAssetIds.has(a.id))
    if (assets.length === 0) {
      toast.warning('Sin selección', 'Selecciona al menos un equipo')
      return
    }

    const confirmed = window.confirm(
      `¿Enviar ${assets.length} equipos a Por Reparación?\n\nSe crearán órdenes de servicio abiertas para Diagnóstico y se descargará el reporte Excel.`
    )
    if (!confirmed) return

    setSendingToRepair(true)
    try {
      const response = await fetch('/api/inventario/bodega/send-to-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds: assets.map((a) => a.id) }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar a Por Reparación')
      }

      await downloadSelectedExcel(assets, result.workOrders)

      toast.success(
        'Enviado a Por Reparación',
        `${result.moved ?? assets.length} movidos · ${result.created ?? 0} OS nuevas${
          result.skipped ? ` · ${result.skipped} ya tenían OS` : ''
        }`
      )
      setSelectedAssetIds(new Set())
      setIsSelectionMode(false)
      window.location.reload()
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Error al enviar')
    } finally {
      setSendingToRepair(false)
    }
  }, [sections, selectedAssetIds, downloadSelectedExcel, toast])

  const openReceptionEditor = useCallback((asset: WarehouseAssetRow) => {
    setEditingReception(asset)
    setEditColor(asset.color || '')
    setEditR2Applicability(asset.inputClassifications?.r2Applicability || '')
    setEditDataSanitization(asset.inputClassifications?.dataSanitization || '')
  }, [])

  const closeReceptionEditor = useCallback(() => {
    setEditingReception(null)
    setEditColor('')
    setEditR2Applicability('')
    setEditDataSanitization('')
  }, [])

  const saveReceptionFields = useCallback(async () => {
    if (!editingReception) return
    setSavingReception(true)
    try {
      const response = await fetch('/api/inventario/bodega/update-reception-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: editingReception.id,
          color: editColor || null,
          r2Applicability: editR2Applicability || null,
          dataSanitization: editDataSanitization || null,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo guardar')
      }
      toast.success('Guardado', 'Color, R2 y sanitización actualizados')
      closeReceptionEditor()
      window.location.reload()
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setSavingReception(false)
    }
  }, [editingReception, editColor, editR2Applicability, editDataSanitization, toast, closeReceptionEditor])

  const openAssetDetails = useCallback(async (asset: WarehouseAssetRow, opts?: { editReception?: boolean }) => {
    if (!asset.serial_number) return
    if (opts?.editReception) {
      openReceptionEditor(asset)
      return
    }
    setSelectedAsset(asset)
    const serialKey = asset.serial_number

    // Cargar historial de taller
    if (historyCache[serialKey]) {
      setHistoryError(null)
      setHistoryLoading(false)
    } else {
      setHistoryLoading(true)
      setHistoryError(null)

      try {
        const response = await fetch(
          `/api/inventario/bodega/asset-history?serial=${encodeURIComponent(serialKey)}`
        )
        const payload = await response.json()
        if (!response.ok) {
          const message = (payload as { error?: string }).error || 'Error al cargar el historial'
          throw new Error(message)
        }
        setHistoryCache((prev) => ({ ...prev, [serialKey]: payload as AssetHistoryPayload }))
      } catch (error) {
        setHistoryError(error instanceof Error ? error.message : 'Error desconocido')
      } finally {
        setHistoryLoading(false)
      }
    }

    // Cargar historial de auditoría
    setAuditHistoryLoading(true)
    try {
      const auditResponse = await fetch(`/api/auditoria?serie=${encodeURIComponent(serialKey)}`)
      if (auditResponse.ok) {
        const auditData = await auditResponse.json()
        setAuditHistory(Array.isArray(auditData) ? auditData : [])
      } else {
        setAuditHistory([])
      }
    } catch (error) {
      console.error('Error al cargar historial de auditoría:', error)
      setAuditHistory([])
    } finally {
      setAuditHistoryLoading(false)
    }
  }, [historyCache, openReceptionEditor])

  const closeModal = useCallback(() => {
    setSelectedAsset(null)
    setHistoryError(null)
    setHistoryLoading(false)
    setAuditHistory([])
    setAuditHistoryLoading(false)
  }, [])

  const openLocationEditor = useCallback((assetId: string, currentLocation: string | null) => {
    setEditingLocation({ assetId, currentLocation })
    setNewLocation(currentLocation || '')
  }, [])

  const closeLocationEditor = useCallback(() => {
    setEditingLocation(null)
    setNewLocation('')
  }, [])

  const saveLocation = useCallback(async () => {
    if (!editingLocation) return

    setSavingLocation(true)
    try {
      const response = await fetch('/api/inventario/bodega/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: editingLocation.assetId,
          location: newLocation.trim() || null
        })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar la ubicación')
      }

      window.location.reload()
    } catch (error) {
      toast.error('Error al guardar', error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setSavingLocation(false)
    }
  }, [editingLocation, newLocation, toast])

  const handleRemoveFromWarehouse = useCallback(async (assetId: string, serial?: string | null) => {
    if (!confirm(`¿Eliminar el activo ${serial || assetId} de Bodega Recepción?`)) return

    setIsRemovingAsset(assetId)
    try {
      const response = await fetch('/api/inventario/bodega/remove-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'No fue posible eliminar el activo')
      }

      toast.success('Activo eliminado', 'Se removió de Bodega Recepción.')
      window.location.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al eliminar', message)
    } finally {
      setIsRemovingAsset(null)
    }
  }, [toast])

  const openPriceEditor = useCallback((
    assetId: string,
    currentPrice: number | null,
    field: 'cost_amount' | 'sales_price' = 'cost_amount'
  ) => {
    setEditingPrice({ assetId, currentPrice, field })
    setNewPrice(currentPrice != null ? String(currentPrice) : '')
  }, [])

  const closePriceEditor = useCallback(() => {
    setEditingPrice(null)
    setNewPrice('')
  }, [])

  const savePrice = useCallback(async () => {
    if (!editingPrice) return

    const priceValue = parseFloat(newPrice)
    if (isNaN(priceValue) || priceValue < 0) {
      toast.warning('Precio inválido', 'Ingresa un monto válido (≥ 0)')
      return
    }

    setSavingPrice(true)
    try {
      const response = await fetch('/api/inventario/bodega/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: editingPrice.assetId,
          price: priceValue,
          field: editingPrice.field,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el precio')
      }

      window.location.reload()
    } catch (error) {
      toast.error('Error al guardar', error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setSavingPrice(false)
    }
  }, [editingPrice, newPrice, toast])

  const openBatchPriceEditor = useCallback((batchId: string, batchCode: string, warehouseCode: string) => {
    setEditingBatchPrice({ batchId, batchCode, warehouseCode })
    setNewBatchPrice('')
    setBatchPriceKind('cost')
  }, [])

  const closeBatchPriceEditor = useCallback(() => {
    setEditingBatchPrice(null)
    setNewBatchPrice('')
    setBatchPriceKind('cost')
  }, [])

  const saveBatchPrice = useCallback(async () => {
    if (!editingBatchPrice) return

    const totalPrice = parseFloat(newBatchPrice)
    if (isNaN(totalPrice) || totalPrice <= 0) {
      toast.warning('Precio inválido', 'Ingresa un total mayor a 0')
      return
    }

    setSavingBatchPrice(true)
    try {
      const response = await fetch('/api/inventario/bodega/set-batch-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: editingBatchPrice.batchId,
          warehouseCode: editingBatchPrice.warehouseCode,
          totalPrice,
          kind: batchPriceKind,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al asignar precio al lote')
      }

      const pricePerUnit = (totalPrice / result.count).toFixed(2)
      const label = batchPriceKind === 'sale' ? 'venta' : 'compra'
      toast.success(
        'Precio asignado',
        `Total Q${totalPrice.toFixed(2)} (${label}) → Q${pricePerUnit} c/u en ${result.count} equipos`
      )
      closeBatchPriceEditor()
      window.location.reload()
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSavingBatchPrice(false)
    }
  }, [editingBatchPrice, newBatchPrice, batchPriceKind, closeBatchPriceEditor, toast])

  const savePurchasePaste = useCallback(async () => {
    const lines = purchasePasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const rows: Array<{ serial: string; cost: number }> = []
    for (const line of lines) {
      const parts = line.split(/[\t,;]+/).map((p) => p.trim()).filter(Boolean)
      if (parts.length < 2) continue
      const serial = parts[0]
      const costRaw = parts[parts.length - 1].replace(/[Qq$\s]/g, '').replace(',', '.')
      const cost = parseFloat(costRaw)
      if (!serial || isNaN(cost)) continue
      rows.push({ serial, cost })
    }

    if (rows.length === 0) {
      toast.warning('Sin filas', 'Pega líneas: SERIE[TAB]COSTO (desde Excel)')
      return
    }

    setSavingPurchasePaste(true)
    try {
      const response = await fetch('/api/inventario/bodega/set-purchase-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error al guardar costos')

      const missing = Array.isArray(result.missing) ? result.missing.length : 0
      toast.success(
        'Costos de compra',
        `Actualizados: ${result.updated || 0}${missing ? ` · No encontrados: ${missing}` : ''}`
      )
      setPurchasePasteOpen(false)
      setPurchasePasteText('')
      window.location.reload()
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSavingPurchasePaste(false)
    }
  }, [purchasePasteText, toast])

  const currentHistory = selectedAsset?.serial_number ? historyCache[selectedAsset.serial_number] : null
  const workOrder = currentHistory?.workOrder ?? null
  const qcSummaryLabel = workOrder
    ? workOrder.qcPassed === true
      ? 'QC aprobado'
      : workOrder.qcPassed === false
        ? 'QC fallido'
        : 'QC pendiente'
    : 'QC pendiente'
  const qcSummaryClass = workOrder
    ? workOrder.qcPassed === true
      ? 'text-emerald-400'
      : workOrder.qcPassed === false
        ? 'text-red-400'
        : 'text-surface-500'
    : 'text-surface-500'

  // Get selected asset objects
  const selectedAssetObjects = sections
    .flatMap(s => s.assets)
    .filter(a => selectedAssetIds.has(a.id))

  if (displaySections.length === 0 || displaySections.every((s) => s.assets.length === 0)) {
    return null
  }

  return (
    <div className="space-y-6 pb-24">
      {displaySections.map((section) => {
        const showPriceWipe =
          unified || section.code === 'BOD-REM' || section.code === 'BOD-VAL'
        const showQcColumn = unified || section.code !== 'BOD-REC'
        const filteredAssets = (() => {
          const filtered = section.assets.filter((asset) =>
            assetMatchesFilters(asset, columnFilters)
          )
          if (!sortState) return filtered
          const { columnId, dir } = sortState
          const factor = dir === 'asc' ? 1 : -1
          return [...filtered].sort((a, b) => {
            const va = getColumnFilterValue(a, columnId)
            const vb = getColumnFilterValue(b, columnId)
            if (columnId === 'cost' || columnId === 'price') {
              const na = Number(va)
              const nb = Number(vb)
              if (Number.isFinite(na) && Number.isFinite(nb)) {
                return (na - nb) * factor
              }
            }
            return (
              va.localeCompare(vb, 'es', { numeric: true, sensitivity: 'base' }) * factor
            )
          })
        })()

        return (
        <div key={section.key} className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
          <div className="bg-indigo-600 dark:bg-[#1a1f2e] px-6 py-4 flex items-center justify-between border-b border-indigo-500 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Warehouse className="w-6 h-6 text-white" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {section.name || 'Sin Bodega Asignada'}
                  </h2>
                  {section.status && (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${section.status === 'activa'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                      : section.status === 'inactiva'
                        ? 'bg-gray-500/20 text-gray-200 border border-gray-500/30'
                        : section.status === 'mantenimiento'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                          : section.status === 'cerrada'
                            ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                            : 'bg-surface-500/20 text-surface-200 border border-surface-500/30'
                      }`}>
                      {section.status === 'activa' ? 'Activa' :
                        section.status === 'inactiva' ? 'Inactiva' :
                          section.status === 'mantenimiento' ? 'Mantenimiento' :
                            section.status === 'cerrada' ? 'Cerrada' :
                              section.status}
                    </span>
                  )}
                </div>
                <p className="text-indigo-200 text-sm">{section.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-white font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" />
                {activeFilterCount > 0
                  ? `${filteredAssets.length}/${section.assets.length}`
                  : section.assets.length}
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllColumnFilters}
                  className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white text-xs font-semibold hover:bg-white/20"
                  title="Limpiar filtros de columna"
                >
                  Limpiar filtros ({activeFilterCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => setPurchasePasteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-300/40 bg-emerald-500/20 text-white text-xs font-semibold hover:bg-emerald-500/30"
                title="Pegar serie + costo de compra desde Excel"
              >
                Costos compra
              </button>

              <button
                onClick={handleToggleSelectionMode}
                className={`
                        flex items-center gap-2 px-4 py-1.5 rounded-lg border transition-all text-sm font-semibold
                        ${isSelectionMode
                    ? 'bg-white text-indigo-600 border-white hover:bg-gray-100'
                    : 'bg-indigo-700 text-white border-indigo-500 hover:bg-indigo-500'
                  }
                    `}
                title="Seleccionar equipos para trasladar o cambiar precio de venta"
              >
                {isSelectionMode ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancelar selección
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Seleccionar
                  </>
                )}
              </button>



              <TableColumnSelector
                visibleColumns={visibleColumns}
                onToggle={handleToggleColumn}
                showBodegaOption={unified}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-[10px] leading-none">
              <thead>
                <tr className="font-black uppercase tracking-wide text-gray-900 dark:text-white border-b border-gray-100 dark:border-surface-800 whitespace-nowrap">
                  {isSelectionMode && (
                    <th className="w-8 px-1.5 py-1.5 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer w-3.5 h-3.5 transition-all"
                        onChange={(e) => toggleSelectAll(filteredAssets, e.target.checked)}
                        checked={filteredAssets.some(a => a.status !== 'destroyed') && filteredAssets.filter(a => a.status !== 'destroyed').every(a => selectedAssetIds.has(a.id))}
                      />
                    </th>
                  )}
                  <th className="text-left px-1.5 py-1.5 text-gray-900 dark:text-gray-100">
                    <ExcelColumnFilter
                      label="Serie"
                      options={collectColumnOptions(section.assets, 'serial')}
                      selected={columnFilters.serial ?? null}
                      onChange={(next) => setColumnFilter('serial', next)}
                      sortDir={sortState?.columnId === 'serial' ? sortState.dir : null}
                      onSort={(dir) => setColumnSort('serial', dir)}
                    />
                  </th>
                  {showBodegaColumn && (
                    <th className="text-left px-1.5 py-1.5 text-indigo-700 dark:text-indigo-300">
                      <ExcelColumnFilter
                        label="Bodega"
                        options={collectColumnOptions(section.assets, 'bodega')}
                        selected={columnFilters.bodega ?? null}
                        onChange={(next) => setColumnFilter('bodega', next)}
                        sortDir={sortState?.columnId === 'bodega' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('bodega', dir)}
                      />
                    </th>
                  )}
                  {showModuleColumn && (
                    <th className="text-left px-1.5 py-1.5 text-violet-700 dark:text-violet-300">
                      <ExcelColumnFilter
                        label="Módulo"
                        options={collectColumnOptions(section.assets, 'module')}
                        selected={columnFilters.module ?? null}
                        onChange={(next) => setColumnFilter('module', next)}
                        sortDir={sortState?.columnId === 'module' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('module', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.project && (
                    <th className="text-left px-1.5 py-1.5 text-sky-700 dark:text-sky-300">
                      <ExcelColumnFilter
                        label="Project #"
                        options={collectColumnOptions(section.assets, 'project')}
                        selected={columnFilters.project ?? null}
                        onChange={(next) => setColumnFilter('project', next)}
                        sortDir={sortState?.columnId === 'project' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('project', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.manufacturer && (
                    <th className="text-left px-1.5 py-1.5 text-gray-900 dark:text-gray-100">
                      <ExcelColumnFilter
                        label="Marca"
                        options={collectColumnOptions(section.assets, 'manufacturer')}
                        selected={columnFilters.manufacturer ?? null}
                        onChange={(next) => setColumnFilter('manufacturer', next)}
                        sortDir={sortState?.columnId === 'manufacturer' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('manufacturer', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.model && (
                    <th className="text-left px-1.5 py-1.5 text-gray-900 dark:text-gray-100">
                      <ExcelColumnFilter
                        label="Modelo"
                        options={collectColumnOptions(section.assets, 'model')}
                        selected={columnFilters.model ?? null}
                        onChange={(next) => setColumnFilter('model', next)}
                        sortDir={sortState?.columnId === 'model' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('model', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.condition && (
                    <th className="text-center px-1.5 py-1.5 text-violet-700 dark:text-violet-300">
                      <ExcelColumnFilter
                        label="Condición"
                        align="center"
                        options={collectColumnOptions(section.assets, 'condition')}
                        selected={columnFilters.condition ?? null}
                        onChange={(next) => setColumnFilter('condition', next)}
                        sortDir={sortState?.columnId === 'condition' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('condition', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.asset_type && (
                    <th className="text-left px-1.5 py-1.5 text-gray-700 dark:text-gray-300">
                      <ExcelColumnFilter
                        label="Tipo"
                        options={collectColumnOptions(section.assets, 'asset_type')}
                        selected={columnFilters.asset_type ?? null}
                        onChange={(next) => setColumnFilter('asset_type', next)}
                        sortDir={sortState?.columnId === 'asset_type' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('asset_type', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.color && (
                    <th className="text-center px-1.5 py-1.5 text-gray-700 dark:text-gray-400">
                      <ExcelColumnFilter
                        label="Color"
                        align="center"
                        options={collectColumnOptions(section.assets, 'color')}
                        selected={columnFilters.color ?? null}
                        onChange={(next) => setColumnFilter('color', next)}
                        sortDir={sortState?.columnId === 'color' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('color', dir)}
                      />
                    </th>
                  )}
                  {showQcColumn && visibleColumns.qc_out && (
                    <th className="text-center px-1.5 py-1.5 text-emerald-700 dark:text-emerald-400">
                      <ExcelColumnFilter
                        label="QC"
                        align="center"
                        options={collectColumnOptions(section.assets, 'qc_out')}
                        selected={columnFilters.qc_out ?? null}
                        onChange={(next) => setColumnFilter('qc_out', next)}
                        sortDir={sortState?.columnId === 'qc_out' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('qc_out', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.rec_in && (
                    <th className="text-center px-1.5 py-1.5 text-indigo-700 dark:text-indigo-400">
                      <ExcelColumnFilter
                        label="R2"
                        align="center"
                        options={collectColumnOptions(section.assets, 'rec_in')}
                        selected={columnFilters.rec_in ?? null}
                        onChange={(next) => setColumnFilter('rec_in', next)}
                        sortDir={sortState?.columnId === 'rec_in' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('rec_in', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.specs && (
                    <th className="text-left px-1.5 py-1.5 text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
                      Specs
                    </th>
                  )}
                  {visibleColumns.location && (
                    <th className="text-center px-1.5 py-1.5 text-amber-700 dark:text-amber-500">
                      <ExcelColumnFilter
                        label="Ubic."
                        align="center"
                        options={collectColumnOptions(section.assets, 'location')}
                        selected={columnFilters.location ?? null}
                        onChange={(next) => setColumnFilter('location', next)}
                        sortDir={sortState?.columnId === 'location' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('location', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.cost && (
                    <th className="text-center px-1.5 py-1.5 text-amber-700 dark:text-amber-400 font-mono">
                      <ExcelColumnFilter
                        label="Costo"
                        align="center"
                        options={collectColumnOptions(section.assets, 'cost')}
                        selected={columnFilters.cost ?? null}
                        onChange={(next) => setColumnFilter('cost', next)}
                        sortDir={sortState?.columnId === 'cost' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('cost', dir)}
                      />
                    </th>
                  )}
                  {showPriceWipe && visibleColumns.price && (
                    <th className="text-center px-1.5 py-1.5 text-emerald-700 dark:text-emerald-400 font-mono">
                      <ExcelColumnFilter
                        label="P. Base"
                        align="center"
                        options={collectColumnOptions(section.assets, 'price')}
                        selected={columnFilters.price ?? null}
                        onChange={(next) => setColumnFilter('price', next)}
                        sortDir={sortState?.columnId === 'price' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('price', dir)}
                      />
                    </th>
                  )}
                  {showPriceWipe && visibleColumns.wipe && (
                    <th className="text-center px-1.5 py-1.5 text-rose-700 dark:text-rose-400">
                      <ExcelColumnFilter
                        label="Wipe"
                        align="center"
                        options={collectColumnOptions(section.assets, 'wipe')}
                        selected={columnFilters.wipe ?? null}
                        onChange={(next) => setColumnFilter('wipe', next)}
                        sortDir={sortState?.columnId === 'wipe' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('wipe', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.ticket && (
                    <th className="text-center px-1.5 py-1.5 text-green-700 dark:text-green-400">
                      <ExcelColumnFilter
                        label="Ticket"
                        align="center"
                        options={collectColumnOptions(section.assets, 'ticket')}
                        selected={columnFilters.ticket ?? null}
                        onChange={(next) => setColumnFilter('ticket', next)}
                        sortDir={sortState?.columnId === 'ticket' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('ticket', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.batch && (
                    <th className="text-left px-1.5 py-1.5 text-gray-700 dark:text-gray-400">
                      <ExcelColumnFilter
                        label="Lote"
                        options={collectColumnOptions(section.assets, 'batch')}
                        selected={columnFilters.batch ?? null}
                        onChange={(next) => setColumnFilter('batch', next)}
                        sortDir={sortState?.columnId === 'batch' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('batch', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.box && (
                    <th className="text-center px-1.5 py-1.5 text-sky-700 dark:text-sky-400 font-mono">
                      Caja
                    </th>
                  )}
                  {visibleColumns.received && (
                    <th className="text-center px-1.5 py-1.5 text-sky-700 dark:text-sky-400 font-mono">
                      <ExcelColumnFilter
                        label="Recib."
                        align="center"
                        options={collectColumnOptions(section.assets, 'received')}
                        selected={columnFilters.received ?? null}
                        onChange={(next) => setColumnFilter('received', next)}
                        sortDir={sortState?.columnId === 'received' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('received', dir)}
                      />
                    </th>
                  )}
                  {visibleColumns.transfer && (
                    <th className="text-center px-1.5 py-1.5 text-purple-700 dark:text-purple-400 font-mono">
                      <ExcelColumnFilter
                        label="Traslad."
                        align="center"
                        options={collectColumnOptions(section.assets, 'transfer')}
                        selected={columnFilters.transfer ?? null}
                        onChange={(next) => setColumnFilter('transfer', next)}
                        sortDir={sortState?.columnId === 'transfer' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('transfer', dir)}
                      />
                    </th>
                  )}
                  {isDestructionContext && visibleColumns.status && (
                    <th className="text-center px-1.5 py-1.5 text-rose-700 dark:text-rose-400 font-mono">
                      <ExcelColumnFilter
                        label="Status"
                        align="center"
                        options={collectColumnOptions(section.assets, 'status')}
                        selected={columnFilters.status ?? null}
                        onChange={(next) => setColumnFilter('status', next)}
                        sortDir={sortState?.columnId === 'status' ? sortState.dir : null}
                        onSort={(dir) => setColumnSort('status', dir)}
                      />
                    </th>
                  )}
                  <th className="text-center px-1.5 py-1.5 text-gray-700 dark:text-gray-400 whitespace-nowrap">
                    Acc.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 transition-colors duration-300">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={20}
                      className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      Sin resultados con los filtros aplicados
                    </td>
                  </tr>
                ) : null}
                {filteredAssets.map((asset, idx) => (
                  <tr key={asset.id} className={cn(
                    "transition-colors duration-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap",
                    selectedAssetIds.has(asset.id)
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : asset.status === 'destroyed'
                        ? "bg-red-50 dark:bg-red-900/10 opacity-75"
                        : idx % 2 === 0
                          ? "bg-white dark:bg-[#1a1f2e]"
                          : "bg-gray-50 dark:bg-[#242936]",
                    "hover:bg-indigo-50/50 dark:hover:bg-[#2d3548] group"
                  )}>
                    {isSelectionMode && (
                      <td className="px-1.5 py-1 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer w-3.5 h-3.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          checked={selectedAssetIds.has(asset.id)}
                          onChange={() => toggleSelection(asset.id)}
                          disabled={asset.status === 'destroyed'}
                        />
                      </td>
                    )}
                    <td className="px-1.5 py-1">
                      {asset.serial_number ? (
                        <button
                          type="button"
                          onClick={() => openAssetDetails(asset, { editReception: (asset.warehouse_code || section.code) === 'BOD-REC' })}
                          className="font-mono text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-tight hover:underline whitespace-nowrap"
                          title={asset.serial_number}
                        >
                          {asset.serial_number}
                        </button>
                      ) : (
                        <span className="font-mono text-gray-400 text-[10px] font-black">-</span>
                      )}
                    </td>
                    {showBodegaColumn && (
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        {asset.warehouse_code ? (
                          <span
                            className="inline-flex flex-col gap-0.5 rounded border border-indigo-200 dark:border-indigo-700/50 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-indigo-800 dark:text-indigo-300"
                            title={asset.warehouse_name || asset.warehouse_code}
                          >
                            <span>{asset.warehouse_code}</span>
                            {asset.warehouse_name ? (
                              <span className="normal-case font-bold text-[8px] text-indigo-600/80 dark:text-indigo-400/80 max-w-[110px] truncate">
                                {asset.warehouse_name}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-rose-500 text-[9px] font-black uppercase">Sin bodega</span>
                        )}
                      </td>
                    )}
                    {showModuleColumn && (
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        {asset.module_label ? (
                          <span
                            className="inline-flex rounded border border-violet-200 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-black text-violet-900 dark:text-violet-300"
                            title={asset.status || asset.module_label}
                          >
                            {asset.module_label}
                          </span>
                        ) : (
                          <span className="text-rose-500 text-[9px] font-black uppercase">Sin módulo</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.project && (
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        {getAssetProjectNumber(asset) ? (
                          <span
                            className="font-mono text-[10px] font-black text-sky-700 dark:text-sky-300"
                            title={`Project # ${getAssetProjectNumber(asset)}`}
                          >
                            {getAssetProjectNumber(asset)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-[10px] font-black">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.manufacturer && (
                      <td className="px-1.5 py-1">
                        <Text variant="body" className="font-black uppercase text-[10px] whitespace-nowrap" title={asset.manufacturer || ''}>{asset.manufacturer || '-'}</Text>
                      </td>
                    )}
                    {visibleColumns.model && (
                      <td className="px-1.5 py-1">
                        <Text variant="secondary" className="font-bold text-[10px] whitespace-nowrap" title={asset.model || ''}>{asset.model || '-'}</Text>
                      </td>
                    )}
                    {visibleColumns.condition && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.condition_grade ? (
                          <span
                            className={cn(
                              'inline-flex rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide',
                              conditionBadgeClass(asset.condition_grade)
                            )}
                            title={formatConditionLabel(asset.condition_grade)}
                          >
                            {asset.condition_grade === 'Scrap' ? 'Grade D' : asset.condition_grade.replace('Grade ', '')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[9px] font-black uppercase opacity-40">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.asset_type && (
                      <td className="px-1.5 py-1">
                        <Text variant="muted" className="font-bold uppercase text-[10px] whitespace-nowrap">{asset.asset_type || '-'}</Text>
                      </td>
                    )}
                    {visibleColumns.color && (
                      <td className="px-1.5 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => openReceptionEditor(asset)}
                          className="text-center whitespace-nowrap"
                          title="Cargar / editar color"
                        >
                          <Text variant="muted" className={cn(
                            "font-bold uppercase text-[10px] whitespace-nowrap",
                            asset.color ? "text-emerald-600 dark:text-emerald-400" : "text-purple-500 hover:underline"
                          )}>
                            {asset.color || 'Cargar'}
                          </Text>
                        </button>
                      </td>
                    )}
                    {showQcColumn && visibleColumns.qc_out && (
                      <td className="px-1.5 py-1 text-center">
                        <div className="inline-flex items-center gap-0.5 font-black whitespace-nowrap">
                          {asset.outputClassifications?.f ? (
                            <span className="rounded border border-purple-200 dark:border-purple-700 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-900 dark:text-purple-400">
                              {asset.outputClassifications.f}
                            </span>
                          ) : null}
                          {asset.outputClassifications?.c ? (
                            <span className="rounded border border-amber-200 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-900 dark:text-amber-300">
                              {asset.outputClassifications.c}
                            </span>
                          ) : null}
                          {!asset.outputClassifications?.f && !asset.outputClassifications?.c && (
                            <span className="text-gray-400 text-[9px] font-black uppercase opacity-30">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.rec_in && (
                      <td className="px-1.5 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => openReceptionEditor(asset)}
                          className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap"
                          title="Cargar / editar R2 y sanitización"
                        >
                          {(asset.inputClassifications?.r2Applicability || asset.inputClassifications?.dataSanitization) ? (
                            <>
                              {asset.inputClassifications?.r2Applicability && (
                                <span className="rounded border border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-900 dark:text-blue-300">
                                  {asset.inputClassifications.r2Applicability}
                                </span>
                              )}
                              {asset.inputClassifications?.dataSanitization && (
                                <span className="rounded border border-violet-200 dark:border-violet-700 bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-violet-900 dark:text-violet-300">
                                  {asset.inputClassifications.dataSanitization}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-purple-500 text-[9px] font-black uppercase hover:underline">
                              Cargar
                            </span>
                          )}
                        </button>
                      </td>
                    )}
                    {visibleColumns.specs && (
                      <td className="px-1.5 py-1 max-w-[120px]">
                        <div className="flex items-center gap-1 text-[9px] font-bold whitespace-nowrap overflow-hidden">
                          {asset.hardwareSpecs.processor && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide font-black shrink-0">CPU:</span>
                              <span className="text-cyan-700 dark:text-cyan-400 font-black truncate" title={asset.hardwareSpecs.processor}>{asset.hardwareSpecs.processor}</span>
                            </div>
                          )}
                          {(asset.hardwareSpecs.ram_capacity || asset.hardwareSpecs.ram_type) && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide font-black shrink-0">RAM:</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-black truncate">{asset.hardwareSpecs.ram_capacity || '-'}{asset.hardwareSpecs.ram_type ? ` (${asset.hardwareSpecs.ram_type})` : ''}</span>
                            </div>
                          )}
                          {(asset.hardwareSpecs.disk_capacity || asset.hardwareSpecs.disk_type) && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide font-black shrink-0">SSD:</span>
                              <span className="text-purple-700 dark:text-purple-400 font-black truncate">{asset.hardwareSpecs.disk_capacity || '-'}{asset.hardwareSpecs.disk_type ? ` (${asset.hardwareSpecs.disk_type})` : ''}</span>
                            </div>
                          )}
                          {asset.receptionNotes && (
                            <div className="flex items-start gap-1 mt-0.5 border-t border-gray-100 dark:border-gray-800 pt-0.5">
                              <span className="text-amber-600 dark:text-amber-500 font-black italic truncate max-w-[150px]" title={asset.receptionNotes}>
                                &quot;{asset.receptionNotes}&quot;
                              </span>
                            </div>
                          )}
                          {!asset.hardwareSpecs.processor && !asset.hardwareSpecs.ram_capacity && !asset.hardwareSpecs.disk_capacity && !asset.receptionNotes && (
                            <span className="text-gray-300 dark:text-gray-600 font-black uppercase tracking-widest">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.status === 'destroyed' ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-red-100 dark:bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black text-red-900 dark:text-rose-400 border border-red-200 dark:border-rose-500/20 uppercase">
                            <Trash2 className="w-3 h-3" /> DEST
                          </span>
                        ) : asset.batch_location ? (
                          <button
                            type="button"
                            onClick={() => openLocationEditor(asset.id, asset.batch_location)}
                            className="text-amber-700 dark:text-amber-500 font-mono text-[10px] font-black bg-amber-50 dark:bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-500/10 hover:underline"
                            title="Editar ubicación"
                          >
                            {asset.batch_location}
                          </button>
                        ) : (
                          <button
                            onClick={() => openLocationEditor(asset.id, null)}
                            className="bg-gray-50 dark:bg-gray-800/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[9px] font-black border border-gray-100 dark:border-gray-700 uppercase hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                          >
                            Asignar
                          </button>
                        )}
                      </td>
                    )}
                    {visibleColumns.cost && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openPriceEditor(asset.id, asset.cost_amount ?? null, 'cost_amount')}
                          className="text-amber-700 dark:text-amber-400 font-bold text-[10px] hover:underline"
                          title="Editar costo de compra"
                        >
                          {asset.cost_amount != null && asset.cost_amount > 0
                            ? `Q ${asset.cost_amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'Asignar'}
                        </button>
                      </td>
                    )}
                    {showPriceWipe && visibleColumns.price && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openPriceEditor(asset.id, asset.sales_price, 'sales_price')}
                          className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px] hover:underline"
                          title={(() => {
                            const specs = asset.specifications as Record<string, unknown> | null
                            const base = specs?.precio_base_usd
                            const ref = specs?.precio_ref_usd
                            const adj = (specs?.pricing_adjustments || {}) as Record<string, unknown>
                            const parts = [
                              'Precio base = precio de venta',
                              ref != null ? `Ref USD ${ref}` : null,
                              base != null ? `Base USD ${base}` : null,
                              adj.ac_adapter_usd ? `A/C -${adj.ac_adapter_usd}` : null,
                              adj.battery_usd ? `Bat -${adj.battery_usd}` : null,
                              adj.lcd_touch_usd ? `LCD -${adj.lcd_touch_usd}` : null,
                            ].filter(Boolean)
                            return parts.join(' · ')
                          })()}
                        >
                          {asset.sales_price
                            ? `Q ${asset.sales_price.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'Asignar'}
                        </button>
                      </td>
                    )}
                    {showPriceWipe && visibleColumns.wipe && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.status === 'wiped' || asset.wipe_status === 'success' ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-900 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase">
                            <ShieldCheck className="w-3 h-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 text-[9px] font-black text-gray-400 border border-gray-100 dark:border-gray-800 uppercase opacity-60">
                            Falta
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.ticket && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.ticket_code ? (
                          <Link
                            href={`/dashboard/tickets`}
                            className="bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-400 px-1.5 py-0.5 rounded text-[9px] font-black font-mono border border-green-100 dark:border-green-800"
                          >
                            {asset.ticket_code}
                          </Link>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-[10px] font-black">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.batch && (
                      <td className="px-1.5 py-1 text-left whitespace-nowrap">
                        {(asset.order_code || asset.batch_code) && asset.batch_id ? (
                          <div className="inline-flex items-center gap-0.5">
                            <Link
                              href={`/dashboard/finanzas/lote/${asset.batch_id}`}
                              className="bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-black font-mono border border-blue-100 dark:border-blue-800"
                              title={asset.order_code || asset.batch_code || ''}
                            >
                              {asset.order_code || asset.batch_code}
                            </Link>
                            {((asset.warehouse_code || section.code) === 'BOD-VAL' ||
                              (asset.warehouse_code || section.code) === 'BOD-REM') && (
                              <button
                                onClick={() =>
                                  openBatchPriceEditor(
                                    asset.batch_id!,
                                    asset.batch_code!,
                                    asset.warehouse_code || section.code || ''
                                  )
                                }
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 p-0.5 bg-emerald-50 dark:bg-emerald-500/10 rounded"
                                title="Asignar costo/precio del lote"
                              >
                                💰
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-[10px] font-black">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.box && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.box_number != null && Number(asset.box_number) > 0 ? (
                          <span className="bg-sky-50 dark:bg-sky-900/10 text-sky-800 dark:text-sky-400 px-1.5 py-0.5 rounded text-[9px] font-black font-mono border border-sky-100 dark:border-sky-800">
                            #{asset.box_number}
                          </span>
                        ) : asset.box_number === 0 ? (
                          <span className="bg-violet-50 dark:bg-violet-900/10 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded text-[9px] font-black border border-violet-100 dark:border-violet-800">
                            Ticket
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-[10px] font-black">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.received && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.formattedReceivedDate ? (
                          <span
                            className="text-gray-700 dark:text-gray-200 text-[9px] font-black font-mono bg-gray-100 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700/50 uppercase"
                            title={asset.formattedReceivedDate}
                          >
                            {asset.formattedReceivedDate}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-[10px] font-black">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.transfer && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.formattedTransferDate ? (
                          <span
                            className="text-purple-800 dark:text-purple-300 text-[9px] font-black font-mono bg-purple-50 dark:bg-purple-900/10 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800 uppercase"
                            title={asset.formattedTransferDate}
                          >
                            {asset.formattedTransferDate}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-[10px] font-black">-</span>
                        )}
                      </td>
                    )}
                    {isDestructionContext && visibleColumns.status && (
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {asset.status === 'destroyed' || (asset.specifications as any)?.destroyed_at ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-400 border border-rose-500/20">
                            Destruido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-500/20">
                            Pendiente
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-1.5 py-1 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-0.5">
                        {(asset.warehouse_code || section.code) === 'BOD-REC' && (
                          <button
                            onClick={() => handleRemoveFromWarehouse(asset.id, asset.serial_number)}
                            className="p-0.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50"
                            title="Eliminar de Bodega Recepción"
                            disabled={isRemovingAsset === asset.id}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {asset.batch_id ? (
                          <button
                            onClick={() => setBatchDetail({
                              id: asset.batch_id!,
                              code: asset.order_code || asset.batch_code,
                            })}
                            className="p-0.5 text-gray-900 dark:text-white hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                            title="Ver Lote"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-0.5 text-surface-600 rounded"
                            title="Sin lote asociado"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <button
                          onClick={() => setLabelAsset(asset)}
                          className="p-0.5 text-gray-900 dark:text-white hover:text-green-500 hover:bg-green-500/10 rounded transition-colors"
                          title="Imprimir Etiqueta"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {isDestructionContext && (asset.status === 'destroyed' || (asset.specifications as any)?.destroyed_at) && (
                          <button
                            onClick={() => {
                              const assetId = asset.id
                              window.open(`/api/inventario/bodega/destruction-certificate?assetId=${assetId}`, '_blank')
                            }}
                            className="p-0.5 text-gray-900 dark:text-white hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                            title="Descargar Certificado de Destrucción"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )
      })}

      {/* Floating Action Bar for Selection */}
      {
        selectedAssetIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-white border border-gray-800 dark:border-gray-200 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-3 border-r border-gray-700 dark:border-gray-200 pr-4">
              <span className="bg-indigo-500 text-white dark:bg-indigo-600 dark:text-white font-mono font-bold px-2 py-1 rounded-lg">
                {selectedAssetIds.size}
              </span>
              <span className="text-gray-300 dark:text-gray-600 font-medium text-sm">Seleccionados</span>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={() => setSelectedAssetIds(new Set())}
                className="px-3 py-2 text-gray-400 hover:text-white dark:text-gray-500 dark:hover:text-gray-900 transition-colors text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => void downloadSelectedExcel(selectedAssetObjects)}
                disabled={exportingSelectedExcel}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exportingSelectedExcel ? 'Excel…' : 'Excel'}
              </button>
              <button
                onClick={openSelectedSalesPriceEditor}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <CircleDollarSign className="w-4 h-4" />
                Precio venta
              </button>
              <button
                onClick={() => void sendSelectedToRepair()}
                disabled={sendingToRepair}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-amber-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                title="Mueve a BOD-REP y crea OS para Diagnóstico + Excel"
              >
                <Wrench className="w-4 h-4" />
                {sendingToRepair ? 'Enviando…' : 'Por Reparación'}
              </button>
              <button
                onClick={() => setMoveModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Trasladar
              </button>

              {isDestructionContext && (
                <button
                  onClick={() => setDestructionDispatchModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-purple-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Generar Salida
                </button>
              )}
            </div>
          </div>
        )
      }

      {
        selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8">
            <div
              className="absolute inset-0 bg-black/80"
              onClick={closeModal}
            />
            <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-gray-700 bg-[#0f1419] p-6 space-y-6 shadow-2xl">
              {/* Same asset detail modal content */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-surface-500">Serie</p>
                  <h3 className="text-2xl font-semibold text-white">
                    {selectedAsset.serial_number}
                  </h3>
                  <p className="text-xs text-surface-400">
                    {selectedAsset.manufacturer || 'Marca no registrada'} • {selectedAsset.model || 'Modelo no registrado'}
                  </p>
                  <p className="text-xs text-surface-400">
                    R2: {selectedAsset.inputClassifications?.r2Applicability || '—'}
                    {' · '}
                    Sanit.: {selectedAsset.inputClassifications?.dataSanitization || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-white/5 p-2 text-surface-300 hover:text-white"
                  onClick={closeModal}
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Logica del modal existente se mantiene igual */}
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* ... Contenido del modal ... */}
                {/* Reutilizando el lógica anterior para no romper el hilo */}
                <div>
                  <h4 className="text-sm font-semibold text-surface-300 mb-3">Órdenes de Taller</h4>
                  {historyLoading ? (
                    <p className="text-surface-400 text-sm">Cargando...</p>
                  ) : historyError ? (
                    <p className="text-amber-400 text-sm">{historyError}</p>
                  ) : workOrder ? (
                    <div className="text-white space-y-1">
                      <p className="text-sm">Estado: {workOrder.status}</p>
                      <p className="text-sm">Diagnóstico: {workOrder.diagnosis || '—'}</p>
                    </div>
                  ) : (
                    <p className="text-surface-400 text-sm">Sin órdenes de taller aún.</p>
                  )}
                  {!historyLoading && !historyError && Array.isArray(historyCache[selectedAsset.serial_number || '']?.history) && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Historial reciente</p>
                      {(historyCache[selectedAsset.serial_number || ''].history || []).slice(0, 8).map((h) => (
                        <div key={h.id} className="rounded-lg border border-surface-800 bg-surface-950/50 px-3 py-2">
                          <p className="text-xs text-white font-medium">
                            {h.accion} · {h.bodega}
                          </p>
                          <p className="text-[10px] text-surface-400 mt-0.5">
                            {h.fecha ? new Date(h.fecha).toLocaleString() : '—'} · {h.comentario}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-surface-800 pt-4">
                  <h4 className="text-sm font-semibold text-surface-300 mb-3">Historial Auditoría</h4>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
                    <p className="text-xs text-indigo-400 font-medium text-center">
                      Usa el buscador de la Bitácora Global para encontrar movimientos por número de serie. Próximamente integraremos una vista simplificada aquí.
                    </p>
                  </div>
                  {/* ... Render simplificado ... */}
                  <div className="space-y-2">
                    {auditHistory.map((h, i) => (
                      <p key={i} className="text-xs text-surface-400">{new Date(h.created_at).toLocaleDateString()}: {h.description}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div >
        )
      }

      {/* Edit Location Modal */}
      {
        editingReception && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80" onClick={closeReceptionEditor} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700 bg-[#0f1419] p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Datos de recepción</h3>
                  <p className="text-xs text-surface-400 font-mono mt-1">
                    {editingReception.serial_number} · {editingReception.manufacturer} {editingReception.model}
                  </p>
                </div>
                <button type="button" onClick={closeReceptionEditor} className="p-2 text-surface-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <FormLabel>Color</FormLabel>
                <select
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-full bg-[#1a2030] border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm font-bold"
                >
                  <option value="">Seleccionar color...</option>
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FormLabel>R2 Applicability</FormLabel>
                <select
                  value={editR2Applicability}
                  onChange={(e) => setEditR2Applicability(e.target.value)}
                  className="w-full bg-[#1a2030] border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm font-bold"
                >
                  <option value="">Seleccionar...</option>
                  {R2_APPLICABILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FormLabel>Data Sanitization</FormLabel>
                <select
                  value={editDataSanitization}
                  onChange={(e) => setEditDataSanitization(e.target.value)}
                  className="w-full bg-[#1a2030] border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm font-bold"
                >
                  <option value="">Seleccionar...</option>
                  {DATA_SANITIZATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeReceptionEditor}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-700 text-surface-300 text-xs font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void saveReceptionFields()}
                  disabled={savingReception}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {savingReception ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        editingLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/80"
              onClick={closeLocationEditor}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700 bg-[#0f1419] p-6 space-y-4 shadow-2xl">
              <h3 className="text-xl font-semibold text-white">Editar Ubicación</h3>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ingresa la ubicación"
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white"
              />
              <button onClick={saveLocation} className="bg-indigo-600 text-white px-4 py-2 rounded">Guardar</button>
            </div>
          </div>
        )
      }

      {editingPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={closePriceEditor} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingPrice.field === 'cost_amount' ? 'Costo de compra' : 'Precio de venta'}
            </h3>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="Q 0.00"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closePriceEditor} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingPrice}
                onClick={savePrice}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {savingPrice ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSalesPriceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeSelectedSalesPriceEditor} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Precio de venta ({selectedAssetIds.size} equipos)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Se aplicará el mismo monto a la columna <strong>P. Base</strong> de todos los equipos seleccionados.
            </p>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Precio de venta (Q)
              <input
                type="number"
                min="0"
                step="0.01"
                value={selectedSalesPrice}
                onChange={(e) => setSelectedSalesPrice(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
                placeholder="Ej. 2892.80"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void saveSelectedSalesPrice()
                  }
                }}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSelectedSalesPriceEditor}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingSelectedSalesPrice}
                onClick={saveSelectedSalesPrice}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {savingSelectedSalesPrice ? 'Guardando…' : 'Aplicar precio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBatchPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeBatchPriceEditor} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Precio del lote {editingBatchPrice.batchCode}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Divide el total en partes iguales entre los equipos del lote en esta bodega.
              Si cada unidad tiene precio distinto, usa <strong>Costos compra</strong> (pegar Excel).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBatchPriceKind('cost')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border ${
                  batchPriceKind === 'cost'
                    ? 'bg-amber-100 border-amber-400 text-amber-900'
                    : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Costo compra
              </button>
              <button
                type="button"
                onClick={() => setBatchPriceKind('sale')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border ${
                  batchPriceKind === 'sale'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                    : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Precio venta
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newBatchPrice}
              onChange={(e) => setNewBatchPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="Total del lote Q"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeBatchPriceEditor} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingBatchPrice}
                onClick={saveBatchPrice}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {savingBatchPrice ? 'Guardando…' : 'Distribuir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {purchasePasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPurchasePasteOpen(false)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Costos de compra (Excel)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pega columnas <strong>Serie</strong> y <strong>Costo</strong> (tab o coma). Una fila por equipo.
              El lote ya debe existir en recepción/bodega; esto solo carga el precio de compra c/u.
            </p>
            <textarea
              value={purchasePasteText}
              onChange={(e) => setPurchasePasteText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-xs"
              placeholder={'CJQQ1T3\t375\nABC123\t550'}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurchasePasteOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingPurchasePaste}
                onClick={savePurchasePaste}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {savingPurchasePaste ? 'Guardando…' : 'Aplicar costos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {
        labelAsset && (
          <ProductLabelModal
            asset={labelAsset}
            onClose={() => setLabelAsset(null)}
          />
        )
      }

      {
        batchDetail && (
          <BatchDetailModal
            batchId={batchDetail.id}
            batchCode={batchDetail.code}
            onClose={() => setBatchDetail(null)}
          />
        )
      }

      <MoveItemsModal
        isOpen={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false)
        }}
        selectedAssets={selectedAssetObjects}
        currentWarehouseCode={sections.length === 1 ? sections[0].code || undefined : undefined}
        onMoveSuccess={() => {
          setSelectedAssetIds(new Set())
          window.location.reload()
        }}
      />

      <DestructionModal
        isOpen={destructionModalOpen}
        onClose={() => setDestructionModalOpen(false)}
        selectedAssets={selectedAssetObjects.filter(a => a.status !== 'destroyed' && !(a.specifications as any)?.destroyed_at)}
        onSuccess={() => {
          setSelectedAssetIds(new Set())
          window.location.reload()
        }}
      />

      <DestructionDispatchModal
        isOpen={destructionDispatchModalOpen}
        onClose={() => setDestructionDispatchModalOpen(false)}
        selectedAssetIds={Array.from(selectedAssetIds)}
        selectedAssets={sections
          .flatMap(s => s.assets)
          .filter(a => selectedAssetIds.has(a.id))}
        onConfirm={() => {
          setDestructionDispatchModalOpen(false)
          setSelectedAssetIds(new Set())
          window.location.reload()
        }}
      />

    </div >
  )
}
