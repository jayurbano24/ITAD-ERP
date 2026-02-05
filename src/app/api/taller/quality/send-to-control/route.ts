import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'

type RepairEntry = {
  repair: string
  code: string
  level: string
}

type PartsEntry = {
  sku: string
  description?: string | null
  quantity?: number | null
  dispatched?: string | null
}

interface SendToQualityPayload {
  workOrderId?: string | null
  repairMode?: string | null
  repairOption?: string | null
  repairs?: RepairEntry[] | null
  partsSource?: string | null
  partsList?: PartsEntry[] | null
  softwareVersionIn?: string | null
  softwareVersionOut?: string | null
  selectedFailure?: string | null
  diagnosisComment?: string | null
  diagnosisDetails?: { code?: string | null; description?: string | null }[] | null
  classificationRec?: string | null
  classificationF?: string | null
  classificationC?: string | null
}

const sanitize = (value?: string | null) => {
  const trimmed = value?.trim() || ''
  return trimmed.length > 0 ? trimmed : null
}

const buildDetailsSection = (details?: { code?: string | null; description?: string | null }[]) => {
  if (!Array.isArray(details) || details.length === 0) return null
  const lines = details
    .map((detail) => {
      const code = sanitize(detail?.code)
      const description = sanitize(detail?.description)
      if (code && description) return `${code} — ${description}`
      return code || description || null
    })
    .filter(Boolean)
  if (lines.length === 0) return null
  return `Diagnóstico tabulado:\n${lines.join('\n')}`
}

const buildRepairsSection = (repairs?: RepairEntry[]) => {
  if (!Array.isArray(repairs) || repairs.length === 0) return null
  const lines = repairs.map((repair) => {
    const labelParts = [repair.repair]
    if (repair.code) labelParts.push(`(${repair.code})`)
    if (repair.level) labelParts.push(`[${repair.level}]`)
    return labelParts.join(' ')
  })
  return `Reparaciones planificadas:\n${lines.join('\n')}`
}

const buildPartsSection = (parts?: PartsEntry[]) => {
  if (!Array.isArray(parts) || parts.length === 0) return null
  const lines = parts.map((part) => {
    const labelParts = [part.sku]
    if (part.description) labelParts.push(`— ${sanitize(part.description)}`)
    if (typeof part.quantity === 'number') labelParts.push(`x${part.quantity}`)
    if (part.dispatched) labelParts.push(`(${sanitize(part.dispatched)})`)
    return labelParts.filter(Boolean).join(' ')
  })
  return `Partes asociadas:\n${lines.join('\n')}`
}

