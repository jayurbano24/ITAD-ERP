import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'
import { NextResponse } from 'next/server'

/**
 * Test endpoint para depurar la certificación de borrado
 * POST /api/wipe/test-certify
 * Body: { assetId, software, externalReportId }
 */
export async function POST(request: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }
    const supabase = createSupabaseClient(supabaseConfig.url, serviceRoleKey)
    const body = await request.json()
    const { assetId, software, externalReportId } = body

    if (!assetId || !software || !externalReportId) {
      return NextResponse.json(
        { error: 'Faltan parámetros: assetId, software, externalReportId' },
        { status: 400 }
      )
    }

    // Verificar que el asset existe
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('id, status, internal_tag, serial_number')
      .eq('id', assetId)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Activo no encontrado', fetchError },
        { status: 404 }
      )
    }

    // Intentar actualizar el estado
    const { error: updateError, data: updateData } = await supabase
      .from('assets')
      .update({
        status: 'wiped',
        wipe_completed_at: new Date().toISOString(),
        wipe_certificate_id: externalReportId,
        wipe_software: software,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .select()

    if (updateError) {
      return NextResponse.json(
        {
          error: 'Error actualizando asset',
          updateError: updateError.message,
          details: updateError
        },
        { status: 500 }
      )
    }

    // Move asset to Valorización (BOD-VAL)
    let warehouseId: string | undefined
    const { data: existingWarehouse } = await supabase
      .from('warehouses')
      .select('id')
      .eq('code', 'BOD-VAL')
      .maybeSingle()

    if (existingWarehouse?.id) {
      warehouseId = existingWarehouse.id
    } else {
      const { data: newWarehouse } = await supabase
        .from('warehouses')
        .insert({
          code: 'BOD-VAL',
          name: 'Bodega Valorización',
          description: 'Equipos valorización',
          is_active: true,
        })
        .select('id')
        .single()
      warehouseId = newWarehouse?.id
    }

    if (warehouseId) {
      await supabase
        .from('assets')
        .update({
          current_warehouse_id: warehouseId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
    }

    // Registrar auditoría en audit_trail
    try {
      await supabase.from('audit_trail').insert([
        {
          serie: asset.serial_number || asset.internal_tag || '',
          usuario_id: 'system', // Reemplaza por el usuario real si lo tienes
          usuario_nombre: 'system', // Reemplaza por el usuario real si lo tienes
          estatus_anterior: asset.status || null,
          estatus_nuevo: 'wiped',
          descripcion: 'Certificación de borrado exitosa',
          origen: 'Wipe'
        }
      ])
    } catch (auditError) {
      console.error('Error registrando auditoría (wipe):', auditError)
    }


    return NextResponse.json({
      success: true,
      message: 'Certificación exitosa y movido a Valorización',
      asset: updateData?.[0],
      movedTo: 'BOD-VAL'
    })
  } catch (error: any) {
    console.error('Error en test-certify:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
