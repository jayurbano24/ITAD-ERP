'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
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
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { FormLabel } from '@/components/ui/FormLabel'
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
  type CrmEntity,
  type CrmEntityType,
  type CrmAccountClass,
} from '../actions'
import DownloadClientsExcelButton from './DownloadClientsExcelButton'
import { formatCrmAccountClass, resolveCrmAccountClass } from '@/lib/clientes/accountClass'
import ExcelColumnFilter from '@/app/dashboard/inventario/bodega/components/ExcelColumnFilter'
import AssociatedCompanyPicker from './AssociatedCompanyPicker'

const EMPTY = '(Vacío)'

const EXCEL_HEADER_LABEL =
  'text-[10px] font-bold uppercase tracking-wide text-gray-900 dark:text-white'
const EXCEL_HEADER_FILTER =
  'border-gray-400 dark:border-surface-500 text-indigo-600 dark:text-indigo-300 hover:border-indigo-500 hover:bg-indigo-500/10'

type ClientColumnId = 'empresa' | 'nit' | 'tipo' | 'clasificacion' | 'contacto' | 'fecha'

type ListFilter = 'all' | CrmEntityType | 'empresa' | 'cliente_final'

function matchesListFilter(client: CrmEntity, filter: ListFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'empresa') {
    return client.entity_type === 'client' && resolveCrmAccountClass(client) === 'empresa'
  }
  if (filter === 'cliente_final') {
    return client.entity_type === 'client' && resolveCrmAccountClass(client) === 'cliente_final'
  }
  return client.entity_type === filter
}

const COLUMN_LABELS: Record<ClientColumnId, string> = {
  empresa: 'Nombre',
  nit: 'NIT',
  tipo: 'Tipo',
  clasificacion: 'Clasificación',
  contacto: 'Contacto',
  fecha: 'Fecha registro',
}

const INITIAL_COLUMN_FILTERS: Record<ClientColumnId, Set<string> | null> = {
  empresa: null,
  nit: null,
  tipo: null,
  clasificacion: null,
  contacto: null,
  fecha: null,
}

function contactFilterLabel(client: CrmEntity): string {
  const parts: string[] = []
  const person = client.contact_person?.trim()
  const email = client.email?.trim()
  const phone = client.phone?.trim()
  if (person) parts.push(person)
  if (email) parts.push(email)
  if (phone) parts.push(phone)
  return parts.length > 0 ? parts.join(' · ') : EMPTY
}

function fechaFilterLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getClientColumnValue(client: CrmEntity, columnId: ClientColumnId): string {
  switch (columnId) {
    case 'empresa':
      return client.commercial_name?.trim() || EMPTY
    case 'nit':
      return client.tax_id_nit?.trim() || EMPTY
    case 'tipo':
      return entityTypeConfig[client.entity_type].label
    case 'clasificacion':
      return formatCrmAccountClass(client)
    case 'contacto':
      return contactFilterLabel(client)
    case 'fecha':
      return fechaFilterLabel(client.created_at)
    default:
      return EMPTY
  }
}

function collectClientOptions(rows: CrmEntity[], columnId: ClientColumnId): string[] {
  const values = new Set<string>()
  for (const row of rows) {
    values.add(getClientColumnValue(row, columnId))
  }
  return Array.from(values)
}

function compareClients(
  a: CrmEntity,
  b: CrmEntity,
  columnId: ClientColumnId,
  dir: 'asc' | 'desc'
): number {
  let cmp = 0
  if (columnId === 'fecha') {
    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  } else {
    cmp = getClientColumnValue(a, columnId).localeCompare(getClientColumnValue(b, columnId), 'es', {
      numeric: true,
      sensitivity: 'base',
    })
  }
  return dir === 'asc' ? cmp : -cmp
}

function matchesClientColumnFilters(
  client: CrmEntity,
  filters: Record<ClientColumnId, Set<string> | null>
): boolean {
  for (const [columnId, selected] of Object.entries(filters) as [
    ClientColumnId,
    Set<string> | null,
  ][]) {
    if (!selected) continue
    if (!selected.has(getClientColumnValue(client, columnId))) return false
  }
  return true
}

