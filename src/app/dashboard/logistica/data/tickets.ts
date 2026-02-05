export type LogisticsStatus = 'Pendiente' | 'En Proceso' | 'Recibido Parcial' | 'Completado'

export interface LogisticsTicket {
  id: string
  client: string
  status: LogisticsStatus
  totalUnits: number
  receivedUnits: number
  date: string
  staffLabel?: string
  location: string
  description: string
}

export const LOGISTICS_TICKETS: LogisticsTicket[] = [
  {
    id: 'TK-000001',
    client: 'JS-Tecnología',
    status: 'Completado',
    totalUnits: 10,
    receivedUnits: 10,
    date: '15 dic 2025',
    staffLabel: 'Juan Pérez',
    location: 'Zona 10, Guatemala',
    description: 'DATA WIPE · NIST 800-88'
  },
  {
    id: 'TK-000002',
    client: 'Banco Industrial',
    status: 'En Proceso',
    totalUnits: 50,
    receivedUnits: 12,
    date: '16 dic 2025',
    staffLabel: 'Lucía Méndez',
    location: 'Zona 4, Guatemala',
    description: 'Activos bancarios para reciclaje certificado'
  },
  {
    id: 'TK-000003',
    client: 'TRASSS',
    status: 'Pendiente',
    totalUnits: 5,
    receivedUnits: 0,
    date: '08 dic 2025',
    location: 'Mixco, Guatemala',
    description: 'Recolección de equipos en lote normal'
  }
]
