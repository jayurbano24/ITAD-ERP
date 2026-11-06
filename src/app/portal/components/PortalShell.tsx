'use client'

import { useEffect, useState } from 'react'
import { PortalSidebar } from './PortalSidebar'
import { PortalHeader } from './PortalHeader'
import { useDevice } from '@/hooks/useDevice'

interface PortalShellProps {
  children: React.ReactNode
  userName: string
  clientName: string
  clientLogo?: string | null
}

export function PortalShell({ children, userName, clientName, clientLogo }: PortalShellProps) {
  const device = useDevice()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveDevice = mounted ? device : 'desktop'
  const showDrawer = effectiveDevice !== 'desktop'

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex max-w-[100vw] overflow-x-hidden">
      {sidebarOpen && showDrawer && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <PortalSidebar
        userName={userName}
        clientName={clientName}
        clientLogo={clientLogo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        device={effectiveDevice}
      />
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <PortalHeader
          userName={userName}
          showMenuButton={showDrawer}
          onOpenMenu={() => setSidebarOpen(true)}
        />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">{children}</div>
      </main>
    </div>
  )
}
