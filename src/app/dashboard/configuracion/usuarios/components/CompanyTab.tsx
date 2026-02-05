/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Palette,
  Loader2,
  CheckCircle,
  Save
} from 'lucide-react'
import { Text } from '@/components/ui/Text'
import { FormLabel } from '@/components/ui/FormLabel'
import { updateCompanySettings, type CompanySettings } from '../actions'

interface CompanyTabProps {
  settings: CompanySettings | null
}

export function CompanyTab({ settings }: CompanyTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const primaryColorPreview = settings?.primary_color || '#22c55e'
  const secondaryColorPreview = settings?.secondary_color || '#16a34a'
  const logoPreview = settings?.logo_url || ''

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateCompanySettings(formData)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Mensaje de éxito */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400">¡Configuración guardada exitosamente!</span>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Información de la Empresa */}
      <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <Text variant="h3" as="h3">Información de la Empresa</Text>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div>
            <FormLabel required>Nombre de la Empresa</FormLabel>
            <input
              name="name"
              type="text"
              defaultValue={settings?.name ?? ''}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* NIT */}
          <div>
            <FormLabel>NIT</FormLabel>
            <input
              name="nit"
              type="text"
              defaultValue={settings?.nit || ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Dirección */}
          <div className="col-span-1 md:col-span-2">
            <FormLabel>
              <MapPin className="w-4 h-4 inline mr-1" />
              Dirección
            </FormLabel>
            <input
              name="address"
              type="text"
              defaultValue={settings?.address || ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Teléfono */}
          <div>
            <FormLabel>
              <Phone className="w-4 h-4 inline mr-1" />
              Teléfono
            </FormLabel>
            <input
              name="phone"
              type="tel"
              defaultValue={settings?.phone || ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Email */}
          <div>
            <FormLabel>
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </FormLabel>
            <input
              name="email"
              type="email"
              defaultValue={settings?.email || ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Website */}
          <div className="col-span-1 md:col-span-2">
            <FormLabel>
              <Globe className="w-4 h-4 inline mr-1" />
              Sitio Web
            </FormLabel>
            <input
              name="website"
              type="url"
              defaultValue={settings?.website || ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Configuración de Documentos */}
      <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <FileText className="w-5 h-5 text-amber-500" />
          <Text variant="h3" as="h3">Configuración de Documentos</Text>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prefijo Tickets */}
          <div>
            <FormLabel>Prefijo de Tickets</FormLabel>
            <input
              name="ticket_prefix"
              type="text"
              defaultValue={settings?.ticket_prefix ?? ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Prefijo Lotes */}
          <div>
            <FormLabel>Prefijo de Lotes</FormLabel>
            <input
              name="batch_prefix"
              type="text"
              defaultValue={settings?.batch_prefix ?? ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Días de Garantía */}
          <div>
            <FormLabel>Días de Garantía por Defecto</FormLabel>
            <input
              name="warranty_days"
              type="number"
              defaultValue={settings?.warranty_days ?? ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Moneda */}
          <div>
            <FormLabel>Moneda por Defecto</FormLabel>
            <select
              name="currency"
              defaultValue={settings?.currency ?? ''}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="" disabled>Selecciona la moneda...</option>
              <option value="GTQ">GTQ - Quetzal</option>
              <option value="USD">USD - Dólar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Personalización Avanzada */}
      <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <Palette className="w-5 h-5 text-amber-500" />
          <Text variant="h3" as="h3">Personalización Avanzada</Text>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-3">
            <FormLabel>Logo Corporativo</FormLabel>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-[#0f1419] flex items-center justify-center shadow-inner">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo de la empresa"
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                ) : (
                  <Text variant="muted" className="text-[10px] text-center px-2">Sin logo</Text>
                )}
              </div>
              <input
                name="logo_url"
                type="url"
                defaultValue={logoPreview}
                placeholder="https://ejemplo.com/logo.png"
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <FormLabel>Color Primario de Marca</FormLabel>
              <div className="flex gap-2">
                <input
                  name="primary_color"
                  type="color"
                  defaultValue={primaryColorPreview}
                  className="w-12 h-12 p-1 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColorPreview}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 font-mono"
                />
              </div>
            </div>
            <div>
              <FormLabel>Color Secundario</FormLabel>
              <div className="flex gap-2">
                <input
                  name="secondary_color"
                  type="color"
                  defaultValue={secondaryColorPreview}
                  className="w-12 h-12 p-1 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColorPreview}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 font-mono"
                />
              </div>
            </div>
            <div>
              <FormLabel>Tipografía PDF</FormLabel>
              <select
                name="typography"
                defaultValue={settings?.typography || 'Inter'}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="Inter">Inter (Estándar)</option>
                <option value="Roboto">Roboto</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Open Sans">Open Sans</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <Text variant="label" className="uppercase tracking-widest text-[10px] text-gray-400 mb-2 block">Visibilidad en Documentos</Text>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'show_nit', label: 'Mostrar RNC/NIT', checked: settings?.show_nit },
                { name: 'show_signatures', label: 'Mostrar Firmas', checked: settings?.show_signatures },
                { name: 'show_phones', label: 'Mostrar Teléfonos', checked: settings?.show_phones },
                { name: 'show_addresses', label: 'Mostrar Direcciones', checked: settings?.show_addresses }
              ].map((field) => (
                <label key={field.name} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm">
                  <div className="relative flex items-center">
                    <input
                      name={field.name}
                      type="checkbox"
                      defaultChecked={field.checked ?? true}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <Text variant="body" className="font-bold text-xs">{field.label}</Text>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FormLabel>Textos Legales / Términos</FormLabel>
              <textarea
                name="legal_texts"
                rows={4}
                defaultValue={settings?.legal_texts || ''}
                placeholder="Incluye aquí los términos y condiciones para los reportes..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <FormLabel>Notas al Pie (Footer)</FormLabel>
              <textarea
                name="footer_notes"
                rows={4}
                defaultValue={settings?.footer_notes || ''}
                placeholder="Texto que aparecerá al final de cada página..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br" style={{ backgroundImage: `linear-gradient(135deg, ${primaryColorPreview}, ${secondaryColorPreview})` }}>
              <Text variant="label" className="uppercase tracking-wider text-white">Paleta actual</Text>
              <div className="mt-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full border border-white/40" style={{ backgroundColor: primaryColorPreview }} />
                <div className="text-sm font-medium text-white leading-tight">
                  Primario
                  <span className="block text-[11px] text-white/70">{primaryColorPreview}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full border border-white/40" style={{ backgroundColor: secondaryColorPreview }} />
                <div className="text-sm font-medium text-white leading-tight">
                  Secundario
                  <span className="block text-[11px] text-white/70">{secondaryColorPreview}</span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1419]">
              <Text variant="body" className="font-bold">Aplicación en la vista</Text>
              <Text variant="muted" className="text-xs">Los colores seleccionados se usan en el header y componentes destacados.</Text>
              <div className="mt-4 h-12 rounded-2xl" style={{ background: `linear-gradient(135deg, ${primaryColorPreview}, ${secondaryColorPreview})` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white 
                   font-bold uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Guardar Configuración</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
