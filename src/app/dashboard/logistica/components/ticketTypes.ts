export type TicketStatus =
  | 'Pendiente'
  | 'En Proceso'
  | 'Recibido Parcial'
  | 'Completado'
  | 'in_progress'
  | 'completed'

export interface TicketItem {
  id: string
  equipo: string
  marcaModelo: string
  tipoProducto: string
  cantidad: number
  recibida: number
}

export interface TicketData {
  id: string
  cliente: string
  unidades: string
  cierre: string
  estado: TicketStatus
  descripcion?: string
  items: TicketItem[]
}
