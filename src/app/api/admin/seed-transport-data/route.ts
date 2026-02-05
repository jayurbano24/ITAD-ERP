import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Endpoint para agregar datos de transporte y ubicación de prueba a los lotes
 * GET /api/admin/seed-transport-data
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener todos los lotes
    const { data: batches, error: fetchError } = await supabase
      .from('batches')
      .select('id, internal_batch_id, location, driver_name')
      .is('driver_name', null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!batches || batches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No hay lotes sin datos de transporte',
        updated: 0 
      })
    }

    let updatedCount = 0

    // Datos de transporte de ejemplo
    const transportData = [
      {
        location: 'P-01-A',
        driver_name: 'Juan Pérez',
        vehicle_plate: 'P-123ABC',
        transport_guide: 'GR-2025-0001'
      },
      {
        location: 'P-02-B',
        driver_name: 'Carlos López',
        vehicle_plate: 'P-456DEF',
        transport_guide: 'GR-2025-0002'
      },
      {
        location: 'E-01-C',
        driver_name: 'María García',
        vehicle_plate: 'P-789GHI',
        transport_guide: 'GR-2025-0003'
      }
    ]

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const transport = transportData[i % transportData.length]

      const { error: updateError } = await supabase
        .from('batches')
        .update({
          location: transport.location,
          driver_name: transport.driver_name,
          vehicle_plate: transport.vehicle_plate,
          transport_guide: transport.transport_guide,
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id)

      if (!updateError) {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${updatedCount} lotes con datos de transporte y ubicación`,
      updated: updatedCount
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

