import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Settings, Shield, FileText, RefreshCw } from 'lucide-react'
import { Text } from '@/components/ui/Text'
import { getTemplates } from './actions'
import { TemplateModuleClient } from './TemplateModuleClient'

export const dynamic = 'force-dynamic'

export default async function PlantillasPage() {
    const supabase = await createClient()

    // Verificar autenticación y permisos
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
        redirect('/dashboard')
    }

    // Obtener plantillas
    const templates = await getTemplates()

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#0f1419]">
            {/* Header Minimalista */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <FileText className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <Text variant="h2" className="text-lg font-black">Gestión de Plantillas</Text>
                        <Text variant="muted" className="text-[10px] uppercase tracking-widest font-bold">Personalización de Documentos PDF</Text>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg shadow-sm">
                        <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <Text variant="label" className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">Modo Editor</Text>
                    </div>
                </div>
            </div>

            {/* Client Component Integrado */}
            <TemplateModuleClient initialTemplates={templates} />
        </div>
    )
}
