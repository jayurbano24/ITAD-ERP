import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OS_NUMBER_PREFIX = 'OS-'
const OS_START_SEQUENCE = 100

/**
 * Endpoint para corregir los IDs de work_orders
 * Cambia formatos como "WO-MJTISDHW" a "OS-100", "OS-101", etc.
 * GET /api/admin/fix-work-order-ids
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener todos los work_orders ordenados por created_at
    const { data: workOrders, error: fetchError } = await supabase
      .from('work_orders')
      .select('id, work_order_number, created_at')
      .order('created_at', { ascending: true })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!workOrders || workOrders.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No hay work_orders para corregir',
        fixed: 0 
      })
    }

    let fixedCount = 0
    let nextSequence = OS_START_SEQUENCE
    const updates = []

    for (const wo of workOrders) {
      // Verificar si ya tiene el formato correcto OS-XXX
      const isCorrectFormat = wo.work_order_number?.match(new RegExp(`^${OS_NUMBER_PREFIX}\\d+$`, 'i'))
      
      if (!isCorrectFormat) {
        // Necesita corrección
        const newNumber = `${OS_NUMBER_PREFIX}${nextSequence}`
        
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({ 
            work_order_number: newNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', wo.id)

        if (!updateError) {
          updates.push({
            id: wo.id,
            old: wo.work_order_number,
            new: newNumber
          })
          fixedCount++
        }
        nextSequence++
      } else {
        // Ya tiene formato correcto, extraer el número para continuar la secuencia
        const match = wo.work_order_number.match(new RegExp(`^${OS_NUMBER_PREFIX}(\\d+)$`, 'i'))
        if (match) {
          const num = Number(match[1])
          if (num >= nextSequence) {
            nextSequence = num + 1
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se corrigieron ${fixedCount} work_orders`,
      fixed: fixedCount,
      nextSequence,
      updates
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

