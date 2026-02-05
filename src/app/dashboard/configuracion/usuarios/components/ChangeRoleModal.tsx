'use client'

import { useState } from 'react'
import { Check, X, Shield, Lock, LayoutGrid, Eye, Edit, Trash } from 'lucide-react'
import { updateUserRole, updateUserModules, type SystemUser } from '../actions'
import { menuItems } from '@/app/dashboard/components/Sidebar'
import { cn } from '@/lib/utils'

interface ChangeRoleModalProps {
    user: SystemUser
    onClose: () => void
}

const roles = [
    { value: 'super_admin', label: 'Super Admin', desc: 'Acceso total al sistema', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    { value: 'account_manager', label: 'Gerente de Cuenta', desc: 'Gestión administrativa y comercial', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    { value: 'logistics', label: 'Logística', desc: 'Gestión de envíos y recolecciones', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { value: 'tech_lead', label: 'Líder Técnico', desc: 'Gestión de taller y diagnósticos', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    { value: 'warehouse', label: 'Bodega', desc: 'Entrada y salida de inventario', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    { value: 'sales_agent', label: 'Ventas', desc: 'Gestión de clientes y órdenes', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { value: 'client_b2b', label: 'Cliente B2B', desc: 'Portal de cliente', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
]

export function ChangeRoleModal({ user, onClose }: ChangeRoleModalProps) {
    const [selectedRole, setSelectedRole] = useState(user.role)
    const [isCustomModules, setIsCustomModules] = useState(!!user.allowed_modules)
    const [loading, setLoading] = useState(false)

    // State for granular permissions: Record<module_href, Set<permission>>
    const [permissions, setPermissions] = useState<Record<string, Set<string>>>(() => {
        const initial: Record<string, Set<string>> = {}
        // Use existing allowed_modules or default to all if not set (standard role behavior logic needed?)
        // If user.allowed_modules is null, the sidebar shows ALL. So we default to ALL.
        const baseModules = user.allowed_modules || menuItems.map(m => m.href)

        baseModules.forEach(href => {
            const existingPerms = user.module_permissions?.[href]
            if (existingPerms) {
                initial[href] = new Set(existingPerms)
            } else {
                // Backward compatibility: If just in allowed_modules, give full access
                // to maintain previous behavior (user could do everything in that module)
                initial[href] = new Set(['view', 'edit', 'delete'])
            }
        })
        return initial
    })

    const handleTogglePermission = (href: string, perm: string) => {
        if (!isCustomModules) return

        setPermissions(prev => {
            const next = { ...prev }
            const currentSet = new Set(next[href] || [])

            if (currentSet.has(perm)) {
                currentSet.delete(perm)
                // If removing 'view', effectively disable the module
                if (perm === 'view') {
                    currentSet.clear()
                }
            } else {
                currentSet.add(perm)
                // If adding 'edit' or 'delete', implicit 'view'
                if (perm === 'edit' || perm === 'delete') {
                    currentSet.add('view')
                }
            }

            if (currentSet.size === 0) {
                delete next[href]
            } else {
                next[href] = currentSet
            }
            return next
        })
    }

    const handleToggleAll = (enabled: boolean) => {
        if (!enabled) {
            setPermissions({})
        } else {
            const all: Record<string, Set<string>> = {}
            menuItems.forEach(item => {
                all[item.href] = new Set(['view', 'edit', 'delete'])
            })
            setPermissions(all)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // 1. Update Role
            if (selectedRole !== user.role) {
                const res = await updateUserRole(user.id, selectedRole)
                if (!res.success) throw new Error(res.error)
            }

            // 2. Update Modules & Permissions
            let modulesToSave: string[] | null = null
            let permissionsToSave: Record<string, string[]> | null = null

            if (isCustomModules) {
                modulesToSave = Object.keys(permissions)
                permissionsToSave = {}
                Object.entries(permissions).forEach(([href, set]) => {
                    permissionsToSave![href] = Array.from(set)
                })
            }

            // Check if changes exist
            // (Simplification: just save always if custom, logic to compare is complex with granular)
            const resModules = await updateUserModules(user.id, modulesToSave, permissionsToSave)
            if (!resModules.success) throw new Error(resModules.error)

            onClose()
        } catch (error: any) {
            alert(error.message || 'Error al guardar cambios')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#0f1419]/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-500" />
                            Configurar Accesos
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Usuario: <span className="font-semibold text-gray-700 dark:text-gray-200">{user.email}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto space-y-8 flex-1">

                    {/* Role Selection */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            <Shield className="w-4 h-4" /> Rol Principal
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {roles.map((role) => (
                                <button
                                    key={role.value}
                                    onClick={() => setSelectedRole(role.value)}
                                    className={cn(
                                        "flex flex-col items-start p-4 rounded-xl border transition-all text-left group relative",
                                        selectedRole === role.value
                                            ? `${role.color} ring-1 ring-offset-0 ring-current`
                                            : "bg-white dark:bg-[#0f1419] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    <span className="font-bold text-sm tracking-wide mb-1">{role.label}</span>
                                    <span className="text-xs opacity-80 font-medium">{role.desc}</span>
                                    {selectedRole === role.value && (
                                        <div className="absolute top-3 right-3">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800" />

                    {/* Module Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                <LayoutGrid className="w-4 h-4" /> Permisos por Módulo
                            </h4>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-0"
                                        checked={isCustomModules}
                                        onChange={(e) => {
                                            setIsCustomModules(e.target.checked)
                                            if (!e.target.checked) {
                                                handleToggleAll(true) // Reset (internal state doesn't matter much if disabled, but cleaner)
                                            }
                                        }}
                                    />
                                    <span className="text-gray-600 dark:text-gray-400">Personalizar</span>
                                </label>
                            </div>
                        </div>

                        <div className={cn(
                            "grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300",
                            !isCustomModules && "opacity-50 pointer-events-none"
                        )}>
                            {!isCustomModules && (
                                <div className="col-span-full text-center py-4 bg-gray-50 dark:bg-[#0f1419] rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <p className="text-sm text-gray-500">Los módulos se asignan automáticamente según el rol.</p>
                                </div>
                            )}
                            {menuItems.map((item) => {
                                const perms = permissions[item.href] || new Set()
                                return (
                                    <div
                                        key={item.href}
                                        className={cn(
                                            "flex flex-col gap-3 p-4 rounded-xl border transition-all",
                                            perms.has('view') && isCustomModules
                                                ? "bg-white dark:bg-[#0b0f1a] border-indigo-200 dark:border-indigo-500/30 shadow-sm"
                                                : "bg-gray-50 dark:bg-[#0f1419] border-gray-200 dark:border-gray-800"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center border",
                                                perms.has('view') && isCustomModules
                                                    ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"
                                                    : "bg-white dark:bg-[#1a1f2e] text-gray-400 border-gray-200 dark:border-gray-700"
                                            )}>
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <span className={cn(
                                                "font-bold text-sm",
                                                perms.has('view') && isCustomModules
                                                    ? "text-gray-900 dark:text-white"
                                                    : "text-gray-500 dark:text-gray-400"
                                            )}>
                                                {item.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 pl-11">
                                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                    perms.has('view')
                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                        : "bg-white dark:bg-[#1a1f2e] border-gray-300 dark:border-gray-600"
                                                )}>
                                                    {perms.has('view') && <Check className="w-3 h-3" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={perms.has('view')}
                                                    onChange={() => handleTogglePermission(item.href, 'view')}
                                                    disabled={!isCustomModules}
                                                />
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Ver</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                    perms.has('edit')
                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                        : "bg-white dark:bg-[#1a1f2e] border-gray-300 dark:border-gray-600"
                                                )}>
                                                    {perms.has('edit') && <Check className="w-3 h-3" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={perms.has('edit')}
                                                    onChange={() => handleTogglePermission(item.href, 'edit')}
                                                    disabled={!isCustomModules}
                                                />
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Editar</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                    perms.has('delete')
                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                        : "bg-white dark:bg-[#1a1f2e] border-gray-300 dark:border-gray-600"
                                                )}>
                                                    {perms.has('delete') && <Check className="w-3 h-3" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={perms.has('delete')}
                                                    onChange={() => handleTogglePermission(item.href, 'delete')}
                                                    disabled={!isCustomModules}
                                                />
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Eliminar</span>
                                            </label>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f1419]/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
