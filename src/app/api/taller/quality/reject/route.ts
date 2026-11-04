import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface RejectPayload {
  workOrderId?: string | null
  reason?: string | null
  /** Destino al rechazar QC: diagnostico | reparacion */
  returnTo?: 'diagnostico' | 'reparacion' | null
}

const sanitizeId = (value?: string | null) => value?.trim() || ''

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RejectPayload
    const workOrderId = sanitizeId(payload.workOrderId)
    if (!workOrderId) {
      return NextResponse.json({ error: 'Falta la orden de trabajo' }, { status: 400 })
    }

    const returnTo = payload.returnTo === 'diagnostico' ? 'diagnostico' : 'reparacion'
    const nextStatus = returnTo === 'diagnostico' ? 'open' : 'in_progress'

    const supabase = await createClient()
    const updates: Record<string, unknown> = {
      status: nextStatus,
      qc_passed: false,
      qc_performed_at: new Date().toISOString(),
      qc_notes: payload.reason?.trim() || `QC rechazado → ${returnTo === 'diagnostico' ? 'Diagnóstico' : 'Reparación'}`,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', workOrderId)

    if (error) {
      console.error('Error al revertir QC fallido:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath(`/dashboard/taller/${workOrderId}`)
    revalidatePath('/dashboard/taller')
    revalidatePath('/dashboard/inventario/bodega')

    return NextResponse.json({
      success: true,
      returnTo,
      status: nextStatus,
    })
  } catch (error) {
    console.error('Error procesando rechazo de QC:', error)
    const message = error instanceof Error ? error.message : 'Error al revertir QC'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
