'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Package, Plus, X, PackageCheck, Loader2, Trash2, ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'

type ReceptionUnit = {
  id: string
  tipo: string
  tipoId: string
  marca: string
  marcaId: string
  modelo: string
  modeloId: string
  serie: string
  expectedSerial?: string
  color: string
  tamanoPantalla: string
  procesador: string
  ramCapacity: string
  ramType: string
  diskCapacity: string
  diskType: string
  teclado: string
  versionTeclado: string
  classified: boolean
  classification: string
  details: Record<string, unknown>
}

type ProductLine = {
  key: string
  marca: string
  marcaId: string
  modelo: string
  modeloId: string
  tipo: string
  tipoId: string
  quantity: number
  withSerial: number
  templateItemId: string
  units: ReceptionUnit[]
}

const buildProductLineKey = (unit: Pick<ReceptionUnit, 'marcaId' | 'modeloId' | 'tipoId' | 'marca' | 'modelo' | 'tipo'>) =>
  [
    unit.marcaId || unit.marca || 'sin-marca',
    unit.modeloId || unit.modelo || 'sin-modelo',
    unit.tipoId || unit.tipo || 'sin-tipo',
  ]
    .join('|')
    .toLowerCase()

const groupUnitsIntoLines = (units: ReceptionUnit[]): ProductLine[] => {
  const map = new Map<string, ProductLine>()
  for (const unit of units) {
    const key = buildProductLineKey(unit)
    const existing = map.get(key)
    if (existing) {
      existing.units.push(unit)
      existing.quantity += 1
      if (unit.serie) existing.withSerial += 1
    } else {
      map.set(key, {
        key,
        marca: unit.marca,
        marcaId: unit.marcaId,
        modelo: unit.modelo,
        modeloId: unit.modeloId,
        tipo: unit.tipo,
        tipoId: unit.tipoId,
        quantity: 1,
        withSerial: unit.serie ? 1 : 0,
        templateItemId: unit.id,
        units: [unit],
      })
    }
  }
  return Array.from(map.values())
}

type CatalogAccessory = {
  id: string
  name: string
  product_type_id: string | null
  is_required: boolean
}

type SelectedAccessory = {
  accessoryId: string
  name: string
  quantity: number
  notes: string
}

type TicketMetadata = {
  id: string
  readableId: string
  client: string
  lotNumber: string
  attachmentUrl?: string | null
  pickupAddress?: string | null
  pickupDate?: string | null
}

type ReceptionTicketListItem = {
  id: string
  readableId: string
  title: string
  status: string
  client: string
  itemCount: number
  pendingCount: number
  attachmentUrl?: string | null
  pickupAddress?: string | null
  pickupDate?: string | null
}

type SavedLabel = {
  boxId: string
  boxNumber: string
  ticket: string
  cliente: string
  lotNumber: string
  totalUnits: number
  receivedUnits: number
  receptionCode?: string | null
}

const RECEIVING_WAREHOUSE_CODE = 'BOD-REC'
const ALLOWED_RECEPTION_ITEM_TYPES = ['asset', 'part', 'seedstock'] as const
type ReceptionItemType = (typeof ALLOWED_RECEPTION_ITEM_TYPES)[number]

const createReceptionForm = () => ({
  clasificacionRec: '',
  clasificacionF: '',
  clasificacionC: '',
  marca: '',
  marcaId: '',
  modelo: '',
  modeloId: '',
  serie: '',
  tipo: '',
  tipoId: '',
  tamanoPantalla: '',
  procesador: '',
  color: '',
  ramCapacity: '',
  ramType: '',
  diskCapacity: '',
  diskType: '',
  teclado: '',
  versionTeclado: '',
  biosVersion: '',
  accessories: [] as SelectedAccessory[],
  observaciones: ''
})

