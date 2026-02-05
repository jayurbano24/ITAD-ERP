/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
  Users,
  FileText,
  Settings,
  LogOut,
  Recycle,
  Building2,
  ShieldCheck,
  Wrench,
  ChevronDown,
  ClipboardList,
  PackageOpen,
  PackagePlus,
  PackageCheck,
  ShoppingCart,
  Plus,
  DollarSign,
  PieChart,
  Calculator,
  ScrollText,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/login/actions'
import { Text } from '@/components/ui/Text'

interface SidebarProps {
  userName: string
  userRole: string
  userEmail: string
  allowedModules?: string[] | null
  companyName?: string
  companyTagline?: string
  companyLogo?: string
  companyLogoSvg?: string
  companyPrimaryColor?: string
  companySecondaryColor?: string
}

export interface MenuItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  submenu?: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[]
}

export const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'Inventario',
    icon: Package,
    href: '/dashboard/inventario',
    submenu: [
      { label: 'Inventario Maestro', href: '/dashboard/inventario', icon: Package },
      { label: 'Partes', href: '/dashboard/inventario/partes', icon: PackagePlus },
      { label: 'Despacho', href: '/dashboard/inventario/despacho', icon: PackageOpen },
      { label: 'Solicitudes', href: '/dashboard/inventario/solicitudes', icon: ClipboardList },
    ]
  },
  {
    label: 'Bodega',
    icon: Warehouse,
    href: '/dashboard/inventario/bodega',
    submenu: [
      { label: 'Bodega Recepción', href: '/dashboard/inventario/bodega?warehouse=BOD-REC', icon: PackageCheck },
      { label: 'Bodega Remarketing', href: '/dashboard/inventario/bodega?warehouse=BOD-REM', icon: PackagePlus },
      { label: 'Bodega Valorización', href: '/dashboard/inventario/bodega?warehouse=BOD-VAL', icon: Calculator },
      { label: 'Bodega Hardvesting', href: '/dashboard/inventario/bodega?warehouse=BOD-HARV', icon: Wrench },
      { label: 'Bodega Destrucción', href: '/dashboard/inventario/bodega?warehouse=BOD-DES', icon: Trash2 },
      { label: 'Historial Salidas', href: '/dashboard/inventario/bodega/despachos', icon: Truck },
    ]
  },
  { label: 'Tickets', icon: FileText, href: '/dashboard/tickets' },
  { label: 'Logística', icon: Truck, href: '/dashboard/logistica' },
  { label: 'Recepción', icon: PackageCheck, href: '/recepcion' },
  { label: 'Taller', icon: Wrench, href: '/dashboard/taller' },
  {
    label: 'Ventas',
    icon: ShoppingCart,
    href: '/dashboard/ventas',
    submenu: [
      { label: 'Órdenes', href: '/dashboard/ventas', icon: FileText },
      { label: 'Nueva Venta', href: '/dashboard/ventas/nuevo', icon: Plus },
    ]
  },
  {
    label: 'Finanzas',
    icon: DollarSign,
    href: '/dashboard/finanzas',
    submenu: [
      { label: 'Liquidaciones', href: '/dashboard/finanzas', icon: PieChart },
      { label: 'Calculadora P&L', href: '/dashboard/finanzas', icon: Calculator },
    ]
  },
  {
    label: 'Borrado de Datos',
    icon: ShieldCheck,
    href: '/dashboard/borrado',
    submenu: [
      { label: 'Procesar Borrado', href: '/dashboard/borrado', icon: ShieldCheck },
      { label: 'Ver Evidencias', href: '/dashboard/borrado/evidencias', icon: FileText },
    ]
  },
  { label: 'Clientes', icon: Building2, href: '/dashboard/clientes' },
  {
    label: 'Auditoría',
    icon: ScrollText,
    href: '/dashboard/auditoria',
    submenu: [
      { label: 'Historial', href: '/auditoria', icon: ScrollText }
    ]
  },
  {
    label: 'Configuración',
    icon: Settings,
    href: '/dashboard/configuracion',
    submenu: [
      { label: 'Usuarios y Roles', href: '/dashboard/configuracion/usuarios', icon: Users },
      { label: 'Plantillas PDF', href: '/dashboard/configuracion/plantillas', icon: FileText },
      { label: 'General', href: '/dashboard/configuracion', icon: Settings },
    ]
  },
]

