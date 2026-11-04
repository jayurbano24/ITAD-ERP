import type { SupabaseClient } from '@supabase/supabase-js'

const VAL_WAREHOUSE_CODE = 'BOD-VAL'

/**
 * Asegura Bodega Valorización y mueve el activo allí con status wiped.
 * Se usa al certificar / al subir evidencia PDF de borrado.
 */
export async function moveAssetToValorizacion(
  supabase: SupabaseClient,
  assetId: string,
  opts?: {
    wipeSoftware?: string | null
    wipeResult?: string | null
    wipeNotes?: string | null
    wipeCertificateId?: string | null
    performedBy?: string | null
  }
): Promise<{ ok: boolean; warehouseId: string | null; error?: string }> {
  const { data: existingVal } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', VAL_WAREHOUSE_CODE)
    .maybeSingle()

  let warehouseId: string | null = existingVal?.id ?? null

  if (!warehouseId) {
    const { data: created, error: createError } = await supabase
      .from('warehouses')
      .insert({
        code: VAL_WAREHOUSE_CODE,
        name: 'Bodega de Valorización',
        description: 'Equipos con borrado de datos certificado',
        is_active: true,
      })
      .select('id')
      .single()

    if (createError || !created?.id) {
      return {
        ok: false,
        warehouseId: null,
        error: createError?.message || 'No se pudo crear BOD-VAL',
      }
    }
    warehouseId = created.id as string
  }

  const { data: asset } = await supabase
    .from('assets')
    .select('id, current_warehouse_id, serial_number, wipe_certificate_id')
    .eq('id', assetId)
    .maybeSingle()

  if (!asset) {
    return { ok: false, warehouseId, error: 'Activo no encontrado' }
  }

  const serialPart = (asset.serial_number || assetId.slice(0, 8))
    .toString()
    .replace(/\s+/g, '')
    .toUpperCase()
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const certificateId =
    opts?.wipeCertificateId ||
    asset.wipe_certificate_id ||
    `WIPE-${serialPart}-${stamp}`

  const updatePayload: Record<string, unknown> = {
    status: 'wiped',
    current_warehouse_id: warehouseId,
    wipe_completed_at: new Date().toISOString(),
    wipe_certificate_id: certificateId,
    wipe_result: opts?.wipeResult || 'success',
    updated_at: new Date().toISOString(),
  }
  if (opts?.wipeSoftware) updatePayload.wipe_software = opts.wipeSoftware
  if (opts?.wipeNotes !== undefined) updatePayload.wipe_notes = opts.wipeNotes

  const { error: updateError } = await supabase
    .from('assets')
    .update(updatePayload)
    .eq('id', assetId)

  if (updateError) {
    return { ok: false, warehouseId, error: updateError.message }
  }

  // Movimiento de inventario (best-effort)
  if (asset.current_warehouse_id !== warehouseId) {
    await supabase.from('inventory_movements').insert({
      asset_id: assetId,
      from_warehouse_id: asset.current_warehouse_id,
      to_warehouse_id: warehouseId,
      movement_type: 'transfer',
      notes: 'Traslado automático por evidencia/certificación de borrado → BOD-VAL',
      performed_by: opts?.performedBy || null,
    })
  }

  return { ok: true, warehouseId }
}
