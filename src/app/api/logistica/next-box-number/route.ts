import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()

        // Consultar el número de caja más alto en la tabla ticket_items
        const { data, error } = await supabase
            .from('ticket_items')
            .select('box_number')
            .order('box_number', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('Error fetching max box number:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Si hay datos, el siguiente es max + 1. Si no (null), iniciar en 10001
        const currentMax = data?.box_number ?? 10000
        const nextBoxNumber = currentMax >= 10000 ? currentMax + 1 : 10001

        return NextResponse.json({ nextBoxNumber })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error obteniendo siguiente número de caja'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
