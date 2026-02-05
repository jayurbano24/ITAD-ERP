'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type WorkOrder, OS_NUMBER_PREFIX } from './constants'
import { createAuditLog } from '@/lib/audit'

// Re-exportar tipo para uso externo
export type { WorkOrder }

const OS_START_SEQUENCE = 100
const OS_FETCH_LIMIT = 500

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

const REMARKETING_WAREHOUSE_CODE = 'BOD-REM'
const QC_REMARKETING_NOTE = 'QC aprobado - traslado a Remarketing'
const QC_READY_STATUS = 'ready_for_sale'

interface RemarketingTransferOptions {
  notes?: string | null
  classificationRec?: string
  classificationF?: string
  classificationC?: string
}

const parseOsSequence = (value?: string | null) => {
  if (!value) return null
  const match = value.match(new RegExp(`^${OS_NUMBER_PREFIX}(\\d+)$`, 'i'))
  if (!match) return null
  return Number(match[1])
}

async function getNextWorkOrderSequence(supabase: ServerSupabaseClient) {
  const { data } = await supabase
    .from('work_orders')
    .select('work_order_number')
    .like('work_order_number', `${OS_NUMBER_PREFIX}%`)
    .order('created_at', { ascending: false })
    .limit(OS_FETCH_LIMIT)

  let maxSequence = OS_START_SEQUENCE - 1

  data?.forEach((row) => {
    const seq = parseOsSequence(row.work_order_number)
    if (seq !== null) {
      maxSequence = Math.max(maxSequence, seq)
    }
  })

  return maxSequence + 1
}

// =====================================================
// INTERFACE EXTENDIDA PARA DETALLE COMPLETO
// =====================================================

export interface WorkOrderDetail extends Omit<WorkOrder, 'ticket'> {
  asset?: {
    id: string
    internal_tag: string
    serial_number: string | null
    manufacturer: string | null
    model: string | null
    asset_type: string
    color: string | null
    status?: string | null
    photos: string[]
    condition: string | null
    location: string | null
    specifications: Record<string, unknown> | null
  }
  technician?: {
    id: string
    full_name: string
  }
  ticket?: {
    id: string
    ticket_number: string
    title: string
    description: string | null
    priority: number
    pickup_address: string | null
    client?: {
      id: string
      name: string
      commercial_name: string
      legal_name: string | null
      entity_type: string
      phone: string | null
      email: string | null
      city: string
      contact_person: string | null
    }
  }
  part_requests?: Array<{
    id: string
    part_sku: string
    part_name: string | null
    quantity: number
    status: string
    created_at: string
  }>
}

// =====================================================
// OBTENER ÓRDENES DE TRABAJO (LISTADO)
// =====================================================

