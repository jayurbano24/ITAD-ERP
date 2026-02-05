'use client'

import { ThemeProvider as ContextProvider } from '@/lib/contexts/ThemeContext'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ContextProvider>
      {children}
    </ContextProvider>
  )
}
