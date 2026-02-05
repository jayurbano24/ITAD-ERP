'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FAILURE_TYPES } from '../constants'
import type { LucideIcon } from 'lucide-react'
import { Radar, ShieldCheck, Trash2, Wrench, Loader2, Package, Search, Plus, CheckCircle, AlertTriangle, X, Zap, ChevronRight, ChevronDown, Settings } from 'lucide-react'
import { Text } from '@/components/ui/Text'
import type { WorkOrder } from '../actions'
import {
  requestPart,
  requestPartsBulk,
  searchParts,
  getPartsCatalogFilters,
  getWarehousePartsForPicker,
  type WarehousePickerSource,
  type GoodWarehousePickerPart,
  type HarvestWarehousePickerPart,
} from '../actions'

// ==================== HELPERS ====================

const parseDiagnosisDetailsFromText = (text?: string | null) => {
  if (!text) return []
  const marker = 'Fallas tabuladas:'
  const markerIndex = text.indexOf(marker)
  if (markerIndex === -1) return []
  const after = text.slice(markerIndex + marker.length).trim()
  if (!after) return []
  return after
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('—').map((part) => part.trim())
      if (parts.length > 1) {
        return { code: parts[0], description: parts.slice(1).join(' — ') }
      }
      return { code: parts[0], description: '' }
    })
}

type WorkshopClassifications = {
  rec?: string
  c?: string
  f?: string
}

const getWorkshopClassifications = (asset?: WorkOrder['asset']): WorkshopClassifications => {
  const specs = asset?.specifications
  if (!specs || typeof specs !== 'object') return {}
  const rawClassifications = (specs as Record<string, unknown>).workshop_classifications
  if (!rawClassifications || typeof rawClassifications !== 'object') return {}
  const cls = rawClassifications as Record<string, unknown>
  return {
    rec: typeof cls.rec === 'string' ? cls.rec : undefined,
    c: typeof cls.c === 'string' ? cls.c : undefined,
    f: typeof cls.f === 'string' ? cls.f : undefined,
  }
}

const formatClassificationsLabel = (classifications: WorkshopClassifications = {}) => {
  const { rec, c, f } = classifications
  const parts: string[] = []
  if (rec) parts.push(`REC: ${rec}`)
  if (f) parts.push(`F: ${f}`)
  if (c) parts.push(`C: ${c}`)
  if (parts.length === 0) return 'Primer Ingreso'
  return parts.join(' | ')
}

const outputClassificationRECOptions = ['R', 'E', 'C']
const outputClassificationFOptions = [
  { value: 'F1', label: 'F1: Equipos coleccionables o especializados' },
  { value: 'F2', label: 'F2: Equipos electrónicos especializados verificados' },
  { value: 'F3', label: 'F3: Funciones esenciales en funcionamiento' },
  { value: 'F4', label: 'F4: Hardware funcionando' },
  { value: 'F5', label: 'F5: Reacondicionados' },
  { value: 'F6', label: 'F6: Como nuevos' }
]
const outputClassificationCOptions = [
  { value: 'C0', label: 'C0: No categorizado' },
  { value: 'C1', label: 'C1: Averiado (para recuperación de materiales)' },
  { value: 'C2', label: 'C2: Usado deficiente - uso intenso y antigüedad' },
  { value: 'C3', label: 'C3: Usado razonable (uso y antigüedad moderados)' },
  { value: 'C4', label: 'C4: Usado bueno' },
  { value: 'C5', label: 'C5: Usado muy bueno' },
  { value: 'C6', label: 'C6: Usado excelente' },
  { value: 'C7', label: 'C7: Certificado como de segunda mano (reacondicionado)' },
  { value: 'C8', label: 'C8: Sin usar' },
  { value: 'C9', label: 'C9: Nuevo y en caja abierta' }
]

// ==================== CONSTANTS ====================

type StageTab = {
  key: 'diagnostico' | 'reparacion' | 'control_calidad'
  label: string
  statuses: string[]
  Icon: LucideIcon
}

const tabs: StageTab[] = [
  {
    key: 'diagnostico',
    label: 'Diagnóstico',
    statuses: ['open', 'waiting_quote', 'quote_rejected', 'en diagnostico'],
    Icon: Radar
  },
  {
    key: 'reparacion',
    label: 'Reparación',
    statuses: ['in_progress', 'waiting_seedstock', 'quote_approved', 'en reparacion'],
    Icon: Wrench
  },
  {
    key: 'control_calidad',
    label: 'Control de Calidad',
    statuses: ['qc_pending', 'qc_failed', 'en control de calidad', 'qc pendiente', 'en qc'],
    Icon: ShieldCheck
  },
]

const normalizeStatus = (value?: string | null) => value?.trim().toLowerCase() ?? ''
const doesStatusMatchTab = (tab: StageTab, status?: string | null) => {
  if (!status) return false
  const normalized = normalizeStatus(status)
  return tab.statuses.some((tabStatus) => normalizeStatus(tabStatus) === normalized)
}
const getStageTabForStatus = (status?: string | null) => tabs.find((tab) => doesStatusMatchTab(tab, status))

const getDiagnosisActionDestinationLabel = (key?: string | null) =>
  diagnosisActions.find((action) => action.key === key)?.warehouseLabel ?? null

const getDiagnosisActionApiKey = (key?: string | null) =>
  diagnosisActions.find((action) => action.key === key)?.apiKey ?? key

const statusLabels: Record<string, string> = {
  open: 'Por Diagnosticar',
  waiting_quote: 'Cotizando',
  quote_rejected: 'Cotización rechazada',
  in_progress: 'En reparación',
  waiting_parts: 'Esperando piezas',
  waiting_seedstock: 'Seedstock',
  quote_approved: 'Cotización aprobada',
  qc_pending: 'QC pendiente',
  qc_passed: 'QC aprobado',
  qc_failed: 'QC fallido'
}

type DiagnosisAction = {
  label: string
  key: string
  warehouseLabel?: string
  apiKey?: string
}

const diagnosisActions: DiagnosisAction[] = [
  { label: 'Diagnóstico', key: 'diagnostico' },
  { label: 'Hardvesting', key: 'hardvesting', warehouseLabel: 'Bodega Hardvesting' },
  { label: 'Borrado', key: 'borrado', apiKey: 'data_wipe', warehouseLabel: 'Borrado de Datos' },
  { label: 'Destrucción', key: 'destruccion', warehouseLabel: 'Bodega de Destrucción' }
]

const repairModes = ['Partes', 'Software', 'Cambio', 'No Reparado', 'Nota de Crédito']
const repairOptions = ['Reparación de pantalla', 'Reemplazo de conector', 'Actualización de software', 'Reemplazo de batería']
const softwareRepairOptions = ['Actualizacion de softwares']
const partsSourceOptions = ['Good Warehouse', 'Harvesting Warehouse']
const qcChecklist = ['Diagnóstico', 'Partes Libres', 'Manual de pruebas', 'Evidencia de QC']
const repairLevelMap: Record<string, string> = {
  Partes: 'L2',
  Software: 'L1',
  Cambio: 'L3',
  'No Reparado': 'L0',
  'Nota de Crédito': 'L0'
}

// ==================== COMPONENT ====================

