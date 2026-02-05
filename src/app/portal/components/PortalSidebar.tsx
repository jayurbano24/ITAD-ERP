'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Truck, 
  Package, 
  FileCheck, 
  DollarSign,
  LogOut,
  Recycle,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/login/actions'

interface PortalSidebarProps {
  userName: string
  clientName: string
  clientLogo?: string | null
}

const menuItems = [
  { label: 'Inicio', icon: LayoutDashboard, href: '/portal' },
  { label: 'Solicitar Recolección', icon: Truck, href: '/portal/solicitud' },
  { label: 'Mis Activos', icon: Package, href: '/portal/activos' },
  { label: 'Certificados', icon: FileCheck, href: '/portal/certificados' },
  { label: 'Liquidaciones', icon: DollarSign, href: '/portal/liquidaciones' },
]

export function PortalSidebar({ userName, clientName, clientLogo }: PortalSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      {/* Logos */}
      <div className="p-6 border-b border-slate-100">
        {/* Logo del Cliente */}
        <div className="flex items-center gap-4 mb-4">
          {clientLogo ? (
            <Image 
              src={clientLogo} 
              alt={clientName}
              width={48}
              height={48}
              className="rounded-xl object-contain"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {clientName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 truncate">{clientName}</h2>
            <p className="text-xs text-slate-500">Portal de Cliente</p>
          </div>
        </div>
        
        {/* Logo ITAD */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Recycle className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs text-slate-400">Powered by ITAD Guatemala</span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/portal' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
      <div className="p-4 border-t border-slate-100">
        {/* Ayuda */}
        <Link
          href="/portal/ayuda"
          className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-700 
                   hover:bg-slate-50 rounded-xl transition-colors mb-2"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Centro de Ayuda</span>
        </Link>
        
        {/* Usuario y Logout */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 
                        flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
            <p className="text-xs text-slate-400">Cliente</p>
          </div>
        </div>
        
        <form action={logout} className="mt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                     text-slate-500 hover:text-red-600 hover:bg-red-50 
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

