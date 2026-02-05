'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Building2,
  Users,
  Handshake,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { FormLabel } from '@/components/ui/FormLabel'
import { createClientAction, updateClientAction, deleteClientAction, type CrmEntity, type CrmEntityType } from '../actions'

interface ClientsTableProps {
  initialClients: CrmEntity[]
}

const entityTypeConfig = {
  client: { label: 'Cliente', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Building2 },
  supplier: { label: 'Proveedor', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Users },
  partner: { label: 'Partner', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Handshake },
}

export default function ClientsTable({ initialClients }: ClientsTableProps) {
  const [clients, setClients] = useState(initialClients)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<CrmEntityType | 'all'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<CrmEntity | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const router = useRouter()

  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.commercial_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.tax_id_nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email?.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType = filterType === 'all' || client.entity_type === filterType

    return matchesSearch && matchesType && client.is_active
  })

  // Manejar creación de cliente
  const handleCreateClient = async (formData: FormData) => {
    setFormError(null)
    setFormSuccess(false)

    startTransition(async () => {
      const result = await createClientAction(formData)

      if (result.success) {
        setFormSuccess(true)
        setTimeout(() => {
          setIsModalOpen(false)
          setFormSuccess(false)
          router.refresh()
        }, 1500)
      } else {
        setFormError(result.error)
      }
    })
  }

  // Manejar edición de cliente
  const handleEditClient = async (formData: FormData) => {
    if (!selectedClient) return
    setFormError(null)
    setFormSuccess(false)

    startTransition(async () => {
      const result = await updateClientAction(selectedClient.id, formData)

      if (result.success) {
        setFormSuccess(true)
        setTimeout(() => {
          setIsEditModalOpen(false)
          setSelectedClient(null)
          setFormSuccess(false)
          router.refresh()
        }, 1500)
      } else {
        setFormError(result.error)
      }
    })
  }

  // Manejar eliminación de cliente
  const handleDeleteClient = async () => {
    if (!selectedClient) return

    startTransition(async () => {
      const result = await deleteClientAction(selectedClient.id)

      if (result.success) {
        setIsDeleteModalOpen(false)
        setSelectedClient(null)
        router.refresh()
      } else {
        setFormError(result.error)
      }
    })
  }

  // Abrir modal de edición
  const openEditModal = (client: CrmEntity) => {
    setSelectedClient(client)
    setFormError(null)
    setFormSuccess(false)
    setIsEditModalOpen(true)
  }

  // Abrir modal de eliminación
  const openDeleteModal = (client: CrmEntity) => {
    setSelectedClient(client)
    setIsDeleteModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-surface-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, NIT o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-xl
                     text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 
                     focus:ring-brand-500/50 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CrmEntityType | 'all')}
            className="px-4 py-3 bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="client">Clientes</option>
            <option value="supplier">Proveedores</option>
            <option value="partner">Partners</option>
          </select>

          {/* New Client Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-500 
                     text-white font-semibold rounded-xl transition-all duration-200
                     hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(entityTypeConfig).map(([type, config]) => {
          const count = clients.filter(c => c.entity_type === type && c.is_active).length
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type as CrmEntityType)}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200 text-left",
                filterType === type
                  ? "bg-gray-100 dark:bg-surface-800 border-brand-500"
                  : "bg-white dark:bg-surface-900 border-gray-200 dark:border-surface-800 hover:border-gray-300 dark:hover:border-surface-700"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", config.bg)}>
                  <config.icon className={cn("w-5 h-5", config.color)} />
                </div>
                <div>
                  <Text variant="h2" as="p" className="leading-tight">{count}</Text>
                  <Text variant="muted" className="block uppercase tracking-tighter font-bold">{config.label}s</Text>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Table or Empty State */}
      {filteredClients.length === 0 ? (
        <EmptyState onCreateClick={() => setIsModalOpen(true)} searchTerm={searchTerm} />
      ) : (
        <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4 text-left">
                    <Text variant="label">Empresa</Text>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-surface-400">
                    NIT
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-surface-400">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-surface-400">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-surface-400">
                    Fecha Registro
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-surface-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
                {filteredClients.map((client) => {
                  const typeConfig = entityTypeConfig[client.entity_type]
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                            <typeConfig.icon className={cn("w-4 h-4", typeConfig.color)} />
                          </div>
                          <div>
                            <Text variant="body" className="font-bold">{client.commercial_name}</Text>
                            {client.legal_name && (
                              <Text variant="muted" className="block text-xs">{client.legal_name}</Text>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-gray-700 dark:text-surface-300">{client.tax_id_nit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          typeConfig.bg, typeConfig.color
                        )}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {client.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-surface-400">
                              <Mail className="w-3 h-3" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-surface-400">
                              <Phone className="w-3 h-3" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {!client.email && !client.phone && (
                            <span className="text-sm text-gray-400 dark:text-surface-600">Sin contacto</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-surface-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(client.created_at).toLocaleDateString('es-GT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-2 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-700 
                                     rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(client)}
                            className="p-2 text-gray-400 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 
                                     rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para crear cliente */}
      {isModalOpen && (
        <CreateClientModal
          onClose={() => {
            setIsModalOpen(false)
            setFormError(null)
            setFormSuccess(false)
          }}
          onSubmit={handleCreateClient}
          isPending={isPending}
          error={formError}
          success={formSuccess}
        />
      )}

      {/* Modal para editar cliente */}
      {isEditModalOpen && selectedClient && (
        <EditClientModal
          client={selectedClient}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedClient(null)
            setFormError(null)
            setFormSuccess(false)
          }}
          onSubmit={handleEditClient}
          isPending={isPending}
          error={formError}
          success={formSuccess}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      {isDeleteModalOpen && selectedClient && (
        <DeleteConfirmModal
          client={selectedClient}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setSelectedClient(null)
          }}
          onConfirm={handleDeleteClient}
          isPending={isPending}
        />
      )}
    </div>
  )
}

// Empty State Component
function EmptyState({ onCreateClick, searchTerm }: { onCreateClick: () => void; searchTerm: string }) {
  return (
    <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-50 dark:bg-surface-800 rounded-2xl flex items-center justify-center">
          <Building2 className="w-10 h-10 text-gray-400 dark:text-surface-600" />
        </div>

        {searchTerm ? (
          <>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-gray-500 dark:text-surface-400 mb-6">
              No hay clientes que coincidan con &quot;<span className="text-brand-600 dark:text-brand-400">{searchTerm}</span>&quot;.
              Intenta con otro término de búsqueda.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aún no tienes clientes registrados
            </h3>
            <p className="text-gray-500 dark:text-surface-400 mb-6">
              Comienza agregando tu primer cliente o proveedor para gestionar sus equipos y tickets.
            </p>
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 
                       text-white font-semibold rounded-xl transition-all duration-200
                       hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Agregar Primer Cliente
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Modal Component
function CreateClientModal({
  onClose,
  onSubmit,
  isPending,
  error,
  success
}: {
  onClose: () => void
  onSubmit: (formData: FormData) => void
  isPending: boolean
  error: string | null
  success: boolean
}) {
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
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-500/20 rounded-xl">
              <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Cliente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 
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
              <p className="text-green-400 text-sm">¡Cliente creado exitosamente!</p>
            </div>
          )}

          {/* Nombre Comercial */}
          <div className="space-y-2">
            <FormLabel required>Nombre Comercial</FormLabel>
            <input
              name="commercial_name"
              type="text"
              required
              placeholder="Ej: Tecnología ABC S.A."
              className="w-full px-4 py-3 bg-white dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* NIT y Tipo - Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                NIT <span className="text-red-500">*</span>
              </label>
              <input
                name="tax_id_nit"
                type="text"
                required
                placeholder="1234567-8"
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                         focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                name="entity_type"
                required
                defaultValue="client"
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                         focus:border-brand-500 transition-all cursor-pointer"
              >
                <option value="client">Cliente</option>
                <option value="supplier">Proveedor</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>

          {/* Razón Social */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Razón Social
            </label>
            <input
              name="legal_name"
              type="text"
              placeholder="Nombre legal de la empresa"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Email y Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="contacto@empresa.com"
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                         focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                Teléfono
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="+502 2222-3333"
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                         focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Persona de Contacto */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Persona de Contacto
            </label>
            <input
              name="contact_person"
              type="text"
              placeholder="Nombre del contacto principal"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Ciudad
            </label>
            <input
              name="city"
              type="text"
              defaultValue="Guatemala"
              placeholder="Ciudad"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Dirección
            </label>
            <textarea
              name="address"
              rows={2}
              placeholder="Dirección completa"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Notas
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Notas adicionales sobre el cliente"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 text-gray-600 dark:text-surface-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 
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
                  Guardando...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  ¡Creado!
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Crear Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Client Modal Component
function EditClientModal({
  client,
  onClose,
  onSubmit,
  isPending,
  error,
  success
}: {
  client: CrmEntity
  onClose: () => void
  onSubmit: (formData: FormData) => void
  isPending: boolean
  error: string | null
  success: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl w-full max-w-lg 
                    shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/20 rounded-xl">
              <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Cliente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 
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
              <p className="text-green-400 text-sm">¡Cliente actualizado exitosamente!</p>
            </div>
          )}

          {/* Nombre Comercial */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Nombre Comercial <span className="text-red-500">*</span>
            </label>
            <input
              name="commercial_name"
              type="text"
              required
              defaultValue={client.commercial_name}
              placeholder="Ej: Tecnología ABC S.A."
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* NIT y Tipo - Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                NIT <span className="text-red-500">*</span>
              </label>
              <input
                name="tax_id_nit"
                type="text"
                required
                defaultValue={client.tax_id_nit}
                placeholder="1234567-8"
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                         focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                name="entity_type"
                required
                defaultValue={client.entity_type}
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                         focus:border-brand-500 transition-all cursor-pointer"
              >
                <option value="client">Cliente</option>
                <option value="supplier">Proveedor</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>

          {/* Razón Social */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Razón Social
            </label>
            <input
              name="legal_name"
              type="text"
              defaultValue={client.legal_name || ''}
              placeholder="Nombre legal de la empresa"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Email y Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={client.email || ''}
                placeholder="contacto@empresa.com"
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                         focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
                Teléfono
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={client.phone || ''}
                placeholder="+502 2222-3333"
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                         focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Persona de Contacto */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Persona de Contacto
            </label>
            <input
              name="contact_person"
              type="text"
              defaultValue={client.contact_person || ''}
              placeholder="Nombre del contacto principal"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Ciudad
            </label>
            <input
              name="city"
              type="text"
              defaultValue={client.city}
              placeholder="Ciudad"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Dirección
            </label>
            <textarea
              name="address"
              rows={2}
              defaultValue={client.address || ''}
              placeholder="Dirección completa"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Notas
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={client.notes || ''}
              placeholder="Notas adicionales sobre el cliente"
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 
                       focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Hidden field for is_active */}
          <input type="hidden" name="is_active" value="true" />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 text-gray-600 dark:text-surface-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 
                       rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 
                       text-white font-semibold rounded-xl transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  ¡Actualizado!
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
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

// Delete Confirm Modal Component
function DeleteConfirmModal({
  client,
  onClose,
  onConfirm,
  isPending
}: {
  client: CrmEntity
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
      <div className="relative bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl w-full max-w-md 
                    shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-500/20 rounded-xl">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Eliminar Cliente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 
                     rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-surface-300 mb-4">
            ¿Estás seguro de que deseas eliminar a <span className="font-semibold text-gray-900 dark:text-white">{client.commercial_name}</span>?
          </p>
          <p className="text-gray-500 dark:text-surface-500 text-sm">
            Esta acción desactivará el cliente y ya no aparecerá en las listas. Los registros históricos asociados se mantendrán.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5 text-gray-600 dark:text-surface-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 
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
                Sí, Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

