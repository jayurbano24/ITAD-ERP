import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()

        // Obtener el último correlativo usado
        // Ordenamos por created_at descendente para obtener el más reciente
        const { data, error } = await supabase
            .from('inventory_movements')
            .select('reference_number')
            .like('reference_number', 'TRAS-%')
            .order('created_at', { ascending: false })
            .limit(1)

        if (error) {
            console.error('Error fetching correlative:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        let nextNum = 1

        if (data && data.length > 0) {
            // Buscar el número más alto parseando, en caso de que created_at no sea perfectamente secuencial (aunque debería)
            // Nota: Si hay múltiples filas con el mismo TRAS-XXXX (lote), cualquiera sirve.
            const lastRef = data[0].reference_number
            if (lastRef) {
                const parts = lastRef.split('-')
                if (parts.length === 2) {
                    const num = parseInt(parts[1], 10)
                    if (!isNaN(num)) {
                        nextNum = num + 1
                    }
                }
            }
        }

        // Formato: TRAS-000001 (6 dígitos para dar espacio)
        const formatted = `TRAS-${nextNum.toString().padStart(6, '0')}`

        return NextResponse.json({ correlative: formatted })
    } catch (error) {
        console.error('Internal error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