export async function getWorkOrders() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      asset:assets(id, internal_tag, serial_number, manufacturer, model, asset_type, color, batch_id, specifications),
      technician:profiles!work_orders_technician_id_fkey(id, full_name),
      part_requests(id, part_sku, part_name, quantity, status, created_at, dispatch_date, installed_at)
    `)
    .order('created_at', { ascending: false })

  // Obtener batch codes para los assets
  const batchIds = Array.from(new Set((data || []).map((wo: any) => wo.asset?.batch_id).filter(Boolean)))
  let batchesMap: Record<string, string> = {}

  if (batchIds.length > 0) {
    const { data: batches } = await supabase
      .from('batches')
      .select('id, internal_batch_id')
      .in('id', batchIds)

    batches?.forEach((b: any) => {
      batchesMap[b.id] = b.internal_batch_id
    })
  }

  if (error) {
    console.error('Error fetching work orders:', error)
    return { data: [], error: error.message }
  }

  const annotated = (data as WorkOrder[]).map((workOrder: any) => ({
    ...workOrder,
    human_id: parseOsSequence(workOrder.work_order_number),
    asset: workOrder.asset ? {
      ...workOrder.asset,
      batch_code: workOrder.asset.batch_id ? batchesMap[workOrder.asset.batch_id] : null
    } : null
  }))

  return { data: annotated, error: null }
}

// =====================================================
// OBTENER ORDEN DE TRABAJO COMPLETA (DETALLE)
// Con joins profundos: Asset, Ticket, Cliente, Técnico
// =====================================================

export async function getWorkOrderById(id: string) {
  const supabase = await createClient()

  // Consulta principal con joins profundos
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      asset:assets(
        id, 
        internal_tag, 
        serial_number, 
        manufacturer, 
        model, 
        asset_type,
        color,
        photos,
        condition,
        location,
        specifications
      ),
      technician:profiles!work_orders_technician_id_fkey(id, full_name),
      ticket:operations_tickets(
        id,
        ticket_number:readable_id,
        title,
        description,
        priority,
        pickup_address,
        client:crm_entities(
          id,
          name:commercial_name,
          commercial_name,
          legal_name,
          entity_type,
          phone,
          email,
          city,
          contact_person
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching work order:', error)
    return { data: null, error: error.message }
  }

  // Obtener solicitudes de piezas
  const { data: partRequests } = await supabase
    .from('part_requests')
    .select('id, part_sku, part_name, quantity, status, created_at')
    .eq('work_order_id', id)
    .order('created_at', { ascending: false })

  const workOrderDetail: WorkOrderDetail = {
    ...data,
    part_requests: partRequests || [],
    human_id: parseOsSequence(data?.work_order_number)
  }

  return { data: workOrderDetail as WorkOrderDetail, error: null }
}

// =====================================================
// CREAR ORDEN DE TRABAJO
// =====================================================

export async function createWorkOrder(assetId: string, reportedIssue: string) {
  const supabase = await createClient()

  const nextSequence = await getNextWorkOrderSequence(supabase)
  const workOrderNumber = `${OS_NUMBER_PREFIX}${nextSequence}`

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      work_order_number: workOrderNumber,
      asset_id: assetId,
      reported_issue: reportedIssue,
      status: 'open',
      priority: 'normal',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating work order:', error)
    return { success: false, error: error.message }
  }

  // Sincronizar clasificaciones de recepción a asset si aún no existen
  if (assetId) {
    try {
      const { data: ticketItem } = await supabase
        .from('ticket_items')
        .select('classification_rec, classification_f, classification_c')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (ticketItem && (ticketItem.classification_rec || ticketItem.classification_f || ticketItem.classification_c)) {
        const { data: asset } = await supabase
          .from('assets')
          .select('specifications')
          .eq('id', assetId)
          .single()

        if (asset) {
          const specs = asset.specifications && typeof asset.specifications === 'object'
            ? { ...(asset.specifications as Record<string, unknown>) }
            : {}

          // Solo actualizar si no existen ya las clasificaciones de entrada
          if (!specs.workshop_classifications) {
            specs.workshop_classifications = {
              rec: ticketItem.classification_rec,
              f: ticketItem.classification_f,
              c: ticketItem.classification_c
            }

            await supabase
              .from('assets')
              .update({ specifications: specs })
              .eq('id', assetId)
          }
        }
      }
    } catch (err) {
      console.error('Error syncing reception classifications:', err)
    }
  }

  // Auditoría: Creación de OS
  await createAuditLog({
    action: 'CREATE',
    module: 'WORKSHOP',
    entityType: 'WORK_ORDER',
    entityId: data?.id,
    entityReference: workOrderNumber,
    description: `Orden de Servicio #${workOrderNumber} creada`,
  });

  // Mover activo a BOD-REP (Reparación) y registrar movimiento
  if (assetId) {
    try {
      // Actualizar ubicación del activo

      // Buscar el ID de la bodega BOD-REP
      const { data: repWarehouse, error: repWarehouseError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('code', 'BOD-REP')
        .maybeSingle();

      if (repWarehouseError || !repWarehouse?.id) {
        console.error('No se pudo obtener el ID de la bodega BOD-REP:', repWarehouseError);
      } else {
        // Actualizar ubicación y current_warehouse_id
        const { error: moveError } = await supabase
          .from('assets')
          .update({ location: 'BOD-REP', current_warehouse_id: repWarehouse.id })
          .eq('id', assetId);

        if (moveError) {
          console.error('Error moviendo activo a BOD-REP:', moveError);
        } else {
          // Registrar movimiento en asset_history
          await supabase
            .from('asset_history')
            .insert({
              asset_id: assetId,
              action: 'MOVE',
              location: 'BOD-REP',
              description: `Movimiento automático a BOD-REP al crear orden de trabajo #${workOrderNumber}`,
            });
        }
      }


    } catch (err) {
      console.error('Error moviendo activo a BOD-REP:', err);
    }
  }

  revalidatePath('/dashboard/taller')
  return { success: true, data }
}

