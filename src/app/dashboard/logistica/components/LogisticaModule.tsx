'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Package, User, Plus, Trash2, FileText, Printer, ArrowLeft, Save, Edit, Edit2, Clock, Check, Box, AlertCircle, PackageOpen, CheckCircle2, Download, X } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { LogisticsTicket } from '../types'
import { CompanySettings } from '../../configuracion/usuarios/actions'
import { Badge } from '@/components/ui/Badge'
import { CollectionGuideModal } from './CollectionGuideModal'
import { TicketManagementModal } from './TicketManagementModal'
import { EquipmentLoadingModal } from './EquipmentLoadingModal'
import { ManifestModal } from './ManifestModal'
import { PDFTemplateModal } from './PDFTemplateModal'
import { useModal } from '../hooks/useModal'
import { usePDFTemplate } from '../hooks/usePDFTemplate'
import type { TicketData } from '../types/modal'

interface CatalogBrand {
  id: string
  name: string
}

interface CatalogModel {
  id: string
  name: string
  brand_id?: string | null
  brand?: {
    id: string
    name: string
  } | null
}

interface CatalogProductType {
  id: string
  name: string
}

interface ManifestInfo {
  manifestNumber: string
  securitySeal: string
}

interface LogisticaModuleProps {
  ticket: LogisticsTicket
  brands: CatalogBrand[]
  models: CatalogModel[]
  productTypes: CatalogProductType[]
  companySettings: CompanySettings | null
}

interface CurrentItemState {
  brandId: string
  modelId: string
  tipoProducto: string
  cantidad: number
}

interface BoxItem {
  id: number
  marca: string
  modelo: string
  brandId: string
  modelId: string
  tipoProducto: string
  serials: SerialEntry[]
  cantidad: number
}

interface BoxStructure {
  id?: number
  boxNumber: number
  items: BoxItem[]
  sku?: string
  seal?: string
}

interface SerialEntry {
  id: number
  serial: string
  status?: string
}

interface SerialModalConfig {
  quantity: number
  brandId: string
  modelId: string
  tipoProducto: string
}

interface EditItemModalState {
  itemId: number
  tipoProducto: string
  brandId: string
  modelId: string
  cantidad: number
  serials: SerialEntry[]
}

interface CollectorOption {
  id: string
  name: string
  phone?: string | null
  vehicleModel?: string | null
  vehiclePlate?: string | null
  source: 'profile' | 'custom'
}

const fallbackProductTypeNames = ['Laptop', 'Desktop', 'Monitor', 'Servidor', 'Switch', 'Router', 'Impresora', 'Tablet', 'Smartphone']

const InfoCard = () => (
  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-6">
    <div className="flex gap-4">
      <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-xl h-fit">
        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Información importante</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Asegúrese de verificar todos los items antes de finalizar la caja.
        </p>
      </div>
    </div>
  </div>
);

