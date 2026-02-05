'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  UserPlus,
  Mail,
  Lock,
  User,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { FormLabel } from '@/components/ui/FormLabel'
import { createSystemUser } from '../actions'

interface CreateUserModalProps {
  onClose: () => void
}

const roles = [
  { value: 'super_admin', label: 'Super Admin', description: 'Acceso total al sistema', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-500/10' },
  { value: 'logistics', label: 'Logística', description: 'Recepción, despacho, envíos', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10' },
  { value: 'tech_lead', label: 'Técnico Lead', description: 'Supervisión de taller', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-500/10' },
  { value: 'technician', label: 'Técnico', description: 'Diagnóstico y reparación', color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-500/10' },
  { value: 'sales_agent', label: 'Ventas', description: 'POS y clientes', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { value: 'warehouse', label: 'Bodega', description: 'Inventario de partes', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10' },
]

export function CreateUserModal({ onClose }: CreateUserModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'technician'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validaciones
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Todos los campos son obligatorios')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }

    const result = await createSystemUser(formData)

    setIsLoading(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 1500)
    } else {
      setError(result.error || 'Error al crear el usuario')
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, password }))
    setShowPassword(true)
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <Text variant="h2" className="mb-2">¡Usuario Creado!</Text>
          <Text variant="muted">
            El usuario <span className="text-gray-900 dark:text-white font-bold">{formData.fullName}</span> ha sido registrado correctamente.
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600/10 rounded-xl">
              <UserPlus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <Text variant="h3" as="h2">Nuevo Usuario</Text>
              <Text variant="muted" className="text-sm">Crear cuenta de empleado</Text>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-900 dark:hover:text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre */}
          <div>
            <FormLabel required>Nombre Completo</FormLabel>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Juan Pérez"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                         text-gray-900 dark:text-white placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <FormLabel required>Correo Electrónico</FormLabel>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@empresa.com"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                         text-gray-900 dark:text-white placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <FormLabel required>Contraseña Temporal</FormLabel>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full pl-11 pr-24 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                         text-gray-900 dark:text-white placeholder:text-gray-400 font-mono font-bold
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-3 py-1 text-[10px] bg-emerald-600/10 hover:bg-emerald-600/20 
                           text-emerald-600 dark:text-emerald-400 rounded-lg transition-all font-black uppercase tracking-widest border border-emerald-500/20"
                >
                  Generar
                </button>
              </div>
            </div>
            <Text variant="muted" className="text-[10px] mt-1.5 font-bold uppercase tracking-tight">
              El usuario deberá cambiar esta contraseña en su primer acceso
            </Text>
          </div>

          {/* Rol */}
          <div>
            <FormLabel required>Rol del Usuario</FormLabel>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left",
                    formData.role === role.value
                      ? "border-emerald-600 dark:border-emerald-500 bg-emerald-600/5 shadow-sm"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50 dark:bg-gray-800/20"
                  )}
                >
                  <Text variant="label" className={cn("font-black tracking-tight", role.color)}>
                    {role.label}
                  </Text>
                  <Text variant="muted" className="text-[10px] mt-0.5 leading-tight">
                    {role.description}
                  </Text>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-bold uppercase tracking-widest text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 
                       text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Crear Usuario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