const RecepcionModule = () => {
  const [ticketSearchTerm, setTicketSearchTerm] = useState('')
  const [ticketInfo, setTicketInfo] = useState<TicketMetadata | null>(null)
  const [availableTickets, setAvailableTickets] = useState<ReceptionTicketListItem[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingBoxes, setLoadingBoxes] = useState(false)
  const [boxesError, setBoxesError] = useState<string | null>(null)
  const [boxes, setBoxes] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeBoxDetails, setActiveBoxDetails] = useState<any>(null)
  const [activeUnitForReception, setActiveUnitForReception] = useState<any>(null)
  const [activeProductLineKey, setActiveProductLineKey] = useState<string | null>(null)
  const [serialInput, setSerialInput] = useState('')
  const [addingSerial, setAddingSerial] = useState(false)
  const [completingTicket, setCompletingTicket] = useState(false)
  const [serialError, setSerialError] = useState<string | null>(null)
  const serialInputRef = useRef<HTMLInputElement>(null)
  const [receptionForm, setReceptionForm] = useState(createReceptionForm())
  const [isPersistingDetails, setIsPersistingDetails] = useState(false)
  const [catalogAccessories, setCatalogAccessories] = useState<CatalogAccessory[]>([])
  const [filteredAccessories, setFilteredAccessories] = useState<CatalogAccessory[]>([])
  const [savedLabels, setSavedLabels] = useState<SavedLabel[]>([])
  // Catálogos maestros dinámicos
  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [productTypes, setProductTypes] = useState<any[]>([])
  const [procesadores, setProcesadores] = useState<string[]>([])
  const [ramOptions, setRamOptions] = useState<string[]>([])
  const [ramTypeOptions, setRamTypeOptions] = useState<string[]>([])
  const [diskCapacityOptions, setDiskCapacityOptions] = useState<string[]>([])
  const [diskTypeOptions, setDiskTypeOptions] = useState<string[]>([])
  const [tecladoOptions, setTecladoOptions] = useState<string[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

  const activeBoxLabel = activeBoxDetails
    ? savedLabels.find((label) => label.boxId === activeBoxDetails.id)
    : null

  // Load accessories catalog + tickets pendientes de recepción
  useEffect(() => {
    const loadAccessoriesCatalog = async () => {
      try {
        const response = await fetch('/api/recepcion/accessories-catalog')
        if (response.ok) {
          const data = await response.json()
          setCatalogAccessories(data.accessories || [])
        }
      } catch (error) {
        console.error('Error loading accessories:', error)
      }
    }
    loadAccessoriesCatalog()

    const loadTickets = async () => {
      setLoadingTickets(true)
      try {
        const response = await fetch('/api/recepcion/tickets')
        if (response.ok) {
          const data = await response.json()
          setAvailableTickets(data.tickets || [])
        }
      } catch (error) {
        console.error('Error loading reception tickets:', error)
      } finally {
        setLoadingTickets(false)
      }
    }
    void loadTickets()
  }, [])

  // Función para cargar catálogos
  const loadCatalogs = useCallback(async () => {
    setLoadingCatalogs(true)
    const fetchCatalog = async (tipo: string, setter: (items: string[]) => void, field: string = 'name') => {
      try {
        const url = `/api/maestros?tipo=${tipo}`
        console.log(`[RecepcionModule] Fetching ${tipo} from:`, url)
        const res = await fetch(url)

        if (res.ok) {
          const data = await res.json()
          console.log(`[RecepcionModule] Response for ${tipo}:`, data)
          const items = data.items || []
          console.log(`[RecepcionModule] Loaded ${tipo}:`, items.length, 'items')

          if (items.length > 0) {
            const values = items.map((item: any) => {
              const value = item[field] || item.name || item
              console.log(`[RecepcionModule] Item for ${tipo}:`, item, '-> value:', value)
              return value
            }).filter((val: any) => val && val !== '')

            console.log(`[RecepcionModule] Setting ${tipo} with ${values.length} values:`, values)
            setter(values)
          } else {
            console.warn(`[RecepcionModule] No items found for ${tipo}`)
            setter([])
          }
        } else {
          const errorText = await res.text()
          console.error(`[RecepcionModule] Error loading ${tipo}:`, res.status, res.statusText, errorText)
          setter([])
        }
      } catch (e) {
        console.error(`[RecepcionModule] Exception loading ${tipo}:`, e)
        setter([])
      }
    }

    const fetchCatalogWithIds = async (tipo: string, setter: (items: any[]) => void) => {
      try {
        const url = `/api/maestros?tipo=${tipo}`
        const res = await fetch(url)

        if (res.ok) {
          const data = await res.json()
          const items = data.items || []
          setter(items)
          console.log(`[RecepcionModule] Loaded ${tipo} with IDs:`, items.length, 'items')
        } else {
          setter([])
        }
      } catch (e) {
        console.error(`[RecepcionModule] Exception loading ${tipo}:`, e)
        setter([])
      }
    }

    try {
      await Promise.all([
        fetchCatalogWithIds('marca', setBrands),
        fetchCatalogWithIds('tipo_producto', setProductTypes),
        fetchCatalog('procesador', setProcesadores, 'name'),
        fetchCatalog('ram_capacity', setRamOptions, 'name'),
        fetchCatalog('ram_type', setRamTypeOptions, 'name'),
        fetchCatalog('disk_capacity', setDiskCapacityOptions, 'name'),
        fetchCatalog('disk_type', setDiskTypeOptions, 'name'),
        fetchCatalog('teclado', setTecladoOptions, 'name')
      ])
      console.log('[RecepcionModule] All catalogs loaded.')
    } finally {
      setLoadingCatalogs(false)
    }
  }, [])

  // Cargar catálogos maestros dinámicos al montar el componente
  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  // Monitorear cambios en procesadores para debugging
  useEffect(() => {
    console.log('[RecepcionModule] Procesadores state changed:', procesadores.length, 'items:', procesadores)
  }, [procesadores])

  // Cargar modelos cuando se selecciona una marca
  useEffect(() => {
    if (!receptionForm.marcaId) {
      setModels([])
      return
    }
    const loadModels = async () => {
      try {
        const url = `/api/maestros?tipo=modelo`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const items = data.items || []
          setModels(items)
          console.log('[RecepcionModule] Loaded models:', items.length, 'items')
        } else {
          setModels([])
        }
      } catch (e) {
        console.error('[RecepcionModule] Error loading models:', e)
        setModels([])
      }
    }
    loadModels()
  }, [receptionForm.marcaId])

  // Resolver modeloId cuando ya hay nombre de modelo pero falta el ID
  useEffect(() => {
    if (!receptionForm.marcaId || receptionForm.modeloId || !receptionForm.modelo || models.length === 0) {
      return
    }

    const matched = models.find(
      (m: any) => m.name === receptionForm.modelo && (!m.brand_id || m.brand_id === receptionForm.marcaId)
    )

    if (matched?.id) {
      setReceptionForm((prev) => ({
        ...prev,
        modeloId: matched.id
      }))
    }
  }, [models, receptionForm.marcaId, receptionForm.modelo, receptionForm.modeloId])

  // Recargar catálogos cuando se abre el modal de recepción
  useEffect(() => {
    if (activeUnitForReception) {
      console.log('[RecepcionModule] Modal opened, reloading catalogs...')
      loadCatalogs()

      const loadAccessoriesCatalog = async () => {
        try {
          const response = await fetch('/api/recepcion/accessories-catalog')
          if (response.ok) {
            const data = await response.json()
            setCatalogAccessories(data.accessories || [])
            console.log('[RecepcionModule] Reloaded accessories:', data.accessories?.length || 0, 'items')
          }
        } catch (error) {
          console.error('Error reloading accessories:', error)
        }
      }
      loadAccessoriesCatalog()
    }
  }, [activeUnitForReception, loadCatalogs])

  // Accessories handlers
  const handleAddAccessory = () => {
    const firstAccessory = catalogAccessories[0] || { id: '', name: '' }
    setReceptionForm((prev) => ({
      ...prev,
      accessories: [
        ...prev.accessories,
        {
          accessoryId: firstAccessory.id,
          name: firstAccessory.name,
          quantity: 1,
          notes: ''
        }
      ]
    }))
  }

  const handleRemoveAccessory = (index: number) => {
    setReceptionForm((prev) => ({
      ...prev,
      accessories: prev.accessories.filter((_, i) => i !== index)
    }))
  }

  const handleUpdateAccessory = (index: number, field: keyof SelectedAccessory, value: any) => {
    setReceptionForm((prev) => {
      const updated = [...prev.accessories]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'accessoryId') {
        const accessory = filteredAccessories.find(acc => acc.id === value)
        if (accessory) {
          updated[index].name = accessory.name
        }
      }
      return { ...prev, accessories: updated }
    })
  }

  const resetReceptionForm = () => setReceptionForm(createReceptionForm())

  const hasHardwareSpecs = Boolean(
    receptionForm.ramCapacity &&
    receptionForm.ramType &&
    receptionForm.diskCapacity &&
    receptionForm.diskType
  )

  const canConfirmReception = Boolean(
    receptionForm.serie?.trim() &&
    receptionForm.clasificacionF &&
    receptionForm.clasificacionC &&
    hasHardwareSpecs &&
    !isPersistingDetails
  )

  // Load boxes / equipos del ticket (incluye ítems sin caja logística)
  const loadBoxesForTicket = async (
    readableOverride?: string,
    options?: { keepModalOpen?: boolean; preferredBoxId?: string }
  ) => {
    setLoadingBoxes(true)
    setBoxesError(null)
    try {
      const normalizedTicket = (readableOverride ?? ticketSearchTerm).trim()
      if (!normalizedTicket) {
        setBoxesError('Ingresa el identificador del ticket')
        setLoadingBoxes(false)
        return
      }
      if (readableOverride && !options?.keepModalOpen) {
        setTicketSearchTerm(normalizedTicket)
      }
      const response = await fetch(`/api/logistica/boxes?ticketReadableId=${encodeURIComponent(normalizedTicket)}`)
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}))
        setBoxesError(errPayload.error || 'No fue posible cargar el ticket')
        setLoadingBoxes(false)
        return
      }
      const payload = await response.json()
      const ticketPayload: TicketMetadata = {
        id: payload.ticket?.id || normalizedTicket,
        readableId: payload.ticket?.readableId || normalizedTicket,
        client: payload.ticket?.client || 'Cliente desconocido',
        lotNumber: payload.ticket?.lotNumber || `Lote ${normalizedTicket}`,
        attachmentUrl: payload.ticket?.attachmentUrl || null,
        pickupAddress: payload.ticket?.pickupAddress || null,
        pickupDate: payload.ticket?.pickupDate || null,
      }
      const fetchedBoxes = Array.isArray(payload.boxes) ? payload.boxes : []
      const normalized = fetchedBoxes.map((box: any) => ({
        id: `${ticketPayload.id}-${box.boxNumber}`,
        boxNumber: box.boxNumber ?? 0,
        label: box.label || (box.boxNumber > 0 ? `Caja ${box.boxNumber}` : 'Equipos del ticket'),
        source: box.source || (box.boxNumber > 0 ? 'logistics' : 'ticket'),
        ticket: ticketPayload.readableId,
        ticketId: ticketPayload.id,
        cliente: ticketPayload.client,
        lotNumber: ticketPayload.lotNumber,
        totalUnits: (box.items || []).length,
        units: (box.items || []).map((item: any) => ({
          id: item.id,
          tipo: item.product_type || 'Equipo',
          tipoId: item.product_type_id || '',
          marca: (item.brand_full || item.brand || 'Sin marca').toString(),
          marcaId: item.brand_id || '',
          modelo: (item.model_full || item.model || 'Sin modelo').toString(),
          modeloId: item.model_id || '',
          serie: item.collected_serial || item.expected_serial || '',
          expectedSerial: item.expected_serial || '',
          color: item.color_detail || item.color || '',
          tamanoPantalla: '',
          procesador: item.processor || '',
          ramCapacity: item.ram_capacity || '',
          ramType: item.ram_type || '',
          diskCapacity: item.disk_capacity || '',
          diskType: item.disk_type || '',
          teclado: item.keyboard_type || '',
          versionTeclado: item.keyboard_version || '',
          classified: !!(item.classification_f && item.classification_c),
          classification: item.classification_f && item.classification_c ? `${item.classification_f}-${item.classification_c}` : '',
          details: {}
        })),
        receptionCode: box.boxReceptionCode || undefined
      }))
      setTicketInfo(ticketPayload)
      setBoxes(normalized)

      if (options?.keepModalOpen) {
        const preferredId = options.preferredBoxId || activeBoxDetails?.id
        const refreshed = normalized.find((b: any) => b.id === preferredId) || normalized[0] || null
        setActiveBoxDetails(refreshed)
      } else {
        setActiveBoxDetails(null)
        setActiveUnitForReception(null)
        resetReceptionForm()
        setActiveProductLineKey(null)
      }

      setBoxesError(
        normalized.length === 0
          ? 'Este ticket no tiene equipos. Agrégalos en Tickets o en Logística.'
          : null
      )
    } catch (error) {
      setBoxesError('Error al cargar el ticket')
    } finally {
      setLoadingBoxes(false)
    }
  }

  const selectTicketFromList = (ticket: ReceptionTicketListItem) => {
    void loadBoxesForTicket(ticket.readableId)
  }

  const getBoxStats = (box: any) => {
    const classified = box.units.filter((u: any) => u.classified).length
    const pending = box.units.filter((u: any) => !u.classified).length
    return { classified, pending }
  }

  const productLines = useMemo(
    () => (activeBoxDetails ? groupUnitsIntoLines(activeBoxDetails.units as ReceptionUnit[]) : []),
    [activeBoxDetails]
  )

  const activeProductLine = useMemo(
    () => productLines.find((line) => line.key === activeProductLineKey) || null,
    [productLines, activeProductLineKey]
  )

  // Al abrir el modal: seleccionar primera línea y enfocar pitoleo
  useEffect(() => {
    if (!activeBoxDetails) {
      setActiveProductLineKey(null)
      setSerialInput('')
      setSerialError(null)
      return
    }
    const lines = groupUnitsIntoLines(activeBoxDetails.units as ReceptionUnit[])
    if (lines.length === 0) return
    setActiveProductLineKey((prev) => {
      if (prev && lines.some((l) => l.key === prev)) return prev
      return lines[0].key
    })
    setTimeout(() => serialInputRef.current?.focus(), 120)
  }, [activeBoxDetails])

  const openBoxDetails = (box: any) => {
    setActiveUnitForReception(null)
    resetReceptionForm()
    setActiveBoxDetails(box)
  }

  const selectProductLine = (line: ProductLine) => {
    setActiveUnitForReception(null)
    resetReceptionForm()
    setActiveProductLineKey(line.key)
    setSerialError(null)
    setSerialInput('')
    setTimeout(() => serialInputRef.current?.focus(), 80)
  }

  const refreshActiveTicketBoxes = async () => {
    if (!activeBoxDetails) return
    await loadBoxesForTicket(activeBoxDetails.ticket, {
      keepModalOpen: true,
      preferredBoxId: activeBoxDetails.id,
    })
  }

  const handleAddSerialToLine = async () => {
    if (!activeBoxDetails || !activeProductLine) return
    const serial = serialInput.trim().toUpperCase()
    if (!serial) {
      setSerialError('Escanea o escribe una serie')
      return
    }

    if (activeProductLine.withSerial >= activeProductLine.quantity) {
      setSerialError(
        `Máximo ${activeProductLine.quantity} series. Usa "Agregar adicional" para más cupos.`
      )
      return
    }

    const duplicate = activeProductLine.units.some(
      (u) => (u.serie || '').trim().toUpperCase() === serial
    )
    if (duplicate) {
      setSerialError(`La serie ${serial} ya está en esta línea`)
      return
    }

    setAddingSerial(true)
    setSerialError(null)
    try {
      const response = await fetch('/api/recepcion/serials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan',
          ticketId: activeBoxDetails.ticketId,
          templateItemId: activeProductLine.templateItemId,
          serial,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSerialError(payload.error || 'No se pudo agregar la serie')
        return
      }

      setSerialInput('')
      await refreshActiveTicketBoxes()
      setTimeout(() => serialInputRef.current?.focus(), 150)
    } catch {
      setSerialError('Error de red al agregar serie')
    } finally {
      setAddingSerial(false)
    }
  }

  const handleAddAdditionalSlot = async () => {
    if (!activeBoxDetails || !activeProductLine) return
    if (!confirm('¿Agregar 1 cupo adicional a esta línea?')) return

    setAddingSerial(true)
    setSerialError(null)
    try {
      const response = await fetch('/api/recepcion/serials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'additional',
          ticketId: activeBoxDetails.ticketId,
          templateItemId: activeProductLine.templateItemId,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSerialError(payload.error || 'No se pudo agregar el adicional')
        return
      }
      await refreshActiveTicketBoxes()
      setTimeout(() => serialInputRef.current?.focus(), 150)
    } catch {
      setSerialError('Error de red al agregar adicional')
    } finally {
      setAddingSerial(false)
    }
  }

  const reloadAvailableTickets = async () => {
    try {
      const response = await fetch('/api/recepcion/tickets')
      if (response.ok) {
        const data = await response.json()
        setAvailableTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Error reloading reception tickets:', error)
    }
  }

  const handleCompleteTicket = async () => {
    if (!activeBoxDetails?.ticketId) return

    const units = (activeBoxDetails.units || []) as ReceptionUnit[]
    if (units.length === 0) {
      alert('No hay equipos en este ticket')
      return
    }

    const missingSerial = units.filter((u) => !(u.serie || '').trim()).length
    if (missingSerial > 0) {
      alert(`Faltan ${missingSerial} serie(s). Completa el pitoleo antes de guardar.`)
      return
    }

    const ok = confirm('¿Completar el ticket y enviar los equipos a Bodega Recepción?')
    if (!ok) return

    setCompletingTicket(true)
    try {
      const response = await fetch('/api/recepcion/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: activeBoxDetails.ticketId,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        alert(payload.error || 'No se pudo completar el ticket')
        return
      }

      const warehouseLabel = payload.warehouseName || payload.warehouseCode || 'Bodega Recepción'
      const moved = payload.movedAssets ?? 0
      alert(
        `✓ Ticket ${activeBoxDetails.ticket} completado\n${moved} equipo(s) enviados a ${warehouseLabel}`
      )
      setActiveBoxDetails(null)
      setActiveUnitForReception(null)
      setActiveProductLineKey(null)
      resetReceptionForm()
      setBoxes([])
      setTicketInfo(null)
      setTicketSearchTerm('')
      await reloadAvailableTickets()
    } catch {
      alert('Error de red al completar el ticket')
    } finally {
      setCompletingTicket(false)
    }
  }

  const handleRemoveSerialFromLine = async (unit: ReceptionUnit) => {
    if (!activeBoxDetails) return
    const label = unit.serie || 'cupo sin serie'
    if (!confirm(`¿Eliminar ${label} de esta línea?`)) return

    setAddingSerial(true)
    setSerialError(null)
    try {
      const response = await fetch('/api/recepcion/serials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: activeBoxDetails.ticketId,
          itemId: unit.id,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSerialError(payload.error || 'No se pudo eliminar la serie')
        return
      }
      if (activeUnitForReception?.id === unit.id) {
        setActiveUnitForReception(null)
        resetReceptionForm()
      }
      await refreshActiveTicketBoxes()
    } catch {
      setSerialError('Error de red al eliminar serie')
    } finally {
      setAddingSerial(false)
    }
  }

  const filteredBoxes = boxes.filter((box) => {
    const nBox = Number(box.boxNumber)
    // Permite caja 0 (equipos del ticket sin logística)
    const isInvalidNumber =
      box.boxNumber === null ||
      box.boxNumber === undefined ||
      box.boxNumber === '' ||
      !Number.isFinite(nBox) ||
      nBox < 0
    if (isInvalidNumber) return false

    const isCompleted =
      box.units.length > 0 && box.units.every((u: ReceptionUnit) => !!(u.serie || '').trim())

    if (filterStatus === 'completed') return isCompleted
    if (filterStatus === 'pending') return !isCompleted
    return true // 'all' displays everything
  })

  // Save to database
  const persistReceptionDetails = async () => {
    if (!activeBoxDetails) {
      throw new Error('No hay una caja activa para asociar la recepción')
    }
    const payload = {
      ticketId: activeBoxDetails.ticketId,
      ticketReadableId: activeBoxDetails.ticket,
      ramCapacity: receptionForm.ramCapacity,
      ramType: receptionForm.ramType,
      diskCapacity: receptionForm.diskCapacity,
      diskType: receptionForm.diskType,
      keyboardType: receptionForm.teclado,
      keyboardVersion: receptionForm.versionTeclado
    }
    const response = await fetch('/api/logistica/collector-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data?.error ?? 'No se pudo guardar la información de hardware')
    }
  }

  const persistIndividualReception = async () => {
    if (!activeUnitForReception || !activeUnitForReception.id) {
      throw new Error('No hay una unidad seleccionada para guardar la recepción')
    }

    const response = await fetch('/api/logistica/reception-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: activeUnitForReception.id,
        brandFull: receptionForm.marca,
        modelFull: receptionForm.modelo,
        productType: receptionForm.tipo,
        collectedSerial: receptionForm.serie,
        colorDetail: receptionForm.color,
        processor: receptionForm.procesador,
        ramCapacity: receptionForm.ramCapacity,
        ramType: receptionForm.ramType,
        diskCapacity: receptionForm.diskCapacity,
        diskType: receptionForm.diskType,
        keyboardType: receptionForm.teclado,
        keyboardVersion: receptionForm.versionTeclado,
        classificationRec: receptionForm.clasificacionRec,
        classificationF: receptionForm.clasificacionF,
        classificationC: receptionForm.clasificacionC,
        biosVersion: receptionForm.biosVersion,
        observations: receptionForm.observaciones,
        brandId: receptionForm.marcaId,
        modelId: receptionForm.modeloId,
        productTypeId: receptionForm.tipoId
      })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data?.error ?? 'No se pudo guardar la recepción del item')
    }
  }

  const handleProcessBoxToWarehouse = async () => {
    if (!ticketInfo || !activeBoxDetails) {
      alert('No hay información del ticket o caja activa')
      return
    }

    try {
      const response = await fetch('/api/logistica/reception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketInfo.id,
          ticketReadableId: ticketInfo.readableId,
          boxNumber: activeBoxDetails.boxNumber,
          warehouseCode: RECEIVING_WAREHOUSE_CODE,
          itemType: 'asset'
        })
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        alert(`Error al procesar la caja: ${payload?.error || 'Error desconocido'}`)
        return
      }

      alert(`✓ Caja #${activeBoxDetails.boxNumber} procesada a ${RECEIVING_WAREHOUSE_CODE} con código ${payload.code}`)

      // Cerrar el modal y recargar cajas
      setActiveBoxDetails(null)
      setActiveUnitForReception(null)
      resetReceptionForm()

      // Recargar las cajas del ticket
      await loadBoxesForTicket()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Error: ${message}`)
    }
  }

  const startReceptionForUnit = async (unit: any) => {
    const details = unit.details || {}
    const brandName = details.marca || unit.marca || ''
    const modelName = details.modelo || unit.modelo || ''
    const typeName = details.tipo || unit.tipo || ''
    const resolvedBrandId = details.marcaId || unit.marcaId || brands.find((b: any) => b.name === brandName)?.id || ''
    const resolvedTypeId = details.tipoId || unit.tipoId || productTypes.find((pt: any) => pt.name === typeName)?.id || ''
    const resolvedModelId = details.modeloId || unit.modeloId || models.find((m: any) => m.name === modelName && (!resolvedBrandId || m.brand_id === resolvedBrandId))?.id || ''
    setActiveUnitForReception(unit)
    setReceptionForm({
      ...createReceptionForm(),
      marca: brandName,
      marcaId: resolvedBrandId,
      modelo: modelName,
      modeloId: resolvedModelId,
      serie: details.serie || unit.serie || unit.expectedSerial || '',
      tipo: typeName,
      tipoId: resolvedTypeId,
      tamanoPantalla: details.tamanoPantalla || unit.tamanoPantalla || '',
      procesador: details.procesador || unit.procesador || '',
      color: details.color || unit.color || '',
      ramCapacity: details.ramCapacity || unit.ramCapacity || '',
      ramType: details.ramType || unit.ramType || '',
      diskCapacity: details.diskCapacity || unit.diskCapacity || '',
      diskType: details.diskType || unit.diskType || '',
      teclado: details.teclado || unit.teclado || '',
      versionTeclado: details.versionTeclado || unit.versionTeclado || '',
      accessories: [],
      clasificacionF: details.clasificacionF || '',
      clasificacionC: details.clasificacionC || '',
      observaciones: details.observaciones || ''
    })

    const productTypeId = resolvedTypeId || unit.tipoId || ''
    if (productTypeId) {
      try {
        const response = await fetch(`/api/recepcion/accessories-catalog?productTypeId=${encodeURIComponent(productTypeId)}`)
        if (response.ok) {
          const data = await response.json()
          const filtered = data.accessories || []
          setFilteredAccessories(filtered.length > 0 ? filtered : catalogAccessories)
        } else {
          setFilteredAccessories(catalogAccessories)
        }
      } catch (error) {
        console.error('Error loading filtered accessories:', error)
        setFilteredAccessories(catalogAccessories)
      }
    } else {
      setFilteredAccessories(catalogAccessories)
    }

    if (unit.id) {
      try {
        const response = await fetch(`/api/recepcion/accessories?ticketItemId=${encodeURIComponent(unit.id)}`)
        if (response.ok) {
          const data = await response.json()
          const loadedAccessories = (data.accessories || []).map((acc: any) => ({
            accessoryId: acc.accessory_id,
            name: acc.catalog_accessories?.name || 'Desconocido',
            quantity: acc.quantity || 1,
            notes: acc.notes || ''
          }))
          setReceptionForm((prev) => ({
            ...prev,
            accessories: loadedAccessories
          }))
        } else {
          console.warn('No se pudieron cargar los accesorios del item:', response.status)
        }
      } catch (error) {
        console.error('Error loading accessories:', error)
      }
    }
  }

  const handleConfirmReception = async () => {
    if (!activeBoxDetails || !activeUnitForReception) return
    if (!receptionForm.serie?.trim()) {
      alert('Ingresa la serie o IMEI antes de confirmar')
      return
    }
    if (!receptionForm.clasificacionF || !receptionForm.clasificacionC) {
      alert('Completa las clasificaciones Funcional (F) y Cosmético (C)')
      return
    }
    if (!hasHardwareSpecs) {
      alert('Selecciona la capacidad y tipo de RAM y Disco')
      return
    }

    const classificationLabel = `${receptionForm.clasificacionF}-${receptionForm.clasificacionC}`
    try {
      setIsPersistingDetails(true)
      await persistReceptionDetails()
      await persistIndividualReception()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      alert(`No fue posible guardar: ${message}`)
      return
    } finally {
      setIsPersistingDetails(false)
    }

    setBoxes((prev) => {
      const updated = prev.map((box) => {
        if (box.id !== activeBoxDetails.id) return box
        const updatedUnits = box.units.map((unit: any) => {
          if (unit.id !== activeUnitForReception.id) return unit
          return {
            ...unit,
            marca: receptionForm.marca || unit.marca,
            modelo: receptionForm.modelo || unit.modelo,
            serie: receptionForm.serie || unit.serie,
            tipo: receptionForm.tipo || unit.tipo,
            tamanoPantalla: receptionForm.tamanoPantalla,
            procesador: receptionForm.procesador,
            color: receptionForm.color,
            teclado: receptionForm.teclado,
            versionTeclado: receptionForm.versionTeclado,
            accessories: receptionForm.accessories,
            classified: true,
            classification: classificationLabel,
            details: { ...receptionForm, classification: classificationLabel }
          }
        })
        return { ...box, units: updatedUnits }
      })
      const updatedActive = updated.find((box) => box.id === activeBoxDetails.id)
      setActiveBoxDetails(updatedActive || null)
      return updated
    })

    setActiveUnitForReception(null)
    resetReceptionForm()
  }

  const handleStartReception = (unit: any) => {
    if (activeBoxLabel) {
      alert('La recepción ya fue guardada y no se puede editar')
      return
    }
    if (activeBoxDetails) {
      const boxStats = getBoxStats(activeBoxDetails)
      if (boxStats.pending === 0) {
        alert('No se puede editar. Esta caja ya fue completada.')
        return
      }
    }
    startReceptionForUnit(unit)
  }

  const clasificacionesREC = [
    { value: 'R', label: 'R - Reciclaje' },
    { value: 'E', label: 'E - Electrónico' },
    { value: 'C', label: 'C - Computadora' }
  ]
  const clasificacionesF = [
    { value: 'F1', label: 'F1: Equipos coleccionables o especializados' },
    { value: 'F2', label: 'F2: Equipos electronicos especializados verificados' },
    { value: 'F3', label: 'F3: Funciones esenciales en funcionamiento' },
    { value: 'F4', label: 'F4: Hardware funcionando' },
    { value: 'F5', label: 'F5: Reacondicionados' },
    { value: 'F6', label: 'F6: Como nuevos' }
  ]
  const clasificacionesC = [
    { value: 'C0', label: 'C0: No categorizado' },
    { value: 'C1', label: 'C1: Averiado (para recuperacion de materiales)' },
    { value: 'C2', label: 'C2: Usado deficiente - uso intenso y antiguedad' },
    { value: 'C3', label: 'C3: Usado razonable (uso y antiguedad moderados)' },
    { value: 'C4', label: 'C4: Usado bueno' },
    { value: 'C5', label: 'C5: Usado muy bueno' },
    { value: 'C6', label: 'C6: Usado excelente' },
    { value: 'C7', label: 'C7: Certificado como de segunda mano (reacondicionado)' },
    { value: 'C8', label: 'C8: Sin usar' },
    { value: 'C9', label: 'C9: Nuevo y en caja abierta' }
  ]
  // const ramOptions = ['4GB', '8GB', '16GB', '32GB', '64GB']
  // const diskCapacityOptions = ['128GB', '256GB', '512GB', '1TB', '2TB']
  const colores = ['Negro', 'Gris', 'Plateado', 'Blanco', 'Azul']
  const versionTecladoOptions = ['Normal', 'Retroiluminado', 'Mecánico']

  // En recepción solo se gestionan series; la clasificación no bloquea el flujo
  const activeBoxCompleted = false

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-8 mb-12">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-surface-900 rounded-[2.5rem] border border-gray-100 dark:border-surface-800 p-8 text-center shadow-xl shadow-gray-200/20 dark:shadow-black/20 min-w-[200px] transition-all hover:scale-105">
              <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mb-1 tracking-tighter">{boxes.reduce((acc, box) => acc + (box.units || []).filter((u: ReceptionUnit) => !!(u.serie || '').trim()).length, 0)}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700 dark:text-gray-300">Con Serie</div>
            </div>
            <div className="bg-white dark:bg-surface-900 rounded-[2.5rem] border border-gray-100 dark:border-surface-800 p-8 text-center shadow-xl shadow-gray-200/20 dark:shadow-black/20 min-w-[200px] transition-all hover:scale-105">
              <div className="text-4xl font-black text-amber-500 dark:text-amber-400 mb-1 tracking-tighter">{boxes.reduce((acc, box) => acc + (box.units || []).filter((u: ReceptionUnit) => !(u.serie || '').trim()).length, 0)}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700 dark:text-gray-300">Sin Serie</div>
            </div>
          </div>
        </div>

        <div className="mb-12 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Plus className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              <input
                placeholder="Buscar ticket (ej: TK-2026-00005)"
                value={ticketSearchTerm}
                onChange={(e) => setTicketSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadBoxesForTicket()
                }}
                className="w-full pl-16 pr-8 py-5 bg-white dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-[2rem] text-gray-900 dark:text-white font-black placeholder-gray-500 dark:placeholder-surface-700 focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all shadow-inner"
              />
            </div>
            <button
              onClick={() => void loadBoxesForTicket()}
              disabled={loadingBoxes}
              className="px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] text-white bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loadingBoxes && <Loader2 className="w-5 h-5 animate-spin" />}
              {loadingBoxes ? 'Cargando...' : 'Cargar Ticket'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400">
                Tickets listos para recepción
              </p>
              {loadingTickets && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
            </div>
            {availableTickets.length === 0 && !loadingTickets ? (
              <p className="text-sm text-gray-500 dark:text-surface-500 px-2">
                No hay tickets activos. Crea uno en Tickets (con foto OCR si aplica).
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {availableTickets.map((ticket) => {
                  const isActive = ticketInfo?.readableId === ticket.readableId
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => selectTicketFromList(ticket)}
                      className={cn(
                        'text-left rounded-2xl border p-4 transition-all',
                        isActive
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                          : 'border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 hover:border-purple-400/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">
                            {ticket.readableId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-surface-400 mt-1 truncate">
                            {ticket.client}
                          </p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {ticket.pendingCount}/{ticket.itemCount} pend.
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-surface-500 mt-2 truncate">
                        {ticket.title}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {boxesError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-center gap-3">
              <X className="w-4 h-4 text-rose-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">{boxesError}</p>
            </div>
          )}
        </div>

        {ticketInfo && (
          <div className="mb-8 px-8 py-5 bg-gray-50/50 dark:bg-surface-950/50 rounded-[2rem] border border-gray-100 dark:border-surface-800 flex flex-wrap gap-8 items-center">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 leading-none mb-1.5">Ticket ID</span>
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">{ticketInfo.readableId}</span>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-surface-800 self-center hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 leading-none mb-1.5">Cliente</span>
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">{ticketInfo.client}</span>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-surface-800 self-center hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 leading-none mb-1.5">Lote</span>
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">{ticketInfo.lotNumber}</span>
            </div>
            {ticketInfo.pickupAddress && (
              <>
                <div className="w-px h-8 bg-gray-200 dark:bg-surface-800 self-center hidden sm:block" />
                <div className="flex flex-col min-w-0 max-w-sm">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 leading-none mb-1.5">Dirección</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white leading-snug truncate">{ticketInfo.pickupAddress}</span>
                </div>
              </>
            )}
            {ticketInfo.attachmentUrl && (
              <a
                href={ticketInfo.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Ver recibo
              </a>
            )}
          </div>
        )}

        <div className="flex p-2 bg-gray-100/50 dark:bg-surface-950 rounded-[2rem] gap-2 border border-gray-100 dark:border-surface-800 shadow-inner mb-8 w-fit">
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-8 py-3 rounded-[1.5rem] transition-all duration-300 font-bold text-[10px] uppercase tracking-widest",
              filterStatus === 'all'
                ? "bg-white dark:bg-surface-900 text-purple-700 dark:text-purple-400 shadow-lg border-b-2 border-purple-600 dark:border-purple-400"
                : "text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            Todas las Cajas
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={cn(
              "px-8 py-3 rounded-[1.5rem] transition-all duration-300 font-bold text-[10px] uppercase tracking-widest",
              filterStatus === 'pending'
                ? "bg-amber-500 text-white shadow-lg"
                : "text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={cn(
              "px-8 py-3 rounded-[1.5rem] transition-all duration-300 font-bold text-[10px] uppercase tracking-widest",
              filterStatus === 'completed'
                ? "bg-emerald-500 text-white shadow-lg"
                : "text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            Completadas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoxes.map((box) => {
            const withSerial = (box.units || []).filter((u: ReceptionUnit) => !!(u.serie || '').trim()).length
            const isCompleted = box.units.length > 0 && withSerial === box.units.length
            return (
              <article key={box.id} className="bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                {isCompleted && (
                  <div className="absolute top-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black uppercase text-white tracking-widest shadow-lg">
                      <Package className="w-3 h-3" />
                      Completada
                    </div>
                  </div>
                )}

                <header className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 dark:bg-surface-950 flex items-center justify-center border border-gray-100 dark:border-surface-800 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <Package className="text-gray-500 dark:text-surface-400" size={32} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-700 dark:text-gray-300 leading-none mb-2">Unidad de Carga</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tighter">
                      {box.label || (box.boxNumber > 0 ? `Caja ${box.boxNumber}` : 'Equipos del ticket')}
                    </p>
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mt-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{box.ticket}</p>
                  </div>
                </header>

                <div className="mt-6 px-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-surface-400 mb-1">
                    Cantidad a recibir
                  </p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                    {box.totalUnits || box.units?.length || 0}{' '}
                    <span className="text-sm font-bold text-gray-400">activos</span>
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-surface-950 rounded-2xl border border-gray-100 dark:border-surface-800 shadow-inner">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1">Con serie</p>
                    <p className="text-2xl font-black text-emerald-500 leading-none">{(box.units || []).filter((u: ReceptionUnit) => !!(u.serie || '').trim()).length}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-surface-950 rounded-2xl border border-gray-100 dark:border-surface-800 shadow-inner">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1">Sin serie</p>
                    <p className="text-2xl font-black text-amber-500 leading-none">{(box.units || []).filter((u: ReceptionUnit) => !(u.serie || '').trim()).length}</p>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => {
                      if (isCompleted) {
                        alert('No se puede editar. Esta caja ya fue completada.')
                        return
                      }
                      openBoxDetails(box)
                    }}
                    disabled={isCompleted}
                    className={`flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isCompleted
                      ? 'bg-gray-200 dark:bg-surface-700 text-gray-400 dark:text-surface-500 cursor-not-allowed opacity-50'
                      : 'bg-gray-100 dark:bg-surface-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-surface-700'
                      }`}
                  >
                    Ver detalles
                  </button>
                  {!isCompleted && (
                    <button
                      onClick={() => {
                        setActiveBoxDetails(box)
                        setTimeout(() => handleProcessBoxToWarehouse(), 100)
                      }}
                      className="px-6 py-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                      Bodega
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm('¿Eliminar esta caja? Esta acción no se puede deshacer.')) return
                      setBoxes(boxes.filter(b => b.id !== box.id))
                    }}
                    className="p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-all active:scale-95"
                    title="Eliminar caja"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {activeBoxDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            <div
              className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-500"
              onClick={() => {
                setActiveBoxDetails(null)
                setActiveUnitForReception(null)
                resetReceptionForm()
              }}
            />

            <div className="relative w-full max-w-[1200px] h-[85vh] rounded-2xl bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="px-5 py-3 border-b border-gray-100 dark:border-surface-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-500 dark:bg-purple-600 flex items-center justify-center shrink-0">
                    <Package className="text-white" size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                      {activeBoxDetails.label || (activeBoxDetails.boxNumber > 0 ? `Caja ${activeBoxDetails.boxNumber}` : 'Equipos del ticket')}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                      {activeBoxDetails.ticket}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {((activeBoxDetails.units || []) as ReceptionUnit[]).every((u) => !!(u.serie || '').trim()) ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                      Series listas
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest">
                      Faltan series
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCompleteTicket()}
                    disabled={
                      completingTicket ||
                      !(activeBoxDetails.units || []).every((u: ReceptionUnit) => !!(u.serie || '').trim())
                    }
                    className="px-3 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Completa y envía a Bodega Recepción"
                  >
                    {completingTicket ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PackageCheck className="w-3.5 h-3.5" />
                    )}
                    {completingTicket ? 'Enviando...' : 'Completar → Bodega'}
                  </button>
                  <button
                    onClick={() => {
                      setActiveBoxDetails(null)
                      setActiveUnitForReception(null)
                      resetReceptionForm()
                    }}
                    className="p-2 rounded-xl bg-gray-50 dark:bg-surface-950 text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-100 dark:border-surface-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-hidden grid lg:grid-cols-[280px,1fr]">
                {/* Líneas de producto */}
                <div className="overflow-y-auto p-3 space-y-2 bg-gray-50/40 dark:bg-surface-950/40 border-r border-gray-100 dark:border-surface-800">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 px-1 mb-1">
                    Líneas ({productLines.length}) · {activeBoxDetails.units.length} activos
                  </p>
                  {productLines.map((line) => {
                    const isSelected = activeProductLineKey === line.key && !activeUnitForReception
                    return (
                      <button
                        key={line.key}
                        type="button"
                        onClick={() => selectProductLine(line)}
                        className={cn(
                          "w-full text-left relative flex flex-col gap-1.5 p-3 rounded-xl border transition-all",
                          isSelected
                            ? "bg-white dark:bg-surface-900 border-purple-500/50 shadow-md"
                            : "bg-white dark:bg-surface-900/50 border-gray-100 dark:border-surface-800 hover:border-purple-400/40"
                        )}
                      >
                        {isSelected && <span className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-xl" />}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase text-gray-900 dark:text-white truncate">
                              {line.marca} {line.modelo}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mt-0.5">
                              {line.tipo}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{line.quantity}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Cant.</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            line.withSerial >= line.quantity ? "text-emerald-500" : "text-amber-500"
                          )}>
                            Series {line.withSerial}/{line.quantity}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500">Detalle →</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="overflow-y-auto p-4 bg-white dark:bg-surface-900">
                  {activeUnitForReception ? (
                    <div className="space-y-10 animate-in slide-in-from-right duration-700">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-surface-950 flex items-center justify-center border border-gray-100 dark:border-surface-800 shadow-inner group-hover:scale-105 transition-transform">
                            <Package size={28} className="text-gray-400" />
                          </div>
                          <div>
                            <Text variant="h3" as="h4" className="uppercase leading-tight tracking-tight">
                              {activeUnitForReception.marca} {activeUnitForReception.modelo}
                            </Text>
                            <Text variant="label" className="text-purple-600 dark:text-purple-400 mt-1 block">Formulario de Recepción</Text>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveUnitForReception(null)
                            resetReceptionForm()
                          }}
                          className="px-6 py-3 rounded-xl bg-gray-50 dark:bg-surface-950 text-gray-400 hover:text-gray-900 dark:hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                            Marca *
                          </label>
                          <select
                            value={receptionForm.marcaId}
                            onChange={(e) => {
                              const selected = brands.find(b => b.id === e.target.value)
                              setReceptionForm((prev) => ({
                                ...prev,
                                marcaId: e.target.value,
                                marca: selected?.name || ''
                              }))
                            }}
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer"
                          >
                            <option value="">Seleccionar marca...</option>
                            {brands.map((brand: any) => (
                              <option key={brand.id} value={brand.id}>{brand.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                            Modelo *
                          </label>
                          <select
                            value={receptionForm.modeloId}
                            onChange={(e) => {
                              const selected = models.find(m => m.id === e.target.value)
                              setReceptionForm((prev) => ({
                                ...prev,
                                modeloId: e.target.value,
                                modelo: selected?.name || ''
                              }))
                            }}
                            disabled={!receptionForm.marcaId}
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccionar modelo...</option>
                            {models
                              .filter((m: any) => m.brand_id === receptionForm.marcaId)
                              .map((model: any) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                          Tipo de Producto *
                        </label>
                        <select
                          value={receptionForm.tipoId}
                          onChange={(e) => {
                            const selected = productTypes.find(pt => pt.id === e.target.value)
                            setReceptionForm((prev) => ({
                              ...prev,
                              tipoId: e.target.value,
                              tipo: selected?.name || ''
                            }))
                          }}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer"
                        >
                          <option value="">Seleccionar tipo de producto...</option>
                          {productTypes.map((pt: any) => (
                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2.5">
                        <Text variant="label" className="ml-1">
                          Serie / IMEI / Service Tag
                        </Text>
                        <input
                          value={receptionForm.serie}
                          onChange={(e) => setReceptionForm((prev) => ({ ...prev, serie: e.target.value }))}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white font-mono font-black placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none focus:border-purple-500 transition-all shadow-inner"
                          placeholder="Ej: K12345678"
                        />
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                          Clasificación REC
                        </label>
                        <select
                          value={receptionForm.clasificacionRec}
                          onChange={(e) => setReceptionForm((prev) => ({ ...prev, clasificacionRec: e.target.value }))}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer"
                        >
                          <option value="">Seleccionar clasificación REC...</option>
                          {clasificacionesREC.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                            Clasificación Funcional (F)
                          </label>
                          <select
                            value={receptionForm.clasificacionF}
                            onChange={(e) => setReceptionForm((prev) => ({ ...prev, clasificacionF: e.target.value }))}
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer"
                          >
                            <option value="">Seleccionar...</option>
                            {clasificacionesF.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                            Clasificación Cosmética (C)
                          </label>
                          <select
                            value={receptionForm.clasificacionC}
                            onChange={(e) => setReceptionForm((prev) => ({ ...prev, clasificacionC: e.target.value }))}
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer"
                          >
                            <option value="">Seleccionar...</option>
                            {clasificacionesC.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="p-8 bg-gray-50/50 dark:bg-surface-950/50 rounded-[2.5rem] border border-gray-100 dark:border-surface-800 space-y-8">
                        <div className="flex items-center gap-3">
                          <Plus className="w-5 h-5 text-purple-500" />
                          <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">Especificaciones Técnicas</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Procesador
                            </label>
                            <select
                              value={receptionForm.procesador}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, procesador: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {procesadores.map((p, index) => (
                                <option key={`proc-${index}-${p}`} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Color
                            </label>
                            <select
                              value={receptionForm.color}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, color: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {colores.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Capacidad RAM
                            </label>
                            <select
                              value={receptionForm.ramCapacity}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, ramCapacity: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {ramOptions.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Tipo RAM
                            </label>
                            <select
                              value={receptionForm.ramType}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, ramType: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {ramTypeOptions.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Capacidad Disco
                            </label>
                            <select
                              value={receptionForm.diskCapacity}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, diskCapacity: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {diskCapacityOptions.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Tipo Disco
                            </label>
                            <select
                              value={receptionForm.diskType}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, diskType: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {diskTypeOptions.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Teclado
                            </label>
                            <select
                              value={receptionForm.teclado}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, teclado: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {tecladoOptions.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-surface-400 ml-1">
                              Versión Teclado
                            </label>
                            <select
                              value={receptionForm.versionTeclado}
                              onChange={(e) => setReceptionForm((prev) => ({ ...prev, versionTeclado: e.target.value }))}
                              className="w-full px-6 py-4 bg-white dark:bg-surface-900 border-2 border-gray-100 dark:border-surface-800 rounded-2xl text-gray-900 dark:text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {versionTecladoOptions.map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-purple-500" />
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">Accesorios Incluidos</h5>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddAccessory}
                            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all active:scale-95 flex items-center gap-2"
                          >
                            <Plus size={14} />
                            Agregar
                          </button>
                        </div>

                        {receptionForm.accessories.length === 0 ? (
                          <div className="p-10 border-2 border-dashed border-gray-100 dark:border-surface-800 rounded-[2rem] text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-600">No hay accesorios registrados</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {receptionForm.accessories.map((acc, index) => (
                              <div key={index} className="bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-surface-800 rounded-2xl p-5 flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                <select
                                  value={acc.accessoryId}
                                  onChange={(e) => handleUpdateAccessory(index, 'accessoryId', e.target.value)}
                                  className="flex-1 px-4 py-3 bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:border-purple-500 outline-none"
                                >
                                  {filteredAccessories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  value={acc.quantity}
                                  onChange={(e) => handleUpdateAccessory(index, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-20 px-4 py-3 bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:border-purple-500 outline-none text-center"
                                  min="1"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAccessory(index)}
                                  className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-surface-600 ml-1">
                          Observaciones
                        </label>
                        <textarea
                          placeholder="Notas adicionales sobre la recepción..."
                          value={receptionForm.observaciones}
                          onChange={(e) => setReceptionForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                          rows={4}
                          className="w-full px-8 py-6 bg-gray-50 dark:bg-surface-950 border-2 border-gray-100 dark:border-surface-800 rounded-[2.5rem] text-gray-900 dark:text-white font-bold placeholder-gray-300 dark:placeholder-surface-700 focus:outline-none focus:border-purple-500 transition-all shadow-inner resize-none"
                        />
                      </div>

                      <div className="pt-8 flex flex-col items-center">
                        <button
                          onClick={handleConfirmReception}
                          className={cn(
                            "w-full max-sm px-10 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4",
                            canConfirmReception
                              ? "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/30"
                              : "bg-gray-100 dark:bg-surface-800 text-gray-400 cursor-not-allowed"
                          )}
                          disabled={!canConfirmReception}
                        >
                          {isPersistingDetails ? (
                            <Plus className="w-6 h-6 animate-spin" />
                          ) : (
                            <Package className="w-6 h-6" />
                          )}
                          {isPersistingDetails ? 'Procesando...' : 'Confirmar Recepción'}
                        </button>
                        <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-600">
                          Todos los campos obligatorios deben estar completos
                        </p>
                      </div>
                    </div>
                  ) : activeProductLine ? (
                    <div className="space-y-3 animate-in slide-in-from-right duration-300">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                            Detalle de línea
                          </p>
                          <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                            {activeProductLine.marca} {activeProductLine.modelo}
                          </h4>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {activeProductLine.tipo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="rounded-lg border border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-950 px-3 py-2 text-center">
                            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{activeProductLine.quantity}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mt-1">Recibir</p>
                          </div>
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-center">
                            <p className="text-lg font-black text-emerald-500 leading-none">{activeProductLine.withSerial}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600/80 mt-1">Serie</p>
                          </div>
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-center">
                            <p className="text-lg font-black text-amber-500 leading-none">
                              {Math.max(activeProductLine.quantity - activeProductLine.withSerial, 0)}
                            </p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-amber-600/80 mt-1">Sin</p>
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        'rounded-xl border p-3 space-y-2',
                        activeProductLine.withSerial >= activeProductLine.quantity
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-purple-500/30 bg-purple-500/5'
                      )}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <ScanBarcode className={cn(
                              'w-4 h-4',
                              activeProductLine.withSerial >= activeProductLine.quantity ? 'text-emerald-500' : 'text-purple-500'
                            )} />
                            <p className={cn(
                              'text-[9px] font-black uppercase tracking-widest',
                              activeProductLine.withSerial >= activeProductLine.quantity
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-purple-600 dark:text-purple-400'
                            )}>
                              {activeProductLine.withSerial >= activeProductLine.quantity
                                ? `Series ${activeProductLine.withSerial}/${activeProductLine.quantity}`
                                : `Pitoleo · ${activeProductLine.withSerial}/${activeProductLine.quantity}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleAddAdditionalSlot()}
                            disabled={addingSerial || !!activeBoxLabel || activeBoxCompleted}
                            className="px-2.5 py-1.5 rounded-lg border border-purple-500/40 text-purple-600 dark:text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/10 disabled:opacity-50 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Adicional
                          </button>
                        </div>
                        {activeProductLine.withSerial >= activeProductLine.quantity ? (
                          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Cupos llenos · usa Adicional para más
                          </p>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              ref={serialInputRef}
                              value={serialInput}
                              onChange={(e) => {
                                setSerialInput(e.target.value)
                                setSerialError(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void handleAddSerialToLine()
                                }
                              }}
                              placeholder="Serie + Enter"
                              disabled={addingSerial || !!activeBoxLabel || activeBoxCompleted}
                              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-surface-950 border border-gray-100 dark:border-surface-800 font-mono text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() => void handleAddSerialToLine()}
                              disabled={addingSerial || !serialInput.trim() || !!activeBoxLabel || activeBoxCompleted}
                              className="px-3 py-2 rounded-lg bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1"
                            >
                              {addingSerial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              Serie
                            </button>
                          </div>
                        )}
                        {serialError && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">{serialError}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 px-0.5">
                          Series en esta línea
                        </p>
                        {activeProductLine.units.map((unit) => (
                          <div
                            key={unit.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-surface-800 bg-gray-50/80 dark:bg-surface-950/60"
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-black text-gray-900 dark:text-white truncate">
                                {unit.serie || 'Sin serie'}
                              </p>
                              <p className={cn(
                                'text-[8px] font-black uppercase tracking-widest',
                                unit.serie ? 'text-emerald-500' : 'text-amber-500'
                              )}>
                                {unit.serie ? 'Serie registrada' : 'Sin serie'}
                              </p>
                            </div>
                            <button
                              type="button"
                              title="Eliminar serie"
                              onClick={() => void handleRemoveSerialFromLine(unit)}
                              disabled={addingSerial || !!activeBoxLabel}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <Package size={36} className="text-gray-300 mb-3 opacity-50" />
                      <h4 className="text-sm font-black text-gray-400 uppercase tracking-tight mb-1">Selecciona una línea</h4>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 max-w-xs">
                        Elige un producto a la izquierda
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecepcionModule
