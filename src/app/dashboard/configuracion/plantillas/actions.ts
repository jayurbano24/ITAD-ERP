'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type DocumentCategory = 'certificados' | 'ordenes_presupuestos' | 'facturas' | 'ventas' | 'etiquetas' | 'despachos' | 'logistica' | 'otros'

export interface DocumentTemplate {
    id: string
    slug: string
    name: string
    description: string | null
    category: DocumentCategory
    content_html: string
    variables: string[]
    is_active: boolean
    updated_at: string
}

const CATEGORIES: Record<DocumentCategory, string> = {
    certificados: 'Certificados',
    ordenes_presupuestos: 'Órdenes y Presupuestos',
    facturas: 'Facturas',
    ventas: 'Ventas',
    etiquetas: 'Etiquetas',
    despachos: 'Despachos',
    logistica: 'Logística y Manifiestos',
    otros: 'Otros'
}

export async function getTemplates() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching templates:', error)
        return []
    }

    return data as DocumentTemplate[]
}

export async function getTemplateBySlug(slug: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error) {
        console.error('Error fetching template:', error)
        return null
    }

    return data as DocumentTemplate
}

export async function updateTemplate(id: string, contentHtml: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('document_templates')
        .update({ content_html: contentHtml, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) {
        console.error('Error updating template:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/configuracion/plantillas')
    return { success: true }
}

export async function createTemplate(template: Partial<DocumentTemplate>) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('document_templates')
        .insert([template])
        .select()
        .single()

    if (error) {
        console.error('Error creating template:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/configuracion/plantillas')
    return { success: true, data }
}

export async function deleteTemplate(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting template:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/configuracion/plantillas')
    return { success: true }
}
