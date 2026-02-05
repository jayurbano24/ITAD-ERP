import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Endpoint para sincronizar datos de clasificación de ticket_items a assets
 * Usar una sola vez para migrar datos existentes
 * GET /api/admin/sync-reception-data
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Primero, vincular asset_id en ticket_items donde no está establecido
    const { error: linkError } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE ticket_items ti
        SET asset_id = a.id
        FROM assets a
        WHERE ti.collected_serial = a.serial_number
          AND ti.asset_id IS NULL;
      `
    })

    // Si no existe la función exec_sql, intentamos con SQL directo
    // Obtener todos los ticket_items con datos de clasificación
    const { data: ticketItems, error: fetchError } = await supabase
      .from('ticket_items')
      .select(`
        id,
        asset_id,
        collected_serial,
        color_detail,
        color,
        classification_rec,
        classification_f,
        classification_c,
        processor,
        bios_version,
        ram_capacity,
        ram_type,
        disk_capacity,
        disk_type,
        keyboard_type,
        keyboard_version,
        observations
      `)
      .or('classification_rec.not.is.null,classification_f.not.is.null,processor.not.is.null,ram_capacity.not.is.null,disk_capacity.not.is.null,keyboard_type.not.is.null,color_detail.not.is.null')

    if (fetchError) {
      console.error('Error fetching ticket_items:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!ticketItems || ticketItems.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No hay items con datos de clasificación para sincronizar',
        synced: 0
      })
    }

    // Obtener assets por serial_number para vincular
    const serials = ticketItems
      .filter(ti => ti.collected_serial && !ti.asset_id)
      .map(ti => ti.collected_serial)

    let serialToAssetMap: Record<string, string> = {}
    
    if (serials.length > 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, serial_number')
        .in('serial_number', serials)
      
      assets?.forEach(a => {
        if (a.serial_number) {
          serialToAssetMap[a.serial_number] = a.id
        }
      })
    }

    let syncedCount = 0
    const errors: string[] = []

    // Actualizar cada asset con los datos de ticket_items
    for (const ti of ticketItems) {
      const assetId = ti.asset_id || (ti.collected_serial ? serialToAssetMap[ti.collected_serial] : null)
      
      if (!assetId) {
        continue
      }

      const specifications = {
        workshop_classifications: {
          rec: ti.classification_rec || undefined,
          f: ti.classification_f || undefined,
          c: ti.classification_c || undefined
        },
        hardware_specs: {
          processor: ti.processor || undefined,
          bios_version: ti.bios_version || undefined,
          ram_capacity: ti.ram_capacity || undefined,
          ram_type: ti.ram_type || undefined,
          disk_capacity: ti.disk_capacity || undefined,
          disk_type: ti.disk_type || undefined,
          keyboard_type: ti.keyboard_type || undefined,
          keyboard_version: ti.keyboard_version || undefined
        },
        reception_notes: ti.observations || undefined
      }

      // Limpiar objetos vacíos
      if (!specifications.workshop_classifications.rec && 
          !specifications.workshop_classifications.f && 
          !specifications.workshop_classifications.c) {
        delete (specifications as any).workshop_classifications
      }

      if (!specifications.hardware_specs.processor && 
          !specifications.hardware_specs.ram_capacity && 
          !specifications.hardware_specs.disk_capacity) {
        delete (specifications as any).hardware_specs
      }

      if (!specifications.reception_notes) {
        delete (specifications as any).reception_notes
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      }

      if (Object.keys(specifications).length > 0) {
        updateData.specifications = specifications
      }

      if (ti.color_detail || ti.color) {
        updateData.color = ti.color_detail || ti.color
      }

      const { error: updateError } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', assetId)

      if (updateError) {
        errors.push(`Asset ${assetId}: ${updateError.message}`)
      } else {
        syncedCount++
      }

      // Vincular asset_id en ticket_items si no estaba
      if (!ti.asset_id && assetId) {
        await supabase
          .from('ticket_items')
          .update({ asset_id: assetId })
          .eq('id', ti.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada`,
      synced: syncedCount,
      total: ticketItems.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error en la sincronización'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

