import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import ThemeProvider from './providers/ThemeProvider'
import { ToastProvider } from '@/context/ToastContext'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ITAD ERP Guatemala | Sistema de Gestión de Activos',
  description: 'Sistema ERP para gestión de activos ITAD y reciclaje electrónico. Cumplimiento norma R2v3.',
  keywords: ['ITAD', 'ERP', 'Guatemala', 'Reciclaje', 'Activos', 'R2v3'],
  authors: [{ name: 'ITAD Guatemala' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

