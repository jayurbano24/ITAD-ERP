'use client'

import { Suspense, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import {
  Recycle,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Truck,
  HardDrive,
  BarChart3,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { login } from '@/app/login/actions'

interface LoginPanelProps {
  companyName: string
  companyTagline?: string
  style?: CSSProperties
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "btn-primary flex items-center justify-center gap-2 group",
        pending && "opacity-70"
      )}
    >
      {pending ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Iniciando sesión...
        </>
      ) : (
        <>
          Iniciar Sesión
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  )
}

function ErrorMessage() {
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')

    if (errorParam) {
      if (errorParam === 'LoginFailed') {
        setError(messageParam || 'Credenciales incorrectas. Verifica tu email y contraseña.')
      } else if (errorParam === 'MissingCredentials') {
        setError('Por favor ingresa tu email y contraseña.')
      } else {
        setError('Ocurrió un error. Intenta de nuevo.')
      }
    }
  }, [searchParams])

  if (!error) return null

  return (
    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-red-400 text-sm font-medium">Error de autenticación</p>
        <p className="text-red-300/80 text-sm mt-1">{error}</p>
      </div>
    </div>
  )
}

export default function LoginPanel({ companyName, companyTagline, style }: LoginPanelProps) {
  const [showPassword, setShowPassword] = useState(false)
  const nameParts = companyName.split(' ').filter(Boolean)
  const hasHighlight = nameParts.length > 1
  const primaryPart = hasHighlight ? nameParts.slice(0, -1).join(' ') : companyName
  const highlightPart = hasHighlight ? nameParts.at(-1) ?? '' : ''
  const footerTagline = companyTagline || 'Guatemala'

  useEffect(() => {
    // Generar un ID de dispositivo persistente para esta PC/Navegador
    let dId = localStorage.getItem('deviceId')
    if (!dId) {
      dId = crypto.randomUUID()
      localStorage.setItem('deviceId', dId)
    }
    const deviceInput = document.getElementById('deviceId') as HTMLInputElement
    if (deviceInput) deviceInput.value = dId
  }, [])
  return (
    <div className="min-h-screen flex bg-grid-pattern relative overflow-hidden" style={style}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative items-center justify-center p-12">
        <div className="max-w-lg space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-500/20 rounded-2xl border border-brand-500/30 animate-float">
                <Recycle className="w-10 h-10 text-brand-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  {hasHighlight ? (
                    <>
                      {primaryPart} <span className="text-brand-400">{highlightPart}</span>
                    </>
                  ) : (
                    companyName
                  )}
                </h1>
                <p className="text-surface-400 text-sm font-medium tracking-widest uppercase">
                  {footerTagline}
                </p>
              </div>
            </div>
            <p className="text-xl text-surface-300 leading-relaxed">
              Sistema integral de gestión de activos tecnológicos y reciclaje electrónico certificado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-8">
            {[
              { icon: Truck, title: 'Logística', desc: 'Trazabilidad completa' },
              { icon: HardDrive, title: 'Borrado Seguro', desc: 'Certificado R2v3' },
              { icon: BarChart3, title: 'Inventario', desc: 'Tiempo real' },
              { icon: Shield, title: 'Auditoría', desc: 'Cumplimiento total' },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="p-4 bg-surface-900/40 backdrop-blur-sm border border-surface-800/50 rounded-xl 
                         hover:border-brand-500/30 hover:bg-surface-900/60 transition-all duration-300"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <feature.icon className="w-6 h-6 text-brand-400 mb-2" />
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-surface-500">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-surface-800/50">
            <p className="text-surface-500 text-sm">
              Cumplimiento normativa <span className="text-brand-400 font-semibold">R2v3</span> •
              ISO 14001 • NIST 800-88
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex items-center gap-2 p-3 bg-brand-500/20 rounded-2xl border border-brand-500/30">
              <Recycle className="w-8 h-8 text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {companyName}
            </h1>
          </div>

          <div className="card-glass p-8 glow-brand bg-surface-900/60 backdrop-blur-md border border-surface-800 shadow-xl">
            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">
                Bienvenido
              </h2>
              <p className="text-surface-400">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            <Suspense fallback={null}>
              <ErrorMessage />
            </Suspense>

            <form action={login} className="space-y-6">
              <input type="hidden" id="deviceId" name="deviceId" />
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-surface-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-surface-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all pr-12"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 
                             focus:ring-brand-500/50 focus:ring-offset-0"
                  />
                  <span className="text-surface-400 group-hover:text-surface-300 transition-colors">
                    Recordarme
                  </span>
                </label>
                <a
                  href="#"
                  className="text-brand-400 hover:text-brand-300 transition-colors font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <SubmitButton />
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface-900 text-surface-500 rounded-full">
                  Acceso seguro
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
              <Shield className="w-10 h-10 text-brand-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-surface-300">
                  Conexión cifrada de extremo a extremo. Tus credenciales están protegidas.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-surface-600 text-sm">
            © {new Date().getFullYear()} {companyName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
