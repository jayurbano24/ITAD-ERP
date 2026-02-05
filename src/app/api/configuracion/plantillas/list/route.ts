import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        
        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching templates:', error)
            return NextResponse.json(
                { error: 'Error al obtener plantillas' },
                { status: 500 }
            )
        }

        return NextResponse.json(
            { templates: data },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }
        )
    } catch (error) {
        console.error('Error in GET:', error)
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        )
    }
}
