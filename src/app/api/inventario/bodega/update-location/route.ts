import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { setSession } from '@/lib/supabase/session'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { assetId, location } = body

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)

    // Obtener el batch_id del asset y datos actuales del lote
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('batch_id, serial_number, internal_tag, status, batches(location, internal_batch_id)')
      .eq('id', assetId)
      .single()

    if (assetError || !asset || !asset.batch_id) {
      return NextResponse.json({ error: 'Asset o batch no encontrado' }, { status: 404 })
    }

    if (asset.status === 'destroyed') {
      return NextResponse.json({ error: 'El activo está destruido y no puede modificarse' }, { status: 400 })
    }

    const currentBatch = asset.batches as any;
    const oldLocation = currentBatch?.location;
    const batchCode = currentBatch?.internal_batch_id;

    // Si la ubicación no cambió, no hacemos nada (o podríamos loguear igual, pero es ruido)
    if (oldLocation === location) {
      return NextResponse.json({ success: true, message: 'Sin cambios' })
    }

    // Actualizar la ubicación en el batch
    const { error: updateError } = await supabase
      .from('batches')
      .update({ location: location || null })
      .eq('id', asset.batch_id)

    if (updateError) {
      console.error('Error updating location:', updateError)
      return NextResponse.json({ error: 'Error al actualizar ubicación' }, { status: 500 })
    }

    // Registrar en auditoría
    await createAuditLog({
      action: 'MOVE',
      module: 'WAREHOUSE',
      description: `Ubicación del lote ${batchCode} actualizada de "${oldLocation || 'N/A'}" a "${location || 'N/A'}" (desde activo: ${asset.serial_number || asset.internal_tag})`,
      entityType: 'BATCH',
      entityId: asset.batch_id,
      entityReference: batchCode,
      batchId: asset.batch_id,
      // assetId: assetId, // Opcional si queremos linkearlo al asset específico que detonó el cambio
      changes_summary: {
        location: {
          old: oldLocation,
          new: location
        }
      }
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-location:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
