import { NextResponse } from 'next/server'
import { approveQcAndSendToRemarketing } from '@/app/dashboard/taller/actions'

type ApprovePayload = {
  workOrderId?: string | null
  notes?: string | null
  classificationRec?: string | null
  classificationF?: string | null
  classificationC?: string | null
}

const sanitizeId = (value?: string | null) => value?.trim() || ''
const sanitizeClassification = (value?: string | null) => value?.trim() || ''

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ApprovePayload
    const workOrderId = sanitizeId(payload.workOrderId)

    if (!workOrderId) {
      return NextResponse.json({ error: 'Falta la orden de trabajo' }, { status: 400 })
    }

    const result = await approveQcAndSendToRemarketing(workOrderId, {
      notes: payload.notes?.trim() || null,
      classificationRec: sanitizeClassification(payload.classificationRec),
      classificationF: sanitizeClassification(payload.classificationF),
      classificationC: sanitizeClassification(payload.classificationC),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo aprobar QC' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error aprobando QC:', error)
    const message = error instanceof Error ? error.message : 'Error al aprobar QC'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
