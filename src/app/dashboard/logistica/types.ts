export type LogisticsStatus = 'Pendiente' | 'En Proceso' | 'Recibido Parcial' | 'Completado'

export interface TicketItem {
  id: string
  brandName?: string
  modelName?: string
  productTypeName?: string
  expectedQuantity: number
  receivedQuantity?: number
  status?: string
}

export interface LogisticsTicket {
  id: string
  client: string
  status: LogisticsStatus
  totalUnits: number
  receivedUnits: number
  date: string
  location: string
  description: string
  type?: string
  staffLabel?: string
  completedBy?: string
  completedAt?: string | null
  collectorName?: string
  collectorPhone?: string
  vehicleModel?: string
  vehiclePlate?: string
  ramCapacity?: string
  ramType?: string
  diskCapacity?: string
  diskType?: string
  keyboardType?: string
  keyboardVersion?: string
  items?: TicketItem[]
}