export default function TallerStageDashboard({ workOrders }: { workOrders: WorkOrder[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const [activeTab, setActiveTab] = useState<StageTab['key']>('diagnostico')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedFailure, setSelectedFailure] = useState('')
  const [selectedRepairMode, setSelectedRepairMode] = useState(repairModes[0])
  const [selectedRepairOption, setSelectedRepairOption] = useState(repairOptions[0])
  const [selectedSoftwareRepairOption, setSelectedSoftwareRepairOption] = useState(softwareRepairOptions[0])
  const [selectedPartsSource, setSelectedPartsSource] = useState(partsSourceOptions[0])
  const [selectedDiagnosisAction, setSelectedDiagnosisAction] = useState(diagnosisActions[0].key)
  const [diagnosisDetails, setDiagnosisDetails] = useState<{ code: string; description: string }[]>([])
  const [repairsList, setRepairsList] = useState<{ repair: string; code: string; level: string }[]>([])
  const [diagnosisComment, setDiagnosisComment] = useState('')
  const [softwareVersionIn, setSoftwareVersionIn] = useState('')
  const [softwareVersionOut, setSoftwareVersionOut] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [repairActionMessage, setRepairActionMessage] = useState<string | null>(null)
  const [qcNotes, setQcNotes] = useState('')
  const [qcChecks, setQcChecks] = useState<Record<string, boolean>>({})
  const [qcEvidenceFiles, setQcEvidenceFiles] = useState<File[]>([])
  const [qcEvidenceUrls, setQcEvidenceUrls] = useState<string[]>([])
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false)

  // Part request (inline card)
  type PartCatalogItem = {
    id: string
    sku: string
    name: string
    category: string
    stock_quantity: number
    location: string | null
  }

  const [partsSearchQuery, setPartsSearchQuery] = useState('')
  const [partsSearchResults, setPartsSearchResults] = useState<PartCatalogItem[]>([])
  const [isPartsSearching, setIsPartsSearching] = useState(false)
  const [selectedPart, setSelectedPart] = useState<PartCatalogItem | null>(null)
  const [partsQuantity, setPartsQuantity] = useState(1)
  const [partsNotes, setPartsNotes] = useState('')
  const [partRequestError, setPartRequestError] = useState<string | null>(null)
  const [partRequestSuccess, setPartRequestSuccess] = useState<string | null>(null)

  type DraftRequestedPart = {
    sku: string
    name: string
    quantity: number
    available?: number | null
    location?: string | null
    source: 'good' | 'harvest'
  }
  const [draftRequestedParts, setDraftRequestedParts] = useState<DraftRequestedPart[]>([])

  // Warehouse picker modal
  const [isWarehousePickerOpen, setIsWarehousePickerOpen] = useState(false)
  const [pickerFiltersLoading, setPickerFiltersLoading] = useState(false)
  const [pickerFiltersError, setPickerFiltersError] = useState<string | null>(null)
  const [pickerBrands, setPickerBrands] = useState<Array<{ id: string; name: string }>>([])
  const [pickerModels, setPickerModels] = useState<Array<{ id: string; name: string; brand_id: string | null; product_type_id: string | null }>>([])
  const [pickerProductTypes, setPickerProductTypes] = useState<Array<{ id: string; name: string }>>([])

  const [pickerBrand, setPickerBrand] = useState('')
  const [pickerModel, setPickerModel] = useState('')
  const [pickerProductType, setPickerProductType] = useState('')
  const [pickerQuery, setPickerQuery] = useState('')

  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [pickerResultsGood, setPickerResultsGood] = useState<GoodWarehousePickerPart[]>([])
  const [pickerResultsHarvest, setPickerResultsHarvest] = useState<HarvestWarehousePickerPart[]>([])

  const pickerSelectedBrandId = useMemo(
    () => pickerBrands.find((b) => b.name === pickerBrand)?.id ?? null,
    [pickerBrands, pickerBrand]
  )
  const pickerHasBrandOption = useMemo(
    () => !pickerBrand || pickerBrands.some((b) => b.name === pickerBrand),
    [pickerBrand, pickerBrands]
  )
  const pickerHasModelOption = useMemo(
    () => !pickerModel || pickerModels.some((m) => m.name === pickerModel),
    [pickerModel, pickerModels]
  )
  const pickerHasProductTypeOption = useMemo(
    () => !pickerProductType || pickerProductTypes.some((pt) => pt.name === pickerProductType),
    [pickerProductType, pickerProductTypes]
  )
  const pickerFilteredModels = useMemo(
    () => pickerModels.filter((m) => !pickerSelectedBrandId || m.brand_id === pickerSelectedBrandId),
    [pickerModels, pickerSelectedBrandId]
  )

  useEffect(() => {
    const run = async () => {
      if (selectedRepairMode !== 'Partes') return
      if (partsSearchQuery.trim().length < 2) {
        setPartsSearchResults([])
        return
      }
      setIsPartsSearching(true)
      const result = await searchParts(partsSearchQuery.trim())
      setPartsSearchResults((result.data || []) as PartCatalogItem[])
      setIsPartsSearching(false)
    }

    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [partsSearchQuery, selectedRepairMode])

  const resetPartRequestForm = () => {
    setPartsSearchQuery('')
    setPartsSearchResults([])
    setSelectedPart(null)
    setPartsQuantity(1)
    setPartsNotes('')
    setPartRequestError(null)
    setPartRequestSuccess(null)
    setDraftRequestedParts([])
  }

  useEffect(() => {
    // When switching orders, keep the UI clean to avoid sending to the wrong order accidentally
    resetPartRequestForm()
    setQcNotes('')
    setQcChecks({})
    setQcEvidenceFiles([])
    setQcEvidenceUrls([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const selectedOrder = useMemo(
    () => workOrders.find((wo) => wo.id === selectedId) ?? null,
    [selectedId, workOrders]
  )
  const partDispatchCompleted = Boolean(selectedOrder?.part_dispatch_completed)
  const installedPartRequests = useMemo(() => {
    const requests = (selectedOrder as any)?.part_requests ?? []
    return requests.filter((req: any) => (req.status ?? '').toLowerCase() === 'installed')
  }, [selectedOrder])

  // Load catalog filters when opening picker
  useEffect(() => {
    if (!isWarehousePickerOpen) return

    const run = async () => {
      setPickerFiltersLoading(true)
      setPickerFiltersError(null)
      const res = await getPartsCatalogFilters()
      if (res.error) {
        setPickerFiltersError(res.error)
      } else {
        setPickerBrands(res.data.brands)
        setPickerModels(res.data.models)
        setPickerProductTypes(res.data.productTypes)
      }
      setPickerFiltersLoading(false)
    }

    run()
  }, [isWarehousePickerOpen])

  // Prefill picker filters from selected order
  useEffect(() => {
    if (!isWarehousePickerOpen) return
    const brand = selectedOrder?.asset?.manufacturer ?? ''
    const model = selectedOrder?.asset?.model ?? ''
    const productType = selectedOrder?.asset?.asset_type ?? ''
    setPickerBrand(brand)
    setPickerModel(model)
    setPickerProductType(productType)
    setPickerQuery('')
    setPickerError(null)
    setPickerResultsGood([])
    setPickerResultsHarvest([])
  }, [isWarehousePickerOpen, selectedOrder?.asset?.manufacturer, selectedOrder?.asset?.model, selectedOrder?.asset?.asset_type])

  const pickerSource: WarehousePickerSource = selectedPartsSource === 'Harvesting Warehouse' ? 'harvest' : 'good'

  // Load picker results when filters change
  useEffect(() => {
    if (!isWarehousePickerOpen) return

    const run = async () => {
      setPickerLoading(true)
      setPickerError(null)
      const res = await getWarehousePartsForPicker({
        source: pickerSource,
        query: pickerQuery,
        brand: pickerBrand,
        model: pickerModel,
        productType: pickerProductType,
        limit: 40
      })

      if (res.error) {
        setPickerError(res.error)
        setPickerLoading(false)
        return
      }

      if (pickerSource === 'good') {
        setPickerResultsGood(res.data as GoodWarehousePickerPart[])
        setPickerResultsHarvest([])
      } else {
        setPickerResultsHarvest(res.data as HarvestWarehousePickerPart[])
        setPickerResultsGood([])
      }

      setPickerLoading(false)
    }

    const t = setTimeout(run, 250)
    return () => clearTimeout(t)
  }, [isWarehousePickerOpen, pickerSource, pickerQuery, pickerBrand, pickerModel, pickerProductType])

  const handleSelectPickerPart = (sku: string, name?: string | null) => {
    setDraftRequestedParts((prev) => {
      const existing = prev.find((p) => p.sku === sku)
      if (existing) {
        return prev.map((p) => p.sku === sku ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [
        ...prev,
        {
          sku,
          name: (name || sku).trim(),
          quantity: 1,
          source: pickerSource
        }
      ]
    })
    setPartRequestError(null)
    setPartRequestSuccess(null)
    setIsWarehousePickerOpen(false)
  }

  // Derived state
  const isDiagnosticoStage = activeTab === 'diagnostico'
  const isReparacionStage = activeTab === 'reparacion'
  const isQcStage = activeTab === 'control_calidad'

  const filteredOrders = useMemo(() => {
    const currentTab = tabs.find((tab) => tab.key === activeTab)
    if (!currentTab) return []
    return workOrders.filter((wo) => doesStatusMatchTab(currentTab, wo.status))
  }, [activeTab, workOrders])

  const stageCounts = useMemo(
    () => tabs.reduce((acc, tab) => {
      acc[tab.key] = workOrders.filter((wo) => doesStatusMatchTab(tab, wo.status)).length
      return acc
    }, {} as Record<string, number>),
    [workOrders]
  )

  const [selectedOutputClassificationRec, setSelectedOutputClassificationRec] = useState('')
  const [selectedOutputClassificationF, setSelectedOutputClassificationF] = useState('')
  const [selectedOutputClassificationC, setSelectedOutputClassificationC] = useState('')

  const workshopClassifications = useMemo(
    () => getWorkshopClassifications(selectedOrder?.asset),
    [selectedOrder?.asset]
  )

  const classificationChips = [
    { label: 'REC', value: workshopClassifications.rec, classes: 'border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10' },
    { label: 'C', value: workshopClassifications.c, classes: 'border-sky-200 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10' },
    { label: 'F', value: workshopClassifications.f, classes: 'border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10' },
  ]

  const classificationLabel = useMemo(
    () => formatClassificationsLabel(workshopClassifications),
    [workshopClassifications]
  )

  useEffect(() => {
    setSelectedOutputClassificationRec(workshopClassifications.rec ?? '')
    setSelectedOutputClassificationF(workshopClassifications.f ?? '')
    setSelectedOutputClassificationC(workshopClassifications.c ?? '')
  }, [workshopClassifications])

  const persistedDiagnosisDetails = useMemo(
    () => parseDiagnosisDetailsFromText(selectedOrder?.diagnosis),
    [selectedOrder?.diagnosis]
  )

  const selectedDiagnosisDestination = useMemo(
    () => getDiagnosisActionDestinationLabel(selectedDiagnosisAction),
    [selectedDiagnosisAction]
  )

  const selectedDiagnosisActionKey = useMemo(
    () => getDiagnosisActionApiKey(selectedDiagnosisAction),
    [selectedDiagnosisAction]
  )

  const sendButtonLabel = selectedDiagnosisDestination ?
    `Enviar a ${selectedDiagnosisDestination}` :
    'Enviar a Reparación'

  // Helpers
  const formatWorkOrderId = (order?: WorkOrder | null) => {
    if (!order) return '—'
    // Keep consistent across modules (e.g. Inventory/Dispatch uses work_order_number like OS-104)
    const raw = order.work_order_number || ''
    const match = raw.match(/^OS-(\d+)$/i)
    if (match?.[1]) return match[1]
    return raw || '—'
  }

  // Effects
  useEffect(() => {
    // If the current stage has no orders (e.g. QC empty), don't keep showing a stale selection
    if (filteredOrders.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!filteredOrders.some((wo) => wo.id === selectedId)) {
      setSelectedId(filteredOrders[0].id)
    }
  }, [filteredOrders, selectedId])

  useEffect(() => {
    setDiagnosisDetails(persistedDiagnosisDetails)
  }, [persistedDiagnosisDetails])

  // Handlers
  const handleAddDiagnosis = () => {
    if (!selectedFailure) return
    const failureMeta = FAILURE_TYPES.find((f) => f.value === selectedFailure)
    if (!failureMeta) return
    // Generate code from value (e.g., "no_power" -> "NP")
    const generatedCode = failureMeta.value.split('_').map(w => w[0]?.toUpperCase() ?? '').join('')
    const entry = { code: generatedCode, description: failureMeta.label }
    if (diagnosisDetails.some((d) => d.code === entry.code)) return
    setDiagnosisDetails((prev) => [...prev, entry])
    setSelectedFailure('')
  }

  const handleRemoveDiagnosis = (index: number) => {
    setDiagnosisDetails((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddRepair = () => {
    if (!selectedRepairOption) return
    const entry = {
      repair: selectedRepairOption,
      code: selectedRepairOption.substring(0, 3).toUpperCase(),
      level: repairLevelMap[selectedRepairMode] ?? 'L1'
    }
    if (repairsList.some((r) => r.repair === entry.repair)) return
    setRepairsList((prev) => [...prev, entry])
  }

  const handleRemoveRepair = (index: number) => {
    setRepairsList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSendToRepair = () => {
    if (!selectedOrder) {
      setSendError('Selecciona una orden para continuar')
      return
    }

    setSendError(null)
    setSendSuccess(null)

    const failureMeta = FAILURE_TYPES.find((f) => f.value === selectedFailure)
    const actionLabel = diagnosisActions.find((action) => action.key === selectedDiagnosisAction)?.label
    const trimmedComment = diagnosisComment.trim()
    const detailPayload = diagnosisDetails.map((detail) => ({ code: detail.code, description: detail.description }))

    const payload: Record<string, unknown> = {
      workOrderId: selectedOrder.id,
      diagnosisComment: trimmedComment || undefined,
    }

    if (detailPayload.length > 0) {
      payload.diagnosisDetails = detailPayload
    }

    if (selectedFailure) {
      payload.failureType = selectedFailure
      if (failureMeta?.category) {
        payload.failureCategory = failureMeta.category
      }
    }

    if (actionLabel) {
      payload.diagnosisActionLabel = actionLabel
    }

    if (selectedDiagnosisActionKey) {
      payload.diagnosisActionKey = selectedDiagnosisActionKey
    }

    console.log('[TallerDashboard] Sending diagnosis payload:', {
      workOrderId: payload.workOrderId,
      diagnosisActionLabel: payload.diagnosisActionLabel,
      diagnosisActionKey: payload.diagnosisActionKey,
      selectedDiagnosisAction,
      selectedDiagnosisActionKey
    })

    startTransition(async () => {
      try {
        const response = await fetch('/api/taller/diagnostics/send-to-repair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await response.json()

        if (!response.ok) {
          setSendError(body?.error || 'No se pudo enviar el diagnóstico')
          return
        }

        const assetIdentifier = selectedOrder.asset?.serial_number ?? selectedOrder.asset?.internal_tag ?? 'activo'
        const successText = selectedDiagnosisDestination
          ? `Serie ${assetIdentifier} enviada a ${selectedDiagnosisDestination}`
          : 'Orden enviada a Reparación'

        setSendSuccess(successText)
        setDiagnosisDetails(detailPayload)
        setSelectedFailure('')
        setDiagnosisComment('')
        router.refresh()
      } catch (error) {
        setSendError(error instanceof Error ? error.message : 'Error al enviar el diagnóstico')
      }
    })
  }

  const handleSendToQuality = () => {
    if (!selectedOrder) {
      setRepairActionMessage('Selecciona una orden para continuar')
      return
    }

    // Auto-agregar reparación de Software si es necesario
    let repairs = repairsList
    if (selectedRepairMode === 'Software' && repairsList.length === 0) {
      repairs = [{ repair: selectedSoftwareRepairOption, code: 'Software', level: 'L1' }]
      console.log('Auto-agregando reparación de Software:', repairs)
    }

    console.log('Mode:', selectedRepairMode, 'Repairs:', repairs.length)

    if (repairs.length === 0) {
      setSendError('Agrega al menos una reparación o selecciona Software')
      return
    }

    setRepairActionMessage(null)
    setSendError(null)
    setSendSuccess(null)

    const trimmedFailure = selectedFailure.trim()
    const trimmedComment = diagnosisComment.trim()
    const detailPayload = diagnosisDetails.map((detail) => ({
      code: detail.code,
      description: detail.description
    }))

    const partsPayload = draftRequestedParts.length > 0
      ? draftRequestedParts.map((part) => ({
        sku: part.sku,
        description: part.name,
        quantity: part.quantity,
        dispatched: part.source === 'harvest' ? 'Harvesting Warehouse' : 'Good Warehouse'
      }))
      : []

    const payload: Record<string, unknown> = {
      workOrderId: selectedOrder.id,
      repairMode: selectedRepairMode,
      repairOption: selectedRepairMode === 'Software' ? selectedSoftwareRepairOption : selectedRepairOption,
      repairs: repairs,
      partsSource: selectedPartsSource,
    }

    if (partsPayload.length > 0) {
      payload.partsList = partsPayload
    }
    if (trimmedFailure) {
      payload.selectedFailure = trimmedFailure
    }
    if (trimmedComment) {
      payload.diagnosisComment = trimmedComment
    }
    if (detailPayload.length > 0) {
      payload.diagnosisDetails = detailPayload
    }

    const softwareInValue = softwareVersionIn.trim()
    if (softwareInValue) {
      payload.softwareVersionIn = softwareInValue
    }
    const softwareOutValue = softwareVersionOut.trim()
    if (softwareOutValue) {
      payload.softwareVersionOut = softwareOutValue
    }
    if (selectedOutputClassificationRec) {
      payload.classificationRec = selectedOutputClassificationRec
    }
    if (selectedOutputClassificationF) {
      payload.classificationF = selectedOutputClassificationF
    }
    if (selectedOutputClassificationC) {
      payload.classificationC = selectedOutputClassificationC
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/taller/quality/send-to-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await response.json()

        if (!response.ok) {
          setRepairActionMessage(null)
          console.error('[TallerDashboard] Error response from Send to QC:', body)
          setSendError(body?.error || 'No se pudo enviar a Control de Calidad')
          return
        }

        console.log('[TallerDashboard] Successfully sent to QC:', body)
        setRepairActionMessage('Orden enviada a Control de Calidad')
        setSendSuccess('Orden enviada a Control de Calidad')

        // Reset local state to be clean for next action
        setSoftwareVersionIn('')
        setSoftwareVersionOut('')

        router.refresh()
      } catch (error) {
        setRepairActionMessage(null)
        setSendError(error instanceof Error ? error.message : 'Error al enviar a Control de Calidad')
      }
    })
  }

  const handleQcApprove = () => {
    if (!selectedOrder) return
    setSendError(null)
    setSendSuccess(null)

    startTransition(async () => {
      try {
        const response = await fetch('/api/taller/quality/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workOrderId: selectedOrder.id,
            notes: qcNotes || null,
            classificationRec: selectedOutputClassificationRec,
            classificationF: selectedOutputClassificationF,
            classificationC: selectedOutputClassificationC,
          })
        })
        const body = await response.json()

        if (!response.ok) {
          setSendError(body?.error || 'No se pudo aprobar QC')
          return
        }

        setSendSuccess('QC Aprobado - Enviado a Remarketing')
        setQcNotes('')
        router.refresh()
      } catch (error) {
        setSendError(error instanceof Error ? error.message : 'Error al aprobar QC')
      }
    })
  }

  const handleQcReject = () => {
    if (!selectedOrder) return
    setSendSuccess(null)
    setSendError(null)
    setRepairActionMessage(null)

    startTransition(async () => {
      try {
        const response = await fetch('/api/taller/quality/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workOrderId: selectedOrder.id })
        })
        const body = await response.json()

        if (!response.ok) {
          setSendError(body?.error || 'No se pudo revertir QC')
          return
        }

        setRepairActionMessage('QC rechazado - orden devuelta a Reparación')
        setSendSuccess('QC rechazado - regresó a Reparación')
        router.refresh()
      } catch (error) {
        setSendError(error instanceof Error ? error.message : 'Error al revertir QC')
      }
    })
  }

  const handleSubmitPartRequest = async () => {
    if (!selectedOrder) {
      setPartRequestError('Selecciona una orden para continuar')
      return
    }

    const sku = selectedPart?.sku
    const name = selectedPart?.name

    if (!sku?.trim()) {
      setPartRequestError('Selecciona una pieza del catálogo')
      return
    }

    if (partsQuantity < 1) {
      setPartRequestError('La cantidad debe ser mayor o igual a 1')
      return
    }

    setPartRequestError(null)
    setPartRequestSuccess(null)

    const originNote = `Bodega: ${selectedPartsSource}`
    const extra = partsNotes.trim()
    const notes = extra ? `${originNote} | ${extra}` : originNote

    startTransition(async () => {
      const result = await requestPart(selectedOrder.id, {
        partSku: sku.trim(),
        partName: (name || sku).trim(),
        quantity: partsQuantity,
        notes
      })

      if (result.success) {
        setPartRequestSuccess('Solicitud enviada correctamente')
        setTimeout(() => {
          router.refresh()
          resetPartRequestForm()
        }, 900)
      } else {
        setPartRequestError(result.error || 'Error al enviar solicitud')
      }
    })
  }

  const handleRemoveDraftPart = (sku: string) => {
    setDraftRequestedParts((prev) => prev.filter((p) => p.sku !== sku))
  }

  const handleUpdateDraftQty = (sku: string, qty: number) => {
    const nextQty = Math.max(1, Number(qty || 1))
    setDraftRequestedParts((prev) => prev.map((p) => p.sku === sku ? { ...p, quantity: nextQty } : p))
  }

  const handleSubmitDraftParts = async () => {
    if (!selectedOrder) {
      setPartRequestError('Selecciona una orden para continuar')
      return
    }
    if (draftRequestedParts.length === 0) {
      setPartRequestError('Agrega al menos una pieza a la lista')
      return
    }

    setPartRequestError(null)
    setPartRequestSuccess(null)

    const originNote = `Bodega: ${selectedPartsSource}`
    const extra = partsNotes.trim()
    const notes = extra ? `${originNote} | ${extra}` : originNote

    startTransition(async () => {
      const result = await requestPartsBulk(
        selectedOrder.id,
        draftRequestedParts.map((p) => ({
          partSku: p.sku,
          partName: p.name,
          quantity: p.quantity
        })),
        { notes }
      )

      if (result.success) {
        setPartRequestSuccess('Solicitud enviada correctamente')
        setTimeout(() => {
          router.refresh()
          resetPartRequestForm()
        }, 900)
      } else {
        setPartRequestError(result.error || 'Error al enviar solicitud')
      }
    })
  }

  const openWarehousePicker = () => {
    setPartRequestError(null)
    setIsWarehousePickerOpen(true)
  }

  return (
    <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2e] p-6 shadow-xl transition-all">
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* TABS STAGE INDICATOR */}
        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-[#1a1f2e] p-1.5 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-inner">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex items-center justify-center gap-3 py-4 rounded-[2rem] transition-all duration-500 overflow-hidden group",
                  isActive
                    ? "bg-white dark:bg-[#0f1419] shadow-2xl scale-[1.02] z-10"
                    : "hover:bg-white/50 dark:hover:bg-white/5 opacity-60 hover:opacity-100"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl transition-colors duration-500",
                  isActive ? "bg-amber-600 dark:bg-amber-500 shadow-lg shadow-amber-500/20" : "bg-gray-200 dark:bg-gray-800"
                )}>
                  <tab.Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-white" : "text-gray-500 dark:text-gray-400"
                  )} />
                </div>
                <div className="flex flex-col items-start">
                  <Text variant="label" className={cn(
                    "tracking-[0.1em]",
                    isActive ? "text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"
                  )}>
                    Etapa
                  </Text>
                  <Text variant="body" className={cn(
                    "font-black uppercase tracking-tight",
                    isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                  )}>
                    {tab.label}
                  </Text>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-4">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar de Órdenes Premium */}
          <div className="lg:col-span-3 h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-[#0f1419] rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 opacity-60">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <Text variant="label" className="text-gray-400">Sin órdenes activas</Text>
              </div>
            ) : (
              filteredOrders.map(wo => {
                const isSelected = selectedId === wo.id
                const classifications = getWorkshopClassifications(wo.asset)

                return (
                  <button
                    key={wo.id}
                    onClick={() => setSelectedId(wo.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all duration-500 group relative overflow-hidden",
                      isSelected
                        ? "bg-white dark:bg-[#1a1f2e] border-indigo-500/50 shadow-2xl shadow-indigo-500/10 ring-4 ring-indigo-500/5"
                        : "bg-gray-50/50 dark:bg-[#0f1419] border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                  >
                    {isSelected && <span className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />}
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-400 text-xs font-black rounded-lg border border-gray-100 dark:border-surface-700 uppercase tracking-tighter">
                        OS-{wo.work_order_number?.split('-')[1] || wo.work_order_number}
                      </span>
                      <span className={cn(
                        "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest",
                        wo.status.includes('fail') || wo.status.includes('rejected') ? "text-rose-500" : "text-emerald-500"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", wo.status.includes('fail') || wo.status.includes('rejected') ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                        {statusLabels[wo.status] || wo.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight uppercase leading-tight">
                      {wo.asset?.manufacturer} {wo.asset?.model}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                      <span>{wo.asset?.internal_tag}</span>
                      <span className="opacity-30">•</span>
                      <span className="text-gray-400/60">{wo.asset?.serial_number || 'S/N'}</span>
                    </div>

                    <div className="mt-4 flex gap-2 flex-wrap">
                      {classifications.rec && <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-md border border-amber-100 dark:border-amber-500/20">{classifications.rec}</span>}
                      {classifications.f && <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black rounded-md border border-sky-100 dark:border-sky-500/20">{classifications.f}</span>}
                      {classifications.c && <span className="px-2 py-0.5 bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-surface-400 text-[10px] font-black rounded-md border border-gray-200 dark:border-surface-700">{classifications.c}</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-9 space-y-6">
            {!selectedOrder ? (
              <div className="rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-20 text-center shadow-xl transition-all flex flex-col items-center justify-center space-y-4">
                <div className="p-5 rounded-full bg-gray-50 dark:bg-surface-950 shadow-inner">
                  <Wrench className="w-10 h-10 text-gray-200 dark:text-surface-800" />
                </div>
                <p className="text-gray-400 dark:text-surface-500 font-black uppercase tracking-[0.3em] text-[10px]">Selecciona una orden de trabajo para ver detalles</p>
              </div>
            ) : (
              <>
                {/* Equipment Info Section */}
                <section className="rounded-2xl border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 shadow-xl transition-all space-y-8">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-600 dark:text-surface-400 leading-none mb-1.5">OS</p>
                        <p className="text-4xl font-black text-gray-900 dark:text-emerald-400 tracking-tighter">#{formatWorkOrderId(selectedOrder)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-gray-600 dark:text-surface-400 font-black leading-none mb-1.5">Estado</p>
                        <p className="text-gray-900 dark:text-white font-black uppercase tracking-wider text-xs">{statusLabels[selectedOrder.status] ?? selectedOrder.status}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-gray-600 dark:text-surface-400 font-black leading-none mb-1.5">Serie/IMEI</p>
                        <p className="text-gray-900 dark:text-white font-mono text-sm font-bold tracking-tighter">{selectedOrder.asset?.serial_number ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-gray-600 dark:text-surface-400 font-black leading-none mb-1.5">Clasificación</p>
                        <p className="text-gray-900 dark:text-white text-sm font-black">{classificationLabel}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-gray-50 dark:border-surface-800">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-700 dark:text-surface-500 leading-none">Marca</p>
                      <p className="text-gray-900 dark:text-white font-black text-sm uppercase">{selectedOrder.asset?.manufacturer ?? '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-700 dark:text-surface-500 leading-none">Modelo</p>
                      <p className="text-gray-900 dark:text-white font-black text-sm uppercase">{selectedOrder.asset?.model ?? '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-700 dark:text-surface-500 leading-none">Color</p>
                      <p className="text-gray-900 dark:text-white font-black text-sm uppercase">{selectedOrder.asset?.color ?? '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-700 dark:text-surface-500 leading-none">Creado</p>
                      <p className="text-gray-900 dark:text-white font-black text-xs uppercase">{new Date(selectedOrder.created_at).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                  {selectedOrder.reported_issue && (
                    <div className="mt-4 rounded-3xl border border-dashed border-gray-200 dark:border-surface-800 bg-gray-50 dark:bg-surface-950/50 p-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-surface-400 leading-none">Falla Reportada</p>
                      </div>
                      <p className="text-gray-600 dark:text-surface-300 font-bold text-sm italic">&quot;{selectedOrder.reported_issue}&quot;</p>
                    </div>
                  )}
                </section>

                {/* Diagnóstico Stage Content */}
                {isDiagnosticoStage && (
                  <section className="rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 shadow-xl transition-all space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                    <div className="flex items-center justify-between border-b border-gray-50 dark:border-surface-800 pb-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-surface-500">Diagnóstico y Acciones</p>
                    </div>

                    {/* Diagnosis Actions Premium */}
                    <div className="flex flex-wrap gap-3 mb-8">
                      {diagnosisActions.map((action) => (
                        <button
                          key={action.key}
                          type="button"
                          onClick={() => setSelectedDiagnosisAction(action.key)}
                          className={cn(
                            'px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border shadow-sm',
                            selectedDiagnosisAction === action.key
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-white dark:bg-surface-950 border-gray-100 dark:border-surface-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800'
                          )}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>

                    {/* Failure Selector Premium */}
                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex-1 relative group">
                        <select
                          value={selectedFailure}
                          onChange={(e) => setSelectedFailure(e.target.value)}
                          className="w-full rounded-2xl border-2 border-gray-100 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-6 py-4 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none appearance-none"
                        >
                          <option value="">Seleccionar falla...</option>
                          {FAILURE_TYPES.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDiagnosis}
                        disabled={!selectedFailure}
                        className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-xl shadow-indigo-500/20 active:scale-90 flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Agregar
                      </button>
                    </div>

                    {/* Diagnosis Details Premium */}
                    {diagnosisDetails.length > 0 && (
                      <div className="overflow-hidden rounded-[2rem] border border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 p-2 mb-8 shadow-inner transition-all">
                        <table className="min-w-full text-left">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700 dark:text-surface-400">
                              <th className="px-6 py-4">Código</th>
                              <th className="px-6 py-4">Descripción</th>
                              <th className="px-6 py-4 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {diagnosisDetails.map((d, i) => (
                              <tr key={i} className="group hover:bg-white dark:hover:bg-surface-900 transition-colors duration-300">
                                <td className="px-6 py-4">
                                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-tighter transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500">
                                    {d.code}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                  {d.description}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDiagnosis(i)}
                                    className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Comment Premium */}
                    <div className="space-y-4 mb-10">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-surface-400">Comentarios Técnicos</label>
                      <textarea
                        value={diagnosisComment}
                        onChange={(e) => setDiagnosisComment(e.target.value)}
                        placeholder="Describa el estado detallado del equipo..."
                        rows={4}
                        className="w-full rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f1419] px-8 py-6 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none shadow-inner"
                      />
                    </div>

                    {/* Send Button Premium */}
                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                          <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="relative">
                          <select
                            value={selectedDiagnosisAction}
                            onChange={(e) => setSelectedDiagnosisAction(e.target.value)}
                            className="appearance-none bg-transparent border-none pr-8 text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest focus:ring-0 cursor-pointer"
                          >
                            {diagnosisActions.map(action => (
                              <option key={action.key} value={action.key}>{action.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <button
                        onClick={handleSendToRepair}
                        disabled={isPending || diagnosisDetails.length === 0}
                        className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50 active:scale-95 flex items-center gap-3"
                      >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                        {sendButtonLabel}
                      </button>
                    </div>

                    {sendError && <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold uppercase text-center mt-4 animate-in shake">{sendError}</div>}
                    {sendSuccess && <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase text-center mt-4 animate-in zoom-in">{sendSuccess}</div>}
                  </section>
                )}

                {/* Reparación Stage Content */}
                {isReparacionStage && (
                  <section className="rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 shadow-xl transition-all space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                    <div className="flex items-center justify-between border-b border-gray-50 dark:border-surface-800 pb-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-700 dark:text-surface-400">Reparación</p>
                    </div>

                    {selectedOrder?.diagnosis && (
                      <div className="rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 p-8 mb-8 shadow-inner animate-in fade-in duration-500">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-indigo-100/50 dark:border-indigo-500/10">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <Search className="w-3 h-3" />
                            Diagnóstico Técnico Registrado
                          </p>
                          <span className="px-2.5 py-1 bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-100 dark:border-indigo-700 shadow-sm uppercase tracking-tighter">
                            OS-{selectedOrder.work_order_number}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed italic">
                          &quot;{selectedOrder.diagnosis}&quot;
                        </p>
                      </div>
                    )}

                    {/* Repair Mode Tabs Premium */}
                    <div className="flex p-1.5 bg-gray-50 dark:bg-surface-950 rounded-2xl gap-2 border border-gray-100 dark:border-surface-800 mb-10 shadow-inner max-w-md">
                      {repairModes.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSelectedRepairMode(mode)}
                          className={cn(
                            'flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500',
                            selectedRepairMode === mode
                              ? 'bg-white dark:bg-surface-900 text-indigo-600 dark:text-indigo-400 shadow-lg border border-gray-100 dark:border-gray-700'
                              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    {/* Parts Mode Premium */}
                    {selectedRepairMode === 'Partes' && (
                      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Card 1: Repairs list */}
                        <div className="rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 p-8 shadow-inner">
                          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700 dark:text-surface-400 flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              Registro de Reparaciones
                            </p>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[9px] font-black rounded-lg border border-gray-100 dark:border-gray-700 uppercase">
                              Nivel: {repairLevelMap[selectedRepairMode] ?? 'L1'}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-8">
                            <div className="flex-1 relative group">
                              <select
                                value={selectedRepairOption}
                                onChange={(e) => setSelectedRepairOption(e.target.value)}
                                className="w-full rounded-2xl border-2 border-gray-100 dark:border-surface-700 bg-white dark:bg-surface-900 px-6 py-4 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none appearance-none"
                              >
                                {repairOptions.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <button
                              type="button"
                              onClick={handleAddRepair}
                              className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                            >
                              <Plus className="w-5 h-5" />
                              Agregar
                            </button>
                          </div>

                          {repairsList.length > 0 ? (
                            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-sm transition-all">
                              <table className="min-w-full text-left text-sm text-gray-600 dark:text-surface-300">
                                <thead>
                                  <tr className="text-[11px] uppercase tracking-[0.3em] text-gray-700 dark:text-surface-400">
                                    <th className="px-3 py-2">Reparación</th>
                                    <th className="px-3 py-2">Código</th>
                                    <th className="px-3 py-2">Nivel</th>
                                    <th className="px-3 py-2"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-800">
                                  {repairsList.map((r, i) => (
                                    <tr key={i}>
                                      <td className="px-3 py-2">{r.repair}</td>
                                      <td className="px-3 py-2 font-mono text-emerald-400">{r.code}</td>
                                      <td className="px-3 py-2">{r.level}</td>
                                      <td className="px-3 py-2">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRepair(i)}
                                          className="text-rose-400 hover:text-rose-300"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="rounded-3xl border border-dashed border-gray-200 dark:border-surface-800 bg-white dark:bg-surface-950/40 p-12 text-center">
                              <p className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-surface-400">Añade un tipo de reparación.</p>
                            </div>
                          )}
                        </div>

                        {/* Card 2: Request parts to warehouse */}
                        <div className="rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900/40 p-8 space-y-8 shadow-xl transition-all">
                          <div className="flex items-start justify-between gap-3 border-b border-gray-50 dark:border-surface-800 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 shadow-lg shadow-purple-500/10">
                                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.4em] text-gray-700 dark:text-surface-400 font-black leading-none mb-1">Solicitud a bodega</p>
                                <p className="text-sm text-gray-600 dark:text-surface-300 font-bold uppercase tracking-wider">
                                  Destino: <span className="text-purple-600 dark:text-purple-400">{selectedPartsSource}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-6 p-4 bg-gray-50 dark:bg-surface-950 rounded-2xl border border-gray-100 dark:border-surface-800">
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-700 dark:text-surface-400">Bodega Origen:</span>
                            {partsSourceOptions.map((opt) => (
                              <label key={opt} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-700 dark:text-surface-400 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <input
                                  type="radio"
                                  name="parts-source"
                                  checked={selectedPartsSource === opt}
                                  onChange={() => setSelectedPartsSource(opt)}
                                  className="accent-indigo-600 h-4 w-4"
                                />
                                {opt}
                              </label>
                            ))}
                          </div>

                          {partRequestError && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-rose-400" />
                              <p className="text-sm text-rose-400">{partRequestError}</p>
                            </div>
                          )}
                          {partRequestSuccess && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                              <p className="text-sm text-emerald-400">{partRequestSuccess}</p>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                                <input
                                  value={partsSearchQuery}
                                  onChange={(e) => setPartsSearchQuery(e.target.value)}
                                  placeholder="Buscar por SKU o nombre (mín. 2 letras)..."
                                  className="w-full pl-11 pr-10 py-4 rounded-2xl border border-gray-100 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder-surface-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none"
                                />
                                {isPartsSearching && (
                                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 animate-spin" />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={openWarehousePicker}
                                disabled={isPending}
                                className="h-[46px] w-[46px] rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition flex items-center justify-center"
                                aria-label="Conectar a bodega"
                                title="Conectar a bodega"
                              >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
                              </button>
                            </div>

                            {partsSearchResults.length > 0 && (
                              <div className="overflow-hidden rounded-xl border border-surface-800 bg-surface-950">
                                {partsSearchResults.map((part) => (
                                  <button
                                    key={part.id}
                                    type="button"
                                    onClick={() => {
                                      setDraftRequestedParts((prev) => {
                                        const existing = prev.find((p) => p.sku === part.sku)
                                        if (existing) {
                                          return prev.map((p) => p.sku === part.sku ? { ...p, quantity: p.quantity + 1 } : p)
                                        }
                                        return [
                                          ...prev,
                                          {
                                            sku: part.sku,
                                            name: part.name,
                                            quantity: 1,
                                            available: part.stock_quantity,
                                            location: part.location,
                                            source: 'good'
                                          }
                                        ]
                                      })
                                      setPartsSearchQuery('')
                                      setPartsSearchResults([])
                                      setPartRequestError(null)
                                    }}
                                    className="w-full px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-surface-900 transition-all border-b border-gray-50 dark:border-surface-800 last:border-b-0 group"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-gray-900 dark:text-white text-sm font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors uppercase">{part.name}</p>
                                        <p className="text-[10px] font-mono font-black text-gray-600 dark:text-surface-400 uppercase tracking-tighter">{part.sku}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className={cn(
                                          'text-[10px] font-black uppercase tracking-widest',
                                          part.stock_quantity > 5 ? 'text-emerald-600 dark:text-emerald-400' : part.stock_quantity > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                        )}>
                                          Stock: {part.stock_quantity}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-600">{part.location || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="rounded-3xl border border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 overflow-hidden shadow-inner transition-all">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 backdrop-blur-sm">
                              <p className="text-[10px] uppercase tracking-[0.4em] text-gray-700 dark:text-surface-400 font-black">Partes a solicitar</p>
                              <span className="px-2.5 py-1 bg-purple-500 text-white text-[9px] font-black rounded-lg">{draftRequestedParts.length} ITEM(S)</span>
                            </div>
                            {draftRequestedParts.length === 0 ? (
                              <p className="px-4 py-6 text-sm text-surface-500">Añade una parte a la lista.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm text-gray-600 dark:text-surface-300">
                                  <thead>
                                    <tr className="text-[10px] uppercase tracking-[0.2em] text-gray-700 dark:text-surface-400 font-black">
                                      <th className="px-6 py-4">SKU</th>
                                      <th className="px-6 py-4">Descripción</th>
                                      <th className="px-6 py-4">Cantidad</th>
                                      <th className="px-6 py-4">Disponible</th>
                                      <th className="px-6 py-4"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
                                    {draftRequestedParts.map((p) => (
                                      <tr key={p.sku}>
                                        <td className="px-3 py-2 font-mono text-emerald-400">{p.sku}</td>
                                        <td className="px-3 py-2">{p.name}</td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            min={1}
                                            value={p.quantity}
                                            onChange={(e) => handleUpdateDraftQty(p.sku, Number(e.target.value || 1))}
                                            className="w-20 rounded-xl border-2 border-gray-100 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-xs font-black text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none shadow-sm"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-xs text-surface-400">
                                          {typeof p.available === 'number' ? p.available : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveDraftPart(p.sku)}
                                            className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-95 group/btn"
                                            aria-label="Quitar"
                                          >
                                            <Trash2 className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Partes ya despachadas */}
                          {(selectedOrder as any)?.part_requests &&
                            (selectedOrder as any).part_requests.filter((pr: any) => pr.status === 'installed').length > 0 && (
                              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-emerald-500/20">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-400">Partes despachadas</p>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-emerald-400">
                                    <span>
                                      {(selectedOrder as any).part_requests.filter((pr: any) => pr.status === 'installed').length} item(s)
                                    </span>
                                    <span className="flex items-center gap-2 uppercase tracking-[0.3em]">
                                      <span className="text-[10px] text-emerald-300">Más despachado</span>
                                      <span className="text-[11px] font-semibold text-emerald-200">{partDispatchCompleted ? 'SI' : 'NO'}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-left text-sm text-surface-300">
                                    <thead>
                                      <tr className="text-[11px] uppercase tracking-[0.3em] text-surface-500">
                                        <th className="px-3 py-2">SKU</th>
                                        <th className="px-3 py-2">Descripción</th>
                                        <th className="px-3 py-2">Cantidad</th>
                                        <th className="px-3 py-2">Fecha despacho</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-500/10">
                                      {(selectedOrder as any).part_requests
                                        .filter((pr: any) => pr.status === 'installed')
                                        .map((pr: any) => (
                                          <tr key={pr.id}>
                                            <td className="px-3 py-2 font-mono text-emerald-400">{pr.part_sku}</td>
                                            <td className="px-3 py-2 text-emerald-300">{pr.part_name || '—'}</td>
                                            <td className="px-3 py-2 text-emerald-300">{pr.quantity || 1}</td>
                                            <td className="px-3 py-2 text-xs text-emerald-400/80">
                                              {pr.dispatch_date
                                                ? new Date(pr.dispatch_date).toLocaleDateString('es-GT', {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })
                                                : pr.installed_at
                                                  ? new Date(pr.installed_at).toLocaleDateString('es-GT', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                  })
                                                  : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                          <div>
                            <label className="text-[11px] uppercase tracking-[0.35em] text-surface-500 block mb-1">
                              Notas (opcional)
                            </label>
                            <textarea
                              value={partsNotes}
                              onChange={(e) => setPartsNotes(e.target.value)}
                              rows={3}
                              placeholder="Ej: prioridad / detalle de la pieza..."
                              className="w-full rounded-2xl border-2 border-gray-100 dark:border-surface-700 bg-white dark:bg-surface-950 px-6 py-4 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder-surface-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none"
                            />
                            <p className="text-[11px] text-surface-500 mt-1">
                              Se enviará también: <span className="font-mono">{`Bodega: ${selectedPartsSource}`}</span>
                            </p>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleSubmitDraftParts}
                              disabled={isPending || draftRequestedParts.length === 0}
                              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-500 disabled:opacity-50 transition flex items-center gap-2"
                            >
                              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                              Solicitar Partes
                            </button>
                          </div>
                        </div>

                        {/* Picker Modal */}
                        {isWarehousePickerOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
                            <div
                              className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
                              onClick={() => setIsWarehousePickerOpen(false)}
                            />
                            <div className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-2xl animate-in zoom-in-95 duration-300">
                              <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-surface-800">
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 dark:text-surface-500 font-black leading-none mb-1.5">Conexión a bodega</p>
                                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Bodega: {selectedPartsSource}</p>
                                  <p className="text-gray-500 dark:text-surface-400 text-xs font-bold mt-1 uppercase tracking-widest">
                                    Filtra por Marca / Modelo / Tipo de producto
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIsWarehousePickerOpen(false)}
                                  className="p-3 rounded-2xl bg-gray-50 dark:bg-surface-950 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 transition-all shadow-sm"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>

                              <div className="p-5 space-y-4">
                                {(pickerFiltersError || pickerError) && (
                                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                                    <p className="text-sm text-rose-400">{pickerFiltersError || pickerError}</p>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                  <div>
                                    <label className="text-[11px] uppercase tracking-[0.35em] text-surface-500 block mb-1">Tipo de producto</label>
                                    <select
                                      value={pickerProductType}
                                      onChange={(e) => setPickerProductType(e.target.value)}
                                      disabled={pickerFiltersLoading}
                                      className="w-full rounded-2xl border-2 border-gray-50 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none appearance-none"
                                    >
                                      <option value="">Todos</option>
                                      {!pickerHasProductTypeOption && (
                                        <option value={pickerProductType}>{pickerProductType}</option>
                                      )}
                                      {pickerProductTypes.map((pt) => (
                                        <option key={pt.id} value={pt.name}>{pt.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[11px] uppercase tracking-[0.35em] text-surface-500 block mb-1">Marca</label>
                                    <select
                                      value={pickerBrand}
                                      onChange={(e) => setPickerBrand(e.target.value)}
                                      disabled={pickerFiltersLoading}
                                      className="w-full rounded-2xl border-2 border-gray-50 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none appearance-none"
                                    >
                                      <option value="">Todas</option>
                                      {!pickerHasBrandOption && (
                                        <option value={pickerBrand}>{pickerBrand}</option>
                                      )}
                                      {pickerBrands.map((b) => (
                                        <option key={b.id} value={b.name}>{b.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[11px] uppercase tracking-[0.35em] text-surface-500 block mb-1">Modelo</label>
                                    <select
                                      value={pickerModel}
                                      onChange={(e) => setPickerModel(e.target.value)}
                                      disabled={pickerFiltersLoading}
                                      className="w-full rounded-2xl border-2 border-gray-50 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none appearance-none"
                                    >
                                      <option value="">Todos</option>
                                      {!pickerHasModelOption && (
                                        <option value={pickerModel}>{pickerModel}</option>
                                      )}
                                      {pickerFilteredModels.map((m) => (
                                        <option key={m.id} value={m.name}>{m.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[11px] uppercase tracking-[0.35em] text-surface-500 block mb-1">Buscar</label>
                                    <input
                                      value={pickerQuery}
                                      onChange={(e) => setPickerQuery(e.target.value)}
                                      placeholder="SKU o nombre..."
                                      className="w-full rounded-2xl border-2 border-gray-50 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder-surface-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none shadow-sm"
                                    />
                                  </div>
                                </div>

                                <div className="rounded-[2rem] border border-gray-100 dark:border-surface-800 bg-gray-50/50 dark:bg-surface-950 overflow-hidden shadow-inner transition-all mt-4">
                                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 backdrop-blur-sm">
                                    <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 dark:text-surface-500 font-black">Resultados de Búsqueda</p>
                                    {pickerLoading && <Loader2 className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-spin" />}
                                  </div>

                                  <div className="max-h-[420px] overflow-y-auto">
                                    {pickerSource === 'good' ? (
                                      pickerResultsGood.length === 0 ? (
                                        <p className="px-4 py-6 text-sm text-surface-500">Sin resultados con esos filtros.</p>
                                      ) : (
                                        pickerResultsGood.map((p) => (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                              setDraftRequestedParts((prev) => {
                                                const existing = prev.find((x) => x.sku === p.sku)
                                                if (existing) {
                                                  return prev.map((x) => x.sku === p.sku ? { ...x, quantity: x.quantity + 1 } : x)
                                                }
                                                return [
                                                  ...prev,
                                                  {
                                                    sku: p.sku,
                                                    name: p.name,
                                                    quantity: 1,
                                                    available: p.stock_quantity,
                                                    location: p.location,
                                                    source: 'good'
                                                  }
                                                ]
                                              })
                                              setIsWarehousePickerOpen(false)
                                            }}
                                            className="w-full text-left px-8 py-5 hover:bg-white dark:hover:bg-surface-900 transition-all border-b border-gray-100 dark:border-surface-800 last:border-b-0 group"
                                          >
                                            <div className="flex items-center justify-between gap-6">
                                              <div>
                                                <p className="text-gray-900 dark:text-white font-black text-sm uppercase group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-none mb-1">{p.name}</p>
                                                <div className="flex items-center gap-3">
                                                  <p className="text-[10px] font-mono font-black text-gray-400 dark:text-surface-600 uppercase tracking-tighter">{p.sku}</p>
                                                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-surface-700" />
                                                  <p className="text-[9px] font-black uppercase tracking-widest text-purple-500 decoration-purple-500/30">{p.category}</p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <p className={cn(
                                                  'text-[10px] font-black uppercase tracking-widest mb-0.5',
                                                  p.stock_quantity > 5 ? 'text-emerald-600 dark:text-emerald-400' : p.stock_quantity > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                                )}>
                                                  Stock: {p.stock_quantity}
                                                </p>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-600">{p.location || 'N/A'}</p>
                                              </div>
                                            </div>
                                          </button>
                                        ))
                                      )
                                    ) : (
                                      pickerResultsHarvest.length === 0 ? (
                                        <p className="px-4 py-6 text-sm text-surface-500">Sin resultados con esos filtros.</p>
                                      ) : (
                                        pickerResultsHarvest.map((p) => (
                                          <button
                                            key={p.sku}
                                            type="button"
                                            onClick={() => {
                                              setDraftRequestedParts((prev) => {
                                                const existing = prev.find((x) => x.sku === p.sku)
                                                if (existing) {
                                                  return prev.map((x) => x.sku === p.sku ? { ...x, quantity: x.quantity + 1 } : x)
                                                }
                                                return [
                                                  ...prev,
                                                  {
                                                    sku: p.sku,
                                                    name: (p.part_name || p.sku),
                                                    quantity: 1,
                                                    available: p.total_quantity,
                                                    source: 'harvest'
                                                  }
                                                ]
                                              })
                                              setIsWarehousePickerOpen(false)
                                            }}
                                            className="w-full text-left px-8 py-5 hover:bg-white dark:hover:bg-surface-900 transition-all border-b border-gray-100 dark:border-surface-800 last:border-b-0 group"
                                          >
                                            <div className="flex items-center justify-between gap-6">
                                              <div>
                                                <p className="text-gray-900 dark:text-white font-black text-sm uppercase group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-none mb-1">{p.part_name || p.sku}</p>
                                                <div className="flex items-center gap-3">
                                                  <p className="text-[10px] font-mono font-black text-gray-400 dark:text-surface-600 uppercase tracking-tighter">{p.sku}</p>
                                                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-surface-700" />
                                                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                                                    {p.condition_summary}{p.disposition ? ` • ${p.disposition}` : ''}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <p className={cn(
                                                  'text-[10px] font-black uppercase tracking-widest mb-0.5',
                                                  p.total_quantity > 5 ? 'text-emerald-600 dark:text-emerald-400' : p.total_quantity > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                                )}>
                                                  Qty: {p.total_quantity}
                                                </p>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-600">{p.received_from || 'Harvesting'}</p>
                                              </div>
                                            </div>
                                          </button>
                                        ))
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Software Mode */}
                    {selectedRepairMode === 'Software' && (
                      <div className="rounded-2xl border border-surface-800 bg-surface-950/40 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-[0.35em] text-surface-500">Reparación</p>
                        </div>

                        <select
                          value={selectedSoftwareRepairOption}
                          onChange={(e) => setSelectedSoftwareRepairOption(e.target.value)}
                          className="w-full rounded-xl border border-surface-700 bg-surface-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus-visible:outline-none"
                        >
                          {softwareRepairOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] uppercase tracking-[0.4em] text-surface-500 block mb-1">Versión In</label>
                            <input
                              type="text"
                              value={softwareVersionIn}
                              onChange={(e) => setSoftwareVersionIn(e.target.value)}
                              placeholder="Versión de ingreso"
                              className="w-full rounded-xl border border-surface-700 bg-surface-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus-visible:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] uppercase tracking-[0.4em] text-surface-500 block mb-1">Versión Out</label>
                            <input
                              type="text"
                              value={softwareVersionOut}
                              onChange={(e) => setSoftwareVersionOut(e.target.value)}
                              placeholder="Versión de salida"
                              className="w-full rounded-xl border border-surface-700 bg-surface-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus-visible:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Send to QC Button */}
                    <div className="flex justify-end pt-8 border-t border-gray-100 dark:border-surface-800">
                      <button
                        type="button"
                        onClick={handleSendToQuality}
                        disabled={isPending || !selectedOrder}
                        className="px-10 py-5 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-3"
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                        Enviar a Control de Calidad
                      </button>
                    </div>

                    {repairActionMessage && <p className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest text-center mt-4 animate-in fade-in">{repairActionMessage}</p>}
                  </section>
                )}

                {/* QC Stage Content */}
                {isQcStage && (
                  <section className="rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 shadow-xl transition-all space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                    <div className="flex items-center justify-between border-b border-gray-50 dark:border-surface-800 pb-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-surface-500">Control de Calidad</p>
                    </div>

                    {/* Tabla de Registros */}
                    <div className="rounded-3xl border border-gray-100 dark:border-surface-800 overflow-hidden bg-gray-50 dark:bg-surface-950 shadow-inner">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
                          <tr className="bg-white/50 dark:bg-surface-900/50 hover:bg-white dark:hover:bg-surface-900 transition-colors">
                            <td className="px-6 py-4 font-black text-gray-400 dark:text-surface-500 text-[10px] uppercase tracking-widest w-48">Diagnóstico registrado</td>
                            <td className="px-6 py-4 text-gray-700 dark:text-surface-300 font-bold italic">
                              &quot;{selectedOrder?.diagnosis ? selectedOrder.diagnosis : 'Sin diagnóstico registrado'}&quot;
                            </td>
                          </tr>
                          <tr className="bg-white/50 dark:bg-surface-900/50 hover:bg-white dark:hover:bg-surface-900 transition-colors">
                            <td className="px-6 py-4 font-black text-gray-400 dark:text-surface-500 text-[10px] uppercase tracking-widest w-48">Reparación registrada</td>
                            <td className="px-6 py-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 dark:text-surface-600 font-bold text-[10px] uppercase">Opción: </span>
                                  <span className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-wide">{selectedRepairMode === 'Software' ? 'Actualización de Softwares' : selectedRepairOption}</span>
                                </div>
                                {selectedPartsSource && selectedRepairMode === 'Partes' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 dark:text-surface-600 font-bold text-[10px] uppercase">Origen: </span>
                                    <span className="text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-wide">{selectedPartsSource}</span>
                                  </div>
                                )}
                                {repairsList.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 dark:text-surface-600 font-bold text-[10px] uppercase">Tareas: </span>
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-100 dark:border-indigo-500/20">{repairsList.length} ITEM(S)</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                          <tr className="bg-white/50 dark:bg-surface-900/50 hover:bg-white dark:hover:bg-surface-900 transition-colors">
                            <td className="px-6 py-4 font-black text-gray-400 dark:text-surface-500 text-[10px] uppercase tracking-widest w-48">Partes despachadas</td>
                            <td className="px-6 py-4">
                              {installedPartRequests.length > 0 ? (
                                <ul className="text-xs space-y-2">
                                  {installedPartRequests.map((pr: any) => (
                                    <li key={pr.id} className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black rounded border border-emerald-100 dark:border-emerald-500/20 uppercase font-mono">{pr.part_sku}</span>
                                      <span className="text-gray-600 dark:text-surface-400 font-bold truncate">
                                        {pr.part_name ? pr.part_name : ''}
                                      </span>
                                      <span className="text-gray-400 dark:text-surface-600 font-black text-[10px]">x{pr.quantity || 1}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-surface-600">No se han despachado partes.</p>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Clasificaciones */}
                    <div className="rounded-[2rem] border border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 p-8 space-y-6 shadow-inner">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-500 flex items-center gap-2">
                        <Radar className="w-4 h-4" />
                        Clasificaciones de salida
                      </p>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-surface-600 block leading-none">REC</label>
                          <select
                            value={selectedOutputClassificationRec}
                            onChange={(event) => setSelectedOutputClassificationRec(event.target.value)}
                            className="w-full rounded-2xl border-2 border-gray-100 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                          >
                            <option value="">Mantener actual</option>
                            {outputClassificationRECOptions.map((rec) => (
                              <option key={rec} value={rec}>{rec}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-surface-600 block leading-none">F (Funcional)</label>
                          <select
                            value={selectedOutputClassificationF}
                            onChange={(event) => setSelectedOutputClassificationF(event.target.value)}
                            className="w-full rounded-2xl border-2 border-gray-100 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                          >
                            <option value="">Mantener actual</option>
                            {outputClassificationFOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-surface-600 block leading-none">C (Cosmético)</label>
                          <select
                            value={selectedOutputClassificationC}
                            onChange={(event) => setSelectedOutputClassificationC(event.target.value)}
                            className="w-full rounded-2xl border-2 border-gray-100 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                          >
                            <option value="">Mantener actual</option>
                            {outputClassificationCOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Evidencias */}
                    <div className="rounded-[2rem] border border-gray-100 dark:border-surface-800 bg-gray-50/50 dark:bg-surface-950 p-8 space-y-6 shadow-inner transition-all">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-500 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Evidencias de QC
                      </p>

                      {/* Visor de Fotos */}
                      {qcEvidenceUrls.length > 0 && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-400 dark:text-surface-600 uppercase tracking-widest leading-none">{qcEvidenceUrls.length} foto(s) capturadas</p>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                            {qcEvidenceUrls.slice(0, 5).map((url, index) => (
                              <div
                                key={index}
                                className="relative aspect-square rounded-[1.5rem] overflow-hidden border-2 border-white dark:border-surface-800 bg-white dark:bg-surface-950 group shadow-lg shadow-black/5"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Evidencia ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQcEvidenceUrls((prev) => prev.filter((_, i) => i !== index))
                                    setQcEvidenceFiles((prev) => prev.filter((_, i) => i !== index))
                                  }}
                                  className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Eliminar foto"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Input de Fotos */}
                      <label className="block group">
                        <span className="text-[10px] font-black text-gray-400 dark:text-surface-600 uppercase tracking-widest mb-3 block">Subir fotos (máximo 5 evidencias)</span>
                        <div className="relative">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            disabled={qcEvidenceUrls.length >= 5 || isUploadingEvidence}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              const remaining = 5 - qcEvidenceUrls.length
                              const filesToAdd = files.slice(0, remaining)
                              setQcEvidenceFiles((prev) => [...prev, ...filesToAdd])

                              // Create preview URLs
                              filesToAdd.forEach((file) => {
                                const reader = new FileReader()
                                reader.onload = (event) => {
                                  const url = event.target?.result as string
                                  setQcEvidenceUrls((prev) => [...prev.slice(0, 4), url].slice(-5))
                                }
                                reader.readAsDataURL(file)
                              })
                            }}
                            className="w-full h-24 rounded-3xl border-2 border-dashed border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950/50 px-8 py-3 text-sm text-transparent file:hidden hover:border-indigo-500/50 hover:bg-white dark:hover:bg-surface-900 transition-all cursor-pointer"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                            <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Seleccionar Archivos</p>
                          </div>
                        </div>
                      </label>

                      {qcEvidenceUrls.length >= 5 && (
                        <p className="text-xs text-amber-400">Máximo de 5 fotos alcanzado</p>
                      )}
                    </div>

                    {/* QC Checklist */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-surface-950 p-6 rounded-3xl border border-gray-100 dark:border-surface-800 shadow-inner">
                      {qcChecklist.map((item) => (
                        <label key={item} className="flex items-center gap-4 text-gray-600 dark:text-surface-400 text-[10px] font-black uppercase tracking-widest cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={qcChecks[item] ?? false}
                              onChange={(e) => setQcChecks((prev) => ({ ...prev, [item]: e.target.checked }))}
                              className="w-6 h-6 rounded-xl border-2 border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 checked:bg-emerald-500 checked:border-emerald-500 appearance-none transition-all cursor-pointer shadow-sm"
                            />
                            {qcChecks[item] && <CheckCircle className="absolute inset-x-0 mx-auto w-3.5 h-3.5 text-white pointer-events-none" />}
                          </div>
                          <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item}</span>
                        </label>
                      ))}
                    </div>

                    {/* QC Notes */}
                    <textarea
                      value={qcNotes}
                      onChange={(e) => setQcNotes(e.target.value)}
                      placeholder="Notas del control de calidad..."
                      rows={3}
                      className="w-full rounded-[2rem] border-2 border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 px-8 py-6 text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-inner"
                    />

                    {/* QC Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-gray-100 dark:border-surface-800">
                      <button
                        type="button"
                        onClick={handleQcReject}
                        disabled={isPending}
                        className="px-10 py-5 rounded-2xl bg-gray-100 dark:bg-surface-800 text-gray-500 dark:text-surface-400 font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white disabled:opacity-50 transition-all active:scale-95"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={handleQcApprove}
                        disabled={isPending || (!selectedOutputClassificationRec && !selectedOutputClassificationF && !selectedOutputClassificationC)}
                        title={!selectedOutputClassificationRec && !selectedOutputClassificationF && !selectedOutputClassificationC ? "Debe seleccionar al menos una clasificación (REC, F o C)" : ""}
                        className="px-10 py-5 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                        Aprobar QC
                      </button>
                    </div>

                    {sendError && <p className="text-rose-400 text-sm">{sendError}</p>}
                    {sendSuccess && <p className="text-emerald-400 text-sm">{sendSuccess}</p>}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