const LogisticaModule: React.FC<LogisticaModuleProps> = ({ ticket, brands, models, productTypes, companySettings }) => {
  // Determinar si es ticket DATA WIPE
  const isDataWipeTicket = ticket.type && (
    ticket.type === 'DATA WIPE' ||
    ticket.type === 'Data Wipe' ||
    ticket.type === 'data wipe' ||
    ticket.type === 'DATA_WIPE' ||
    ticket.type.toLowerCase().includes('wipe')
  )

  const [loadingBoxes, setLoadingBoxes] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode')

  // Declara currentBox primero
  const [currentBox, setCurrentBox] = useState<BoxStructure>({ boxNumber: 10001, items: [] })

  // Para DATA WIPE, view empieza como 'main' (vista principal), para otros tickets usa 'details' o 'manifest' si tiene items
  const [view, setView] = useState<'details' | 'boxes' | 'main' | 'manifest' | 'data_wipe' | 'data_wipe_boxes'>(
    initialMode === 'loading'
      ? 'manifest'
      : (isDataWipeTicket
        ? 'main'
        : (ticket.status === 'Completado' ? 'boxes' : 'details'))
  )

  const [collector, setCollector] = useState(ticket.staffLabel || '')
  const [collectors, setCollectors] = useState<CollectorOption[]>([])
  const [collectorsLoading, setCollectorsLoading] = useState(false)
  const [collectorsError, setCollectorsError] = useState<string | null>(null)
  const [savingCollector, setSavingCollector] = useState(false)
  const [metadataSaving, setMetadataSaving] = useState(false)
  const [metadataMessage, setMetadataMessage] = useState<string | null>(null)
  const [otherDetails, setOtherDetails] = useState('')
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [collectorName, setCollectorName] = useState(
    (ticket as any).collectorName || (ticket as any).collector_name || ''
  )
  const [collectorPhone, setCollectorPhone] = useState(
    (ticket as any).collectorPhone || (ticket as any).collector_phone || ''
  )
  const [vehicleModel, setVehicleModel] = useState(
    (ticket as any).vehicleModel || (ticket as any).vehicle_model || ''
  )
  const [vehiclePlate, setVehiclePlate] = useState(
    (ticket as any).vehiclePlate || (ticket as any).vehicle_plate || ''
  )
  const [boxes, setBoxes] = useState<BoxStructure[]>([])
  const [currentItem, setCurrentItem] = useState<CurrentItemState>({
    brandId: '',
    modelId: '',
    tipoProducto: '',
    cantidad: 1
  })
  const [editingBoxId, setEditingBoxId] = useState<number | string | null>(null)
  const [editItemModal, setEditItemModal] = useState<any>(null)
  const [printingBox, setPrintingBox] = useState<BoxStructure | null>(null)
  const [generatedDocuments, setGeneratedDocuments] = useState<{
    manifestNumber: string
    securitySeal: string
    manifestNotes: string
  } | null>(null)
  const [generatedTemplateHtml, setGeneratedTemplateHtml] = useState<string | null>(null)
  const [ticketAssets, setTicketAssets] = useState<any[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)

  // Variables para formulario de dispositivos múltiples
  const [multipleDevices, setMultipleDevices] = useState<Array<{
    brandId: string
    modelId: string
    tipoProducto: string
    cantidad: number
  }>>([])

  // Variables para formulario de transporte
  const [showTransportForm, setShowTransportForm] = useState(false)
  const [transportDetails, setTransportDetails] = useState({
    pilotName: '',
    vehiclePlate: '',
    phoneNumber: ''
  })
  const [transportSaving, setTransportSaving] = useState(false)
  const [transportMessage, setTransportMessage] = useState<string | null>(null)

  const manualCollectorId = `manual-${ticket.id}`

  const loadCollectors = useCallback(() => {
    let isMounted = true

    const parseErrorMessage = (payload: unknown) => {
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const message = (payload as { error?: unknown }).error
        if (typeof message === 'string') {
          return message
        }
      }
      return undefined
    }

    const run = async () => {
      setCollectorsLoading(true)
      setCollectorsError(null)

      try {
        const response = await fetch('/api/logistica/collectors')
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          const message = parseErrorMessage(payload)
          throw new Error(message || 'No fue posible cargar el personal de recolección')
        }

        if (!isMounted) return

        if (Array.isArray(payload)) {
          const normalized = payload
            .filter(
              (entry): entry is CollectorOption =>
                !!entry && typeof entry === 'object' && typeof (entry as CollectorOption).id === 'string'
            )
            .map((entry) => ({
              id: entry.id,
              name: entry.name || 'Recolector sin nombre',
              phone: entry.phone || undefined,
              vehicleModel: entry.vehicleModel || undefined,
              vehiclePlate: entry.vehiclePlate || undefined,
              source: (entry.source === 'custom' ? 'custom' : 'profile') as 'profile' | 'custom'
            }))

          setCollectors(normalized)
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Error cargando personal de logística:', error)
        setCollectorsError(error instanceof Error ? error.message : 'No fue posible cargar el personal de recolección')
      } finally {
        if (isMounted) {
          setCollectorsLoading(false)
        }
      }
    }

    run()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    loadCollectors()
  }, [loadCollectors])

  // Cargar cajas existentes al montar el componente
  useEffect(() => {
    const loadExistingBoxes = async () => {
      try {
        const query = encodeURIComponent(ticket.id)
        const response = await fetch(`/api/logistica/boxes?ticketReadableId=${query}`)
        if (!response.ok) {
          console.error('No se pudieron cargar cajas. Status:', response.status)
          return
        }

        const data = await response.json()

        // Cargar datos del ticket incluyendo collector_name
        if (data.ticket) {
          const ticketInfo = data.ticket
          // Intentar obtener más detalles del ticket desde operations_tickets
          const ticketResponse = await fetch(`/api/logistica/tickets/${ticket.id}`).catch(() => null)
          if (ticketResponse?.ok) {
            const ticketData = await ticketResponse.json()
            if (ticketData.collector_name) setCollectorName(ticketData.collector_name)
            if (ticketData.collector_phone) setCollectorPhone(ticketData.collector_phone)
            if (ticketData.vehicle_plate) setVehiclePlate(ticketData.vehicle_plate)
            if (ticketData.vehicle_model) setVehicleModel(ticketData.vehicle_model)
            if (ticketData.collector_name && !collector) setCollector('MANUAL')
          }
        }

        const boxesData = data.boxes || []
        if (!Array.isArray(boxesData) || boxesData.length === 0) {
          return
        }

        // Agrupar items por serial para reconstruir la estructura BoxStructure
        const loadedBoxes: BoxStructure[] = boxesData.map((box: any) => {
          const itemsMap = new Map<string, BoxItem>()

          box.items.forEach((item: any) => {
            const key = `${item.brand}-${item.model}-${item.product_type}`

            if (!itemsMap.has(key)) {
              itemsMap.set(key, {
                id: itemsMap.size + 1,
                marca: item.brand || '',
                modelo: item.model || '',
                brandId: item.brand_id || '',
                modelId: item.model_id || '',
                tipoProducto: item.product_type || '',
                cantidad: 0,
                serials: []
              })
            }

            const groupedItem = itemsMap.get(key)!
            const serialValue =
              item.collected_serial ||
              item.serial ||
              item.serial_number ||
              item.serialNumber ||
              (Array.isArray(item.serials) && item.serials.length > 0 ? item.serials[0] : null)

            if (serialValue) {
              groupedItem.serials.push({
                id: groupedItem.serials.length + 1,
                serial: serialValue,
                status: box.boxReceptionCode ? 'RECIBIDO' : (item.validation_status || 'PENDIENTE_VALIDACION')
              })
              groupedItem.cantidad = groupedItem.serials.length
            }
          })

          return {
            id: box.boxNumber,
            boxNumber: box.boxNumber || 10001,
            sku: box.boxSku || undefined,
            seal: box.boxSeal || undefined,
            items: Array.from(itemsMap.values())
          }
        })

        setBoxes(loadedBoxes)
      } catch (error) {
        console.error('Error cargando cajas existentes:', error)
      }
    }

    if (ticket.id) {
      loadExistingBoxes()
    }
  }, [ticket.id, collector])

  // Cargar el siguiente número de caja global
  const fetchNextBoxNumber = useCallback(async () => {
    try {
      const res = await fetch('/api/logistica/next-box-number')
      if (res.ok) {
        const data = await res.json()
        if (data.nextBoxNumber) {
          setCurrentBox(prev => ({ ...prev, boxNumber: data.nextBoxNumber }))
        }
      }
    } catch (e) {
      console.error('Error fetching next box number', e)
    }
  }, [])

  useEffect(() => {
    fetchNextBoxNumber()
  }, [fetchNextBoxNumber])

  // Cargar assets para tickets DATA WIPE
  useEffect(() => {
    const loadTicketAssets = async () => {
      if (!isDataWipeTicket || !ticket.id) return

      setAssetsLoading(true)
      try {
        const response = await fetch(`/api/logistica/assets?ticketId=${encodeURIComponent(ticket.id)}`)
        if (response.ok) {
          const data = await response.json()
          setTicketAssets(data.assets || [])
          console.log('Assets cargados exitosamente:', data.assets?.length || 0, 'items')
        } else {
          console.warn('Error en respuesta de API assets:', response.status, response.statusText)
          setTicketAssets([])
        }
      } catch (error) {
        console.error('Error cargando assets del ticket:', error)
        setTicketAssets([])
      } finally {
        setAssetsLoading(false)
      }
    }

    loadTicketAssets()
  }, [isDataWipeTicket, ticket.id])

  // Cargar datos del colector guardados en la BD
  useEffect(() => {
    const loadCollectorInfo = async () => {
      if (!ticket.id) return

      try {
        console.log('Cargando datos del colector desde BD para ticket:', ticket.id)
        const response = await fetch(`/api/logistica/collector-info?ticketId=${encodeURIComponent(ticket.id)}`)

        if (response.ok) {
          const data = await response.json()
          console.log('Datos del colector cargados desde BD:', data)

          if (data.collectorName) setCollectorName(data.collectorName)
          if (data.collectorPhone) setCollectorPhone(data.collectorPhone)
          if (data.vehicleModel) setVehicleModel(data.vehicleModel)
          if (data.vehiclePlate) setVehiclePlate(data.vehiclePlate)
        } else {
          console.warn('No hay datos guardados del colector')
        }
      } catch (error) {
        console.error('Error cargando datos del colector:', error)
      }
    }

    loadCollectorInfo()
  }, [ticket.id])

  const [serialModalState, setSerialModalState] = useState<SerialModalConfig | null>(null)
  const [serialDraft, setSerialDraft] = useState({ serial: '' })
  const [capturedSerials, setCapturedSerials] = useState<SerialEntry[]>([])
  const [manifestModalOpen, setManifestModalOpen] = useState(false)
  const [manifestNumber, setManifestNumber] = useState('')
  const [securitySeal, setSecuritySeal] = useState('')
  const [manifestNotes, setManifestNotes] = useState('')
  const [boxManifests, setBoxManifests] = useState<Record<number, ManifestInfo>>({})
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isClosed, setIsClosed] = useState(ticket.status === 'Completado')
  const [isReopened, setIsReopened] = useState(false)
  const [localCompletedAt, setLocalCompletedAt] = useState<string | null>(null)
  const [localCompletedBy, setLocalCompletedBy] = useState<string | null>(null)

  // Cargar la plantilla PDF desde la BD
  const { templateContent: pdfTemplateContent } = usePDFTemplate()

  const ticketData = ticket as any
  const completedAt = localCompletedAt || ticketData.completedAt || ticketData.completed_at || null;
  const completedBy = localCompletedBy || ticketData.completedBy || ticketData.completed_by_user || ticketData.completed_by || null;
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false)
  const [manageCollectorModalOpen, setManageCollectorModalOpen] = useState(false)
  const [isCollectionGuideModalOpen, setIsCollectionGuideModalOpen] = useState(false)
  const [showExitPDF, setShowExitPDF] = useState(false)

  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false)
  const [editItemState, setEditItemState] = useState<EditItemModalState | null>(null)

  const ticketManagementModal = useModal<TicketData>()

  const [equipmentLoadingModalOpen, setEquipmentLoadingModalOpen] = useState(false)

  const handleStartLoadingFromModal = async (data: {
    equipmentItems: any[]
    collectorData: {
      name: string
      phone: string
      vehicleModel: string
      vehiclePlate: string
    }
    collectWithoutName: boolean
    notes: string
  }) => {
    console.log('=== INICIANDO CARGA DESDE MODAL ===')
    console.log('Data recibida:', data)

    let dataToUse = { ...data.collectorData }

    if (data.collectWithoutName) {
      setCollector('SIN_NOMBRE')
      setCollectorName('Recolector sin nombre')
      setCollectorPhone('')
      setVehicleModel('')
      setVehiclePlate('')
    } else if (data.collectorData.name) {
      console.log('Guardando datos del recolector:', data.collectorData)
      setCollector('MANUAL')
      setCollectorName(data.collectorData.name)
      setCollectorPhone(data.collectorData.phone)
      setVehicleModel(data.collectorData.vehicleModel)
      setVehiclePlate(data.collectorData.vehiclePlate)
    }

    if (data.notes) {
      console.log('Guardando notas:', data.notes)
      setManifestNotes((prev) => prev + (prev ? '\n' : '') + data.notes)
    }

    // Guardar datos del recolector/vehículo a la base de datos
    if (!data.collectWithoutName && data.collectorData.name) {
      try {
        console.log('Guardando metadatos del recolector en BD...')
        const payload = {
          ticketId: ticket.id,
          collectorName: data.collectorData.name,
          collectorPhone: data.collectorData.phone,
          vehicleModel: data.collectorData.vehicleModel,
          vehiclePlate: data.collectorData.vehiclePlate
        }

        const response = await fetch('/api/logistica/collector-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
          console.error('Error guardando metadatos:', errorData)
        } else {
          console.log('Metadatos guardados correctamente en BD')
          // Verificar que los datos fueron guardados leyendo de vuelta desde la BD
          try {
            const getResponse = await fetch(`/api/logistica/collector-info?ticketId=${ticket.id}`)
            if (getResponse.ok) {
              const savedData = await getResponse.json()
              console.log('Datos guardados verificados desde BD:', savedData)
              // Actualizar los estados con los datos verificados desde BD
              setCollectorName(savedData.collectorName || data.collectorData.name)
              setCollectorPhone(savedData.collectorPhone || data.collectorData.phone)
              setVehicleModel(savedData.vehicleModel || data.collectorData.vehicleModel)
              setVehiclePlate(savedData.vehiclePlate || data.collectorData.vehiclePlate)
            }
          } catch (getError) {
            console.error('Error verificando datos guardados:', getError)
          }
        }
      } catch (error) {
        console.error('Error en guardado de metadatos:', error)
      }
    }

    console.log('Cambiando a vista de manifiesto...')
    // Usar setTimeout para asegurar que los estados se actualicen antes de cambiar la vista
    setTimeout(() => {
      setView('manifest')
      console.log('Vista cambiada a manifest')
    }, 100)

    console.log('Cerrando ticketManagementModal...')
    ticketManagementModal.close()
  }

  const handleFinalizeLogisticsFromModal = (equipmentData: any[]) => {
    console.log('Finalizando logística con equipos:', equipmentData)

    const newItems: BoxItem[] = equipmentData.map((eq, idx) => ({
      id: Date.now() + idx,
      marca: eq.brand,
      modelo: eq.model,
      brandId: eq.brand,
      modelId: eq.model,
      tipoProducto: eq.productType,
      serials: [],
      cantidad: eq.quantity
    }))

    setCurrentBox((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }))

    setView('boxes')
  }

  const adaptTicketToModalFormat = (ticket: LogisticsTicket) => {
    return {
      id: ticket.id,
      client: ticket.client,
      description: ticket.description,
      status: ticket.status as 'Pendiente' | 'Completado' | 'En Progreso',
      date: ticket.date,
      receivedUnits: ticket.receivedUnits || 0,
      totalUnits: ticket.totalUnits || 6,
      items: (ticket.items && ticket.items.length > 0)
        ? ticket.items.map(item => ({
          id: item.id,
          brandName: item.brandName || 'Sin marca',
          modelName: item.modelName || 'Sin modelo',
          productTypeName: item.productTypeName || 'Sin tipo',
          expectedQuantity: item.expectedQuantity || 0,
          receivedQuantity: item.receivedQuantity || 0
        }))
        : []
    }
  }

  const manualCollectorOption = useMemo<CollectorOption | null>(() => {
    if (!collectorName && !collectorPhone && !vehicleModel && !vehiclePlate) {
      return null
    }

    const name = collectorName || 'Datos de recolección guardados'
    return {
      id: manualCollectorId,
      name,
      phone: collectorPhone || undefined,
      vehicleModel: vehicleModel || undefined,
      vehiclePlate: vehiclePlate || undefined,
      source: 'custom'
    }
  }, [collectorName, collectorPhone, manualCollectorId, vehicleModel, vehiclePlate])

  const expectedUnits = useMemo(() => {
    if (ticket.items?.length) {
      return ticket.items.reduce((sum, item) => sum + (item.expectedQuantity ?? 0), 0)
    }
    return ticket.totalUnits ?? 0
  }, [ticket.items, ticket.totalUnits])

  const totalUnits = useMemo(() => {
    const fromBoxes = boxes.reduce((boxSum, box) => boxSum + box.items.reduce((sum, item) => sum + item.cantidad, 0), 0)
    return fromBoxes > 0 ? fromBoxes : expectedUnits
  }, [boxes, expectedUnits])

  const availableCollectors = manualCollectorOption ? [manualCollectorOption, ...collectors] : collectors
  const selectedCollectorOption = availableCollectors.find((entry) => entry.id === collector)
  const displayedCollectorName = collectorName || selectedCollectorOption?.name
  const displayedCollectorPhone = collectorPhone || selectedCollectorOption?.phone
  const displayedVehicleModel = vehicleModel || selectedCollectorOption?.vehicleModel
  const displayedVehiclePlate = vehiclePlate || selectedCollectorOption?.vehiclePlate
  const collectorLabel = displayedCollectorName || selectedCollectorOption?.name || 'Recolector'
  const isCompleted = (ticket.status === 'Completado' && !isReopened) || isClosed
  const hasBoxes = boxes.length > 0

  useEffect(() => {
    if (!collector && (collectorName || collectorPhone || vehicleModel || vehiclePlate)) {
      setCollector('MANUAL')
    }
  }, [collector, collectorName, collectorPhone, vehicleModel, vehiclePlate])

  console.log('DEBUG - ticket.type:', ticket.type, 'ticket:', ticket)
  console.log('DEBUG - isDataWipeTicket:', isDataWipeTicket)

  const waitingForBatch = !isCompleted && !hasBoxes && !isDataWipeTicket && (!ticket.items || ticket.items.length === 0)

  const productTypeOptions = productTypes.length
    ? productTypes
    : fallbackProductTypeNames.map((name) => ({ id: name, name }))

  const filteredModels = useMemo(() => {
    if (!currentItem.brandId) {
      return models
    }

    return models.filter((model) => {
      const brandMatch = model.brand_id === currentItem.brandId
      const nestedBrandMatch = model.brand?.id === currentItem.brandId
      return brandMatch || nestedBrandMatch
    })
  }, [currentItem.brandId, models])

  // Filtrar solo cajas que tienen items (cantidad > 0)
  const nonEmptyBoxes = useMemo(() => {
    return boxes.filter(box => box.items.reduce((acc, i) => acc + i.cantidad, 0) > 0)
  }, [boxes])

  const generateBoxSku = (boxNumber: number) => {
    const boxNum = String(boxNumber)
    const timestamp = String(Date.now()).slice(-6)
    return `${boxNum}-${timestamp}`
  }

  const generateBoxSeal = (boxNumber: number) => {
    const boxNum = String(boxNumber)
    const random = Math.floor(Math.random() * 900 + 100)
    return `${boxNum}-${random}`
  }

  const generateManifestSeal = () => `PS-${ticket.id}-${String(Date.now()).slice(-6)}`

  // Funciones de manejo
  const handleAddMultipleDevices = () => {
    if (multipleDevices.length === 0) {
      alert('Debes agregar al menos un dispositivo')
      return
    }

    const newItems: BoxItem[] = multipleDevices.map((device, idx) => ({
      id: Date.now() + idx,
      marca: brands.find(b => b.id === device.brandId)?.name || '',
      modelo: models.find(m => m.id === device.modelId)?.name || '',
      brandId: device.brandId,
      modelId: device.modelId,
      tipoProducto: device.tipoProducto,
      cantidad: device.cantidad,
      serials: []
    }))

    const updatedBox = {
      ...currentBox,
      items: [...currentBox.items, ...newItems]
    }

    setCurrentBox(updatedBox)
    setBoxes(boxes.map(box =>
      box.boxNumber === currentBox.boxNumber ? updatedBox : box
    ))

    setMultipleDevices([])
    setCurrentItem({ brandId: '', modelId: '', tipoProducto: '', cantidad: 1 })

    console.log('Dispositivos agregados:', newItems)
  }

  const handleAddDeviceToList = () => {
    if (!currentItem.tipoProducto || !currentItem.brandId || !currentItem.modelId) {
      alert('Completa todos los campos antes de agregar')
      return
    }

    const deviceExists = multipleDevices.some(
      device => device.brandId === currentItem.brandId &&
        device.modelId === currentItem.modelId &&
        device.tipoProducto === currentItem.tipoProducto
    )

    if (deviceExists) {
      alert('Este dispositivo ya está en la lista')
      return
    }

    setMultipleDevices([...multipleDevices, { ...currentItem }])
    setCurrentItem({ brandId: '', modelId: '', tipoProducto: '', cantidad: 1 })
  }

  const handleRemoveDeviceFromList = (index: number) => {
    setMultipleDevices(multipleDevices.filter((_, i) => i !== index))
  }

  const handleDeleteItem = (index: number) => {
    if (confirm('¿Estás seguro de eliminar este dispositivo?')) {
      const newItems = currentBox.items.filter((_, i) => i !== index)
      setCurrentBox({ ...currentBox, items: newItems })
      setBoxes(boxes.map(box =>
        box.boxNumber === currentBox.boxNumber
          ? { ...box, items: newItems }
          : box
      ))
    }
  }

  const handleAddNewBox = () => {
    const nextBoxNumber = Math.max(...boxes.map(b => b.boxNumber), currentBox.boxNumber) + 1
    const newBox: BoxStructure = {
      boxNumber: nextBoxNumber,
      items: [],
      sku: generateBoxSku(nextBoxNumber),
      seal: `DW-${nextBoxNumber}-${Date.now().toString().slice(-4)}`
    }

    setBoxes([...boxes, newBox])
    setCurrentBox(newBox)
  }

  const handleCreateBoxAndStartLoading = async () => {
    try {
      const newBox: BoxStructure = {
        boxNumber: currentBox.boxNumber,
        items: [],
        sku: generateBoxSku(currentBox.boxNumber),
        seal: `DW-${currentBox.boxNumber}-${Date.now().toString().slice(-4)}`
      }

      setBoxes([...boxes, newBox])
      setCurrentBox(newBox)
      setView('boxes')

      console.log('Caja creada para DATA WIPE:', newBox)

    } catch (error) {
      console.error('Error creando caja para DATA WIPE:', error)
      alert('Error al crear la caja. Por favor intenta nuevamente.')
    }
  }

  const handleSaveTransportDetails = async () => {
    if (!transportDetails.pilotName || !transportDetails.vehiclePlate || !transportDetails.phoneNumber) {
      alert('Por favor completa todos los campos de transporte')
      return
    }

    setTransportSaving(true)
    setTransportMessage(null)

    try {
      const response = await fetch(`/api/logistica/tickets/${ticket.id}/transport`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilotName: transportDetails.pilotName,
          vehiclePlate: transportDetails.vehiclePlate,
          phoneNumber: transportDetails.phoneNumber
        })
      })

      if (!response.ok) {
        throw new Error('Error al guardar los detalles de transporte')
      }

      setCollector('MANUAL')
      setCollectorName(transportDetails.pilotName)
      setCollectorPhone(transportDetails.phoneNumber)
      setVehiclePlate(transportDetails.vehiclePlate)
      setTransportMessage('Detalles de transporte guardados exitosamente')
      setShowTransportForm(false)

      setTimeout(() => setTransportMessage(null), 3000)
    } catch (error) {
      console.error('Error guardando detalles de transporte:', error)
      setTransportMessage('Error al guardar los detalles de transporte')
    } finally {
      setTransportSaving(false)
    }
  }

  // Funciones para manejo de series
  const handleAddSerial = () => {
    if (!serialDraft.serial.trim()) {
      alert('Por favor ingresa un número de serie')
      return
    }

    // Validar que no esté duplicado
    if (capturedSerials.some(entry => entry.serial === serialDraft.serial.trim())) {
      alert('Este número de serie ya fue agregado')
      return
    }

    // Validar que no exceda la cantidad
    if (serialModalState && capturedSerials.length >= serialModalState.quantity) {
      alert(`Solo puedes agregar ${serialModalState.quantity} series`)
      return
    }

    setCapturedSerials([...capturedSerials, { id: capturedSerials.length + 1, serial: serialDraft.serial.trim() }])
    setSerialDraft({ serial: '' })
  }

  const handleRemoveSerial = (index: number) => {
    setCapturedSerials(capturedSerials.filter((_, i) => i !== index))
  }

  const handleConfirmEquipmentWithSerials = () => {
    if (!serialModalState) return

    // Validar que se hayan capturado todas las series
    if (capturedSerials.length !== serialModalState.quantity) {
      alert(`Debes capturar ${serialModalState.quantity} series. Actualmente tienes ${capturedSerials.length}`)
      return
    }

    // Obtener nombres de marca y modelo
    const brandName = brands.find(b => b.id === serialModalState.brandId)?.name || ''
    const modelName = models.find(m => m.id === serialModalState.modelId)?.name || ''

    // Crear el item con las series
    const newItem: BoxItem = {
      id: Date.now(),
      marca: brandName,
      modelo: modelName,
      brandId: serialModalState.brandId,
      modelId: serialModalState.modelId,
      tipoProducto: serialModalState.tipoProducto,
      cantidad: serialModalState.quantity,
      serials: capturedSerials
    }

    // Agregar a la caja actual
    setCurrentBox(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))

    // Limpiar estados
    setSerialModalState(null)
    setCapturedSerials([])
    setSerialDraft({ serial: '' })
    setCurrentItem({ brandId: '', modelId: '', tipoProducto: '', cantidad: 1 })

    console.log('Equipo agregado con series:', newItem)
  }


  const handleAddItem = () => {
    if (!currentItem.tipoProducto || !currentItem.tipoProducto.trim()) {
      alert('Completa tipo de producto antes de guardar')
      return
    }

    if (!currentItem.brandId) {
      alert('Selecciona una marca válida antes de guardar')
      return
    }

    if (!currentItem.modelId) {
      alert('Selecciona un modelo válido antes de guardar')
      return
    }

    if (!currentItem.cantidad || currentItem.cantidad <= 0) {
      alert('Ingresa una cantidad válida (mayor a 0) antes de guardar')
      return
    }

    const selectedBrand = brands.find((brand) => brand.id === currentItem.brandId)
    const selectedModel = models.find((model) => model.id === currentItem.modelId)

    if (!selectedBrand || !selectedModel) {
      alert('Selecciona una marca y modelo válidos del catálogo')
      return
    }

    setCapturedSerials([])
    setSerialDraft({ serial: '' })
    setSerialModalState({
      quantity: currentItem.cantidad,
      brandId: currentItem.brandId,
      modelId: currentItem.modelId,
      tipoProducto: currentItem.tipoProducto
    })
  }

  const handleCaptureSerialEntry = () => {
    if (!serialModalState) {
      return
    }

    if (capturedSerials.length >= serialModalState.quantity) {
      return
    }

    if (!serialDraft.serial.trim()) {
      alert('Ingresa el número de serie antes de continuar')
      return
    }

    const nextEntry: SerialEntry = {
      id: Date.now(),
      serial: serialDraft.serial.trim()
    }

    const updated = [...capturedSerials, nextEntry]
    setCapturedSerials(updated)
    setSerialDraft({ serial: '' })

    if (updated.length >= serialModalState.quantity) {
      finalizeSerialCapture(updated)
    }
  }

  const finalizeSerialCapture = (entries: SerialEntry[]) => {
    if (!serialModalState || entries.length === 0) {
      return
    }

    const selectedBrand = brands.find((brand) => brand.id === serialModalState.brandId)
    const selectedModel = models.find((model) => model.id === serialModalState.modelId)

    if (!selectedBrand || !selectedModel) {
      alert('La marca o modelo seleccionado ya no está disponible en el catálogo')
      handleCancelSerialModal()
      return
    }

    const newItem: BoxItem = {
      id: Date.now(),
      marca: selectedBrand.name,
      modelo: selectedModel.name,
      brandId: selectedBrand.id,
      modelId: selectedModel.id,
      tipoProducto: serialModalState.tipoProducto,
      serials: entries,
      cantidad: entries.length
    }

    setCurrentBox((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }))

    setCurrentItem({
      brandId: '',
      modelId: '',
      tipoProducto: '',
      cantidad: 1
    })

    handleCancelSerialModal()
  }

  const handleCancelSerialModal = () => {
    setSerialModalState(null)
    setCapturedSerials([])
    setSerialDraft({ serial: '' })
  }

  const handleRemoveItem = (itemId: number) => {
    setCurrentBox({
      ...currentBox,
      items: currentBox.items.filter(item => item.id !== itemId)
    })
  }

  const openEditItemModal = (item: BoxItem) => {
    setEditItemState({
      itemId: item.id,
      tipoProducto: item.tipoProducto,
      brandId: item.brandId,
      modelId: item.modelId,
      cantidad: item.cantidad,
      serials: item.serials && item.serials.length > 0
        ? item.serials.map((serial, idx) => ({ id: serial.id ?? Date.now() + idx, serial: serial.serial }))
        : Array.from({ length: item.cantidad }, (_, idx) => ({ id: Date.now() + idx, serial: '' }))
    })
    setIsEditItemModalOpen(true)
  }

  const handleUpdateItem = () => {
    if (!editItemState) return

    const { itemId, tipoProducto, brandId, modelId, cantidad, serials } = editItemState

    if (!tipoProducto || !tipoProducto.trim()) {
      alert('Completa tipo de producto antes de guardar')
      return
    }

    if (!brandId) {
      alert('Selecciona una marca válida antes de guardar')
      return
    }

    if (!modelId) {
      alert('Selecciona un modelo válido antes de guardar')
      return
    }

    if (!cantidad || cantidad <= 0) {
      alert('Ingresa una cantidad válida (mayor a 0) antes de guardar')
      return
    }

    const selectedBrand = brands.find((brand) => brand.id === brandId)
    const selectedModel = models.find((model) => model.id === modelId)

    if (!selectedBrand || !selectedModel) {
      alert('Selecciona una marca y modelo válidos del catálogo')
      return
    }

    const updatedItems = currentBox.items.map((item) => {
      if (item.id !== itemId) return item

      return {
        ...item,
        tipoProducto,
        brandId,
        modelId,
        marca: selectedBrand.name,
        modelo: selectedModel.name,
        cantidad,
        serials: serials.slice(0, cantidad)
      }
    })

    setCurrentBox({ ...currentBox, items: updatedItems })
    setIsEditItemModalOpen(false)
    setEditItemState(null)
  }

  const saveBoxToSupabase = async (box: BoxStructure) => {
    const response = await fetch('/api/logistica/boxes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticketId: ticket.id,
        boxNumber: box.boxNumber,
        sku: box.sku,
        seal: box.seal,
        items: box.items.map((item) => ({
          marca: item.marca,
          modelo: item.modelo,
          tipoProducto: item.tipoProducto,
          serials: item.serials.map((serial) => ({
            serial: serial.serial,
            color: null
          }))
        }))
      })
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload?.error || 'Error al guardar la caja en la base de datos')
    }

    return payload
  }

  const handleSaveBox = async () => {
    if (currentBox.items.length === 0) {
      alert('Debe agregar al menos un equipo a la caja')
      return
    }

    // Validar que el precinto/marchamo no esté vacío
    if (!currentBox.seal || currentBox.seal.trim() === '') {
      alert('Debe ingresar el Precinto de Seguridad (Marchamo) antes de guardar la caja')
      return
    }

    // Validar que cada equipo tenga al menos un serial
    const itemsWithoutSerials = currentBox.items.filter(item => !item.serials || item.serials.length === 0)
    if (itemsWithoutSerials.length > 0) {
      const itemNames = itemsWithoutSerials.map(item => `${item.marca} ${item.modelo}`).join(', ')
      alert(`Los siguientes equipos no tienen números de serie asignados:\n${itemNames}\n\nDebe capturar al menos un serial para cada equipo antes de guardar la caja.`)
      return
    }

    const isEditingExisting = editingBoxId !== null
    const finalBoxNumber = currentBox.boxNumber

    if (!finalBoxNumber || finalBoxNumber <= 0) {
      alert('Error: No se ha asignado un número de caja válido.')
      return
    }

    if (!isEditingExisting && boxes.some(b => b.boxNumber === finalBoxNumber)) {
      await fetchNextBoxNumber()
      alert(`El número de caja ha sido actualizado al siguiente disponible. Por favor intente guardar de nuevo.`)
      return
    }

    const sku = currentBox.sku || generateBoxSku(finalBoxNumber)
    const seal = currentBox.seal || generateBoxSeal(finalBoxNumber)
    const resolvedId = isEditingExisting
      ? typeof editingBoxId === 'number'
        ? editingBoxId
        : currentBox.id ?? Date.now()
      : Date.now()

    const newBox: BoxStructure = {
      ...currentBox,
      id: resolvedId,
      boxNumber: finalBoxNumber,
      sku,
      seal
    }

    try {
      await saveBoxToSupabase(newBox)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar la caja'
      alert(message)
      return
    }

    const filtered = isEditingExisting
      ? boxes.filter((b) => (b.id ?? b.boxNumber) !== (newBox.id ?? newBox.boxNumber))
      : boxes
    const updatedBoxes = [...filtered, newBox].sort((a, b) => a.boxNumber - b.boxNumber)

    setBoxes(updatedBoxes)

    setCurrentBox({ boxNumber: 0, items: [] })
    await fetchNextBoxNumber()
    setCurrentItem({ brandId: '', modelId: '', tipoProducto: '', cantidad: 1 })
    setEditingBoxId(null)
  }

  const resolveBoxKey = (box: BoxStructure) => box.id ?? box.boxNumber

  const handleEditBox = (box: BoxStructure) => {
    setCurrentBox(box)
    setEditingBoxId(box.id ?? box.boxNumber)
    setCurrentItem({ brandId: '', modelId: '', tipoProducto: '', cantidad: 1 })
    setBoxes(boxes.filter((b) => (b.id ?? b.boxNumber) !== (box.id ?? box.boxNumber)))
    setView('boxes')
  }

  const handleDeleteBox = async (boxKey: string | number) => {
    if (isCompleted) {
      alert('No se puede eliminar cajas después de finalizar logística. La logística ya está completada.')
      return
    }

    if (!confirm('¿Eliminar esta caja y sus series? Esta acción no se puede deshacer.')) return

    const target = boxes.find((b) => (b.id ?? b.boxNumber) === boxKey)
    if (!target) {
      alert('No se encontró la caja a eliminar')
      return
    }

    const previousBoxes = [...boxes]
    const remainingBoxes = boxes.filter((b) => (b.id ?? b.boxNumber) !== boxKey)
    setBoxes(remainingBoxes)

    try {
      const response = await fetch('/api/logistica/boxes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          boxNumber: target.boxNumber
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setBoxes(previousBoxes)
        alert(`Error al eliminar la caja en la base de datos: ${result.error || 'Error desconocido'}. Cambios descartados.`)
        console.error('Error en DELETE:', result)
        return
      }

      console.log('Caja eliminada exitosamente:', result.message)

    } catch (error) {
      setBoxes(previousBoxes)
      const errorMsg = error instanceof Error ? error.message : 'Error de conexión'
      alert(`No se pudo conectar al servidor para eliminar la caja: ${errorMsg}. Cambios descartados.`)
      console.error('Error al eliminar en backend:', error)
      return
    }

    const nextNumber = remainingBoxes.length > 0
      ? Math.max(...remainingBoxes.map((b) => b.boxNumber), 10000) + 1
      : 10001
    const finalNextNumber = Math.max(nextNumber, 10001)
    setCurrentBox({ boxNumber: finalNextNumber, items: [] })
  }

  const handleReopenLogistics = async () => {
    try {
      const response = await fetch(`/api/logistica/tickets/${ticket.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'No fue posible reabrir la logística')
      }

      // Recargar datos del ticket después de reabrir
      try {
        const ticketResponse = await fetch(`/api/logistica/tickets/${ticket.id}`)
        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json()
          if (ticketData.collector_name) setCollectorName(ticketData.collector_name)
          if (ticketData.collector_phone) setCollectorPhone(ticketData.collector_phone)
          if (ticketData.vehicle_plate) setVehiclePlate(ticketData.vehicle_plate)
          if (ticketData.vehicle_model) setVehicleModel(ticketData.vehicle_model)
          if (ticketData.collector_name && !collector) setCollector('MANUAL')
        }
      } catch (error) {
        console.error('Error recargando datos del ticket:', error)
      }

      setIsReopened(true)
      setIsClosed(false)
      setConfirmFinalizeOpen(false)
      setView('details')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible reabrir la logística'
      alert(message)
    }
  }

  const handlePrintBox = (box: BoxStructure) => {
    setPrintingBox(box)
  }

  const closePrintModal = () => setPrintingBox(null)

  const createManifestRecord = (boxNumber: number): ManifestInfo => {
    const timestamp = String(Date.now()).slice(-6)
    const randomSuffix = Math.floor(Math.random() * 900) + 100
    const manifestNumber = `${boxNumber}-${timestamp}`
    const securitySeal = `${boxNumber}-${randomSuffix}`
    return { manifestNumber, securitySeal }
  }

  const handleCollectorConfirmed = async (data: any) => {
    const { collectorData, collectWithoutName } = data

    if (collectWithoutName) {
      setCollector('SIN_NOMBRE')
      setCollectorName('Recolector sin nombre')
      setCollectorPhone('')
      setVehicleModel('')
      setVehiclePlate('')
    } else {
      setCollector('MANUAL')
      setCollectorName(collectorData.name)
      setCollectorPhone(collectorData.phone)
      setVehicleModel(collectorData.vehicleModel)
      setVehiclePlate(collectorData.vehiclePlate)
    }

    ticketManagementModal.close()
    alert('Recolector asignado correctamente. Ahora puedes continuar.')
  }

  const handleGenerateManifests = async () => {
    if (boxes.length === 0) {
      alert('No hay cajas guardadas para generar el manifiesto.\n\nSi tienes una caja en progreso, asegúrate de presionar el botón "Guardar Caja y Continuar" para registrarla antes de generar las guías.')
      return
    }

    const entries: Record<number, ManifestInfo> = {}
    boxes.forEach((box) => {
      const key = resolveBoxKey(box) as number
      entries[key] = createManifestRecord(box.boxNumber)
    })

    setBoxManifests((prev) => ({ ...prev, ...entries }))

    const firstManifest = Object.values(entries)[0]
    if (firstManifest) {
      setManifestNumber(firstManifest.manifestNumber)
      setSecuritySeal(firstManifest.securitySeal)
    }
    setManifestNotes('')
    setManifestModalOpen(true)
  }

  const handleSaveManifests = ({ manifestNumber, notes, templateContent }: { manifestNumber: string; notes: string; templateContent?: string }) => {
    setManifestNumber(manifestNumber)
    setManifestNotes(notes)

    // Guardar la plantilla generada para vista previa / descarga
    if (templateContent) {
      setGeneratedTemplateHtml(templateContent)
    } else {
      setGeneratedTemplateHtml(null)
    }

    // Actualizar también los registros de manifiesto por caja
    setBoxManifests(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(k => {
        updated[Number(k)] = { ...updated[Number(k)], manifestNumber }
      })
      return updated
    })

    // Actualizar documentos generados para la vista
    setGeneratedDocuments({
      manifestNumber,
      securitySeal: securitySeal || 'PENDING',
      manifestNotes: notes
    })

    setManifestModalOpen(false)
    setShowExitPDF(true)
    alert(`Manifiesto ${manifestNumber} guardado correctamente. Ahora puedes finalizar la logística.`)
  }

  const handleCancelManifest = () => {
    setManifestModalOpen(false)
  }

  const handleFinalizeLogistics = async () => {
    if (boxes.length === 0) {
      alert('Agrega al menos una caja antes de finalizar la logística')
      return
    }

    if (!collector && !collectorName) {
      alert('Debes asignar personal de recolección antes de finalizar. Se abrirá el formulario de asignación.')
      ticketManagementModal.open(adaptTicketToModalFormat(ticket))
      return
    }

    if (!selectedCollectorOption && collector !== 'MANUAL' && collector !== 'SIN_NOMBRE' && !collectorName) {
      alert('Selecciona un perfil válido de recolección antes de finalizar')
      return
    }

    if (!manifestNumber || !securitySeal.trim()) {
      handleGenerateManifests()
      return
    }

    if (window.confirm('¿Estás seguro de que deseas finalizar la logística? Esta acción no se puede deshacer.')) {
      await handleConfirmFinalize()
    }
  }

  const handleConfirmFinalize = async () => {
    const totalUnitsInBoxes = boxes.reduce(
      (sum, box) => sum + box.items.reduce((inner, item) => inner + item.cantidad, 0),
      0
    )

    setIsFinalizing(true)

    try {
      const payload: Record<string, unknown> = {
        ticketId: ticket.id,
        collector: collector,
        boxesCount: boxes.length,
        unitsCount: totalUnitsInBoxes,
        manifestNumber,
        securitySeal,
        notes: manifestNotes.trim() || null
      }

      const addFieldIfPresent = (key: string, value: string) => {
        const trimmed = value.trim()
        if (trimmed.length > 0) {
          payload[key] = trimmed
        }
      }

      addFieldIfPresent('collectorName', collectorName)
      addFieldIfPresent('collectorPhone', collectorPhone)
      addFieldIfPresent('vehicleModel', vehicleModel)
      addFieldIfPresent('vehiclePlate', vehiclePlate)
      addFieldIfPresent('otherDetails', otherDetails)

      const response = await fetch('/api/logistica/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const responseBody = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = responseBody?.error || responseBody?.message || `Error HTTP ${response.status}: No fue posible finalizar la logística`
        throw new Error(errorMessage)
      }

      // Obtener información del usuario actual
      const userResponse = await fetch('/api/auth/user')
      let currentUserName = 'Usuario actual'

      try {
        const contentType = userResponse.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const userData = await userResponse.json()
          currentUserName = userData?.user?.user_metadata?.full_name || userData?.user?.email || currentUserName
        }
      } catch (parseError) {
        console.warn('No fue posible leer el usuario actual:', parseError)
      }

      // Establecer la fecha y usuario de finalización
      setLocalCompletedAt(new Date().toISOString())
      setLocalCompletedBy(currentUserName)

      setIsFinalizing(false)
      setIsClosed(true)

      // La vista de "Logística Completada" permanecerá abierta hasta que el usuario la cierre manualmente
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible finalizar la logística'
      console.error('Error en finalización:', error)
      alert(message)
      setIsFinalizing(false)
      setConfirmFinalizeOpen(false)
    }
  }

  const handleSaveCollectorMetadata = async () => {
    setMetadataSaving(true)
    setMetadataMessage(null)

    try {
      const payload = {
        ticketId: ticket.id,
        collectorId: collector === manualCollectorId || !collector ? null : collector,
        name: collectorName,
        phone: collectorPhone,
        vehicleModel: vehicleModel,
        vehiclePlate: vehiclePlate
      }

      const response = await fetch('/api/logistica/collectors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || 'Error guardando los datos del recolector')
      }

      setMetadataMessage('Datos guardados correctamente')

      if (!collector || collector === '') {
        setCollector(manualCollectorId)
      }

      setTimeout(() => {
        setShowVehicleForm(false)
        setMetadataMessage(null)
      }, 1500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error guardando los datos de recolección'
      setMetadataMessage(message)
      console.error('Error en handleSaveCollectorMetadata:', error)
    } finally {
      setMetadataSaving(false)
    }
  }

  const handleConfirmCollectorAssignment = async () => {
    if (!collector) {
      alert('Selecciona un recolector antes de confirmar')
      return
    }

    setSavingCollector(true)
    try {
      const payload = {
        ticketId: ticket.id,
        collectorId: collector === manualCollectorId ? null : collector,
        name: collectorName || selectedCollectorOption?.name || '',
        phone: collectorPhone || selectedCollectorOption?.phone || '',
        vehicleModel: vehicleModel || selectedCollectorOption?.vehicleModel || '',
        vehiclePlate: vehiclePlate || selectedCollectorOption?.vehiclePlate || ''
      }

      const response = await fetch('/api/logistica/collectors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || 'Error asignando el recolector')
      }

      setView('manifest')
      ticketManagementModal.close()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error asignando el recolector'
      alert(message)
      console.error('Error en handleConfirmCollectorAssignment:', error)
    } finally {
      setSavingCollector(false)
    }
  }

  // COMPONENTES DE VISTAS
  const completedNotice = (
    <div className="space-y-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <InfoCard />
      <div className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-[2.5rem] p-10 space-y-8 shadow-sm dark:shadow-none transition-colors overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 -mr-16 -mt-16 rounded-full"></div>

        {/* Botón X para cerrar */}
        <button
          onClick={() => router.push('/dashboard/logistica')}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Cerrar y volver a logística"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 border-b border-gray-50 dark:border-surface-800 pb-8">
          <div className="p-4 bg-emerald-500/10 rounded-2xl">
            <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-1">Logística Completada</h2>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Este ticket ha sido procesado y cerrado correctamente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-surface-800 rounded-2xl p-6 transition-all hover:bg-gray-100 dark:hover:bg-surface-800/50">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
              <User className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Completado por</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{completedBy || 'Desconocido'}</p>
          </div>

          <div className="bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-surface-800 rounded-2xl p-6 transition-all hover:bg-gray-100 dark:hover:bg-surface-800/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Package className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Recolectado por</span>
              </div>
              {!isCompleted && (
                <button
                  onClick={() => {
                    console.log('Botón Gestionar clickeado - yendo directo a cajas')
                    setView('manifest')
                  }}
                  className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                >
                  Gestionar
                </button>
              )}
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{collectorLabel}</p>
          </div>

          <div className="bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-surface-800 rounded-2xl p-6 transition-all hover:bg-gray-100 dark:hover:bg-surface-800/50">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Fecha de cierre</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {completedAt ? new Date(completedAt).toLocaleString('es-GT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No disponible'}
            </p>
          </div>
        </div>

        <div className="bg-brand-50 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/20 rounded-2xl p-6">
          <p className="text-sm font-bold text-brand-900 dark:text-brand-300">
            Información del proceso:
          </p>
          <p className="text-sm font-medium text-brand-700 dark:text-brand-400/80 mt-1">
            Este ticket ya fue marcado como completado y los datos han sido archivados. No se permiten modificaciones adicionales en las series o cajas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-sm font-black hover:opacity-90 transition-all shadow-xl active:scale-95"
          >
            Volver a logística
          </button>
          <button
            type="button"
            onClick={handleReopenLogistics}
            className="px-8 py-4 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-2xl text-sm font-black text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-surface-700 transition-all active:scale-95"
          >
            Reabrir logística
          </button>
        </div>
      </div>
    </div>
  )

  const waitingForBatchMessage = (
    <div className="space-y-4 bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-[2.5rem] p-12 text-center shadow-sm dark:shadow-none">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700 dark:text-gray-400">Esperando datos del lote</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">Los datos aún no llegaron, vuelve a intentarlo en unos segundos.</p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">La interfaz necesita que el lote exista y tenga cajas antes de continuar.</p>
    </div>
  )


  const DetailsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-800/50 dark:bg-surface-950/50 border border-surface-700 dark:border-surface-800 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest mb-2">Cliente</p>
          <p className="text-base font-bold text-white truncate" title={ticket.client}>{ticket.client}</p>
        </div>
        <div className="bg-surface-800/50 dark:bg-surface-950/50 border border-surface-700 dark:border-surface-800 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest mb-2">Unidades</p>
          <p className="text-base font-bold text-white">{ticket.receivedUnits}/{ticket.totalUnits}</p>
        </div>
        <div className="bg-surface-800/50 dark:bg-surface-950/50 border border-surface-700 dark:border-surface-800 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest mb-2">Fecha</p>
          <p className="text-base font-bold text-white">{ticket.date}</p>
        </div>
        <div className="bg-surface-800/50 dark:bg-surface-950/50 border border-surface-700 dark:border-surface-800 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest mb-2">Tipo de Servicio</p>
          <p className="text-base font-bold text-white truncate" title={ticket.description}>{ticket.description || 'n/a'}</p>
        </div>
      </div>

      {ticket.items && ticket.items.length > 0 && (
        <div className="bg-surface-800/30 dark:bg-surface-950/30 border border-surface-700 dark:border-surface-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-surface-700 dark:border-surface-800 bg-surface-900/50">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Package size={18} className="text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Equipos a recolectar</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700 dark:border-surface-800 bg-surface-800/40">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">TIPO DE PRODUCTO</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">MARCA</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">MODELO</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">CANTIDAD</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">RECIBIDAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700 dark:divide-surface-800">
                {ticket.items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-300 dark:text-surface-400">
                      {item.productTypeName || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-white">
                      {item.brandName || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-300">
                      {item.modelName || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-center font-bold text-white">
                      {item.expectedQuantity}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] px-3 py-1.5 rounded-full text-xs font-bold text-white bg-orange-500/80 hover:bg-orange-500 transition-colors">
                        {item.receivedQuantity ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-surface-800/30 dark:bg-surface-950/30 border border-surface-700 dark:border-surface-800 rounded-2xl p-6 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">Otros detalles o notas</p>
        <textarea
          value={otherDetails}
          onChange={(e) => setOtherDetails(e.target.value)}
          placeholder="Ej: No tiene carcasa original, requiere empaque especial, entrega en horario específico, etc."
          rows={3}
          className="w-full bg-surface-900 dark:bg-surface-950 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-4 text-white placeholder:text-surface-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm font-medium transition-all resize-none"
        />
      </div>

      <div className="bg-surface-800/30 dark:bg-surface-950/30 border border-surface-700 dark:border-surface-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User size={18} className="text-blue-400" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">Asignar personal de recolección</p>
          </div>
          <button
            onClick={() => {
              console.log('Botón Gestionar (DetailsView) clickeado - yendo directo a cajas')
              setView('manifest')
            }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-brand-500/20"
          >
            Gestionar
          </button>
          <button
            onClick={() => setIsCollectionGuideModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            Cargar Guía
          </button>
        </div>

        <div className="space-y-3">
          <select
            className="w-full bg-surface-900 dark:bg-surface-950 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer appearance-none"
            value={collector}
            onChange={(e) => setCollector(e.target.value)}
            disabled={collectorsLoading}
          >
            <option value="">
              {collectorsLoading
                ? 'Cargando...'
                : collectorsError
                  ? 'Lista no disponible'
                  : 'Recolector sin nombre'}
            </option>
            {availableCollectors.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.source === 'custom' && ' (datos locales)'}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowVehicleForm(!showVehicleForm)}
              className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl transition active:scale-95 ${showVehicleForm
                ? 'bg-rose-500 hover:bg-rose-400'
                : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
            >
              {showVehicleForm ? '✕ Cancelar' : '+ Agregar datos del recolector'}
            </button>
            <button
              type="button"
              onClick={loadCollectors}
              className="px-6 py-2.5 border border-surface-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white hover:bg-surface-700/50 transition active:scale-95"
            >
              Recargar Lista
            </button>
          </div>
        </div>

        {!collectorsLoading && collectors.length === 0 && !collectorsError && !manualCollectorOption && (
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No hay personal activo para asignar.</p>
        )}
        {collectorsError && (
          <p className="text-xs text-rose-400 font-bold">{collectorsError}</p>
        )}
      </div>

      {showVehicleForm && (
        <div className="bg-surface-800/50 dark:bg-surface-950/50 border border-surface-700 dark:border-surface-800 rounded-2xl p-6 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-surface-500">Datos adicionales del transporte</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-widest px-1">Responsable de recolección</span>
              <input
                type="text"
                placeholder="Nombre completo"
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                className="w-full bg-surface-900 dark:bg-surface-950 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-widest px-1">Teléfono / contacto</span>
              <input
                type="tel"
                placeholder="+502 1234 5678"
                value={collectorPhone}
                onChange={(e) => setCollectorPhone(e.target.value)}
                className="w-full bg-surface-900 dark:bg-surface-950 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-widest px-1">Vehículo asignado</span>
              <input
                type="text"
                placeholder="Marca / Modelo"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full bg-surface-900 dark:bg-surface-950 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-widest px-1">Placa / identificador</span>
              <input
                type="text"
                placeholder="P-123F"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full bg-surface-900 dark:bg-surface-950 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-surface-700">
            <button
              type="button"
              onClick={() => setShowVehicleForm(false)}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-bold text-sm transition active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCollectorMetadata}
              disabled={metadataSaving}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm transition disabled:opacity-60 active:scale-95"
            >
              {metadataSaving ? 'Guardando...' : 'Guardar Datos'}
            </button>
            {metadataMessage && (
              <p className={`text-xs font-bold ${metadataMessage.includes('correctamente') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metadataMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderManifestView = () => {
    const isSealMissing = !currentBox.seal || currentBox.seal.trim() === ''
    const isSaveBoxDisabled = isSealMissing
    const isCollectorIncomplete =
      !displayedCollectorName?.trim() ||
      !displayedCollectorPhone?.trim() ||
      !displayedVehicleModel?.trim() ||
      !displayedVehiclePlate?.trim()
    const isFinalizeDisabled = isCollectorIncomplete || currentBox.items.length > 0 || nonEmptyBoxes.length === 0

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-[2.25rem] border border-[#2a2d36] bg-[#14161b]/90 px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur space-y-6 sticky top-6">
            <div className="pb-6 border-b border-[#2a2d36]">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400 mb-3">Ticket</p>
              <p className="text-2xl font-black text-white">{ticket.id}</p>
              <p className="text-sm text-gray-400 mt-2">{ticket.description || 'Sin descripción'}</p>
            </div>

            <div className="pb-6 border-b border-[#2a2d36]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Cliente</p>
              <p className="text-base font-black text-white">{ticket.client || 'Sin asignar'}</p>
            </div>

            <div className="pb-6 border-b border-[#2a2d36]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Ubicación</p>
              <p className="text-base font-black text-white">{ticket.location || 'No especificada'}</p>
            </div>

            <div className="pb-6 border-b border-[#2a2d36]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Cajas Creadas</p>
              <p className="text-3xl font-black text-emerald-400">{nonEmptyBoxes.length}</p>
              <p className="text-xs text-gray-400 mt-1">Cajas completadas</p>
            </div>

            <div className="pb-6 border-b border-[#2a2d36]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Total Unidades</p>
              <p className="text-3xl font-black text-blue-400">{ticket.totalUnits || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Unidades totales</p>
            </div>

            {nonEmptyBoxes.length > 0 && (
              <div className="pt-6 border-t border-[#2a2d36]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Cajas Guardadas Recientemente</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {nonEmptyBoxes
                    .slice()
                    .reverse()
                    .map((box, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-[#2a2d36] bg-[#1b1e24]/30 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                            <Package size={14} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Caja #{box.boxNumber}</p>
                            <p className="text-[9px] text-gray-500 font-mono">{box.seal || 'SIN PRECINTO'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-emerald-400">{box.items.reduce((acc, i) => acc + i.cantidad, 0)} Und</p>
                          <button
                            onClick={() => {
                              if (confirm(`¿Deseas eliminar la Caja #${box.boxNumber}?`)) {
                                setBoxes(boxes.filter(b => (b.id ?? b.boxNumber) !== (box.id ?? box.boxNumber)))
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 hover:text-red-300"
                            title="Eliminar caja"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Vehículo Asignado</p>
                <button
                  onClick={() => ticketManagementModal.open(adaptTicketToModalFormat(ticket))}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider flex items-center gap-1"
                >
                  <Edit2 size={12} /> {collector ? 'Editar' : 'Asignar'}
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] font-bold text-gray-400">Nombre</p>
                  <p className="text-sm font-black text-white">{collectorName || 'Sin asignar'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400">Teléfono</p>
                  <p className="text-sm font-black text-white">{collectorPhone || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400">Modelo</p>
                  <p className="text-sm font-black text-white">{vehicleModel || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400">Placa</p>
                  <p className="text-sm font-black text-white">{vehiclePlate || 'Sin placa'}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#2a2d36]">
              <button
                onClick={handleGenerateManifests}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
              >
                <FileText size={18} />
                Generar Guías y Manifiesto ({nonEmptyBoxes.length})
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[2.25rem] border border-[#2a2d36] bg-[#14161b]/90 px-8 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#2a2d36]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                  <Box className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-white leading-none">Caja #{currentBox.boxNumber}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 px-1">Precinto de Seguridad (Marchamo)</p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="INGRESAR PRECINTO..."
                      value={currentBox.seal || ''}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setCurrentBox(prev => ({ ...prev, seal: value }));
                      }}
                      className="bg-[#1b1e24] border border-[#2a2d36] rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all w-48"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado de Carga</span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
                      {currentBox.items.reduce((acc, item) => acc + item.cantidad, 0)} unidades
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {currentItem.brandId && currentItem.modelId && currentItem.tipoProducto && (
              <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipo Seleccionado</span>
                      <h4 className="text-2xl font-black text-white mt-2">
                        {brands.find(b => b.id === currentItem.brandId)?.name || 'Sin marca'} {models.find(m => m.id === currentItem.modelId)?.name || 'Sin modelo'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#1A1A1A]/80 rounded-xl p-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tipo de Producto</span>
                        <p className="text-lg font-bold text-emerald-400">{currentItem.tipoProducto}</p>
                      </div>
                      <div className="bg-[#1A1A1A]/80 rounded-xl p-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Cantidad</span>
                        <p className="text-lg font-bold text-blue-400">{currentItem.cantidad} {currentItem.cantidad === 1 ? 'unidad' : 'unidades'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/30 rounded-xl h-fit">
                    <Package className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest px-1">Tipo de Producto *</label>
                <select
                  value={currentItem.tipoProducto}
                  onChange={(e) => setCurrentItem({ ...currentItem, tipoProducto: e.target.value })}
                  className="w-full bg-[#1A1A1A] dark:bg-surface-900 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="">Seleccionar...</option>
                  {productTypeOptions.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest px-1">Marca *</label>
                <select
                  value={currentItem.brandId}
                  onChange={(e) => setCurrentItem({ ...currentItem, brandId: e.target.value, modelId: '' })}
                  className="w-full bg-[#1A1A1A] dark:bg-surface-900 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="">Seleccionar...</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest px-1">Modelo *</label>
                <select
                  value={currentItem.modelId}
                  onChange={(e) => setCurrentItem({ ...currentItem, modelId: e.target.value })}
                  disabled={!currentItem.brandId}
                  className="w-full bg-[#1A1A1A] dark:bg-surface-900 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                >
                  <option value="">Seleccionar...</option>
                  {filteredModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest px-1">Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  max={50 - currentBox.items.reduce((acc, item) => acc + item.cantidad, 0)}
                  value={currentItem.cantidad}
                  onChange={(e) => setCurrentItem({ ...currentItem, cantidad: Math.max(1, Math.min(50, Number(e.target.value))) })}
                  className="w-full bg-[#1A1A1A] dark:bg-surface-900 border border-surface-700 dark:border-surface-800 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={() => {
                  if (!currentItem.brandId || !currentItem.modelId || !currentItem.tipoProducto) {
                    alert('Por favor completa todos los campos')
                    return
                  }

                  const currentTotal = currentBox.items.reduce((acc, item) => acc + item.cantidad, 0)
                  if (currentTotal + currentItem.cantidad > 50) {
                    alert('La caja no puede exceder 50 unidades')
                    return
                  }

                  setCapturedSerials([])
                  setSerialDraft({ serial: '' })
                  setSerialModalState({
                    quantity: currentItem.cantidad,
                    brandId: currentItem.brandId,
                    modelId: currentItem.modelId,
                    tipoProducto: currentItem.tipoProducto
                  })
                }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
              >
                + Agregar Equipo a la Caja
              </button>
            </div>
          </div>

          {currentBox.items.length > 0 && (
            <div className="rounded-[2.25rem] border border-[#2a2d36] bg-[#14161b]/90 px-8 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),_0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur">
              <div className="pb-6 border-b border-[#2a2d36]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                    <Package className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">Equipos en Caja</h3>
                  <span className="ml-auto inline-flex items-center rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
                    {currentBox.items.length} articulos
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {currentBox.items.map((item, idx) => (
                  <div key={item.id} className="p-3 rounded-xl border border-[#2a2d36] hover:border-emerald-500/50 bg-[#1b1e24]/50 transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-black text-white">{item.marca} • {item.modelo}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{item.tipoProducto} • {item.cantidad} unidades</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition"
                          title="Editar equipo"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setCurrentBox((prev) => ({
                            ...prev,
                            items: prev.items.filter((_, i) => i !== idx)
                          }))}
                          className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg transition"
                          title="Eliminar equipo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {item.serials && item.serials.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#2a2d36] flex flex-wrap gap-1.5">
                        {item.serials.map((s) => (
                          <span key={s.id} className="text-[9px] font-mono font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
                            #{s.serial}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-[#2a2d36]">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Total Equipos en Caja</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {currentBox.items.reduce((acc, item) => acc + item.cantidad, 0)} unidades
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                if (currentBox.items.length > 0) {
                  if (confirm('Tienes equipos en la caja actual sin guardar. ¿Deseas volver sin guardar?')) {
                    setView('details')
                  }
                } else {
                  setView('details')
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-[#2a2d36] bg-[#1b1e24] hover:border-[#3a3d46] text-gray-400 font-bold text-sm transition-all active:scale-95"
            >
              <ArrowLeft size={18} />
              Volver
            </button>

            <button
              onClick={handleSaveBox}
              disabled={isSaveBoxDisabled}
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#0052FF] hover:bg-[#0041CC] disabled:bg-[#2a2d36] disabled:hover:bg-[#2a2d36] text-white font-black text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              Guardar Caja y Continuar
            </button>

            <button
              onClick={() => {
                if (currentBox.items.length > 0) {
                  alert('Tienes una caja en proceso. Guárdala antes de finalizar.')
                  return
                }
                handleFinalizeLogistics()
              }}
              disabled={isFinalizeDisabled}
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-black text-sm transition-all active:scale-95 shadow-lg shadow-fuchsia-500/20 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PackageOpen size={18} />
              Finalizar Logística
            </button>
          </div>
        </div>
      </div>
    )
  }

  const DataWipeBoxesView = () => (
    <div>DATA WIPE BOXES VIEW PLACEHOLDER</div>
  )

  const handleDownloadPDF = async () => {
    try {
      if (!generatedTemplateHtml) {
        alert('No hay una plantilla generada. Abre "Generar Guías y Manifiesto" primero.')
        return
      }

      // Crear contenedor temporal
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.padding = '20mm'
      container.style.backgroundColor = 'white'
      container.innerHTML = generatedTemplateHtml
      document.body.appendChild(container)

      // Esperar que se renderice
      await new Promise(resolve => setTimeout(resolve, 500))

      const filename = `Manifiesto-${manifestNumber || 'sin-numero'}-${new Date().toISOString().split('T')[0]}.pdf`

      // Importar html2canvas dinámicamente
      const html2canvas = (await import('html2canvas')).default

      // Capturar el HTML como imagen
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')

      // Crear PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Primera página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(filename)
      document.body.removeChild(container)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      alert('Error al descargar el PDF. Intenta con Imprimir.')
    }
  }

  const handlePrintTemplate = () => {
    if (!generatedTemplateHtml) {
      window.print()
      return
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(generatedTemplateHtml)
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  const ExitPDFView = () => {
    const displayCollectorName = collectorName || 'Sin asignar'
    const hasTemplatePreview = Boolean(generatedTemplateHtml)

    return (
      <div className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 space-y-6" id="exit-pdf-document">
            {hasTemplatePreview ? (
              <div className="border rounded-2xl overflow-hidden">
                <iframe
                  title="Vista previa del manifiesto"
                  className="w-full h-[70vh] bg-white"
                  srcDoc={generatedTemplateHtml || ''}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Manifiesto</p>
                    <h2 className="text-2xl font-black text-gray-900">{manifestNumber || 'Sin manifiesto'}</h2>
                    <p className="text-xs text-gray-500 mt-1">Ticket: {ticket.id}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {new Date().toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Cliente</p>
                    <p className="font-semibold text-gray-900">{ticket.client}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Recolector</p>
                    <p className="font-semibold text-gray-900">{displayCollectorName}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {boxes.map((box) => (
                    <div key={box.boxNumber} className="border rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-gray-900">Caja #{box.boxNumber}</p>
                        <p className="text-xs text-gray-500">Precinto: {box.seal || 'N/A'}</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {box.items.map((item) => (
                          <div key={`${box.boxNumber}-${item.id}`} className="text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">{item.marca} {item.modelo}</span>
                              <span className="text-gray-600">{item.cantidad} und</span>
                            </div>
                            {item.serials.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.serials.map((serial) => (
                                  <span key={serial.id} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                                    {serial.serial}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t flex gap-3">
            <button
              onClick={() => setShowExitPDF(false)}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={16} />
              Descargar PDF
            </button>
            <button
              onClick={handlePrintTemplate}
              className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    )
  }

  const dataWipeView = () => (
    <div>DATA WIPE VIEW PLACEHOLDER</div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4 md:p-8 font-sans selection:bg-brand-500/30">
      <CollectionGuideModal
        ticketId={ticket.id}
        isOpen={isCollectionGuideModalOpen}
        onClose={() => setIsCollectionGuideModalOpen(false)}
      />
      <TicketManagementModal
        isOpen={ticketManagementModal.isOpen}
        onClose={ticketManagementModal.close}
        ticket={ticketManagementModal.data!}
        onStartLoading={handleStartLoadingFromModal}
      />
      <ManifestModal
        isOpen={false}
        onClose={() => setManifestModalOpen(false)}
        onConfirm={handleSaveManifests}
        boxCount={boxes.length}
        defaultManifestNumber={manifestNumber}
      />
      <PDFTemplateModal
        isOpen={manifestModalOpen}
        onClose={() => setManifestModalOpen(false)}
        onConfirm={handleSaveManifests}
        boxCount={nonEmptyBoxes.length}
        defaultManifestNumber={manifestNumber}
        initialTemplateContent={pdfTemplateContent || undefined}
        logisticsData={{
          ticketId: ticket.id,
          clientName: ticket.client,
          clientLocation: (ticket as any).location || (ticket as any).ubicacion || 'N/A',
          collectorName: collectorName || 'Sin asignar',
          collectorPhone: selectedCollectorOption?.phone || transportDetails.phoneNumber || 'N/A',
          vehicleModel: vehicleModel || selectedCollectorOption?.vehicleModel || 'N/A',
          vehiclePlate: vehiclePlate || selectedCollectorOption?.vehiclePlate || 'N/A',
          manifestNumber: manifestNumber,
          boxCount: nonEmptyBoxes.length,
          totalUnits: nonEmptyBoxes.reduce((sum, box) => sum + box.items.reduce((itemSum, item) => itemSum + item.cantidad, 0), 0),
          boxNumbers: nonEmptyBoxes.map(box => box.boxNumber.toString()),
          boxSeals: nonEmptyBoxes.map(box => box.seal || 'SIN PRECINTO'),
          equipmentDetails: nonEmptyBoxes
            .flatMap(box => box.items)
            .flatMap(item =>
              item.serials?.map(serial => ({
                brand: item.marca,
                model: item.modelo,
                serial: serial.serial,
                tipo: item.tipoProducto
              })) || []
            )
        }}
      />
      {showExitPDF && <ExitPDFView />}

      {/* Modal de Captura de Series */}
      {serialModalState && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161b] border border-[#2a2d36] rounded-[2.5rem] w-full max-w-2xl p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-6 border-b border-[#2a2d36]">
              <div>
                <h3 className="text-2xl font-black text-white">Capturar Números de Serie</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {brands.find(b => b.id === serialModalState.brandId)?.name} • {models.find(m => m.id === serialModalState.modelId)?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Progreso</p>
                <p className="text-3xl font-black text-emerald-400 mt-1">
                  {capturedSerials.length}/{serialModalState.quantity}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                  Número de Serie
                </label>
                <div className="flex gap-3 mt-2">
                  <input
                    type="text"
                    value={serialDraft.serial}
                    onChange={(e) => setSerialDraft({ serial: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSerial()
                      }
                    }}
                    placeholder="Ingresa el número de serie"
                    className="flex-1 bg-[#1A1A1A] border border-surface-700 rounded-xl px-5 py-3 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                    disabled={capturedSerials.length >= serialModalState.quantity}
                  />
                  <button
                    onClick={handleAddSerial}
                    disabled={capturedSerials.length >= serialModalState.quantity}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {capturedSerials.length > 0 && (
                <div className="bg-[#1A1A1A] border border-surface-700 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">
                    Series Capturadas ({capturedSerials.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {capturedSerials.map((serial, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-[#14161b] border border-[#2a2d36] rounded-xl group hover:border-emerald-500/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black">
                            {index + 1}
                          </span>
                          <span className="font-mono font-bold text-white">{serial.serial}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveSerial(index)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                          title="Eliminar serie"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setSerialModalState(null)
                  setCapturedSerials([])
                  setSerialDraft({ serial: '' })
                }}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmEquipmentWithSerials}
                disabled={capturedSerials.length !== serialModalState.quantity}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-bold transition"
              >
                Confirmar Equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditItemModalOpen && editItemState && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-900 rounded-[2.5rem] w-full max-w-lg p-8 space-y-6 shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Editar Equipo</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Tipo de Producto</label>
                <select
                  className="w-full bg-gray-50 dark:bg-surface-950 border border-gray-200 dark:border-surface-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none"
                  value={editItemState.tipoProducto}
                  onChange={(e) => setEditItemState({ ...editItemState, tipoProducto: e.target.value })}
                >
                  {productTypeOptions.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Cantidad</label>
                <input
                  type="number"
                  className="w-full bg-gray-50 dark:bg-surface-950 border border-gray-200 dark:border-surface-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none"
                  value={editItemState.cantidad}
                  onChange={(e) => setEditItemState({ ...editItemState, cantidad: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsEditItemModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateItem}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {isClosed ? (
          completedNotice
        ) : view === 'data_wipe' ? (
          dataWipeView()
        ) : view === 'data_wipe_boxes' ? (
          <DataWipeBoxesView />
        ) : view === 'manifest' ? (
          renderManifestView()
        ) : (
          <DetailsView />
        )}
      </div>

    </div>
  )
}

export default LogisticaModule