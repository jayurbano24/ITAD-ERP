import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { setSession } from '@/lib/supabase/session'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        await setSession(supabase)
        const body = await request.json()
        const { assetIds, destinationWarehouseCode, reason, correlative, transferDate: providedTransferDate } = body

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ error: 'No se seleccionaron equipos' }, { status: 400 })
        }

        if (!destinationWarehouseCode) {
            return NextResponse.json({ error: 'Falta código de bodega destino' }, { status: 400 })
        }

        // 1. Obtener ID de la bodega destino
        const { data: warehouse, error: whError } = await supabase
            .from('warehouses')
            .select('id, name')
            .eq('code', destinationWarehouseCode)
            .single()

        if (whError || !warehouse) {
            return NextResponse.json({ error: 'Bodega destino no encontrada' }, { status: 404 })
        }

        // 1.5 Validar que los equipos no estén destruidos
        const { data: assetsToCheck } = await supabase
            .from('assets')
            .select('id, status, serial_number')
            .in('id', assetIds)

        const destroyedAssets = assetsToCheck?.filter(a => a.status === 'destroyed') || []
        if (destroyedAssets.length > 0) {
            const serials = destroyedAssets.map(a => a.serial_number).join(', ')
            return NextResponse.json({
                error: `No se pueden mover equipos destruidos: ${serials}`
            }, { status: 400 })
        }

        // 2. Obtener bodega origen de los assets antes de actualizar
        const { data: assetsBeforeUpdate } = await supabase
            .from('assets')
            .select('id, current_warehouse_id')
            .in('id', assetIds)

        const transferDate = providedTransferDate ? new Date(providedTransferDate).toISOString() : new Date().toISOString()

        // 3. Actualizar assets con fecha de traslado
        const { error: updateError } = await supabase
            .from('assets')
            .update({
                current_warehouse_id: warehouse.id,
                last_transfer_date: transferDate,
                // Si es bodega de destrucción, podríamos cambiar el status si se requiere
                // status: destinationWarehouseCode === 'BOD-DES' ? 'ready_to_recycle' : undefined 
                // Por ahora mantenemos status, solo movemos.
            })
            .in('id', assetIds)

        if (updateError) {
            console.error('Error updating assets:', updateError)
            return NextResponse.json({ error: 'Error al actualizar equipos' }, { status: 500 })
        }

        // 4. Registrar movimientos en inventory_movements con fecha de traslado
        const { data: { user } } = await supabase.auth.getUser()
        const movements = assetIds.map(assetId => {
            const asset = assetsBeforeUpdate?.find(a => a.id === assetId)
            return {
                asset_id: assetId,
                from_warehouse_id: asset?.current_warehouse_id || null,
                to_warehouse_id: warehouse.id,
                movement_type: 'transfer',
                transfer_date: transferDate,
                notes: reason || null,
                created_by: user?.id || null,
                reference_number: correlative || null
            }
        })

        const { error: movementsError } = await supabase
            .from('inventory_movements')
            .insert(movements)

        if (movementsError) {
            console.error('Error inserting movements:', movementsError)
            // No fallar el proceso si solo falla el registro de movimientos
        }

        // 5. Registrar Audit Log detallado
        try {
            const { AuditService } = await import('@/lib/services/audit-service')
            await AuditService.registrar({
                action: 'TRANSFER',
                module: 'WAREHOUSE',
                description: `Traslado masivo de ${assetIds.length} equipos a ${warehouse.name}`,
                entityType: 'ASSET',
                entityId: assetIds[0], // Usamos el primer ID como referencia
                entityReference: correlative || `TRAS-${new Date().getTime()}`,
                additionalData: {
                    asset_count: assetIds.length,
                    reason,
                    correlative,
                    destination: warehouse.name,
                    warehouse_id: warehouse.id
                }
            }, request)
        } catch (auditError) {
            console.error('Error recording audit:', auditError)
        }

        return NextResponse.json({ success: true, count: assetIds.length, correlative })
    } catch (error) {
        console.error('Error interno:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
