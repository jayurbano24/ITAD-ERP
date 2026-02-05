'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useDevice } from '@/hooks/useDevice'

interface DashboardLayoutClientProps {
    children: React.ReactNode
    userName: string
    userRole: string
    userEmail: string
    allowedModules: string[] | null
    companyName: string
    companyTagline: string
    companyLogoUrl: string | null
    companyLogoSvg: string | undefined
    companyPrimaryColor: string
    companySecondaryColor: string
    themeStyles: CSSProperties
}

export default function DashboardLayoutClient({
    children,
    userName,
    userRole,
    userEmail,
    allowedModules,
    companyName,
    companyTagline,
    companyLogoUrl,
    companyLogoSvg,
    companyPrimaryColor,
    companySecondaryColor,
    themeStyles,
}: DashboardLayoutClientProps) {
    const device = useDevice()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const showHamburger = device !== 'desktop'

    return (
        <div className="min-h-screen bg-white dark:bg-[#0f1419] flex transition-colors duration-300" style={themeStyles}>
            <Sidebar
                device={device}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                userName={userName}
                userRole={userRole}
                userEmail={userEmail}
                allowedModules={allowedModules}
                companyName={companyName}
                companyTagline={companyTagline}
                companyLogo={companyLogoUrl ?? undefined}
                companyLogoSvg={companyLogoSvg}
                companyPrimaryColor={companyPrimaryColor}
                companySecondaryColor={companySecondaryColor}
            />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header Barra */}
                <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 sm:px-8 bg-white/50 dark:bg-[#0f1419]/50 backdrop-blur-sm z-10 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        {/* Botón hamburguesa solo en móvil/tablet */}
                        {showHamburger && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Abrir menú"
                            >
                                <Menu className="w-6 h-6 text-gray-900 dark:text-white" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="h-8 w-px bg-surface-200 dark:bg-surface-800 mx-2" />
                        <div className="flex items-center gap-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{userName}</p>
                                <p className="text-[10px] text-surface-500 dark:text-surface-400 uppercase leading-tight">{userRole}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
