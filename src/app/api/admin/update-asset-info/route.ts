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
    const manufacturerParam = searchParams.get('manufacturer')
    const modelParam = searchParams.get('model')

    console.log('[update-asset-info] Buscando asset:', serial)
    
    // Si se proporcionan manufacturer y/o model como query params, actualizar directamente
    if (manufacturerParam || modelParam) {
      console.log('[update-asset-info] Actualización directa via GET:', { manufacturerParam, modelParam })
      
      const { data: asset, error: findError } = await supabase
        .from('assets')
        .select('id, internal_tag')
        .eq('serial_number', serial)
        .maybeSingle()

      if (findError || !asset) {
        return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 })
      }

      const updatePayload: any = { updated_at: new Date().toISOString() }
      if (manufacturerParam) updatePayload.manufacturer = manufacturerParam
      if (modelParam) updatePayload.model = modelParam

      const { error: updateError } = await supabase
        .from('assets')
        .update(updatePayload)
        .eq('id', asset.id)

      if (updateError) {
        console.error('[update-asset-info] Error actualizando:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      console.log('[update-asset-info] ✅ Asset actualizado via GET')

      return NextResponse.json({
        success: true,
        message: '✅ Asset actualizado',
        asset: {
          id: asset.id,
          internal_tag: asset.internal_tag,
          manufacturer: manufacturerParam,
          model: modelParam
        }
      })
    }

    // Buscar asset con toda su información
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        id,
        internal_tag,
        serial_number,
        manufacturer,
        model,
        asset_type,
        status,
        specifications,
        batch_id,
        batches (
          id,
          internal_batch_id,
          ticket_id
        )
      `)
      .eq('serial_number', serial)
      .maybeSingle()

    if (assetError) {
      console.error('[update-asset-info] Error:', assetError)
      return NextResponse.json({ error: assetError.message }, { status: 500 })
    }

    if (!asset) {
      return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 })
    }

    console.log('[update-asset-info] Asset encontrado:', asset)
    console.log('[update-asset-info] Specifications:', asset.specifications)

    // Intentar extraer marca y modelo de specifications
    let manufacturer = asset.manufacturer
    let model = asset.model
    let needsUpdate = false

    if ((!manufacturer || !model) && asset.specifications) {
      const specs = asset.specifications as any
      
      // Buscar en input_classifications
      if (specs.input_classifications) {
        if (!manufacturer && specs.input_classifications.brand) {
          manufacturer = specs.input_classifications.brand
          needsUpdate = true
        }
        if (!model && specs.input_classifications.model) {
          model = specs.input_classifications.model
          needsUpdate = true
        }
      }

      // Buscar en output_classifications
      if (specs.output_classifications) {
        if (!manufacturer && specs.output_classifications.brand) {
          manufacturer = specs.output_classifications.brand
          needsUpdate = true
        }
        if (!model && specs.output_classifications.model) {
          model = specs.output_classifications.model
          needsUpdate = true
        }
      }

      // Buscar en otros campos comunes
      if (!manufacturer && specs.brand) {
        manufacturer = specs.brand
        needsUpdate = true
      }
      if (!model && specs.model) {
        model = specs.model
        needsUpdate = true
      }
      if (!manufacturer && specs.manufacturer) {
        manufacturer = specs.manufacturer
        needsUpdate = true
      }
    }

    console.log('[update-asset-info] Datos encontrados:', { manufacturer, model, needsUpdate })

    // Si encontramos datos, actualizar el asset
    if (needsUpdate && (manufacturer || model)) {
      console.log('[update-asset-info] Actualizando asset...')
      
      const updatePayload: any = { updated_at: new Date().toISOString() }
      if (manufacturer) updatePayload.manufacturer = manufacturer
      if (model) updatePayload.model = model

      const { error: updateError } = await supabase
        .from('assets')
        .update(updatePayload)
        .eq('id', asset.id)

      if (updateError) {
        console.error('[update-asset-info] Error actualizando:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      console.log('[update-asset-info] ✅ Asset actualizado exitosamente')

      return NextResponse.json({
        success: true,
        message: '✅ Asset actualizado con marca y modelo',
        asset: {
          id: asset.id,
          internal_tag: asset.internal_tag,
          serial_number: asset.serial_number,
          manufacturer,
          model,
          updated: true
        }
      })
    }

    // Si no hay datos en specifications, retornar info para actualización manual
    return NextResponse.json({
      success: false,
      message: 'No se encontró marca/modelo en specifications',
      asset: {
        id: asset.id,
        internal_tag: asset.internal_tag,
        serial_number: asset.serial_number,
        manufacturer: asset.manufacturer,
        model: asset.model,
        specifications: asset.specifications
      },
      suggestion: 'Usa POST para actualizar manualmente con manufacturer y model'
    })

  } catch (error) {
    console.error('[update-asset-info] Error inesperado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}

// Permitir actualización manual
export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createSupabaseClient(supabaseConfig.url, serviceRoleKey)
    const { serial, manufacturer, model } = await request.json()

    if (!serial) {
      return NextResponse.json({ error: 'Serial requerido' }, { status: 400 })
    }

    console.log('[update-asset-info] POST - Actualizando:', { serial, manufacturer, model })

    const { data: asset, error: findError } = await supabase
      .from('assets')
      .select('id, internal_tag')
      .eq('serial_number', serial)
      .maybeSingle()

    if (findError || !asset) {
      return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 })
    }

    const updatePayload: any = { updated_at: new Date().toISOString() }
    if (manufacturer) updatePayload.manufacturer = manufacturer
    if (model) updatePayload.model = model

    const { error: updateError } = await supabase
      .from('assets')
      .update(updatePayload)
      .eq('id', asset.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '✅ Asset actualizado',
      asset: {
        id: asset.id,
        internal_tag: asset.internal_tag,
        manufacturer,
        model
      }
    })

  } catch (error) {
    console.error('[update-asset-info] POST Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
