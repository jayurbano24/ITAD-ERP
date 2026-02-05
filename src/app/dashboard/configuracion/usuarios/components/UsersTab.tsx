'use client'

import { useState } from 'react'
import {
  UserPlus,
  MoreVertical,
  Shield,
  Truck,
  Wrench,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Key,
  Trash2,
  Edit
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type SystemUser, toggleUserStatus, updateUserRole, deleteSystemUser, updateUserName } from '../actions'
import { CreateUserModal } from './CreateUserModal'
import { ChangeRoleModal } from './ChangeRoleModal'
import { Text } from '@/components/ui/Text'

interface UsersTabProps {
  users: SystemUser[]
  isConfigured?: boolean
}

const roleConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Shield },
  logistics: { label: 'Logística', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Truck },
  tech_lead: { label: 'Técnico Lead', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Wrench },
  technician: { label: 'Técnico', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Wrench },
  sales_agent: { label: 'Ventas', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: ShoppingCart },
  warehouse: { label: 'Bodega', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Truck },
}

export function UsersTab({ users, isConfigured = true }: UsersTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUserForRole, setSelectedUserForRole] = useState<SystemUser | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState<string>('')

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setLoading(userId)
    await toggleUserStatus(userId, !currentStatus)
    setLoading(null)
    setActionMenuId(null)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return
    }
    setLoading(userId)
    await deleteSystemUser(userId)
    setLoading(null)
    setActionMenuId(null)
  }

  const handleEditName = (userId: string, currentName: string) => {
    setEditingNameId(userId)
    setEditingNameValue(currentName || '')
  }

  const handleSaveName = async (userId: string) => {
    if (!editingNameValue.trim()) {
      alert('El nombre no puede estar vacío')
      return
    }
    setLoading(userId)
    await updateUserName(userId, editingNameValue)
    setLoading(null)
    setEditingNameId(null)
    setEditingNameValue('')
  }

  const handleCancelEditName = () => {
    setEditingNameId(null)
    setEditingNameValue('')
  }

  const handleOpenInfo = (user: SystemUser) => {
    // Future implementation for user details
  }

  const getRoleBadge = (role: string) => {
    const config = roleConfig[role] || {
      label: role,
      color: 'bg-surface-700 text-surface-300 border-surface-600',
      icon: Shield
    }
    const Icon = config.icon

    return (
      <span className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
        config.color
      )}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Text variant="h2" as="h2">Usuarios del Sistema</Text>
          <Text variant="muted" className="text-sm block">{users.length} usuarios registrados</Text>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!isConfigured}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg active:scale-95",
            isConfigured
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
              : "bg-gray-200 dark:bg-[#1a1f2e] text-gray-400 dark:text-gray-500 cursor-not-allowed"
          )}
          title={!isConfigured ? 'Configura SERVICE_ROLE_KEY primero' : ''}
        >
          <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="hidden md:inline">Nuevo Usuario</span>
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-[#0f1419]/50 border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-6 py-4">
                <Text variant="label">Usuario</Text>
              </th>
              <th className="text-left px-6 py-4">
                <Text variant="label">Nombre</Text>
              </th>
              <th className="text-left px-6 py-4">
                <Text variant="label">Email</Text>
              </th>
              <th className="text-center px-6 py-4">
                <Text variant="label">Rol</Text>
              </th>
              <th className="text-center px-6 py-4">
                <Text variant="label">Estado</Text>
              </th>
              <th className="text-center px-6 py-4">
                <Text variant="label">Último Acceso</Text>
              </th>
              <th className="text-center px-6 py-4">
                <Text variant="label">Acciones</Text>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0f1419]/50 transition-colors">
                {/* Usuario */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Text variant="body" className="font-bold text-emerald-600 dark:text-emerald-400">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </Text>
                    </div>
                    <div>
                      <Text variant="body" className="font-bold">{user.email.split('@')[0]}</Text>
                      <Text variant="muted" className="text-[10px] block font-medium">
                        Creado: {new Date(user.created_at).toLocaleDateString('es-GT')}
                      </Text>
                    </div>
                  </div>
                </td>

                {/* Nombre */}
                <td className="px-6 py-4">
                  {editingNameId === user.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="Nombre completo"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveName(user.id)}
                        disabled={loading === user.id}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Guardar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEditName}
                        disabled={loading === user.id}
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Cancelar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <Text variant="body" className="font-bold">{user.full_name || 'Sin nombre'}</Text>
                      <button
                        onClick={() => handleEditName(user.id, user.full_name || '')}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-amber-500 rounded-lg transition-all"
                        title="Editar nombre"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>

                {/* Email */}
                <td className="px-6 py-4">
                  <Text variant="secondary" className="font-medium">{user.email}</Text>
                </td>

                {/* Rol */}
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {getRoleBadge(user.role)}
                    {user.allowed_modules && (
                      <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/30">
                        Customizado
                      </span>
                    )}
                  </div>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 text-center">
                  {user.is_active ? (
                    <span className="flex items-center justify-center gap-1.5 text-emerald-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Activo
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5 text-red-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      Inactivo
                    </span>
                  )}
                </td>

                {/* Último Acceso */}
                <td className="px-6 py-4 text-center">
                  <Text variant="muted" className="text-sm font-medium">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString('es-GT', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      : 'Nunca'
                    }
                  </Text>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 text-center">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>

                    {/* Dropdown Menu */}
                    {actionMenuId === user.id && (
                      <div className="fixed mt-2 w-48 bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800
                                    rounded-xl shadow-2xl z-50 py-2"
                        style={{
                          transform: 'translateX(-80%)',
                        }}>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          disabled={loading === user.id}
                          className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                        >
                          {user.is_active ? (
                            <>
                              <XCircle className="w-4 h-4 text-rose-500" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              Activar
                            </>
                          )}
                        </button>

                        <button
                          className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                        >
                          <Key className="w-4 h-4 text-amber-500" />
                          Resetear Password
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUserForRole(user)
                            setActionMenuId(null)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                        >
                          <Edit className="w-4 h-4 text-blue-500" />
                          Cambiar Rol
                        </button>

                        <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={loading === user.id}
                          className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400
                                 hover:bg-red-500/10 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar Usuario
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <UserPlus className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <Text variant="muted" className="block uppercase font-bold tracking-widest">No hay usuarios registrados</Text>
          </div>
        )}
      </div>

      {/* Modal de Crear Usuario */}
      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Modal de Cambiar Rol */}
      {selectedUserForRole && (
        <ChangeRoleModal
          user={selectedUserForRole}
          onClose={() => setSelectedUserForRole(null)}
        />
      )}

      {/* Click outside to close menu */}
      {actionMenuId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActionMenuId(null)}
        />
      )}
    </>
  )
}

