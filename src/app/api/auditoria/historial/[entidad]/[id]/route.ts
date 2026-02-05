import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: { entidad: string; id: string } }
) {
    try {
        const { entidad, id } = params
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('entity_type', entidad.toUpperCase())
            .eq('entity_id', id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Audit History API Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
