'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Package, 
  Calendar,
  Check,
  Loader2,
  Laptop,
  Monitor,
  Smartphone,
  Cpu,
  Box,
  Truck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPickupRequest } from '../actions'

const steps = [
  { id: 1, title: 'Ubicación', description: '¿Dónde recogemos?', icon: MapPin },
  { id: 2, title: 'Equipos', description: '¿Qué envías?', icon: Package },
  { id: 3, title: 'Fecha', description: '¿Cuándo?', icon: Calendar },
]

export default function SolicitudPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    pickupAddress: '',
    contactName: '',
    contactPhone: '',
    preferredDate: '',
    preferredTime: 'morning',
    estimatedLaptops: 0,
    estimatedDesktops: 0,
    estimatedMonitors: 0,
    estimatedPhones: 0,
    estimatedOther: 0,
    notes: ''
  })

  const updateFormData = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.pickupAddress.trim() !== '' && 
               formData.contactName.trim() !== '' && 
               formData.contactPhone.trim() !== ''
      case 2:
        const total = formData.estimatedLaptops + formData.estimatedDesktops + 
                     formData.estimatedMonitors + formData.estimatedPhones + formData.estimatedOther
        return total > 0
      case 3:
        return formData.preferredDate !== ''
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    
    const result = await createPickupRequest(formData)
    
    setIsSubmitting(false)
    
    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/portal')
      }, 2000)
    } else {
      setError(result.error || 'Error al crear la solicitud')
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            ¡Solicitud Creada!
          </h1>
          <p className="text-slate-500 mb-6">
            Nos pondremos en contacto contigo para confirmar la recolección.
          </p>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white 
                     rounded-xl hover:bg-blue-600 transition-colors font-medium"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/portal"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 
                   transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Truck className="w-7 h-7 text-blue-500" />
          Solicitar Recolección
        </h1>
        <p className="text-slate-500 mt-1">
          Completa los datos para programar una recolección
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-10">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "flex items-center gap-3",
              currentStep === step.id ? "text-blue-600" :
              currentStep > step.id ? "text-emerald-500" : "text-slate-400"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                currentStep === step.id ? "bg-blue-100 text-blue-600" :
                currentStep > step.id ? "bg-emerald-100 text-emerald-500" : "bg-slate-100 text-slate-400"
              )}>
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <div className="hidden sm:block">
                <p className="font-medium">{step.title}</p>
                <p className="text-xs text-slate-400">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-16 sm:w-24 h-0.5 mx-4",
                currentStep > step.id ? "bg-emerald-300" : "bg-slate-200"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">
          {/* Step 1: Ubicación */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dirección de Recolección *
                </label>
                <textarea
                  value={formData.pickupAddress}
                  onChange={(e) => updateFormData('pickupAddress', e.target.value)}
                  placeholder="Ej: 6ta Avenida 10-25 Zona 1, Ciudad de Guatemala"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                           text-slate-700 placeholder:text-slate-400 resize-none"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre de Contacto *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => updateFormData('contactName', e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl 
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             text-slate-700 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Teléfono de Contacto *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => updateFormData('contactPhone', e.target.value)}
                    placeholder="+502 5555-0000"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl 
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Equipos */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="text-slate-500 text-sm">
                Indica la cantidad aproximada de equipos a recolectar:
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Laptops */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm">
                    <Laptop className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">Laptops</p>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedLaptops}
                      onChange={(e) => updateFormData('estimatedLaptops', parseInt(e.target.value) || 0)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                               text-slate-700 text-center"
                    />
                  </div>
                </div>

                {/* Desktops */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm">
                    <Cpu className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">Desktops</p>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedDesktops}
                      onChange={(e) => updateFormData('estimatedDesktops', parseInt(e.target.value) || 0)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                               text-slate-700 text-center"
                    />
                  </div>
                </div>

                {/* Monitores */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm">
                    <Monitor className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">Monitores</p>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedMonitors}
                      onChange={(e) => updateFormData('estimatedMonitors', parseInt(e.target.value) || 0)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                               text-slate-700 text-center"
                    />
                  </div>
                </div>

                {/* Celulares */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm">
                    <Smartphone className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">Celulares</p>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedPhones}
                      onChange={(e) => updateFormData('estimatedPhones', parseInt(e.target.value) || 0)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                               text-slate-700 text-center"
                    />
                  </div>
                </div>

                {/* Otros */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 col-span-2">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm">
                    <Box className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">Otros equipos</p>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedOther}
                      onChange={(e) => updateFormData('estimatedOther', parseInt(e.target.value) || 0)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                               text-slate-700 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                <span className="font-medium text-blue-700">Total Estimado:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formData.estimatedLaptops + formData.estimatedDesktops + 
                   formData.estimatedMonitors + formData.estimatedPhones + formData.estimatedOther} equipos
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Fecha */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fecha Preferida de Recolección *
                </label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => updateFormData('preferredDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                           text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horario Preferido
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'morning', label: 'Mañana', time: '8:00 - 12:00' },
                    { value: 'afternoon', label: 'Tarde', time: '14:00 - 18:00' },
                    { value: 'flexible', label: 'Flexible', time: 'Cualquier hora' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateFormData('preferredTime', option.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        formData.preferredTime === option.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <p className={cn(
                        "font-medium",
                        formData.preferredTime === option.value ? "text-blue-700" : "text-slate-700"
                      )}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{option.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas Adicionales (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData('notes', e.target.value)}
                  placeholder="Instrucciones especiales, acceso al edificio, etc."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                           text-slate-700 placeholder:text-slate-400 resize-none"
                  rows={3}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
              currentStep === 1
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-200"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all",
                canProceed()
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all",
                canProceed() && !isSubmitting
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Enviar Solicitud
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

