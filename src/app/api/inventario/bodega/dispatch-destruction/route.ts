import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { assetIds, clientId, driverName, vehiclePlate, generateCertificate, totalWeight } = await req.json()

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ error: 'No se proporcionaron activos' }, { status: 400 })
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Call Transactional RPC - Using NAMED parameters to ensure strict matching
        const { data, error } = await supabase.rpc('create_destruction_dispatch', {
            p_origin_warehouse: 'BOD-DES',
            p_client_id: clientId,
            p_driver_name: driverName || null,
            p_vehicle_plate: vehiclePlate || null,
            p_total_weight: totalWeight || 0,
            p_asset_ids: assetIds,
            p_user_id: user.id
        })

        if (error) {
            console.error('Error creating dispatch:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: 'Salida procesada correctamente',
            dispatch_id: (data as any)?.dispatch_id,
            dispatch_code: (data as any)?.dispatch_code,
            count: assetIds.length
        })
    } catch (error: any) {
        console.error('Dispatch error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
