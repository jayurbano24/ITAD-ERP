import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const modulo = searchParams.get('modulo')
        const accion = searchParams.get('accion')
        const usuario = searchParams.get('usuario')
        const desde = searchParams.get('desde')
        const hasta = searchParams.get('hasta')
        const search = searchParams.get('search')
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')

        const supabase = await createClient()

        let query = supabase
            .from('v_auditoria_detallada')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (modulo) query = query.eq('module', modulo)
        if (accion) query = query.eq('action', accion)
        if (usuario) query = query.eq('user_id', usuario)
        if (desde) query = query.gte('created_at', desde)
        if (hasta) query = query.lte('created_at', hasta)

        if (search) {
            query = query.or(`description.ilike.%${search}%,entity_reference.ilike.%${search}%,user_name.ilike.%${search}%`)
        }

        const { data, error, count } = await query

        if (error) throw error

        return NextResponse.json({
            data,
            pagination: {
                total: count,
                limit,
                offset
            }
        })
    } catch (error) {
        console.error('Audit Report API Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
