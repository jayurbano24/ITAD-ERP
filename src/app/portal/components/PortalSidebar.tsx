'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { DeviceType } from '@/hooks/useDevice'
import { 
  LayoutDashboard, 
  Truck, 
  Package, 
  FileCheck, 
  DollarSign,
  LogOut,
  Recycle,
  HelpCircle,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/login/actions'

interface PortalSidebarProps {
  userName: string
  clientName: string
  clientLogo?: string | null
  device?: DeviceType
  isOpen?: boolean
  onClose?: () => void
}

const menuItems = [
  { label: 'Inicio', icon: LayoutDashboard, href: '/portal' },
  { label: 'Solicitar Recolección', icon: Truck, href: '/portal/solicitud' },
  { label: 'Mis Activos', icon: Package, href: '/portal/activos' },
  { label: 'Certificados', icon: FileCheck, href: '/portal/certificados' },
  { label: 'Liquidaciones', icon: DollarSign, href: '/portal/liquidaciones' },
]

export function PortalSidebar({
  userName,
  clientName,
  clientLogo,
  device = 'desktop',
  isOpen = false,
  onClose,
}: PortalSidebarProps) {
  const pathname = usePathname()

  const handleNav = () => {
    if (device !== 'desktop') onClose?.()
  }

  return (
    <aside
      className={cn(
        'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm h-full min-h-0 transition-transform duration-300 z-50',
        'w-[min(288px,85vw)] flex-shrink-0',
        'lg:relative lg:translate-x-0 lg:flex',
        device !== 'desktop' &&
          'fixed inset-y-0 left-0 w-[min(288px,88vw)] max-h-[100dvh] max-h-screen',
        device !== 'desktop' && (isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      )}
    >
      {/* Logos */}
      <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {clientLogo ? (
              <Image
                src={clientLogo}
                alt={clientName}
                width={48}
                height={48}
                className="rounded-xl object-contain shrink-0"
              />
            ) : (
              <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {clientName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 truncate">{clientName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Portal de Cliente</p>
            </div>
          </div>
          {device !== 'desktop' && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Logo ITAD */}
        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg">
            <Recycle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">Powered by ITAD Guatemala</span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/portal' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNav}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-blue-500" : "text-slate-400"
              )} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
        {/* Ayuda */}
        <Link
          href="/portal/ayuda"
          onClick={handleNav}
          className="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                   hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors mb-2"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Centro de Ayuda</span>
        </Link>
        
        {/* Usuario y Logout */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 
                        flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{userName}</p>
            <p className="text-xs text-slate-400">Cliente</p>
          </div>
        </div>
        
        <form action={logout} className="mt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                     text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10
                     rounded-xl transition-all duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}

