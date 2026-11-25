import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'
import { peekWarehouseTransferCorrelative } from '@/lib/inventario/nextWarehouseTransferCorrelative'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        await setSession(supabase)

        const formatted = await peekWarehouseTransferCorrelative(supabase)

        return NextResponse.json({ correlative: formatted })
    } catch (error) {
        console.error('Internal error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
