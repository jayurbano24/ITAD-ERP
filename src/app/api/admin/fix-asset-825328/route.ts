import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createSupabaseClient(supabaseConfig.url, serviceRoleKey)
    const searchParams = request.nextUrl.searchParams
    const serial = searchParams.get('serial') || '825328253282532'

    console.log('[fix-asset] Buscando asset con serial:', serial)

    // Buscar asset exacto
    const { data: assets, error: searchError } = await supabase
      .from('assets')
      .select(`
        id,
        internal_tag,
        serial_number,
        status,
        asset_type,
        manufacturer,
        model,
        current_warehouse_id,
        wipe_started_at,
        wipe_completed_at,
        wipe_certificate_id,
        wipe_result,
        warehouses (
          id,
          code,
          name
        )
      `)
      .eq('serial_number', serial)

    console.log('[fix-asset] Resultado búsqueda:', assets)

    if (searchError) {
      console.error('[fix-asset] Error buscando:', searchError)
      return NextResponse.json({ error: searchError.message }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      // Intentar por internal_tag
      const { data: assetsByTag, error: tagError } = await supabase
        .from('assets')
        .select(`
          id,
          internal_tag,
          serial_number,
          status,
          asset_type,
          current_warehouse_id,
          warehouses (code, name)
        `)
        .eq('internal_tag', serial)

      if (tagError) {
        return NextResponse.json({
          error: 'Asset no encontrado por serial ni por tag',
          serial,
          searchError: (searchError as any)?.message,
          tagError: tagError.message
        }, { status: 404 })
      }

      if (!assetsByTag || assetsByTag.length === 0) {
        return NextResponse.json({
          error: 'Asset no encontrado en la base de datos',
          serial,
          message: 'Verifica que el serial/tag sea correcto'
        }, { status: 404 })
      }

      // Encontrado por tag, mover a BOD-VAL
      const asset = assetsByTag[0]
      console.log('[fix-asset] Asset encontrado por tag:', asset)

      // Continuar con el movimiento...
      return await moveAssetToVal(supabase, asset)
    }

    // Encontrado por serial
    const asset = assets[0]
    console.log('[fix-asset] Asset encontrado por serial:', asset)

    return await moveAssetToVal(supabase, asset)

  } catch (error) {
    console.error('[fix-asset] Error inesperado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}

async function moveAssetToVal(supabase: any, asset: any) {
  console.log('[fix-asset] Procesando asset:', asset.id, asset.internal_tag)

  // Buscar BOD-VAL
  const { data: warehouse, error: whError } = await supabase
    .from('warehouses')
    .select('id, code, name')
    .eq('code', 'BOD-VAL')
    .maybeSingle()

  if (whError) {
    console.error('[fix-asset] Error buscando BOD-VAL:', whError)
    return NextResponse.json({ error: whError.message }, { status: 500 })
  }

  let warehouseId: string

  if (!warehouse) {
    console.log('[fix-asset] Creando BOD-VAL...')
    const { data: newWh, error: createError } = await supabase
      .from('warehouses')
      .insert({
        code: 'BOD-VAL',
        name: 'Bodega de Valorización',
        description: 'Equipos con borrado de datos certificado',
        is_active: true
      })
      .select('id')
      .single()

    if (createError) {
      console.error('[fix-asset] Error creando BOD-VAL:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    warehouseId = newWh.id
  } else {
    warehouseId = warehouse.id
  }

  console.log('[fix-asset] Warehouse BOD-VAL:', warehouseId)

  // Verificar si ya está en BOD-VAL
  if (asset.current_warehouse_id === warehouseId) {
    return NextResponse.json({
      success: true,
      message: 'Asset ya está en BOD-VAL',
      asset: {
        id: asset.id,
        internal_tag: asset.internal_tag,
        serial_number: asset.serial_number,
        status: asset.status,
        warehouse: asset.warehouses
      }
    })
  }

  // Mover asset
  const previousWarehouse = asset.current_warehouse_id
  console.log('[fix-asset] Moviendo de', previousWarehouse, 'a', warehouseId)

  const { error: updateError } = await supabase
    .from('assets')
    .update({
      current_warehouse_id: warehouseId,
      updated_at: new Date().toISOString()
    })
    .eq('id', asset.id)

  if (updateError) {
    console.error('[fix-asset] Error actualizando:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  console.log('[fix-asset] ✅ Asset movido exitosamente')

  // Verificar
  const { data: verified } = await supabase
    .from('assets')
    .select('id, internal_tag, serial_number, current_warehouse_id, warehouses(code, name)')
    .eq('id', asset.id)
    .single()

  return NextResponse.json({
    success: true,
    message: '✅ Asset movido a BOD-VAL exitosamente',
    asset: {
      id: asset.id,
      internal_tag: asset.internal_tag,
      serial_number: asset.serial_number,
      status: asset.status,
      previousWarehouse: previousWarehouse,
      newWarehouse: warehouseId
    },
    verification: verified
  })
}
