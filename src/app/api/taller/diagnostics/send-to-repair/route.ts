import { NextResponse } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'
import { FAILURE_TYPES } from '@/app/dashboard/taller/constants'

interface DiagnosisDetailPayload {
  code?: string | null
  description?: string | null
}

interface SendToRepairPayload {
  workOrderId?: string | null
  diagnosisComment?: string | null
  failureType?: string | null
  failureCategory?: string | null
  diagnosisActionLabel?: string | null
  diagnosisActionKey?: string | null
  diagnosisDetails?: DiagnosisDetailPayload[]
}

const sanitize = (value?: string | null) => {
  const trimmed = value?.trim() || ''
  return trimmed.length > 0 ? trimmed : null
}

const warehouseCodeMap: Record<string, string> = {
  hardvesting: 'BOD-HARV',
  borrado: 'BOD-VAL',
  data_wipe: 'BOD-VAL',
  destruccion: 'BOD-DES'
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SendToRepairPayload
    const workOrderId = payload.workOrderId?.trim()

    console.log('[send-to-repair] Received payload:', JSON.stringify({
      workOrderId: payload.workOrderId,
      diagnosisActionLabel: payload.diagnosisActionLabel,
      diagnosisActionKey: payload.diagnosisActionKey,
      hasComment: !!payload.diagnosisComment,
      hasDetails: Array.isArray(payload.diagnosisDetails) && payload.diagnosisDetails.length > 0
    }))

    if (!workOrderId) {
      return NextResponse.json({ error: 'Falta la orden de trabajo' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('[send-to-repair] Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createSupabaseClient(supabaseConfig.url, serviceRoleKey)

    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('started_at, asset_id, work_order_number, status, ticket_id, current_warehouse_id')
      .eq('id', workOrderId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!workOrder) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const normalizedFailureType = sanitize(payload.failureType)
    let failureCategory = sanitize(payload.failureCategory)
    if (!failureCategory && normalizedFailureType) {
      failureCategory = FAILURE_TYPES.find((item) => item.value === normalizedFailureType)?.category ?? null
    }

    const normalizedDetails = Array.isArray(payload.diagnosisDetails)
      ? payload.diagnosisDetails
        .map((detail) => ({ code: sanitize(detail.code), description: sanitize(detail.description) }))
        .filter((detail) => detail.code || detail.description)
      : []

    const detailLines = normalizedDetails
      .map((detail) => {
        if (detail.code && detail.description) {
          return `${detail.code} — ${detail.description}`
        }
        return detail.code || detail.description || ''
      })
      .filter(Boolean)

    const sections: string[] = []
    const actionLabel = sanitize(payload.diagnosisActionLabel)
    const actionKey = sanitize(payload.diagnosisActionKey)
    const isDataWipeAction = actionKey === 'data_wipe'

    console.log('[send-to-repair] actionLabel:', actionLabel, 'actionKey:', actionKey, 'isDataWipeAction:', isDataWipeAction)

    if (actionLabel) {
      sections.push(`Acción: ${actionLabel}`)
    }

    const comment = sanitize(payload.diagnosisComment)
    if (comment) {
      sections.push(comment)
    }

    if (detailLines.length > 0) {
      sections.push(`Fallas tabuladas:\n${detailLines.join('\n')}`)
    }

    const updates: Record<string, unknown> = {
      status: isDataWipeAction ? 'data_wipe' : 'in_progress',
      updated_at: new Date().toISOString(),
    }

    if (!workOrder.started_at) {
      updates.started_at = new Date().toISOString()
    }

    if (sections.length > 0) {
      updates.diagnosis = sections.join('\n\n')
    }

    if (normalizedFailureType !== null) {
      updates.failure_type = normalizedFailureType
      updates.failure_category = failureCategory
    }

    const { error: updateError } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', workOrderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Obtener usuario
    const { data: { user } } = await supabase.auth.getUser();

    // Registrar auditoría en audit_logs usando la función centralizada
    try {
      await createAuditLog({
        action: 'STATUS_CHANGE',
        module: 'TICKETS', // Or WORKSHOP
        entityType: 'WORK_ORDER',
        entityId: workOrderId,
        entityReference: workOrder.work_order_number || workOrderId,
        description: 'Diagnóstico enviado a reparación: ' + (actionLabel || 'Sin acción específica'),
        ticketId: workOrder.ticket_id, // If available in workOrder select
        workOrderId: workOrderId,
        assetId: workOrder.asset_id,
        changes_summary: {
          status: { old: workOrder.status, new: updates.status },
          diagnosis_action: { old: null, new: actionLabel }
        },
        userInfo: user ? {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.email,
          role: user.user_metadata?.role
        } : undefined
      });
    } catch (auditError) {
      console.error('Error registrando auditoría (diagnóstico):', auditError);
    }

    // Move asset to appropriate warehouse if diagnosisActionKey is provided
    if (actionKey && workOrder.asset_id) {
      const warehouseCode = warehouseCodeMap[actionKey]
      console.log('[send-to-repair] Moving asset. actionKey:', actionKey, 'warehouseCode:', warehouseCode, 'asset_id:', workOrder.asset_id)

      if (warehouseCode) {
        // Try to get warehouse, if not exists, create it
        let warehouseId: string | undefined

        const { data: existingWarehouse, error: fetchWarehouseError } = await supabase
          .from('warehouses')
          .select('id')
          .eq('code', warehouseCode)
          .maybeSingle()

        if (fetchWarehouseError && fetchWarehouseError.code !== 'PGRST116') {
          console.error('[send-to-repair] Error fetching warehouse:', fetchWarehouseError)
        }

        if (existingWarehouse?.id) {
          console.log('[send-to-repair] Found existing warehouse:', warehouseCode, existingWarehouse.id)
          warehouseId = existingWarehouse.id
        } else {
          console.log('[send-to-repair] Warehouse not found, creating new warehouse:', warehouseCode)
          // Create warehouse if it doesn't exist
          const warehouseNames: Record<string, string> = {
            'BOD-HARV': 'Bodega Hardvesting',
            'BOD-DES': 'Bodega Destrucción',
            'BOD-VAL': 'Bodega Valorización'
          }
          const warehouseDescriptions: Record<string, string> = {
            'BOD-HARV': 'Equipos a despiezar',
            'BOD-DES': 'Equipos para destrucción',
            'BOD-VAL': 'Equipos valorización'
          }

          const { data: newWarehouse, error: createError } = await supabase
            .from('warehouses')
            .insert({
              code: warehouseCode,
              name: warehouseNames[warehouseCode] || warehouseCode,
              description: warehouseDescriptions[warehouseCode] || 'Bodega',
              is_active: true
            })
            .select('id')
            .single()

          if (createError) {
            console.error('[send-to-repair] Error creating warehouse:', createError)
          } else if (newWarehouse?.id) {
            console.log('[send-to-repair] Warehouse created:', warehouseCode, newWarehouse.id)
            warehouseId = newWarehouse.id
          }
        }

        if (warehouseId) {
          console.log('[send-to-repair] Updating asset current_warehouse_id:', warehouseId)
          const { error: assetUpdateError } = await supabase
            .from('assets')
            .update({
              current_warehouse_id: warehouseId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', workOrder.asset_id)

          if (assetUpdateError) {
            console.error('[send-to-repair] Error moving asset to warehouse:', assetUpdateError)
          } else {
            console.log('[send-to-repair] Asset successfully moved to warehouse:', warehouseCode)
            // Obtener el nombre de la bodega
            const { data: warehouseData } = await supabase
              .from('warehouses')
              .select('name')
              .eq('id', warehouseId)
              .single();
            const bodegaNombre = warehouseData?.name || warehouseCode;
            // Registrar auditoría en audit_logs
            await createAuditLog({
              action: 'MOVE',
              module: 'WAREHOUSE',
              description: `Activo movido a bodega ${bodegaNombre}`,
              entityType: 'ASSET',
              entityId: workOrder.asset_id,
              entityReference: workOrder.work_order_number || workOrderId,
              changes_summary: {
                bodega: { old: workOrder.current_warehouse_id, new: bodegaNombre }
              },
              assetId: workOrder.asset_id,
              userInfo: user ? {
                id: user.id,
                email: user.email,
                fullName: user.user_metadata?.full_name || user.email,
                role: user.user_metadata?.role
              } : undefined
            });
          }
        } else {
          console.log('[send-to-repair] No warehouse ID available for asset movement')
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al enviar diagnóstico'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}