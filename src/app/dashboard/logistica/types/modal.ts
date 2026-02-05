// Tipos para el sistema de logística
export interface TicketData {
  id: string
  client: string
  description?: string
  status: 'Pendiente' | 'Completado' | 'En Progreso'
  date: string
  receivedUnits: number
  totalUnits: number
  items?: TicketItem[]
  completedAt?: string
  completedBy?: string
}

export interface TicketItem {
  id: string
  brandName?: string
  modelName?: string
  productTypeName?: string
  expectedQuantity: number
  receivedQuantity?: number
}

export interface CollectorOption {
  id: string
  name: string
  phone?: string
  vehicleModel?: string
  vehiclePlate?: string
  source: 'profile' | 'custom'
}

export interface CollectorMetadata {
  ticketId: string
  collectorId?: string | null
  name: string
  phone?: string
  vehicleModel?: string
  vehiclePlate?: string
}

export interface BoxItem {
  id: number
  brandId: string
  modelId: string
  tipoProducto: string
  cantidad: number
  serials: Array<{
    id?: number
    serial: string
  }>
  marca?: string
  modelo?: string
}

export interface BoxStructure {
  id: number
  boxNumber: number
  sku?: string
  seal?: string
  items: BoxItem[]
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export interface TicketManagementModalProps {
  isOpen: boolean
  onClose: () => void
  ticket: TicketData
  onStartLoading: () => void
}

export interface EquipmentFormData {
  brand: string
  model: string
  productType: string
  quantity: number
  notes?: string
}
