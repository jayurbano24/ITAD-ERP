import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ReceptionItemRequest {
  itemId: string
  brandFull?: string | null
  modelFull?: string | null
  productType?: string | null
  brandId?: string | null
  modelId?: string | null
  productTypeId?: string | null
  collectedSerial?: string | null
  colorDetail?: string | null
  processor?: string | null
  ramCapacity?: string | null
  ramType?: string | null
  diskCapacity?: string | null
  diskType?: string | null
  keyboardType?: string | null
  keyboardVersion?: string | null
  classificationRec?: string | null
  classificationF?: string | null
  classificationC?: string | null
  biosVersion?: string | null
  observations?: string | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReceptionItemRequest

    if (!body.itemId?.trim()) {
      return NextResponse.json({ error: 'Falta el ID del item' }, { status: 400 })
    }

    const supabase = await createClient()

    const normalizeLabel = (value?: string | null) => (value || '').trim().toLowerCase()
    const isPlaceholder = (value?: string | null) => {
      const normalized = normalizeLabel(value)
      return !normalized || normalized === 'sin marca' || normalized === 'sin modelo' || normalized === 'equipo'
    }

    let resolvedBrand = body.brandFull || null
    let resolvedModel = body.modelFull || null
    let resolvedType = body.productType || null

    if (isPlaceholder(resolvedBrand) && body.brandId) {
      const { data } = await supabase
        .from('catalog_brands')
        .select('name')
        .eq('id', body.brandId)
        .maybeSingle()
      resolvedBrand = data?.name || resolvedBrand
    }

    if (isPlaceholder(resolvedModel) && body.modelId) {
      const { data } = await supabase
        .from('catalog_models')
        .select('name')
        .eq('id', body.modelId)
        .maybeSingle()
      resolvedModel = data?.name || resolvedModel
    }

    if (isPlaceholder(resolvedType) && body.productTypeId) {
      const { data } = await supabase
        .from('catalog_product_types')
        .select('name')
        .eq('id', body.productTypeId)
        .maybeSingle()
      resolvedType = data?.name || resolvedType
    }

    // Actualizar el ticket_item con todos los campos de clasificación
    const { error } = await supabase
      .from('ticket_items')
      .update({
        brand: resolvedBrand || null,
        model: resolvedModel || null,
        product_type: resolvedType || null,
        brand_full: resolvedBrand || null,
        model_full: resolvedModel || null,
        brand_id: body.brandId || null,
        model_id: body.modelId || null,
        product_type_id: body.productTypeId || null,
        collected_serial: body.collectedSerial || null,
        color_detail: body.colorDetail || null,
        processor: body.processor || null,
        ram_capacity: body.ramCapacity || null,
        ram_type: body.ramType || null,
        disk_capacity: body.diskCapacity || null,
        disk_type: body.diskType || null,
        keyboard_type: body.keyboardType || null,
        keyboard_version: body.keyboardVersion || null,
        classification_rec: body.classificationRec || null,
        classification_f: body.classificationF || null,
        classification_c: body.classificationC || null,
        bios_version: body.biosVersion || null,
        observations: body.observations || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.itemId)

    if (error) {
      console.error('Error updating reception item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Si ya existe un asset creado, sincronizar marca/modelo/tipo
    const { data: ticketItem } = await supabase
      .from('ticket_items')
      .select('asset_id')
      .eq('id', body.itemId)
      .maybeSingle()

    if (ticketItem?.asset_id) {
      const { error: assetError } = await supabase
        .from('assets')
        .update({
          manufacturer: resolvedBrand || null,
          model: resolvedModel || null,
          asset_type: resolvedType || null,
          color: body.colorDetail || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketItem.asset_id)

      if (assetError) {
        console.error('Error updating asset from reception item:', assetError)
      }
    }

    // Registrar auditoría
    try {
      const serieNormalized = (body.collectedSerial || '').toUpperCase().replace(/\s+/g, '');
      await supabase.from('audit_trail').insert([
        {
          serie: serieNormalized,
          usuario_id: 'system', // Reemplaza por el usuario real si lo tienes
          usuario_nombre: 'system', // Reemplaza por el usuario real si lo tienes
          estatus_anterior: null, // Si tienes el estatus anterior, colócalo aquí
          estatus_nuevo: body.classificationF || body.classificationC || '',
          descripcion: 'Actualización de recepción',
          origen: 'Recepción'
        }
      ])
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError)
    }

    return NextResponse.json({ success: true, itemId: body.itemId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando el item de recepción'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

