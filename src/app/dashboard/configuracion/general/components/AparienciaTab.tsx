'use client'

import { useState } from 'react'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { Sun, Moon, Monitor, Palette, Check, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AparienciaTab() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [saving, setSaving] = useState(false)

  const handleApply = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSaving(false)
  }

  const themeOptions = [
    {
      id: 'light',
      name: 'Claro',
      description: 'Interfaz con fondo blanco y texto oscuro',
      icon: Sun,
    },
    {
      id: 'dark',
      name: 'Oscuro',
      description: 'Interfaz con fondo oscuro y texto claro',
      icon: Moon,
    },
    {
      id: 'auto',
      name: 'Automático',
      description: 'Se adapta a la configuración del sistema',
      icon: Monitor,
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-500/10 rounded-2xl">
          <Palette className="w-6 h-6 text-brand-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Apariencia</h2>
          <p className="text-surface-500 dark:text-surface-400">Personaliza cómo ves la aplicación ITAD</p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-100 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tema de la interfaz</h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id as 'light' | 'dark' | 'auto')}
                className={cn(
                  'relative flex flex-col text-left p-4 rounded-xl border-2 transition-all duration-200',
                  theme === option.id
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/5'
                    : 'border-surface-100 dark:border-surface-800 hover:border-surface-200 dark:hover:border-surface-700'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center mb-4',
                    theme === option.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                  )}
                >
                  <option.icon className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-900 dark:text-white">{option.name}</span>
                  {theme === option.id && <Check className="w-4 h-4 text-brand-500" />}
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400">{option.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <label className="text-xs font-bold text-surface-500 uppercase tracking-widest">Vista previa</label>
            <div
              className={cn(
                'rounded-xl border p-6 transition-all',
                resolvedTheme === 'dark'
                  ? 'bg-surface-950 border-surface-800'
                  : 'bg-white border-surface-200'
              )}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-brand-500" />
                <div className="space-y-2">
                  <div
                    className={cn(
                      'h-4 w-32 rounded',
                      resolvedTheme === 'dark' ? 'bg-surface-800' : 'bg-surface-100'
                    )}
                  />
                  <div
                    className={cn(
                      'h-3 w-48 rounded',
                      resolvedTheme === 'dark' ? 'bg-surface-900' : 'bg-surface-50'
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-50/50 dark:bg-surface-950/50 border-t border-surface-100 dark:border-surface-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className="px-4 py-2 text-sm font-semibold text-surface-500 hover:text-gray-900 dark:hover:text-white"
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}