const revalidatePaths = (path: string) => {
  revalidatePath(path)
  revalidatePath('/dashboard/taller')
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SendToQualityPayload
    const workOrderId = sanitize(payload.workOrderId)

    if (!workOrderId) {
      return NextResponse.json({ error: 'Falta la orden de trabajo' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('resolution, diagnosis, asset_id')
      .eq('id', workOrderId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!workOrder) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const sections: string[] = []

    const repairMode = sanitize(payload.repairMode)
    if (repairMode) {
      sections.push(`Modo de reparación: ${repairMode}`)
    }

    const repairOption = sanitize(payload.repairOption)
    if (repairOption) {
      sections.push(`Opción seleccionada: ${repairOption}`)
    }

    const failure = sanitize(payload.selectedFailure)
    if (failure) {
      sections.push(`Falla reportada: ${failure}`)
    }

    const softwareIn = sanitize(payload.softwareVersionIn)
    if (softwareIn) {
      sections.push(`Versión In: ${softwareIn}`)
    }

    const softwareOut = sanitize(payload.softwareVersionOut)
    if (softwareOut) {
      sections.push(`Versión Out: ${softwareOut}`)
    }

    const source = sanitize(payload.partsSource)
    if (source) {
      sections.push(`Origen de piezas: ${source}`)
    }

    const classificationRec = sanitize(payload.classificationRec)
    const classificationF = sanitize(payload.classificationF)
    const classificationC = sanitize(payload.classificationC)
    const classificationParts: string[] = []
    if (classificationRec) classificationParts.push(`REC ${classificationRec}`)
    if (classificationF) classificationParts.push(`F ${classificationF}`)
    if (classificationC) classificationParts.push(`C ${classificationC}`)
    if (classificationParts.length > 0) {
      sections.push(`Clasificación de salida: ${classificationParts.join(' • ')}`)
    }

    const partsSection = buildPartsSection(payload.partsList ?? undefined)
    if (partsSection) {
      sections.push(partsSection)
    }

    const repairsSection = buildRepairsSection(payload.repairs ?? undefined)
    if (repairsSection) {
      sections.push(repairsSection)
    }

    const detailsSection = buildDetailsSection(payload.diagnosisDetails ?? undefined)
    if (detailsSection) {
      sections.push(detailsSection)
    }

    const diagnosisComment = sanitize(payload.diagnosisComment)
    if (diagnosisComment) {
      sections.push(`Comentario: ${diagnosisComment}`)
    }

    const resolutionSegments = []
    if (workOrder.resolution) {
      resolutionSegments.push(workOrder.resolution.trim())
    }
    resolutionSegments.push(...sections)

    const updates: Record<string, unknown> = {
      status: 'qc_pending',
      updated_at: new Date().toISOString(),
    }

    // Guardar clasificaciones de salida directamente en la orden
    // NOTA EMPERGENCIA: Comentado temporalmente porque las columnas en DB son char(1) y los valores son mayores (ej. F1).
    // Se debe correr la migración para ampliar columnas. Mientras tanto, se guarda en asset.specifications.
    /*
    if (classificationRec) {
      updates.rec_classification = classificationRec
    }
    if (classificationF) {
      updates.f_classification = classificationF
    }
    if (classificationC) {
      updates.c_classification = classificationC
    }
    */

    if (resolutionSegments.length > 0) {
      updates.resolution = resolutionSegments.filter(Boolean).join('\n\n')
    }

    if (diagnosisComment) {
      const diagSegments = []
      if (workOrder.diagnosis) diagSegments.push(workOrder.diagnosis.trim())
      diagSegments.push(diagnosisComment)
      updates.diagnosis = diagSegments.filter(Boolean).join('\n\n')
    }

    const { error: updateError } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', workOrderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const assetId = workOrder.asset_id ?? null
    const classificationUpdates: Record<string, string> = {}
    if (classificationRec) classificationUpdates.rec = classificationRec
    if (classificationF) classificationUpdates.f = classificationF
    if (classificationC) classificationUpdates.c = classificationC
    if (assetId && Object.keys(classificationUpdates).length > 0) {
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id, specifications')
        .eq('id', assetId)
        .single()

      if (!assetError && asset) {
        const existingSpecs = asset.specifications && typeof asset.specifications === 'object'
          ? { ...(asset.specifications as Record<string, unknown>) }
          : {}
        const workshopClassificationsRaw = existingSpecs.workshop_classifications
        const previousClassifications =
          workshopClassificationsRaw && typeof workshopClassificationsRaw === 'object'
            ? { ...(workshopClassificationsRaw as Record<string, unknown>) }
            : {}
        const updatedWorkshopClassifications = {
          ...previousClassifications,
          ...classificationUpdates
        }
        const updatedSpecs = {
          ...existingSpecs,
          workshop_classifications: updatedWorkshopClassifications,
          // También persistimos las clasificaciones de salida explícitamente para inventario/bodega
          ...(classificationRec ? { rec_classification_out: classificationRec } : {}),
          ...(classificationF ? { f_classification_out: classificationF } : {}),
          ...(classificationC ? { c_classification_out: classificationC } : {})
        }

        const { error: assetUpdateError } = await supabase
          .from('assets')
          .update({ specifications: updatedSpecs })
          .eq('id', assetId)

        if (assetUpdateError) {
          console.error('Error actualizando clasificaciones del activo:', assetUpdateError)
        }
      }
    }

    // Auditoría
    const { data: woRef } = await supabase
      .from('work_orders')
      .select('work_order_number, status, asset_id')
      .eq('id', workOrderId)
      .single();

    if (woRef) {
      console.log('[AUDIT] Intentando registrar auditoría en audit_logs para OS:', woRef.work_order_number);

      const { data: { user } } = await supabase.auth.getUser();

      try {
        await createAuditLog({
          action: 'STATUS_CHANGE',
          module: 'WORKSHOP',
          entityType: 'WORK_ORDER',
          entityId: workOrderId,
          entityReference: woRef.work_order_number,
          description: `OS #${woRef.work_order_number}: Enviada a Control de Calidad (${repairMode || 'Reparación'} - ${repairOption || 'N/A'})`,
          changes_summary: {
            status: { old: woRef.status, new: 'qc_pending' },
            repair_mode: { old: null, new: repairMode },
            repair_option: { old: null, new: repairOption }
          },
          workOrderId: workOrderId,
          assetId: woRef.asset_id,
          userInfo: user ? {
            id: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name || user.email,
            role: user.user_metadata?.role
          } : undefined
        });
        console.log('[AUDIT] Auditoría registrada correctamente en audit_logs para OS:', woRef.work_order_number);
      } catch (auditError) {
        console.error('[AUDIT] Error registrando auditoría en audit_logs:', auditError);
      }
    }

    revalidatePaths(`/dashboard/taller/${workOrderId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al enviar a Control de Calidad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
