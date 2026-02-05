'use client'

import { DocumentTemplate, DocumentCategory } from '../actions'
import { Text } from '@/components/ui/Text'
import { cn } from '@/lib/utils'
import {
    FileText,
    ClipboardList,
    Receipt,
    Tag,
    Wrench,
    DollarSign,
    ChevronRight,
    Plus,
    Package
} from 'lucide-react'

interface TemplateSidebarProps {
    templates: DocumentTemplate[]
    activeTemplateId?: string
    onSelect: (id: string) => void
    onNew: (category?: DocumentCategory) => void
}

const CATEGORY_ICONS: Record<string, any> = {
    certificados: ClipboardList,
    ordenes_presupuestos: FileText,
    facturas: Receipt,
    ventas: DollarSign,
    etiquetas: Tag,
    logistica: Package,
    despachos: Package,
    otros: FileText
}

const CATEGORY_NAMES: Record<DocumentCategory, string> = {
    certificados: 'Certificados',
    ordenes_presupuestos: 'Órdenes y Presupuestos',
    facturas: 'Facturas',
    ventas: 'Ventas',
    etiquetas: 'Etiquetas',
    logistica: 'Logística y Manifiestos',
    despachos: 'Despachos',
    otros: 'Otros'
}

export function TemplateSidebar({ templates, activeTemplateId, onSelect, onNew }: TemplateSidebarProps) {
    const groupedTemplates = templates.reduce((acc, template: DocumentTemplate) => {
        if (!acc[template.category]) {
            acc[template.category] = []
        }
        acc[template.category].push(template)
        return acc
    }, {} as Record<DocumentCategory, DocumentTemplate[]>)

    const categories = Object.keys(CATEGORY_NAMES) as DocumentCategory[]

    return (
        <div className="w-72 bg-white dark:bg-[#1a1f2e] border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800/50">
                <button
                    onClick={() => onNew()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md active:scale-95 text-sm font-bold"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Documento
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-6">
                {categories.map((cat) => {
                    const catTemplates = groupedTemplates[cat] || []
                    const Icon = CATEGORY_ICONS[cat] || FileText

                    return (
                        <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-2 group/cat">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-emerald-500" />
                                    <Text variant="label" className="uppercase tracking-widest text-[10px] text-gray-500 dark:text-gray-400">
                                        {CATEGORY_NAMES[cat]}
                                    </Text>
                                </div>
                                <button
                                    onClick={() => onNew(cat)}
                                    className="p-1 opacity-0 group-hover/cat:opacity-100 hover:bg-emerald-500/10 rounded-md transition-all"
                                    title={`Nueva plantilla en ${CATEGORY_NAMES[cat]}`}
                                >
                                    <Plus className="w-3 h-3 text-emerald-500" />
                                </button>
                            </div>

                            <div className="space-y-0.5">
                                {catTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => onSelect(template.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all group",
                                            activeTemplateId === template.id
                                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        )}
                                    >
                                        <span className="truncate">{template.name}</span>
                                        <ChevronRight className={cn(
                                            "w-4 h-4 opacity-0 transition-opacity",
                                            activeTemplateId === template.id ? "opacity-100" : "group-hover:opacity-50"
                                        )} />
                                    </button>
                                ))}
                                {catTemplates.length === 0 && (
                                    <Text variant="muted" className="px-4 py-2 italic text-xs block">
                                        Sin plantillas
                                    </Text>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
