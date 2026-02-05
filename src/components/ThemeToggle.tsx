'use client'

import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { cn } from '@/lib/utils'

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
    const { theme, setTheme } = useTheme()

    return (
        <div className={cn("flex items-center p-1 bg-surface-100 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700", className)}>
            <button
                onClick={() => setTheme('light')}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    theme === 'light' ? "bg-white text-brand-600 shadow-sm" : "text-surface-500 hover:text-gray-900"
                )}
                title="Modo Claro"
            >
                <Sun className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme('dark')}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    theme === 'dark' ? "bg-surface-700 text-brand-400 shadow-sm" : "text-surface-500 dark:text-surface-400 hover:text-white"
                )}
                title="Modo Oscuro"
            >
                <Moon className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme('auto')}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    theme === 'auto' ? "bg-brand-500 text-white shadow-sm" : "text-surface-500 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Automático"
            >
                <Monitor className="w-4 h-4" />
            </button>
        </div>
    )
}
