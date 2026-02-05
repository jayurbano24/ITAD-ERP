'use client'

import { useState, useEffect } from 'react'
import { DocumentTemplate, updateTemplate, deleteTemplate, createTemplate, DocumentCategory } from './actions'
import { TemplateSidebar } from './components/TemplateSidebar'
import { TemplateEditor } from './components/TemplateEditor'
import { VariablePanel } from './components/VariablePanel'
import { Text } from '@/components/ui/Text'
import { FileText, Loader2, AlertCircle } from 'lucide-react'

interface TemplateModuleClientProps {
    initialTemplates: DocumentTemplate[]
}

export function TemplateModuleClient({ initialTemplates }: TemplateModuleClientProps) {
    const [templates, setTemplates] = useState<DocumentTemplate[]>(initialTemplates)
    const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(templates[0]?.id)
    const [lastInsertedVariable, setLastInsertedVariable] = useState<{ code: string; timestamp: number } | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const activeTemplate = templates.find(t => t.id === activeTemplateId)

    // Cargar plantillas desde la API (sin cache)
    useEffect(() => {
        const loadTemplatesFromAPI = async () => {
            try {
                const response = await fetch('/api/configuracion/plantillas/list', {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    }
                })
                if (response.ok) {
                    const data = await response.json()
                    if (data.templates && Array.isArray(data.templates)) {
                        setTemplates(data.templates)
                    }
                }
            } catch (error) {
                console.warn('Error cargando plantillas desde API:', error)
            }
        }

        // Cargar plantillas 1 segundo después de montar
        const timer = setTimeout(() => {
            loadTemplatesFromAPI()
        }, 1000)

        return () => clearTimeout(timer)
    }, [])

    // Inicializar plantilla de logística si no existe
    useEffect(() => {
        const initLogisticsTemplate = async () => {
            try {
                const hasLogisticsTemplate = templates.some(t => t.slug === 'guias-y-manifiestos')
                if (!hasLogisticsTemplate) {
                    const response = await fetch('/api/configuracion/plantillas/init-logistica', {
                        method: 'POST'
                    })
                    const result = await response.json()
                    if (result.created && result.template) {
                        setTemplates(prev => [...prev, result.template as DocumentTemplate])
                    }
                }
            } catch (error) {
                console.error('Error initializing logistics template:', error)
            }
        }
        initLogisticsTemplate()
    }, [templates])

    const handleSave = async (id: string, content: string) => {
        const result = await updateTemplate(id, content)
        if (result.success) {
            setTemplates(prev => prev.map(t => t.id === id ? { ...t, content_html: content } : t))
            // Aquí se podría mostrar un toast de éxito
        } else {
            alert('Error al guardar: ' + result.error)
        }
    }

    const handleDelete = async (id: string) => {
        const result = await deleteTemplate(id)
        if (result.success) {
            setTemplates(prev => prev.filter(t => t.id !== id))
            if (activeTemplateId === id) {
                setActiveTemplateId(templates.find(t => t.id !== id)?.id)
            }
        } else {
            alert('Error al eliminar: ' + result.error)
        }
    }

    const handleNew = async (forcedCategory?: DocumentCategory) => {
        const name = prompt('Nombre de la nueva plantilla:')
        if (!name) return

        let category = forcedCategory
        if (!category) {
            const catInput = prompt('Categoría (certificados, ordenes_presupuestos, facturas, ventas, etiquetas, otros):', 'otros')
            category = (catInput as DocumentCategory) || 'otros'
        }

        const slug = name.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '')
        const newTemplate: Partial<DocumentTemplate> = {
            name,
            slug,
            category,
            content_html: '<p>Nueva plantilla</p>',
            variables: []
        }

        const result = await createTemplate(newTemplate)
        if (result.success && result.data) {
            setTemplates(prev => [...prev, result.data as DocumentTemplate])
            setActiveTemplateId(result.data.id)
        } else {
            alert('Error al crear: ' + result.error)
        }
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50 dark:bg-[#0f1419]">
            <TemplateSidebar
                templates={templates}
                activeTemplateId={activeTemplateId}
                onSelect={setActiveTemplateId}
                onNew={handleNew}
            />

            {activeTemplate ? (
                <>
                    <TemplateEditor
                        template={activeTemplate}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        insertTrigger={lastInsertedVariable}
                    />
                    <VariablePanel onInsert={(code) => {
                        setLastInsertedVariable({ code, timestamp: Date.now() })
                    }} />
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 dark:bg-[#0f1419]">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    </div>
                    <Text variant="h2" className="text-gray-900 dark:text-white">Selecciona una plantilla</Text>
                    <Text variant="muted" className="mt-2 max-w-sm">
                        Elige una plantilla de la izquierda para comenzar a editarla o crea una nueva.
                    </Text>
                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={() => handleNew('logistica')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                        >
                            Crear Plantilla de Logística
                        </button>
                        <button
                            onClick={() => handleNew()}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                        >
                            Crear Primera Plantilla
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
