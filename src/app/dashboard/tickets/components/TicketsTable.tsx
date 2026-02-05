'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  FileText,
  Truck,
  Shield,
  ClipboardCheck,
  Trash2,
  MoreVertical,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Clock,
  Package,
  Eye,
  Edit,
  ChevronDown,
  Download,
  MapPin,
  User,
  Hash,
  Hammer,
  Wrench,
  Settings,
  Eraser
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createTicketAction, updateTicketAction, updateTicketStatus, deleteTicketCompletely, type OperationsTicket, type TicketStatus, type TicketType } from '../actions'
import { type CrmEntity } from '../../clientes/actions'
import { type CatalogItem } from '../../configuracion/usuarios/actions'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { DataTable } from '@/components/ui/DataTable'
import { Text } from '@/components/ui/Text'
import { FormLabel } from '@/components/ui/FormLabel'

interface TicketsTableProps {
  initialTickets: OperationsTicket[]
  clients: CrmEntity[]
  serviceTypes: CatalogItem[]
  brands: CatalogItem[]
  models: CatalogItem[]
  productTypes: CatalogItem[]
}

// Configuración de tipos de ticket
const ticketTypeConfig: Record<TicketType, { label: string; color: string; bg: string; icon: typeof Truck }> = {
  recoleccion: { label: 'Recolección', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/20', icon: Truck },
  garantia: { label: 'Garantía', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/20', icon: Shield },
  auditoria: { label: 'Auditoría', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/20', icon: ClipboardCheck },
  destruccion: { label: 'Destrucción', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/20', icon: Trash2 },
  reciclaje: { label: 'Reciclaje', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/20', icon: Package },
  itad: { label: 'ITAD Services', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/20', icon: Building2 },
  mantenimiento: { label: 'Mantenimiento', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/20', icon: Hammer },
  reparacion: { label: 'Reparación', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/20', icon: Wrench },
  instalacion: { label: 'Instalación', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/20', icon: Settings },
  data_wipe: { label: 'DATA WIPE', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/20', icon: Eraser },
}

const DEFAULT_TICKET_TYPE: TicketType = 'recoleccion'

const ticketTypeMatchers: { regex: RegExp; type: TicketType }[] = [
  { regex: /garant/i, type: 'garantia' },
  { regex: /auditor/i, type: 'auditoria' },
  { regex: /(destrucci|destruction)/i, type: 'destruccion' },
  { regex: /recicl/i, type: 'reciclaje' },
  { regex: /recolecci/i, type: 'recoleccion' },
  { regex: /itad/i, type: 'itad' },
  { regex: /mantenim/i, type: 'mantenimiento' },
  { regex: /repara/i, type: 'reparacion' },
  { regex: /instal/i, type: 'instalacion' },
  { regex: /(data wipe|wipe|nist|refurbished|acondicion)/i, type: 'data_wipe' },
]

const normalizeServiceTypeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const getTicketTypeFromServiceName = (name?: string): TicketType => {
  if (!name) {
    return DEFAULT_TICKET_TYPE
  }
  const normalized = normalizeServiceTypeName(name)
  const match = ticketTypeMatchers.find((matcher) => matcher.regex.test(normalized))
  return match ? match.type : DEFAULT_TICKET_TYPE
}

// Configuración de estados
const statusConfig: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-600 dark:text-surface-400', bg: 'bg-gray-100 dark:bg-surface-500/20' },
  open: { label: 'Abierto', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/20' },
  pending: { label: 'Pendiente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/20' },
  assigned: { label: 'Asignado', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/20' },
  confirmed: { label: 'Confirmado', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/20' },
  in_progress: { label: 'En Proceso', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/20' },
  completed: { label: 'Completado', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/20' },
  closed: { label: 'Cerrado', color: 'text-gray-600 dark:text-surface-400', bg: 'bg-gray-100 dark:bg-surface-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/20' },
}

const formatStatusLabel = (status: string) => {
  if (!status) return 'Desconocido'
  return status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getStatusBadgeConfig = (status: string) => {
  return statusConfig[status as TicketStatus] ?? {
    label: formatStatusLabel(status),
    color: 'text-surface-400',
    bg: 'bg-surface-800/40'
  }
}

// Configuración de prioridades
const priorityConfig: Record<number, { label: string; color: string }> = {
  1: { label: 'Urgente', color: 'text-red-600 dark:text-red-400' },
  2: { label: 'Alta', color: 'text-amber-600 dark:text-amber-400' },
  3: { label: 'Normal', color: 'text-gray-600 dark:text-surface-400' },
  4: { label: 'Baja', color: 'text-gray-500 dark:text-surface-500' },
  5: { label: 'Mínima', color: 'text-gray-400 dark:text-surface-600' },
}

const formatTicketId = (readableId?: string | null) => {
  if (!readableId) return 'TK-XXXXX'
  return readableId
}

export default function TicketsTable({ initialTickets, clients, serviceTypes, brands, models, productTypes }: TicketsTableProps) {
  const [tickets, setTickets] = useState(initialTickets)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<TicketType | 'all'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<OperationsTicket | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const router = useRouter()

  // Abrir modal de ver detalles
  const openViewModal = (ticket: OperationsTicket) => {
    setSelectedTicket(ticket)
    setIsViewModalOpen(true)
  }

  // Sincronizar estado local con props del servidor cuando hay cambios (ej. router.refresh)
  useMemo(() => {
    setTickets(initialTickets)
  }, [initialTickets])

  // Estado para modal de editar
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [ticketToEdit, setTicketToEdit] = useState<OperationsTicket | null>(null)

  // Abrir modal de editar
  const openEditModal = (ticket: OperationsTicket) => {
    setTicketToEdit(ticket)
    setIsEditModalOpen(true)
  }

  // Estado para modal de eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<OperationsTicket | null>(null)

  // Abrir modal de eliminar
  const openDeleteModal = (ticket: OperationsTicket) => {
    setTicketToDelete(ticket)
    setIsDeleteModalOpen(true)
  }

  // Manejar eliminación de ticket
  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return

    startTransition(async () => {
      try {
        console.log('Iniciando borrado de ticket:', ticketToDelete.id)
        const result = await deleteTicketCompletely(ticketToDelete.id)

        console.log('Resultado del borrado:', result)

        if (result.success) {
          console.log('Ticket borrado exitosamente')
          // Eliminar del estado local
          setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id))
          setIsDeleteModalOpen(false)
          setTicketToDelete(null)
          setFormSuccess(true)
          setTimeout(() => {
            setFormSuccess(false)
            router.refresh()
          }, 1500)
        } else {
          console.error('Error al borrar ticket:', result.error)
          setFormError(result.error || 'Error desconocido al borrar el ticket')
        }
      } catch (err) {
        console.error('Exception al borrar ticket:', err)
        setFormError('Error al borrar el ticket. Por favor, intenta de nuevo.')
      }
    })
  }

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase()

    // Búsqueda por ticket ID (soporta formatos: TK-2026-00002, TK-00002, 00002)
    const ticketIdMatch = ticket.readable_id?.toLowerCase().includes(searchLower) ||
      (searchTerm.match(/^\d+$/) && ticket.readable_id?.match(/TK-\d{4}-(\d{5})/)?.[1]?.endsWith(searchTerm))

    const matchesSearch =
      ticketIdMatch ||
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.client?.commercial_name?.toLowerCase().includes(searchLower)

    // Ocultar cancelados por defecto, solo mostrar si se filtra específicamente por ellos
    const matchesStatus = filterStatus === 'all'
      ? ticket.status !== 'cancelled'
      : ticket.status === filterStatus
    const matchesType = filterType === 'all' || (ticket as any).ticket_type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  // Manejar creación de ticket
  const handleCreateTicket = async (formData: FormData) => {
    setFormError(null)
    setFormSuccess(false)

    startTransition(async () => {
      const result = await createTicketAction(formData)

      if (result && result.success) {
        setFormSuccess(true)
        setTimeout(() => {
          setIsModalOpen(false)
          setFormSuccess(false)
          router.refresh()
        }, 1500)
      } else {
        setFormError(result?.error || 'Error desconocido al crear el ticket')
      }
    })
  }

  // Manejar cambio de estado
  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    startTransition(async () => {
      const result = await updateTicketStatus(ticketId, newStatus)
      if (result.success) {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md w-full">
          <SearchInput
            placeholder="Buscar por Ticket o Cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
            className="flex-1 lg:flex-none px-4 py-2.5 bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-xl text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer text-sm font-medium"
          >
            <option value="all">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="assigned">Asignado</option>
            <option value="draft">Borrador</option>
            <option value="confirmed">Confirmado</option>
            <option value="in_progress">En Proceso</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as TicketType | 'all')}
            className="flex-1 lg:flex-none px-4 py-2.5 bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-xl text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer text-sm font-medium"
          >
            <option value="all">Todos los tipos</option>
            <option value="recoleccion">Recolección</option>
            <option value="garantia">Garantía</option>
            <option value="auditoria">Auditoría</option>
            <option value="destruccion">Destrucción</option>
            <option value="reciclaje">Reciclaje</option>
            <option value="itad">ITAD Services</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="reparacion">Reparación</option>
            <option value="instalacion">Instalación</option>
            <option value="data_wipe">Refurbished (Data Wipe)</option>
          </select>

          {/* New Ticket Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 
                     text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20
                     active:scale-95 text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Ticket</span>
          </button>
        </div>
      </div>

      {/* Table or Empty State */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          onCreateClick={() => setIsModalOpen(true)}
          searchTerm={searchTerm}
          hasClients={clients.length > 0}
        />
      ) : (
        <DataTable
          columns={[
            {
              header: 'Ticket',
              key: 'id',
              render: (ticket) => {
                const typeConfig = ticketTypeConfig[(ticket as any).ticket_type as TicketType] || ticketTypeConfig.recoleccion
                return (
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl transition-colors", typeConfig.bg)}>
                      <typeConfig.icon className={cn("w-4 h-4", typeConfig.color)} />
                    </div>
                    <div>
                      <Text variant="body" className="font-mono font-bold">
                        {formatTicketId(ticket.readable_id)}
                      </Text>
                      <Text variant="muted" className="truncate max-w-[200px] font-medium block">
                        {ticket.title}
                      </Text>
                    </div>
                  </div>
                )
              }
            },
            {
              header: 'Cliente',
              key: 'client',
              render: (ticket) => (
                <div className="flex items-center gap-2 font-medium">
                  <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <Text variant="secondary">{ticket.client?.commercial_name || 'Sin cliente'}</Text>
                </div>
              )
            },
            {
              header: 'Creado por',
              key: 'created_by',
              render: (ticket) => (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <Text variant="muted" className="font-medium">{ticket.created_by_user?.full_name || 'Desconocido'}</Text>
                </div>
              )
            },
            {
              header: 'Tipo',
              key: 'ticket_type',
              render: (ticket) => {
                const typeConfig = ticketTypeConfig[(ticket as any).ticket_type as TicketType] || ticketTypeConfig.recoleccion
                const ticket_type = (ticket as any).ticket_type as BadgeVariant
                return <Badge variant={ticket_type}>{typeConfig.label}</Badge>
              }
            },
            {
              header: 'Estado',
              key: 'status',
              render: (ticket) => {
                const variantMap: Record<string, BadgeVariant> = {
                  'draft': 'default',
                  'open': 'en-proceso',
                  'assigned': 'en-proceso',
                  'confirmed': 'completado',
                  'in_progress': 'pendiente',
                  'completed': 'completado',
                  'cancelled': 'destruccion'
                }
                return <Badge variant={variantMap[ticket.status] || 'default'}>{formatStatusLabel(ticket.status)}</Badge>
              }
            },
            {
              header: 'Unidades',
              key: 'units',
              render: (ticket) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold">
                  <Package className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <Text variant="body" className="font-bold">{ticket.received_units}/{ticket.expected_units}</Text>
                </div>
              )
            },
            {
              header: 'Fecha',
              key: 'created_at',
              render: (ticket) => (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-surface-500 font-medium whitespace-nowrap">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(ticket.created_at).toLocaleDateString('es-GT', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )
            },
            {
              header: 'Acciones',
              key: 'actions',
              className: 'text-right',
              render: (ticket) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openViewModal(ticket)}
                    className="p-2 text-gray-400 dark:text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-500/10 rounded-xl transition-all"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(ticket)}
                    className="p-2 text-gray-400 dark:text-surface-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                    title="Editar ticket"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(ticket)}
                    className="p-2 text-gray-400 dark:text-surface-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Eliminar ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            }
          ]}
          data={filteredTickets}
        />
      )}

      {/* Modal para crear ticket */}
      {isModalOpen && (
        <CreateTicketModal
          clients={clients}
          serviceTypes={serviceTypes}
          brands={brands}
          models={models}
          productTypes={productTypes}
          onClose={() => {
            setIsModalOpen(false)
            setFormError(null)
            setFormSuccess(false)
          }}
          onSubmit={handleCreateTicket}
          isPending={isPending}
          error={formError}
          success={formSuccess}
        />
      )}

      {/* Modal para ver detalles del ticket */}
      {isViewModalOpen && selectedTicket && (
        <ViewTicketModal
          ticket={selectedTicket}
          onClose={() => {
            setIsViewModalOpen(false)
            setSelectedTicket(null)
          }}
        />
      )}

      {/* Modal para editar ticket */}
      {isEditModalOpen && ticketToEdit && (
        <EditTicketModal
          ticket={ticketToEdit}
          serviceTypes={serviceTypes}
          onClose={() => {
            setIsEditModalOpen(false)
            setTicketToEdit(null)
          }}
          isPending={isPending}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      {isDeleteModalOpen && ticketToDelete && (
        <DeleteTicketModal
          ticket={ticketToDelete}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setTicketToDelete(null)
          }}
          onConfirm={handleDeleteTicket}
          isPending={isPending}
        />
      )}
    </div>
  )
}

// Empty State Component
function EmptyState({
  onCreateClick,
  searchTerm,
  hasClients
}: {
  onCreateClick: () => void
  searchTerm: string
  hasClients: boolean
}) {
  return (
    <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-[2.5rem] p-12 text-center shadow-sm dark:shadow-none">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-50 dark:bg-surface-800 rounded-[2rem] flex items-center justify-center transition-colors">
          <FileText className="w-10 h-10 text-gray-300 dark:text-surface-600" />
        </div>

        {searchTerm ? (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-gray-500 dark:text-surface-400 mb-6 font-medium">
              No hay tickets que coincidan con &quot;<span className="text-brand-500 font-bold">{searchTerm}</span>&quot;.
            </p>
          </>
        ) : !hasClients ? (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Primero necesitas clientes
            </h3>
            <p className="text-gray-500 dark:text-surface-400 mb-6 font-medium">
              Antes de crear tickets, debes registrar al menos un cliente en el sistema.
            </p>
            <a
              href="/dashboard/clientes"
              className="inline-flex items-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-500 
                       text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95"
            >
              <Building2 className="w-5 h-5" />
              Ir a Clientes
            </a>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Aún no tienes tickets
            </h3>
            <p className="text-gray-500 dark:text-surface-400 mb-6 font-medium">
              Crea tu primer ticket de operación para comenzar a gestionar el flujo de trabajo.
            </p>
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-500 
                       text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Ticket
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Configuración de títulos automáticos por tipo de servicio
const ticketTitleByType: Record<TicketType, string> = {
  recoleccion: 'Recolección de equipos',
  garantia: 'Servicio de garantía',
  auditoria: 'Auditoría de activos',
  destruccion: 'Destrucción certificada',
  reciclaje: 'Reciclaje de equipos',
  itad: 'ITAD Services',
  mantenimiento: 'Mantenimiento',
  reparacion: 'Reparación',
  instalacion: 'Instalación',
  data_wipe: 'Refurbished (Data Wipe)'
}

// Modal Component
function CreateTicketModal({
  clients,
  serviceTypes,
  brands,
  models,
  productTypes,
  onClose,
  onSubmit,
  isPending,
  error,
  success
}: {
  clients: CrmEntity[]
  serviceTypes: CatalogItem[]
  brands: CatalogItem[]
  models: CatalogItem[]
  productTypes: CatalogItem[]
  onClose: () => void
  onSubmit: (formData: FormData) => void
  isPending: boolean
  error: string | null
  success: boolean
}) {
  const uniqueServiceTypes = useMemo(() => {
    const seen = new Set<string>()
    return serviceTypes.filter((type) => {
      const normalizedName = normalizeServiceTypeName(type.name ?? '')
      if (seen.has(normalizedName)) return false
      seen.add(normalizedName)
      return true
    })
  }, [serviceTypes])

  const defaultServiceTypeId = uniqueServiceTypes[0]?.id ?? ''
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>(defaultServiceTypeId)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [manualItems, setManualItems] = useState<Array<{
    id: string
    brand_id: string
    model_id: string
    product_type_id: string
    quantity: number
  }>>([])
  const [newItem, setNewItem] = useState({
    brand_id: '',
    model_id: '',
    product_type_id: '',
    quantity: 1
  })

  // Obtener el cliente seleccionado
  const selectedClient = clients.find(c => c.id === selectedClientId)

  const selectedServiceType = uniqueServiceTypes.find((type) => type.id === selectedServiceTypeId)
  const selectedServiceTypeLabel = selectedServiceType?.name ?? uniqueServiceTypes[0]?.name ?? 'Recolección'
  const currentTicketType = getTicketTypeFromServiceName(selectedServiceTypeLabel)

  // Generar título automático basado en el tipo de servicio seleccionado
  const generatedTitle = selectedClient
    ? `${selectedServiceTypeLabel} - ${selectedClient.commercial_name}`
    : selectedServiceTypeLabel

  // Manejar agregar item manual

  // Filter models based on selected brand
  const filteredModels = useMemo(() => {
    if (!newItem.brand_id) return []
    return models.filter((model: any) => model.brand_id === newItem.brand_id)
  }, [models, newItem.brand_id])
  const handleAddItem = () => {
    if (!newItem.brand_id || !newItem.model_id || !newItem.product_type_id || newItem.quantity <= 0) {
      alert('Por favor selecciona todos los campos del equipo')
      return
    }

    const itemToAdd = {
      id: `manual-${Date.now()}`,
      ...newItem
    }

    console.log('[ADD ITEM] Adding item:', itemToAdd)

    setManualItems([
      ...manualItems,
      itemToAdd
    ])
    setNewItem({
      brand_id: '',
      model_id: '',
      product_type_id: '',
      quantity: 1
    })
  }

  // Eliminar item manual
  const handleRemoveItem = (itemId: string) => {
    setManualItems(manualItems.filter(item => item.id !== itemId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg 
                    shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#1a1f2e] z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 
                     rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form action={onSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm">¡Ticket creado exitosamente!</p>
            </div>
          )}

          {/* Cliente */}
          <div className="space-y-2">
            <FormLabel required>Cliente</FormLabel>
            <select
              name="client_id"
              required
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                       focus:border-brand-500 transition-all cursor-pointer"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.filter(c => c.is_active).map(client => (
                <option key={client.id} value={client.id}>
                  {client.commercial_name} ({client.tax_id_nit})
                </option>
              ))}
            </select>
          </div>

          {/* Tipo y Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-300">
                Tipo de Servicio <span className="text-red-400">*</span>
              </label>
              <select
                name="service_type_id"
                required
                value={selectedServiceTypeId}
                onChange={(e) => setSelectedServiceTypeId(e.target.value)}
                className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl
                         text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                         focus:border-brand-500 transition-all cursor-pointer"
              >
                {uniqueServiceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <input type="hidden" name="ticket_type" value={currentTicketType} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-300">
                Prioridad
              </label>
              <select
                name="priority"
                defaultValue="3"
                className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl
                         text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                         focus:border-brand-500 transition-all cursor-pointer"
              >
                <option value="1">🔴 Urgente</option>
                <option value="2">🟠 Alta</option>
                <option value="3">⚪ Normal</option>
                <option value="4">🔵 Baja</option>
                <option value="5">⚫ Mínima</option>
              </select>
            </div>
          </div>

          {/* Título - Hidden, generado automáticamente */}
          <input type="hidden" name="title" value={generatedTitle} />

          {/* Items Manuales - Agregar equipos directamente desde catálogos */}
          <div className="space-y-3 bg-surface-800/40 p-4 rounded-xl border border-surface-700">
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-3">
                Equipos a Recolectar <span className="text-surface-500 text-xs">(Marca • Modelo • Tipo • Cantidad)</span>
              </label>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  value={newItem.brand_id}
                  onChange={(e) => setNewItem({ ...newItem, brand_id: e.target.value, model_id: '' })}
                  className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
                           text-white text-sm focus:outline-none focus:border-blue-500 transition-all
                           cursor-pointer"
                >
                  <option value="">Seleccionar Marca</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newItem.model_id}
                  onChange={(e) => setNewItem({ ...newItem, model_id: e.target.value })}
                  className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
                           text-white text-sm focus:outline-none focus:border-blue-500 transition-all
                           cursor-pointer"
                >
                  <option value="">Seleccionar Modelo</option>
                  {filteredModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newItem.product_type_id}
                  onChange={(e) => setNewItem({ ...newItem, product_type_id: e.target.value })}
                  className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
                           text-white text-sm focus:outline-none focus:border-blue-500 transition-all
                           cursor-pointer"
                >
                  <option value="">Seleccionar Tipo</option>
                  {productTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad a recibir"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
                           text-white placeholder-surface-500 text-sm focus:outline-none 
                           focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium 
                         rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Equipo
              </button>
            </div>

            {/* Lista de equipos agregados */}
            {manualItems.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-surface-700">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wide">
                  {manualItems.length} equipo{manualItems.length !== 1 ? 's' : ''} agregado{manualItems.length !== 1 ? 's' : ''}
                </p>
                {manualItems.map((item, idx) => {
                  const brand = brands.find(b => b.id === item.brand_id)
                  const model = models.find(m => m.id === item.model_id)
                  const type = productTypes.find(t => t.id === item.product_type_id)
                  return (
                    <div key={item.id} className="flex items-start justify-between p-3 bg-surface-900/60 rounded-lg border border-surface-700">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">
                          {brand?.name} {model?.name}
                        </p>
                        <p className="text-xs text-surface-500">
                          {type?.name} • Cantidad: {item.quantity}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="ml-2 p-1 text-surface-400 hover:text-red-400 hover:bg-red-500/10 
                                 rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
                {/* Hidden inputs para enviar los items al servidor */}
                {manualItems.map((item, idx) => (
                  <div key={`hidden-${item.id}`}>
                    <input type="hidden" name={`items[${idx}].brand_id`} value={item.brand_id} />
                    <input type="hidden" name={`items[${idx}].model_id`} value={item.model_id} />
                    <input type="hidden" name={`items[${idx}].product_type_id`} value={item.product_type_id} />
                    <input type="hidden" name={`items[${idx}].quantity`} value={item.quantity} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fecha de Recolección - Moved out of grid since Expected Units was removed */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-300">
              Fecha de Recolección
            </label>
            <input
              name="pickup_date"
              type="date"
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl
                       text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                       focus:border-brand-500 transition-all"
            />
          </div>

          {/* Dirección de Recolección */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-300">
              Dirección de Recolección
            </label>
            <input
              name="pickup_address"
              type="text"
              placeholder="Dirección donde se recogerán los equipos"
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl
                       text-white placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-300">
              Descripción / Instrucciones
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Detalles adicionales, instrucciones especiales, contacto en sitio..."
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl
                       text-white placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 text-surface-300 hover:text-white hover:bg-surface-800 
                       rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 
                       text-white font-semibold rounded-xl transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  ¡Creado!
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Crear Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// View Ticket Modal Component
function ViewTicketModal({
  ticket,
  onClose
}: {
  ticket: OperationsTicket
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'assets'>('details')
  const [assets, setAssets] = useState<any[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)
  const [assetsError, setAssetsError] = useState<string | null>(null)

  const typeConfig = ticketTypeConfig[(ticket as any).ticket_type as TicketType] || ticketTypeConfig.recoleccion
  const statConfig = getStatusBadgeConfig(ticket.status)
  const prioConfig = priorityConfig[ticket.priority] || priorityConfig[3]

  // Cargar assets al abrir el modal
  useState(() => {
    const loadAssets = async () => {
      setIsLoadingAssets(true)
      const { data, error } = await import('../actions').then(mod => mod.getTicketAssetsAction(ticket.id))
      if (error) {
        setAssetsError(error)
      } else {
        setAssets(data || [])
      }
      setIsLoadingAssets(false)
    }
    loadAssets()
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-2xl 
                    shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800 bg-surface-900 z-10">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", typeConfig.bg)}>
              <typeConfig.icon className={cn("w-5 h-5", typeConfig.color)} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{ticket.readable_id || 'Ticket'}</h2>
              <p className="text-sm text-surface-400">{ticket.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 
                     rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-800 px-6 gap-6 bg-surface-900/50">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              "py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'details'
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-surface-400 hover:text-white"
            )}
          >
            Detalle del Servicio
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={cn(
              "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'assets'
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-surface-400 hover:text-white"
            )}
          >
            Equipos Recibidos
            {assets.length > 0 && (
              <span className="px-2 py-0.5 bg-surface-800 text-surface-300 rounded-full text-xs">
                {assets.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Estado y Tipo */}
              <div className="flex flex-wrap gap-3">
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  statConfig.bg, statConfig.color
                )}>
                  {statConfig.label}
                </span>
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  typeConfig.bg, typeConfig.color
                )}>
                  {typeConfig.label}
                </span>
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium bg-surface-800",
                  prioConfig.color
                )}>
                  Prioridad: {prioConfig.label}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Usuario que creó el ticket */}
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-surface-400 mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Creado por</span>
                  </div>
                  <p className="text-white font-medium">
                    {ticket.created_by_user?.full_name || 'Desconocido'}
                  </p>
                </div>
                {/* Cliente */}
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-surface-400 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Cliente</span>
                  </div>
                  <p className="text-white font-medium">
                    {ticket.client?.commercial_name || 'Sin cliente'}
                  </p>
                  {ticket.client?.tax_id_nit && (
                    <p className="text-sm text-surface-500">NIT: {ticket.client.tax_id_nit}</p>
                  )}
                </div>

                {/* Unidades */}
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-surface-400 mb-2">
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">Unidades</span>
                  </div>
                  <p className="text-white font-medium">
                    {ticket.received_units} de {ticket.expected_units} recibidas
                  </p>
                  <div className="mt-2 h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{
                        width: ticket.expected_units > 0
                          ? `${Math.min((ticket.received_units / ticket.expected_units) * 100, 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                {/* Fecha de Recolección */}
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-surface-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Fecha de Recolección</span>
                  </div>
                  <p className="text-white font-medium">
                    {ticket.pickup_date
                      ? new Date(ticket.pickup_date).toLocaleDateString('es-GT', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                      : 'No especificada'}
                  </p>
                </div>

                {/* Fecha de Creación */}
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-surface-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Fecha de Creación</span>
                  </div>
                  <p className="text-white font-medium">
                    {new Date(ticket.created_at).toLocaleDateString('es-GT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Dirección */}
              {ticket.pickup_address && (
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-surface-400 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">Dirección de Recolección</span>
                  </div>
                  <p className="text-white">{ticket.pickup_address}</p>
                </div>
              )}

              {/* Descripción */}
              {ticket.description && (
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-surface-400 mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Descripción / Instrucciones</span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}

              {/* Archivo Adjunto */}
              {(ticket as any).attachment_url && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-3">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Archivo de Detalle Adjunto</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {(ticket as any).attachment_name || 'Archivo Excel'}
                        </p>
                        <p className="text-sm text-surface-500">Lista de equipos a recolectar</p>
                      </div>
                    </div>
                    <a
                      href={(ticket as any).attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 
                               text-white font-medium rounded-xl transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </a>
                  </div>
                </div>
              )}


              {/* Notas Internas */}
              {ticket.notes && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Notas Internas</span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{ticket.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {isLoadingAssets ? (
                <div className="flex flex-col items-center justify-center py-12 text-surface-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Cargando equipos recibidos...</p>
                </div>
              ) : assetsError ? (
                <div className="text-center py-12 text-red-400">
                  <p>Error cargando detalles: {assetsError}</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-12 text-surface-500 bg-surface-800/30 rounded-xl border border-dashed border-surface-700">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No se han recibido equipos aún</p>
                  <p className="text-sm mt-1">Los activos aparecerán aquí cuando sean ingresados a bodega.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-surface-400">
                      Mostrando {assets.length} equipos ingresados a bodega
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="bg-surface-800/40 border border-surface-700 rounded-xl p-4 hover:border-surface-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-brand-500/10 rounded-lg">
                              <Package className="w-5 h-5 text-brand-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-medium text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded">
                                  {asset.internal_tag}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full capitalize",
                                  asset.status === 'received' ? 'bg-blue-500/20 text-blue-300' :
                                    asset.status === 'wiped' ? 'bg-green-500/20 text-green-300' :
                                      'bg-surface-700 text-surface-300'
                                )}>
                                  {asset.status === 'received' ? 'En Bodega' : asset.status}
                                </span>
                              </div>
                              <h4 className="font-semibold text-white">
                                {asset.manufacturer || 'Generico'} {asset.model || ''}
                              </h4>
                              <p className="text-sm text-surface-400 mt-0.5">
                                SN: <span className="text-surface-300 font-mono">{asset.serial_number || 'N/A'}</span>
                              </p>
                              {(asset.specifications?.cpu || asset.specifications?.ram) && (
                                <p className="text-xs text-surface-500 mt-2">
                                  {asset.specifications?.cpu} • {asset.specifications?.ram} • {asset.specifications?.storage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-800 bg-surface-900 mt-auto">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-surface-800 hover:bg-surface-700 text-white 
                     font-medium rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Ticket Modal Component
function EditTicketModal({
  ticket,
  serviceTypes,
  onClose,
  isPending
}: {
  ticket: OperationsTicket
  serviceTypes: CatalogItem[]
  onClose: () => void
  isPending: boolean
}) {
  const [formData, setFormData] = useState({
    title: ticket.title || '',
    description: ticket.description || '',
    expected_units: ticket.expected_units || 0,
    pickup_address: ticket.pickup_address || '',
    pickup_date: ticket.pickup_date || '',
    priority: ticket.priority || 3,
    notes: ticket.notes || '',
    ticket_type: ticket.ticket_type || 'recoleccion'
  })

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('title', formData.title)
      form.append('description', formData.description)
      form.append('expected_units', String(formData.expected_units))
      form.append('pickup_address', formData.pickup_address)
      form.append('pickup_date', formData.pickup_date)
      form.append('priority', String(formData.priority))
      form.append('ticket_type', formData.ticket_type)
      form.append('notes', formData.notes)

      const result = await updateTicketAction(ticket.id, form)
      if (result.success) {
        router.refresh()
        onClose()
      } else {
        setError(result.error || 'Error al actualizar el ticket')
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800 sticky top-0 bg-surface-900 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Editar Ticket</h2>
            <p className="text-sm text-surface-400 mt-1">{ticket.readable_id}</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 
                     rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                       rounded-lg text-white placeholder-surface-500 focus:outline-none 
                       focus:border-blue-500 disabled:opacity-50"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                       rounded-lg text-white placeholder-surface-500 focus:outline-none 
                       focus:border-blue-500 disabled:opacity-50 resize-none"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Unidades Esperadas
              </label>
              <input
                type="number"
                min="0"
                value={formData.expected_units}
                onChange={(e) => setFormData({ ...formData, expected_units: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                         rounded-lg text-white placeholder-surface-500 focus:outline-none 
                         focus:border-blue-500 disabled:opacity-50"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tipo de Servicio <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.ticket_type}
                onChange={(e) => setFormData({ ...formData, ticket_type: e.target.value as TicketType })}
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                         rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                <option value="recoleccion">Recolección</option>
                <option value="garantia">Garantía</option>
                <option value="auditoria">Auditoría</option>
                <option value="destruccion">Destrucción</option>
                <option value="reciclaje">Reciclaje</option>
                <option value="itad">ITAD Services</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="reparacion">Reparación</option>
                <option value="instalacion">Instalación</option>
                <option value="data_wipe">DATA WIPE, NIST 800-88</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Prioridad
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                         rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                <option value="1">🔴 Urgente</option>
                <option value="2">🟠 Alta</option>
                <option value="3">⚪ Normal</option>
                <option value="4">🔵 Baja</option>
                <option value="5">⚫ Mínima</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Dirección de Recogida
            </label>
            <input
              type="text"
              value={formData.pickup_address}
              onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
              className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                       rounded-lg text-white placeholder-surface-500 focus:outline-none 
                       focus:border-blue-500 disabled:opacity-50"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Fecha de Recogida
            </label>
            <input
              type="date"
              value={formData.pickup_date}
              onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
              className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                       rounded-lg text-white placeholder-surface-500 focus:outline-none 
                       focus:border-blue-500 disabled:opacity-50"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-surface-800 border border-surface-700 
                       rounded-lg text-white placeholder-surface-500 focus:outline-none 
                       focus:border-blue-500 disabled:opacity-50 resize-none"
              disabled={isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-surface-800 hover:bg-surface-700 text-white 
                       font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 
                       text-white font-semibold rounded-xl transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Ticket Modal Component
function DeleteTicketModal({
  ticket,
  onClose,
  onConfirm,
  isPending
}: {
  ticket: OperationsTicket
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md 
                    shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Eliminar Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 
                     rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-surface-300 mb-4">
            ¿Estás seguro de que deseas eliminar permanentemente el ticket <span className="font-semibold text-white">{ticket.readable_id}</span>?
          </p>
          <div className="bg-surface-800/50 rounded-xl p-4 mb-4">
            <p className="text-white font-medium">{ticket.title}</p>
            <p className="text-sm text-surface-500 mt-1">
              Cliente: {ticket.client?.commercial_name || 'Sin cliente'}
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm font-medium">
              ⚠️ Esta acción es irreversible. Se eliminarán también todos los items, logística y registro de cambios asociados.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5 text-surface-300 hover:text-white hover:bg-surface-800 
                     rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 
                     text-white font-semibold rounded-xl transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Sí, Eliminar Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