const PAGE_SIZE_OPTIONS = [15, 20, 25] as const
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

interface ClientsTableProps {
  initialClients: CrmEntity[]
}

const entityTypeConfig = {
  client: { label: 'Cliente', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Building2 },
  supplier: { label: 'Proveedor', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Users },
  partner: { label: 'Partner', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Handshake },
}

const accountClassStyle: Record<
  CrmAccountClass,
  { label: string; bg: string; color: string }
> = {
  empresa: {
    label: 'Empresa',
    bg: 'bg-slate-100 dark:bg-surface-800',
    color: 'text-slate-700 dark:text-surface-200',
  },
  cliente_final: {
    label: 'Cliente final',
    bg: 'bg-teal-50 dark:bg-teal-500/15',
    color: 'text-teal-800 dark:text-teal-200',
  },
}

export default function ClientsTable({ initialClients }: ClientsTableProps) {
  const [clients, setClients] = useState(initialClients)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ListFilter>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createPreset, setCreatePreset] = useState<{
    parentId?: string
    accountClass?: CrmAccountClass
  } | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<CrmEntity | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const [pageSize, setPageSize] = useState<PageSize>(15)
  const [page, setPage] = useState(1)
  const [columnFilters, setColumnFilters] = useState(INITIAL_COLUMN_FILTERS)
  const [sort, setSort] = useState<{ columnId: ClientColumnId; dir: 'asc' | 'desc' } | null>(null)
  const router = useRouter()

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CrmEntity[]>()
    for (const c of clients) {
      if (!c.is_active || !c.parent_entity_id) continue
      const bucket = map.get(c.parent_entity_id) ?? []
      bucket.push(c)
      map.set(c.parent_entity_id, bucket)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.commercial_name.localeCompare(b.commercial_name, 'es'))
    }
    return map
  }, [clients])

  const parentCompanyOptions = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.is_active &&
          c.entity_type === 'client' &&
          resolveCrmAccountClass(c) === 'empresa'
      ),
    [clients]
  )

  const baseFilteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return clients.filter((client) => {
      const matchesSearch =
        !q ||
        client.commercial_name.toLowerCase().includes(q) ||
        client.tax_id_nit.toLowerCase().includes(q) ||
        (client.email?.toLowerCase().includes(q) ?? false) ||
        (client.contact_person?.toLowerCase().includes(q) ?? false)

      const matchesType = matchesListFilter(client, filterType)

      return matchesSearch && matchesType && client.is_active
    })
  }, [clients, searchTerm, filterType])

  const filteredClients = useMemo(() => {
    let list = baseFilteredClients.filter((client) =>
      matchesClientColumnFilters(client, columnFilters)
    )
    if (sort) {
      list = [...list].sort((a, b) => compareClients(a, b, sort.columnId, sort.dir))
    }
    return list
  }, [baseFilteredClients, columnFilters, sort])

  const setColumnFilter = (columnId: ClientColumnId, next: Set<string> | null) => {
    setColumnFilters((prev) => ({ ...prev, [columnId]: next }))
  }

  const handleColumnSort = (columnId: ClientColumnId, dir: 'asc' | 'desc') => {
    setSort({ columnId, dir })
  }

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, filterType, pageSize, columnFilters, sort])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedClients = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredClients.slice(start, start + pageSize)
  }, [filteredClients, pageSize, safePage])

  const pageFrom = filteredClients.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const pageTo = Math.min(safePage * pageSize, filteredClients.length)

  const headerCell = (columnId: ClientColumnId) => (
    <th className="px-1.5 py-1 bg-slate-100 dark:bg-surface-800/90">
      <ExcelColumnFilter
        label={COLUMN_LABELS[columnId]}
        options={collectClientOptions(baseFilteredClients, columnId)}
        selected={columnFilters[columnId]}
        onChange={(next) => setColumnFilter(columnId, next)}
        sortDir={sort?.columnId === columnId ? sort.dir : null}
        onSort={(dir) => handleColumnSort(columnId, dir)}
        labelClassName={EXCEL_HEADER_LABEL}
        inactiveFilterClassName={EXCEL_HEADER_FILTER}
      />
    </th>
  )

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
    <div className="space-y-3 max-w-[1280px]">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-surface-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, NIT o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-lg
                     text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 
                     focus:ring-brand-500/50 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ListFilter)}
            className="px-2.5 py-2 text-sm bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="client">Clientes</option>
            <option value="empresa">Empresas</option>
            <option value="cliente_final">Clientes finales</option>
            <option value="supplier">Proveedores</option>
            <option value="partner">Partners</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
            className="px-2 py-2 bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 text-xs
                     focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
            title="Registros por página"
            aria-label="Registros por página"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / página
              </option>
            ))}
          </select>

          <DownloadClientsExcelButton clients={filteredClients} allClients={clients} />

          {/* New Client Button */}
          <button
            onClick={() => {
              setCreatePreset(null)
              setIsModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 hover:bg-brand-500 
                     text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(entityTypeConfig).map(([type, config]) => {
          const count = clients.filter(c => c.entity_type === type && c.is_active).length
          return (
            <button
              key={type}
              onClick={() =>
                setFilterType(filterType === type ? 'all' : (type as CrmEntityType))
              }
              className={cn(
                "px-3 py-2 rounded-lg border transition-colors text-left",
                filterType === type
                  ? "bg-gray-100 dark:bg-surface-800 border-brand-500"
                  : "bg-white dark:bg-surface-900 border-gray-200 dark:border-surface-800 hover:border-gray-300 dark:hover:border-surface-700"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded-md", config.bg)}>
                  <config.icon className={cn("w-3.5 h-3.5", config.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none tabular-nums text-gray-900 dark:text-white">{count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-surface-500 truncate">
                    {config.label}s
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Table or Empty State */}
      {baseFilteredClients.length === 0 ? (
        <EmptyState onCreateClick={() => setIsModalOpen(true)} searchTerm={searchTerm} />
      ) : (
        <div className="bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-[12px] leading-tight table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="border-b-2 border-indigo-200/80 dark:border-indigo-500/30 sticky top-0 z-[2]">
                <tr>
                  {headerCell('empresa')}
                  {headerCell('nit')}
                  {headerCell('tipo')}
                  {headerCell('clasificacion')}
                  {headerCell('contacto')}
                  {headerCell('fecha')}
                  <th className="px-1.5 py-1 text-right bg-slate-100 dark:bg-surface-800/90">
                    <span className={EXCEL_HEADER_LABEL}>Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-sm text-gray-500 dark:text-surface-500"
                    >
                      Sin coincidencias con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
                {paginatedClients.map((client) => {
                  const typeConfig = entityTypeConfig[client.entity_type]
                  const accountClass = resolveCrmAccountClass(client)
                  const classStyle = accountClassStyle[accountClass]
                  const hasContact =
                    Boolean(client.contact_person?.trim()) ||
                    Boolean(client.email?.trim()) ||
                    Boolean(client.phone?.trim())
                  const EmpresaIcon = accountClass === 'cliente_final' ? User : typeConfig.icon
                  const empresaIconColor =
                    accountClass === 'cliente_final'
                      ? 'text-teal-600 dark:text-teal-300'
                      : typeConfig.color
                  const parentCompany = client.parent_entity_id
                    ? clientById.get(client.parent_entity_id)
                    : undefined
                  const associatedUnder =
                    accountClass === 'empresa' ? childrenByParent.get(client.id) ?? [] : []
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-surface-800/40 transition-colors border-b border-gray-100 dark:border-surface-800"
                    >
                      <td className="px-2 py-1 align-middle">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <EmpresaIcon className={cn('w-3.5 h-3.5 shrink-0', empresaIconColor)} aria-hidden />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate" title={client.commercial_name}>
                              {client.commercial_name}
                            </p>
                            {client.legal_name ? (
                              <p className="text-[10px] text-gray-500 dark:text-surface-500 truncate" title={client.legal_name}>
                                {client.legal_name}
                              </p>
                            ) : null}
                            {parentCompany ? (
                              <p
                                className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 truncate"
                                title={parentCompany.commercial_name}
                              >
                                Empresa: {parentCompany.commercial_name}
                              </p>
                            ) : null}
                            {associatedUnder.length > 0 ? (
                              <p
                                className="text-[10px] text-slate-600 dark:text-surface-400 truncate"
                                title={associatedUnder.map((c) => c.commercial_name).join(', ')}
                              >
                                {associatedUnder.length} asociado
                                {associatedUnder.length === 1 ? '' : 's'}:{' '}
                                {associatedUnder
                                  .slice(0, 2)
                                  .map((c) => c.commercial_name)
                                  .join(', ')}
                                {associatedUnder.length > 2 ? '…' : ''}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <span className="font-mono text-[11px] text-gray-700 dark:text-surface-300 truncate block" title={client.tax_id_nit}>
                          {client.tax_id_nit}
                        </span>
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none",
                          typeConfig.bg, typeConfig.color
                        )}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none whitespace-nowrap',
                            classStyle.bg,
                            classStyle.color
                          )}
                        >
                          {formatCrmAccountClass(client)}
                        </span>
                      </td>
                      <td className="px-2 py-1 align-middle">
                        {!hasContact ? (
                          <span className="text-[11px] text-gray-400 dark:text-surface-600">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5 min-w-0 text-[11px] text-gray-700 dark:text-surface-300">
                            {client.contact_person?.trim() ? (
                              <span className="truncate font-medium" title={client.contact_person}>
                                {client.contact_person.trim()}
                              </span>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-gray-500 dark:text-surface-500">
                              {client.email?.trim() ? (
                                <span className="inline-flex items-center gap-0.5 truncate max-w-full" title={client.email}>
                                  <Mail className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{client.email}</span>
                                </span>
                              ) : null}
                              {client.phone?.trim() ? (
                                <span className="inline-flex items-center gap-0.5 tabular-nums whitespace-nowrap">
                                  <Phone className="w-2.5 h-2.5 shrink-0" />
                                  {client.phone}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 align-middle whitespace-nowrap text-[11px] text-gray-600 dark:text-surface-400 tabular-nums">
                        {new Date(client.created_at).toLocaleDateString('es-GT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-1 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-700 
                                     rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(client)}
                            className="p-1 text-gray-400 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 
                                     rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-t border-gray-200 dark:border-surface-800 px-2 py-1.5 bg-gray-50/80 dark:bg-surface-950/50">
            <p className="text-xs font-medium text-gray-600 dark:text-surface-400 tabular-nums">
              Mostrando {pageFrom}–{pageTo} de {filteredClients.length} · {pageSize} por página
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-surface-700 text-xs font-semibold disabled:opacity-40 hover:bg-white dark:hover:bg-surface-800"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-surface-300 tabular-nums min-w-[96px] text-center">
                Página {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-surface-700 text-xs font-semibold disabled:opacity-40 hover:bg-white dark:hover:bg-surface-800"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear cliente */}
      {isModalOpen && (
        <CreateClientModal
          parentCompanyOptions={parentCompanyOptions}
          initialParentId={createPreset?.parentId}
          initialAccountClass={createPreset?.accountClass}
          onClose={() => {
            setIsModalOpen(false)
            setCreatePreset(null)
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
          parentCompanyOptions={parentCompanyOptions.filter((c) => c.id !== selectedClient.id)}
          associatedClients={childrenByParent.get(selectedClient.id) ?? []}
          onAssociateClient={() => {
            setCreatePreset({
              parentId: selectedClient.id,
              accountClass: 'cliente_final',
            })
            setIsEditModalOpen(false)
            setSelectedClient(null)
            setIsModalOpen(true)
          }}
          onEditAssociated={(child) => {
            setSelectedClient(child)
          }}
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
  parentCompanyOptions,
  initialParentId,
  initialAccountClass,
  onClose,
  onSubmit,
  isPending,
  error,
  success,
}: {
  parentCompanyOptions: CrmEntity[]
  initialParentId?: string
  initialAccountClass?: CrmAccountClass
  onClose: () => void
  onSubmit: (formData: FormData) => void
  isPending: boolean
  error: string | null
  success: boolean
}) {
  const [accountClass, setAccountClass] = useState<CrmAccountClass>(
    initialAccountClass ?? 'empresa'
  )
  const [parentId, setParentId] = useState(initialParentId ?? '')
  const [parentOptions, setParentOptions] = useState(parentCompanyOptions)

  useEffect(() => {
    setParentOptions(parentCompanyOptions)
  }, [parentCompanyOptions])

  useEffect(() => {
    if (initialAccountClass) setAccountClass(initialAccountClass)
    if (initialParentId) setParentId(initialParentId)
  }, [initialAccountClass, initialParentId])

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

          {/* Nombre */}
          <div className="space-y-2">
            <FormLabel required>Nombre</FormLabel>
            <input
              name="commercial_name"
              type="text"
              required
              placeholder="Ej: Tecnología ABC S.A. o Juan Pérez"
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Clasificación <span className="text-red-500">*</span>
            </label>
            <select
              name="account_class"
              required
              value={accountClass}
              onChange={(e) => {
                const next = e.target.value as CrmAccountClass
                setAccountClass(next)
                if (next === 'empresa') setParentId('')
              }}
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                       focus:border-brand-500 transition-all cursor-pointer"
            >
              <option value="empresa">Empresa</option>
              <option value="cliente_final">Cliente final</option>
            </select>
          </div>

          {accountClass !== 'empresa' ? (
            <AssociatedCompanyPicker
              options={parentOptions}
              value={parentId}
              onChange={setParentId}
              onOptionsUpdated={setParentOptions}
            />
          ) : null}

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
  parentCompanyOptions,
  associatedClients,
  onAssociateClient,
  onEditAssociated,
  onClose,
  onSubmit,
  isPending,
  error,
  success,
}: {
  client: CrmEntity
  parentCompanyOptions: CrmEntity[]
  associatedClients: CrmEntity[]
  onAssociateClient: () => void
  onEditAssociated: (child: CrmEntity) => void
  onClose: () => void
  onSubmit: (formData: FormData) => void
  isPending: boolean
  error: string | null
  success: boolean
}) {
  const [accountClass, setAccountClass] = useState<CrmAccountClass>(resolveCrmAccountClass(client))
  const [parentId, setParentId] = useState(client.parent_entity_id ?? '')
  const [parentOptions, setParentOptions] = useState(parentCompanyOptions)
  const isEmpresaAccount = accountClass === 'empresa'

  useEffect(() => {
    setParentOptions(parentCompanyOptions)
  }, [parentCompanyOptions])

  useEffect(() => {
    setAccountClass(resolveCrmAccountClass(client))
    setParentId(client.parent_entity_id ?? '')
  }, [client])

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

          {/* Nombre */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              name="commercial_name"
              type="text"
              required
              defaultValue={client.commercial_name}
              placeholder="Ej: Tecnología ABC S.A. o Juan Pérez"
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-surface-300">
              Clasificación <span className="text-red-500">*</span>
            </label>
            <select
              name="account_class"
              required
              value={accountClass}
              onChange={(e) => {
                const next = e.target.value as CrmAccountClass
                setAccountClass(next)
                if (next === 'empresa') setParentId('')
              }}
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl
                       text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 
                       focus:border-brand-500 transition-all cursor-pointer"
            >
              <option value="empresa">Empresa</option>
              <option value="cliente_final">Cliente final</option>
            </select>
          </div>

          {!isEmpresaAccount ? (
            <AssociatedCompanyPicker
              options={parentOptions}
              value={parentId}
              onChange={setParentId}
              onOptionsUpdated={setParentOptions}
            />
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50/80 dark:bg-surface-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-800 dark:text-surface-200">
                  Clientes asociados
                </h3>
                <button
                  type="button"
                  onClick={onAssociateClient}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Asociar
                </button>
              </div>
              {associatedClients.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-surface-500">
                  No hay clientes o contactos bajo esta empresa. Use Asociar para vincular uno nuevo.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {associatedClients.map((child) => (
                    <li
                      key={child.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{child.commercial_name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{child.tax_id_nit}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditAssociated(child)}
                        className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Editar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

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

