import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createSupabaseClient(supabaseConfig.url, serviceRoleKey)
    const { assetId, serial, tag } = await request.json()

    console.log('[move-to-val] Request:', { assetId, serial, tag })

    // Buscar asset
    let assetQuery = supabase
      .from('assets')
      .select('id, internal_tag, serial_number, status, current_warehouse_id')

    if (assetId) {
      assetQuery = assetQuery.eq('id', assetId)
    } else if (serial) {
      assetQuery = assetQuery.eq('serial_number', serial)
    } else if (tag) {
      assetQuery = assetQuery.eq('internal_tag', tag)
    } else {
      return NextResponse.json({ error: 'Proporciona assetId, serial o tag' }, { status: 400 })
    }

    const { data: asset, error: assetError } = await assetQuery.maybeSingle()

    if (assetError) {
      console.error('[move-to-val] Error buscando asset:', assetError)
      return NextResponse.json({ error: assetError.message }, { status: 500 })
    }

    if (!asset) {
      return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 })
    }

    console.log('[move-to-val] Asset encontrado:', asset)

    // Buscar o crear BOD-VAL
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id, code, name, is_active')
      .eq('code', 'BOD-VAL')
      .maybeSingle()

    let warehouseId: string

    if (warehouseError) {
      console.error('[move-to-val] Error buscando BOD-VAL:', warehouseError)
      return NextResponse.json({ error: warehouseError.message }, { status: 500 })
    }

    if (!warehouse) {
      console.log('[move-to-val] BOD-VAL no existe, creando...')
      const { data: newWarehouse, error: createError } = await supabase
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
        console.error('[move-to-val] Error creando BOD-VAL:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      warehouseId = newWarehouse.id
      console.log('[move-to-val] BOD-VAL creada:', warehouseId)
    } else {
      warehouseId = warehouse.id
      console.log('[move-to-val] BOD-VAL encontrada:', warehouseId, warehouse.name)
    }

    // Mover asset
    const previousWarehouseId = asset.current_warehouse_id
    console.log('[move-to-val] Moviendo asset de', previousWarehouseId, 'a', warehouseId)

    const { error: updateError } = await supabase
      .from('assets')
      .update({
        current_warehouse_id: warehouseId,
        updated_at: new Date().toISOString()
      })
      .eq('id', asset.id)

    if (updateError) {
      console.error('[move-to-val] Error moviendo asset:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('[move-to-val] Asset movido exitosamente')

    // Verificar
    const { data: verifyAsset } = await supabase
      .from('assets')
      .select('id, internal_tag, current_warehouse_id, warehouses(code, name)')
      .eq('id', asset.id)
      .single()

    console.log('[move-to-val] Verificación:', verifyAsset)

    // Contar assets en BOD-VAL
    const { count } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('current_warehouse_id', warehouseId)

    return NextResponse.json({
      success: true,
      message: 'Asset movido a BOD-VAL exitosamente',
      asset: {
        id: asset.id,
        internal_tag: asset.internal_tag,
        serial_number: asset.serial_number,
        previousWarehouse: previousWarehouseId,
        newWarehouse: warehouseId
      },
      verification: verifyAsset,
      totalInBodVal: count
    })

  } catch (error) {
    console.error('[move-to-val] Error inesperado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}

// También permitir GET con query params para facilitar el uso
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const serial = searchParams.get('serial')
  const tag = searchParams.get('tag')
  const assetId = searchParams.get('assetId')

  if (!serial && !tag && !assetId) {
    return NextResponse.json(
      { error: 'Proporciona serial, tag o assetId como query parameter' },
      { status: 400 }
    )
  }

  // Reutilizar la lógica de POST
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ serial, tag, assetId })
    })
  )
}