// =====================================================
// ACTUALIZAR DIAGNÓSTICO
// =====================================================

interface DiagnosisData {
  warrantyStatus: 'in_warranty' | 'out_of_warranty' | 'pending_validation'
  failureType?: string
  failureCategory?: string
  diagnosis?: string
}


export async function updateDiagnosis(workOrderId: string, data: DiagnosisData) {
  const supabase = await createClient()

  // Obtener estado anterior para auditoría
  const { data: oldWorkOrder } = await supabase
    .from('work_orders')
    .select('status, work_order_number')
    .eq('id', workOrderId)
    .single()

  const updateData: Record<string, unknown> = {
    warranty_status: data.warrantyStatus,
    failure_type: data.failureType || null,
    failure_category: data.failureCategory || null,
    diagnosis: data.diagnosis || null,
    updated_at: new Date().toISOString(),
  }

  if (data.warrantyStatus === 'in_warranty' && data.failureType) {
    updateData.status = 'in_progress'
    updateData.started_at = new Date().toISOString()
    updateData.quote_status = 'not_required'
  }

  const { error } = await supabase
    .from('work_orders')
    .update(updateData)
    .eq('id', workOrderId)

  if (error) {
    console.error('Error updating diagnosis:', error)
    return { success: false, error: error.message }
  }

  // Auditoría
  if (oldWorkOrder) {
    const statusChanged = updateData.status && updateData.status !== oldWorkOrder.status;
    const action = statusChanged ? 'STATUS_CHANGE' : 'UPDATE';
    const description = statusChanged
      ? `OS #${oldWorkOrder.work_order_number}: Estado actualizado de "${oldWorkOrder.status}" a "${updateData.status}" (Inicio de reparación)`
      : `OS #${oldWorkOrder.work_order_number}: Diagnóstico actualizado`;

    await createAuditLog({
      action,
      module: 'WORKSHOP',
      entityType: 'WORK_ORDER',
      entityId: workOrderId,
      entityReference: oldWorkOrder.work_order_number,
      description,
      changes_summary: statusChanged ? {
        status: { old: oldWorkOrder.status, new: updateData.status }
      } : undefined
    });
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  return { success: true }
}

// =====================================================
// ENVIAR COTIZACIÓN
// =====================================================

interface QuoteData {
  partsCost: number
  laborCost: number
  notes?: string
}

export async function sendQuote(workOrderId: string, data: QuoteData) {
  const supabase = await createClient()

  // Obtener referencia para log
  const { data: woRef } = await supabase
    .from('work_orders')
    .select('work_order_number, status')
    .eq('id', workOrderId)
    .single();

  const totalAmount = data.partsCost + data.laborCost

  const { error } = await supabase
    .from('work_orders')
    .update({
      warranty_status: 'out_of_warranty',
      quote_amount: totalAmount,
      quote_status: 'pending',
      quote_notes: `Piezas: Q${data.partsCost.toFixed(2)} | Mano de obra: Q${data.laborCost.toFixed(2)}${data.notes ? ` | ${data.notes}` : ''}`,
      status: 'waiting_quote',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)

  if (error) {
    console.error('Error sending quote:', error)
    return { success: false, error: error.message }
  }

  // Auditoría
  if (woRef) {
    await createAuditLog({
      action: 'UPDATE',
      module: 'WORKSHOP',
      entityType: 'WORK_ORDER',
      entityId: workOrderId,
      entityReference: woRef.work_order_number,
      description: `OS #${woRef.work_order_number}: Cotización enviada por Q${totalAmount.toFixed(2)}`,
      changes_summary: {
        status: { old: woRef.status, new: 'waiting_quote' },
        quote_amount: { old: null, new: totalAmount }
      }
    });
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  return { success: true }
}

// =====================================================
// APROBAR/RECHAZAR COTIZACIÓN
// =====================================================

export async function handleQuoteResponse(workOrderId: string, approved: boolean) {
  const supabase = await createClient()

  const { data: woRef } = await supabase
    .from('work_orders')
    .select('work_order_number, status')
    .eq('id', workOrderId)
    .single();

  const updateData: Record<string, unknown> = {
    quote_status: approved ? 'approved' : 'rejected',
    updated_at: new Date().toISOString(),
  }

  if (approved) {
    updateData.status = 'in_progress'
    updateData.quote_approved_at = new Date().toISOString()
    updateData.started_at = new Date().toISOString()
  } else {
    updateData.status = 'ready_to_ship'
  }

  const { error } = await supabase
    .from('work_orders')
    .update(updateData)
    .eq('id', workOrderId)

  if (error) {
    console.error('Error handling quote response:', error)
    return { success: false, error: error.message }
  }

  // Auditoría
  if (woRef) {
    const newStatus = approved ? 'in_progress' : 'ready_to_ship';

    await createAuditLog({
      action: 'STATUS_CHANGE',
      module: 'WORKSHOP',
      entityType: 'WORK_ORDER',
      entityId: workOrderId,
      entityReference: woRef.work_order_number,
      description: `OS #${woRef.work_order_number}: Cotización ${approved ? 'APROBADO' : 'RECHAZADA'} por cliente`,
      changes_summary: {
        status: { old: woRef.status, new: newStatus },
        quote_status: { old: 'pending', new: approved ? 'approved' : 'rejected' }
      }
    });
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  return { success: true }
}

// =====================================================
// MARCAR COMO IRREPARABLE
// =====================================================

interface IrreparableData {
  reason: string
  evidenceUrl?: string
}

export async function markAsIrreparable(workOrderId: string, data: IrreparableData) {
  const supabase = await createClient()

  const { data: woRef } = await supabase
    .from('work_orders')
    .select('work_order_number, status')
    .eq('id', workOrderId)
    .single();

  const { error } = await supabase
    .from('work_orders')
    .update({
      is_irreparable: true,
      irreparable_reason: data.reason,
      irreparable_marked_at: new Date().toISOString(),
      status: 'ready_to_ship',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)

  if (error) {
    console.error('Error marking as irreparable:', error)
    return { success: false, error: error.message }
  }

  // Auditoría
  if (woRef) {
    await createAuditLog({
      action: 'STATUS_CHANGE',
      module: 'WORKSHOP',
      entityType: 'WORK_ORDER',
      entityId: workOrderId,
      entityReference: woRef.work_order_number,
      description: `OS #${woRef.work_order_number}: Marcada como IRREPARABLE (${data.reason})`,
      changes_summary: {
        status: { old: woRef.status, new: 'ready_to_ship' },
        is_irreparable: { old: false, new: true }
      }
    });
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  return { success: true }
}

// =====================================================
// COMPLETAR REPARACIÓN
// =====================================================

export async function completeRepair(workOrderId: string, resolution: string) {
  const supabase = await createClient()

  const { data: woRef } = await supabase
    .from('work_orders')
    .select('work_order_number, status')
    .eq('id', workOrderId)
    .single();

  const { error } = await supabase
    .from('work_orders')
    .update({
      resolution,
      status: 'qc_pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)

  if (error) {
    console.error('Error completing repair:', error)
    return { success: false, error: error.message }
  }

  // Auditoría
  if (woRef) {
    await createAuditLog({
      action: 'STATUS_CHANGE',
      module: 'WORKSHOP',
      entityType: 'WORK_ORDER',
      entityId: workOrderId,
      entityReference: woRef.work_order_number,
      description: `OS #${woRef.work_order_number}: Reparación completada, pasa a QC`,
      changes_summary: {
        status: { old: woRef.status, new: 'qc_pending' }
      }
    });
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  return { success: true }
}

// =====================================================
// REGISTRAR SEEDSTOCK
// =====================================================

interface SeedstockData {
  originalImei: string
  newImei: string
  originalSerial: string
  newSerial: string
  notes?: string
}

export async function registerSeedstock(workOrderId: string, data: SeedstockData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('work_orders')
    .update({
      seedstock_exchange: true,
      original_imei: data.originalImei,
      new_imei: data.newImei,
      original_serial: data.originalSerial,
      new_serial: data.newSerial,
      seedstock_date: new Date().toISOString(),
      seedstock_notes: data.notes || null,
      status: 'qc_pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)

  if (error) {
    console.error('Error registering seedstock:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  return { success: true }
}

// =====================================================
// GUARDAR PRUEBAS MMI (QC)
// =====================================================

interface MMITestData {
  type: 'in' | 'out'
  tests: Record<string, boolean>
}

export async function saveMmiTest(workOrderId: string, data: MMITestData) {
  const supabase = await createClient()
  let qcApproved = false

  const { data: woRef } = await supabase
    .from('work_orders')
    .select('work_order_number, status')
    .eq('id', workOrderId)
    .single();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.type === 'in') {
    updateData.mmi_test_in = data.tests
  } else {
    updateData.mmi_test_out = data.tests
    const allPassed = Object.values(data.tests).every(v => v === true)
    updateData.qc_passed = allPassed
    updateData.qc_performed_at = new Date().toISOString()
    updateData.status = allPassed ? 'qc_passed' : 'qc_failed'
    qcApproved = allPassed
  }

  const { error } = await supabase
    .from('work_orders')
    .update(updateData)
    .eq('id', workOrderId)

  if (error) {
    console.error('Error saving MMI test:', error)
    return { success: false, error: error.message }
  }

  // Auditoría
  if (woRef) {
    if (data.type === 'out') {
      const newStatus = qcApproved ? 'qc_passed' : 'qc_failed';
      await createAuditLog({
        action: 'STATUS_CHANGE',
        module: 'WORKSHOP',
        entityType: 'WORK_ORDER',
        entityId: workOrderId,
        entityReference: woRef.work_order_number,
        description: `OS #${woRef.work_order_number}: QC Finalizado - ${qcApproved ? 'APROBADO' : 'FALLIDO'}`,
        changes_summary: {
          status: { old: woRef.status, new: newStatus },
          qc_passed: { old: null, new: qcApproved }
        }
      });
    }
    // Podríamos loguear también MMI IN como UPDATE si se requiere
  }

  if (qcApproved) {
    const { data: authData } = await supabase.auth.getUser()
    await moveAssetToRemarketing(supabase, workOrderId, authData?.user?.id ?? null)
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  if (qcApproved) {
    revalidatePath('/dashboard/inventario')
    revalidatePath('/dashboard/ventas')
  }
  return { success: true }
}

async function moveAssetToRemarketing(
  supabase: ServerSupabaseClient,
  workOrderId: string,
  performedBy: string | null,
  options?: RemarketingTransferOptions
) {
  try {
    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .select('asset_id')
      .eq('id', workOrderId)
      .single()

    if (workOrderError) {
      console.error('Error fetching work order for QC transfer:', workOrderError)
      return
    }

    const assetId = workOrder?.asset_id
    if (!assetId) {
      console.warn('Work order missing asset reference for QC transfer:', workOrderId)
      return
    }

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, current_warehouse_id, batch_id, internal_tag, serial_number, manufacturer, model, asset_type')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      console.error('Error fetching asset for QC transfer:', assetError)
      return
    }

    const { data: warehouseData, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('code', REMARKETING_WAREHOUSE_CODE)
      .single()

    if (warehouseError || !warehouseData?.id) {
      console.error('Remarketing warehouse lookup failed:', warehouseError)
      return
    }

    const destWarehouseId = warehouseData.id
    const shouldLogMovement = asset.current_warehouse_id !== destWarehouseId

    const { error: assetUpdateError } = await supabase
      .from('assets')
      .update({
        current_warehouse_id: destWarehouseId,
        status: QC_READY_STATUS,
        updated_at: new Date().toISOString(),
      })
      .eq('id', asset.id)

    if (assetUpdateError) {
      console.error('Error updating asset for Remarketing transfer:', assetUpdateError)
      return
    }

    if (!shouldLogMovement) {
      return
    }

    const descriptorParts: string[] = []
    if (asset.serial_number) {
      descriptorParts.push(`Serial: ${asset.serial_number}`)
    }
    const brandModel = [asset.manufacturer, asset.model].filter(Boolean).join(' ').trim()
    if (brandModel) {
      descriptorParts.push(brandModel)
    }
    if (asset.asset_type) {
      descriptorParts.push(asset.asset_type)
    }

    const noteSegments = [QC_REMARKETING_NOTE]
    if (descriptorParts.length > 0) {
      noteSegments.push(`Detalle: ${descriptorParts.join(' • ')}`)
    }
    if (options?.notes) {
      const trimmed = options.notes.trim()
      if (trimmed.length > 0) {
        noteSegments.push(`Notas QC: ${trimmed}`)
      }
    }
    noteSegments.push(`Orden: ${workOrderId}`)

    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        asset_id: asset.id,
        batch_id: asset.batch_id ?? null,
        movement_type: 'transfer',
        item_type: 'asset',
        item_id: asset.id,
        item_sku: asset.internal_tag || asset.serial_number || asset.id,
        quantity: 1,
        from_warehouse_id: asset.current_warehouse_id,
        to_warehouse_id: destWarehouseId,
        work_order_id: workOrderId,
        notes: noteSegments.join(' | '),
        performed_by: performedBy,
      })

    if (movementError) {
      console.error('Error logging Remarketing movement after QC:', movementError)
    }
  } catch (err) {
    console.error('Unexpected error moving asset to Remarketing:', err)
  }
}

export async function approveQcAndSendToRemarketing(workOrderId: string, options?: RemarketingTransferOptions) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const updatePayload: Record<string, unknown> = {
    status: 'qc_passed',
    qc_passed: true,
    qc_performed_at: new Date().toISOString(),
    qc_performed_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('work_orders')
    .update(updatePayload)
    .eq('id', workOrderId)

  if (error) {
    console.error('Error aprobando QC desde dashboard:', error)
    return { success: false, error: error.message }
  }

  // Save classifications to asset
  if (options?.classificationRec || options?.classificationF || options?.classificationC) {
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('asset_id')
      .eq('id', workOrderId)
      .single()

    if (workOrder?.asset_id) {
      const { data: asset } = await supabase
        .from('assets')
        .select('specifications')
        .eq('id', workOrder.asset_id)
        .single()

      if (asset) {
        const existingSpecs = asset.specifications && typeof asset.specifications === 'object'
          ? { ...(asset.specifications as Record<string, unknown>) }
          : {}

        // Get previous output classifications
        const outputClassificationsRaw = existingSpecs.output_classifications
        const previousOutputClassifications =
          outputClassificationsRaw && typeof outputClassificationsRaw === 'object'
            ? { ...(outputClassificationsRaw as Record<string, unknown>) }
            : {}

        const classificationUpdates: Record<string, string> = {}
        // Always save F and C classifications if provided, allowing updates
        if (options?.classificationF !== undefined) classificationUpdates.f = options.classificationF
        if (options?.classificationC !== undefined) classificationUpdates.c = options.classificationC
        // REC is optional and only saved if provided
        if (options?.classificationRec) classificationUpdates.rec = options.classificationRec

        const updatedOutputClassifications = {
          ...previousOutputClassifications,
          ...classificationUpdates
        }

        const updatedSpecs = {
          ...existingSpecs,
          output_classifications: updatedOutputClassifications,
        }

        const { error: assetUpdateError } = await supabase
          .from('assets')
          .update({ specifications: updatedSpecs })
          .eq('id', workOrder.asset_id)

        if (assetUpdateError) {
          console.error('Error actualizando clasificaciones del activo:', assetUpdateError)
        }
      }
    }
  }

  await moveAssetToRemarketing(supabase, workOrderId, user?.id ?? null, options)

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  revalidatePath('/dashboard/inventario')
  revalidatePath('/dashboard/ventas')

  return { success: true }
}

// =====================================================
// FINALIZAR ORDEN DE TRABAJO
// =====================================================

export async function finalizeWorkOrder(workOrderId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('work_orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)

  if (error) {
    console.error('Error finalizing work order:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  return { success: true }
}

// =====================================================
// SOLICITAR PIEZA
// =====================================================

interface RequestPartData {
  partSku: string
  partName: string
  quantity: number
  notes?: string
}

export async function requestPart(workOrderId: string, data: RequestPartData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  if (!data.partSku.trim()) {
    return { success: false, error: 'El SKU de la pieza es requerido' }
  }

  const { data: partRequest, error } = await supabase
    .from('part_requests')
    .insert({
      work_order_id: workOrderId,
      requested_by: user.id,
      part_sku: data.partSku,
      part_name: data.partName || null,
      quantity: data.quantity || 1,
      status: 'pending',
      notes: data.notes || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating part request:', error)
    return { success: false, error: error.message }
  }

  const { error: woError } = await supabase
    .from('work_orders')
    .update({
      status: 'waiting_parts',
      updated_at: new Date().toISOString()
    })
    .eq('id', workOrderId)

  if (woError) {
    console.error('Error updating work order:', woError)
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  revalidatePath('/dashboard/inventario/solicitudes')

  return { success: true, data: partRequest }
}

// =====================================================
// SOLICITAR MÚLTIPLES PIEZAS (BULK)
// =====================================================

interface RequestPartsBulkItem {
  partSku: string
  partName: string
  quantity: number
}

export async function requestPartsBulk(
  workOrderId: string,
  items: RequestPartsBulkItem[],
  options?: { notes?: string }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  const cleaned = (items || [])
    .map((it) => ({
      partSku: it.partSku?.trim() || '',
      partName: (it.partName || it.partSku || '').trim(),
      quantity: Math.max(1, Number(it.quantity || 1))
    }))
    .filter((it) => it.partSku.length > 0)

  if (cleaned.length === 0) {
    return { success: false, error: 'Agrega al menos una pieza a la solicitud' }
  }

  const now = new Date().toISOString()
  const payload = cleaned.map((it) => ({
    work_order_id: workOrderId,
    requested_by: user.id,
    part_sku: it.partSku,
    part_name: it.partName || null,
    quantity: it.quantity,
    status: 'pending',
    notes: options?.notes || null,
    created_at: now
  }))

  const { error } = await supabase
    .from('part_requests')
    .insert(payload)

  if (error) {
    console.error('Error creating bulk part requests:', error)
    return { success: false, error: error.message }
  }

  const { error: woError } = await supabase
    .from('work_orders')
    .update({
      status: 'waiting_parts',
      updated_at: now
    })
    .eq('id', workOrderId)

  if (woError) {
    console.error('Error updating work order:', woError)
    // No bloquear: ya se crearon solicitudes
  }

  revalidatePath(`/dashboard/taller/${workOrderId}`)
  revalidatePath('/dashboard/taller')
  revalidatePath('/dashboard/inventario/solicitudes')
  revalidatePath('/dashboard/inventario/despacho')

  return { success: true }
}

// =====================================================
// OBTENER SOLICITUDES DE UNA ORDEN
// =====================================================

export async function getPartRequestsForOrder(workOrderId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('part_requests')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching part requests:', error)
    return { data: [], error: error.message }
  }

  return { data, error: null }
}

// =====================================================
// BUSCAR PIEZAS EN CATÁLOGO
// =====================================================

export async function searchParts(query: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parts_catalog')
    .select('id, sku, name, category, stock_quantity, location')
    .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(10)

  if (error) {
    console.error('Error searching parts:', error)
    return { data: [], error: error.message }
  }

  return { data, error: null }
}

// =====================================================
// PICKER DE BODEGA (CATÁLOGOS + PIEZAS FILTRADAS)
// =====================================================

export type PartsCatalogFilters = {
  brands: Array<{ id: string; name: string }>
  models: Array<{ id: string; name: string; brand_id: string | null; product_type_id: string | null }>
  productTypes: Array<{ id: string; name: string }>
}

export async function getPartsCatalogFilters(): Promise<{ data: PartsCatalogFilters; error: string | null }> {
  const supabase = await createClient()

  const [brandsRes, modelsRes, productTypesRes] = await Promise.all([
    supabase.from('catalog_brands').select('id, name').order('name'),
    supabase.from('catalog_models').select('id, name, brand_id, product_type_id').order('name'),
    supabase.from('catalog_product_types').select('id, name').order('name')
  ])

  const error = brandsRes.error || modelsRes.error || productTypesRes.error
  if (error) {
    console.error('Error fetching parts catalog filters:', error)
    return {
      data: { brands: [], models: [], productTypes: [] },
      error: error.message
    }
  }

  return {
    data: {
      brands: (brandsRes.data || []) as Array<{ id: string; name: string }>,
      models: (modelsRes.data || []) as Array<{ id: string; name: string; brand_id: string | null; product_type_id: string | null }>,
      productTypes: (productTypesRes.data || []) as Array<{ id: string; name: string }>
    },
    error: null
  }
}

export type WarehousePickerSource = 'good' | 'harvest'

export type GoodWarehousePickerPart = {
  id: string
  sku: string
  name: string
  category: string
  stock_quantity: number
  location: string | null
}

export type HarvestWarehousePickerPart = {
  sku: string
  part_name: string | null
  total_quantity: number
  condition_summary: string
  latest_received_at: string | null
  received_from: string | null
  disposition: string | null
  notes: string | null
}

type BadWarehouseRow = {
  sku: string
  part_name: string | null
  condition: string | null
  quantity: number | null
  received_from: string | null
  disposition: string | null
  date_received: string | null
  notes: string | null
}

export async function getWarehousePartsForPicker(params: {
  source: WarehousePickerSource
  query?: string
  brand?: string
  model?: string
  productType?: string
  limit?: number
}): Promise<{ data: GoodWarehousePickerPart[] | HarvestWarehousePickerPart[]; error: string | null }> {
  const supabase = await createClient()
  const limit = Math.min(Math.max(params.limit ?? 30, 5), 100)
  const q = params.query?.trim() || ''
  const brand = params.brand?.trim() || ''
  const model = params.model?.trim() || ''
  const productType = params.productType?.trim() || ''

  if (params.source === 'good') {
    let query = supabase
      .from('parts_catalog')
      .select('id, sku, name, category, stock_quantity, location')

    if (productType) {
      query = query.ilike('category', `%${productType}%`)
    }
    if (brand) {
      query = query.ilike('name', `%${brand}%`)
    }
    if (model) {
      query = query.ilike('name', `%${model}%`)
    }
    if (q) {
      query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%`)
    }

    const { data, error } = await query.limit(limit)
    if (error) {
      console.error('Error fetching good warehouse picker parts:', error)
      return { data: [], error: error.message }
    }

    const normalized = (data || []).map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      stock_quantity: row.stock_quantity ?? 0,
      location: row.location ?? null
    })) as GoodWarehousePickerPart[]

    return { data: normalized, error: null }
  }

  // harvest (bad_warehouse_inventory)
  const { data, error } = await supabase
    .from('bad_warehouse_inventory')
    .select('sku, part_name, condition, quantity, received_from, disposition, date_received, notes')
    .order('date_received', { ascending: false })
    .limit(300)

  if (error) {
    console.error('Error fetching harvest warehouse picker parts:', error)
    return { data: [], error: error.message }
  }

  const filtered = ((data || []) as BadWarehouseRow[]).filter((row) => {
    if (!row.sku) return false
    const name = (row.part_name || '').toLowerCase()
    const sku = row.sku.toLowerCase()
    const notes = (row.notes || '').toLowerCase()
    const disp = (row.disposition || '').toLowerCase()

    const qOk = !q || sku.includes(q.toLowerCase()) || name.includes(q.toLowerCase())
    const brandOk = !brand || name.includes(brand.toLowerCase()) || notes.includes(brand.toLowerCase())
    const modelOk = !model || name.includes(model.toLowerCase()) || notes.includes(model.toLowerCase())
    const typeOk = !productType || name.includes(productType.toLowerCase()) || notes.includes(productType.toLowerCase()) || disp.includes(productType.toLowerCase())

    return qOk && brandOk && modelOk && typeOk
  })

  const grouped = new Map<string, {
    sku: string
    part_name: string | null
    total_quantity: number
    conditions: Set<string>
    latest_received_at: string | null
    received_from: string | null
    disposition: string | null
    notes: string | null
  }>()

  filtered.forEach((row) => {
    const quantity = Number(row.quantity ?? 0)
    const existing = grouped.get(row.sku)
    if (!existing) {
      grouped.set(row.sku, {
        sku: row.sku,
        part_name: row.part_name,
        total_quantity: quantity,
        conditions: new Set(row.condition ? [row.condition] : []),
        latest_received_at: row.date_received,
        received_from: row.received_from,
        disposition: row.disposition,
        notes: row.notes
      })
      return
    }

    existing.total_quantity += quantity
    if (row.condition) existing.conditions.add(row.condition)
    if (row.date_received) {
      const current = existing.latest_received_at ? new Date(existing.latest_received_at) : null
      const candidate = new Date(row.date_received)
      if (!current || candidate.getTime() > current.getTime()) {
        existing.latest_received_at = row.date_received
      }
    }
    if (!existing.received_from && row.received_from) existing.received_from = row.received_from
    if (!existing.disposition && row.disposition) existing.disposition = row.disposition
    if (row.notes) existing.notes = row.notes
  })

  const normalized = Array.from(grouped.values())
    .map((entry) => ({
      sku: entry.sku,
      part_name: entry.part_name,
      total_quantity: entry.total_quantity,
      condition_summary: Array.from(entry.conditions).filter(Boolean).join(', ') || 'Harvested',
      latest_received_at: entry.latest_received_at,
      received_from: entry.received_from,
      disposition: entry.disposition,
      notes: entry.notes
    }))
    .slice(0, limit) as HarvestWarehousePickerPart[]

  return { data: normalized, error: null }
}