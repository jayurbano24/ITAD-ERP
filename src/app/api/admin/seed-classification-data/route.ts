import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Endpoint para agregar datos de clasificación de prueba a los equipos existentes
 * GET /api/admin/seed-classification-data
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Datos de ejemplo para diferentes tipos de equipos
    const classificationData: any[] = []

    // Obtener todos los ticket_items sin clasificar
    const { data: items, error: fetchError } = await supabase
      .from('ticket_items')
      .select('id, model, model_full, asset_id')
      .is('classification_rec', null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay items sin clasificar',
        updated: 0
      })
    }

    let updatedCount = 0
    const updates: any[] = []

    for (const item of items) {
      const modelName = item.model_full || item.model || ''

      // Encontrar datos de clasificación basados en el modelo
      let classData = classificationData.find(c =>
        modelName.toLowerCase().includes(c.model_pattern.toLowerCase())
      )

      // Si no hay coincidencia, usar datos por defecto
      if (!classData) {
        classData = {
          model_pattern: 'Default',
          classification_rec: 'C',
          classification_f: 'F5',
          classification_c: 'C3',
          color_detail: 'Gris',
          processor: 'Intel Core i5',
          ram_capacity: '8GB',
          ram_type: 'DDR4',
          disk_capacity: '500GB',
          disk_type: 'HDD',
          keyboard_type: 'Español',
          keyboard_version: 'Normal',
          observations: 'Equipo funcional'
        }
      }

      // Actualizar ticket_item
      const { error: updateError } = await supabase
        .from('ticket_items')
        .update({
          classification_rec: classData.classification_rec,
          classification_f: classData.classification_f,
          classification_c: classData.classification_c,
          color_detail: classData.color_detail,
          processor: classData.processor,
          ram_capacity: classData.ram_capacity,
          ram_type: classData.ram_type,
          disk_capacity: classData.disk_capacity,
          disk_type: classData.disk_type,
          keyboard_type: classData.keyboard_type,
          keyboard_version: classData.keyboard_version,
          observations: classData.observations,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (!updateError) {
        updatedCount++
        updates.push({
          id: item.id,
          model: modelName,
          classification: `${classData.classification_rec}${classData.classification_f}-${classData.classification_c}`
        })

        // También actualizar el asset directamente
        if (item.asset_id) {
          await supabase
            .from('assets')
            .update({
              color: classData.color_detail,
              specifications: {
                workshop_classifications: {
                  rec: classData.classification_rec,
                  f: classData.classification_f,
                  c: classData.classification_c
                },
                hardware_specs: {
                  processor: classData.processor,
                  ram_capacity: classData.ram_capacity,
                  ram_type: classData.ram_type,
                  disk_capacity: classData.disk_capacity,
                  disk_type: classData.disk_type,
                  keyboard_type: classData.keyboard_type,
                  keyboard_version: classData.keyboard_version
                },
                reception_notes: classData.observations
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', item.asset_id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${updatedCount} equipos con datos de clasificación`,
      updated: updatedCount,
      details: updates
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