export default function Sidebar({
  userName,
  userRole,
  userEmail,
  allowedModules,
  companyName = 'ITAD',
  companyTagline = 'ERP',
  companyLogo,
  companyLogoSvg,
  companyPrimaryColor,
  companySecondaryColor
}: SidebarProps) {
  const pathname = usePathname()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(
    // Auto-expand if we're in a submenu
    menuItems.find(item =>
      item.submenu?.some(sub => pathname.startsWith(sub.href))
    )?.href || null
  )

  const brandPrimary = companyPrimaryColor || '#22c55e'
  const brandSecondary = companySecondaryColor || '#16a34a'
  const logoBackgroundStyle = {
    backgroundImage: `linear-gradient(135deg, ${brandPrimary}, ${brandSecondary})`
  }
  const svgLogoMarkup = companyLogoSvg?.trim() || null

  const filteredItems = allowedModules
    ? menuItems.filter(item => allowedModules.includes(item.href))
    // If no allowedModules, show all (except Configuration usually restricted but we'll leave as is for now unless role checks exist)
    : menuItems

  return (
    <aside className="w-64 bg-white dark:bg-[#1a1f2e] border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 transition-colors duration-300">
      {/* Logo */}
      <div className="p-6 border-b border-surface-100 dark:border-surface-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={logoBackgroundStyle}>
            {svgLogoMarkup ? (
              <div
                className="w-8 h-8 flex items-center justify-center text-white"
                dangerouslySetInnerHTML={{ __html: svgLogoMarkup }}
              />
            ) : companyLogo ? (
              <img
                src={companyLogo}
                alt="Logo"
                className="w-8 h-8 object-contain"
                loading="lazy"
              />
            ) : (
              <Recycle className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <Text variant="body" className="font-bold truncate" as="h1">
              {companyName} <span className="text-brand-600 dark:text-brand-400">{companyTagline}</span>
            </Text>
            <Text variant="muted" className="text-xs truncate block">Sistema ERP</Text>
          </div>
        </Link>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const hasSubmenu = item.submenu && item.submenu.length > 0
          const isExpanded = expandedMenu === item.href

          return (
            <div key={item.href}>
              {hasSubmenu ? (
                <>
                  <button
                    onClick={() => setExpandedMenu(isExpanded ? null : item.href)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-3 border-l-4 transition-all duration-200",
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 border-emerald-600 dark:border-emerald-500"
                        : "text-gray-800 dark:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <Text variant="body" className="font-medium">{item.label}</Text>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  </button>
                  {/* Submenu */}
                  {isExpanded && (
                    <div className="mt-1 ml-4 pl-4 border-l border-surface-200 dark:border-surface-800 space-y-1">
                      {item.submenu?.map((subItem) => {
                        const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href)
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isSubActive
                                ? "bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 font-bold"
                                : "text-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium"
                            )}
                          >
                            <subItem.icon className="w-4 h-4" />
                            <span>{subItem.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 border-l-4 transition-all duration-200",
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 border-emerald-600 dark:border-emerald-500"
                      : "text-gray-800 dark:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <Text variant="body" className="font-medium">{item.label}</Text>
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* Usuario y Logout */}
      <div className="p-4 border-t border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-500/20 flex items-center justify-center">
            <span className="text-brand-600 dark:text-brand-400 font-semibold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <Text variant="body" className="font-bold truncate block">{userName}</Text>
            <Text variant="muted" className="text-[10px] capitalize block">{userRole.replace('_', ' ')}</Text>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-surface-600 dark:text-surface-400 
                     hover:text-rose-600 dark:hover:text-red-400 hover:bg-rose-50 dark:hover:bg-red-500/10 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}

