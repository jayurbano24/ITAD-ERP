'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'itad-theme-preference'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>('dark')
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

    useEffect(() => {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme
        if (storedTheme) {
            setThemeState(storedTheme)
        }
    }, [])

    useEffect(() => {
        const root = window.document.documentElement

        const updateTheme = () => {
            let nextTheme: 'light' | 'dark' = 'dark'

            if (theme === 'auto') {
                nextTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            } else {
                nextTheme = theme
            }

            setResolvedTheme(nextTheme)

            if (nextTheme === 'dark') {
                root.classList.add('dark')
            } else {
                root.classList.remove('dark')
            }
        }

        updateTheme()
        localStorage.setItem(THEME_STORAGE_KEY, theme)

        // Listen for system changes if in auto mode
        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const listener = () => updateTheme()
            mediaQuery.addEventListener('change', listener)
            return () => mediaQuery.removeEventListener('change', listener)
        }
    }, [theme])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
