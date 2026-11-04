'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const RECEIVING_WAREHOUSE_CODE = 'BOD-REC'
const REPAIR_WAREHOUSE_CODE = 'BOD-REP'

// Tipos
export type AssetStatus = 'pending_reception' | 'received' | 'diagnosing' | 'wiping' | 'wiped' | 'ready_for_sale' | 'sold' | 'scrapped'

export type WipeSoftware = 'blancco' | 'killdisk' | 'wipedrive' | 'physical_destruction' | 'other'

export type WipeResult = 'success' | 'failed' | 'partial'

export interface WipeAsset {
  id: string
  internal_tag: string
  serial_number: string | null
  asset_type: string
  manufacturer: string | null
  model: string | null
  status: AssetStatus
  batch_id: string
  batch_code: string
  client_name: string
  wipe_started_at: string | null
  wipe_completed_at: string | null
  wipe_certificate_id: string | null
  wipe_software: string | null
  created_at: string
  photoEvidenceCount: number
  xmlEvidenceCount: number
  pdfEvidenceCount: number
}

/** Snapshot de reporte de borrado (Blancco / WipeDrive) para el certificado. */
export interface WipeReportSnapshot {
  make?: string | null
  model?: string | null
  serialNumber?: string | null
  customerAssetTag?: string | null
  mainBoardPart?: string | null
  ramCapacityGb?: string | null
  ramType?: string | null
  cpu?: string | null
  hddCount?: number | null
  ssd?: string | null
  screenSize?: string | null
  powerOnOverHeat?: string | null
  battery?: string | null
  screen?: string | null
  keyboard?: string | null
  testDate?: string | null
  technicianName?: string | null
  comments?: string | null
  errors?: string[]
  processedTime?: string | null
  software?: string | null
  customerName?: string | null
  reportUuid?: string | null
  disks?: Array<{
    index: number
    vendor: string | null
    model: string | null
    serial: string | null
    size: string | null
    bus: string | null
    wipeStatus: string | null
    destruction: string | null
    method: string | null
    startEnd: string | null
    duration: string | null
    health: string | null
  }>
}

export interface WipedAssetForCertificate {
  id: string
  internal_tag: string
  serial_number: string | null
  asset_type: string
  manufacturer: string | null
  model: string | null
  wipe_certificate_id: string | null
  wipe_software: string | null
  wipe_completed_at: string | null
  wipe_notes: string | null
  client_name: string
  wipe_report: WipeReportSnapshot | null
}

export type WipeEvidenceType = 'photo' | 'xml' | 'pdf'

export interface WipeEvidenceRecord {
  id: string
  asset_id: string
  type: WipeEvidenceType
  file_name: string
  file_url: string
  content_type: string | null
  file_size: number | null
  uploaded_by: string | null
  uploaded_at: string
}

// Obtener activos pendientes de borrado (received o wiping)
export async function getPendingWipeAssets(): Promise<{ data: WipeAsset[] | null; error: string | null }> {
  const supabase = await createClient()

  try {
    const { data: workOrders, error: workOrdersError } = await supabase
      .from('work_orders')
      .select(`
        asset:assets(
          id,
          internal_tag,
          serial_number,
          asset_type,
          manufacturer,
          model,
          status,
          batch_id,
          wipe_started_at,
          wipe_completed_at,
          wipe_certificate_id,
          wipe_software,
          created_at,
          batches (
            internal_batch_id,
            ticket_id
          )
        )
      `)
      .eq('status', 'data_wipe')
      .order('created_at', { ascending: true })

    if (workOrdersError) {
      console.error('Error fetching pending wipe assets from work orders:', workOrdersError)
      return { data: null, error: workOrdersError.message }
    }

    const assetRows = (workOrders || [])
      .map((workOrder: any) => workOrder.asset)
      .filter(Boolean) as Array<Record<string, any>>
    const pendingAssetRows = assetRows.filter((asset) => ['received', 'wiping'].includes(asset.status))
    if (pendingAssetRows.length === 0) {
      return { data: [], error: null }
    }

    const ticketIds = Array.from(new Set(pendingAssetRows.map((a) => a.batches?.ticket_id).filter(Boolean)))

    const wipeAssetIds = pendingAssetRows.map((asset: any) => asset.id).filter(Boolean)
    const evidenceCounts: Record<string, { photo: number; xml: number; pdf: number }> = {}
    if (wipeAssetIds.length > 0) {
      const { data: evidenceRows, error: evidenceError } = await supabase
        .from('asset_wipe_evidence')
        .select('asset_id, type')
        .in('asset_id', wipeAssetIds)

      if (evidenceError) {
        console.error('Error fetching wipe evidence counts:', evidenceError)
      } else {
        evidenceRows?.forEach((row: any) => {
          if (!row?.asset_id || !row?.type) return
          const current = evidenceCounts[row.asset_id] || { photo: 0, xml: 0, pdf: 0 }
          if (row.type === 'photo') {
            current.photo += 1
          } else if (row.type === 'xml') {
            current.xml += 1
          } else if (row.type === 'pdf') {
            current.pdf += 1
          }
          evidenceCounts[row.asset_id] = current
        })
      }
    }

    // Consulta para obtener los nombres de clientes
    let clientNames: Record<string, string> = {}

    if (ticketIds.length > 0) {
      const { data: tickets } = await supabase
        .from('operations_tickets')
        .select(`
          id,
          crm_entities (
            name
          )
        `)
        .in('id', ticketIds)

      if (tickets) {
        tickets.forEach((t: any) => {
          clientNames[t.id] = t.crm_entities?.name || 'N/A'
        })
      }
    }

    // Transformar datos para la UI
    const transformedData: WipeAsset[] = assetRows.map((asset: any) => ({
      id: asset.id,
      internal_tag: asset.internal_tag,
      serial_number: asset.serial_number,
      asset_type: asset.asset_type,
      manufacturer: asset.manufacturer,
      model: asset.model,
      status: asset.status,
      batch_id: asset.batch_id,
      batch_code: asset.batches?.internal_batch_id || 'N/A',
      client_name: clientNames[asset.batches?.ticket_id] || 'N/A',
      wipe_started_at: asset.wipe_started_at,
      wipe_completed_at: asset.wipe_completed_at,
      wipe_certificate_id: asset.wipe_certificate_id,
      wipe_software: asset.wipe_software,
      created_at: asset.created_at,
      photoEvidenceCount: evidenceCounts[asset.id]?.photo || 0,
      xmlEvidenceCount: evidenceCounts[asset.id]?.xml || 0,
      pdfEvidenceCount: evidenceCounts[asset.id]?.pdf || 0,
    }))

    return { data: transformedData, error: null }
  } catch (err) {
    console.error('Unexpected error in getPendingWipeAssets:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}

// Buscar activo por serial o tag
export async function searchAssetBySerial(query: string): Promise<{ data: WipeAsset | null; error: string | null }> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        id,
        internal_tag,
        serial_number,
        asset_type,
        manufacturer,
        model,
        status,
        batch_id,
        wipe_started_at,
        wipe_completed_at,
        wipe_certificate_id,
        wipe_software,
        created_at,
        batches (
          internal_batch_id,
          ticket_id
        )
      `)
      .or(`serial_number.ilike.%${query}%,internal_tag.ilike.%${query}%`)
      .in('status', ['received', 'wiping'])
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'No se encontró ningún activo con ese serial/tag pendiente de borrado' }
      }
      console.error('Error searching asset:', error)
      return { data: null, error: error.message }
    }

    // Obtener nombre del cliente si hay ticket
    let clientName = 'N/A'
    const ticketId = (data.batches as any)?.ticket_id

    if (ticketId) {
      const { data: ticket } = await supabase
        .from('operations_tickets')
        .select('crm_entities(name)')
        .eq('id', ticketId)
        .single()

      clientName = (ticket?.crm_entities as any)?.name || 'N/A'
    }

    const evidenceResult = await supabase
      .from('asset_wipe_evidence')
      .select('type')
      .eq('asset_id', data.id)

    const evidenceCounts = { photo: 0, xml: 0, pdf: 0 }
    evidenceResult.data?.forEach((row: any) => {
      if (!row?.type) return
      if (row.type === 'photo') evidenceCounts.photo += 1
      if (row.type === 'xml') evidenceCounts.xml += 1
      if (row.type === 'pdf') evidenceCounts.pdf += 1
    })

    const transformedData: WipeAsset = {
      id: data.id,
      internal_tag: data.internal_tag,
      serial_number: data.serial_number,
      asset_type: data.asset_type,
      manufacturer: data.manufacturer,
      model: data.model,
      status: data.status as AssetStatus,
      batch_id: data.batch_id,
      batch_code: (data.batches as any)?.internal_batch_id || 'N/A',
      client_name: clientName,
      wipe_started_at: data.wipe_started_at,
      wipe_completed_at: data.wipe_completed_at,
      wipe_certificate_id: data.wipe_certificate_id,
      wipe_software: data.wipe_software,
      created_at: data.created_at,
      photoEvidenceCount: evidenceCounts.photo,
      xmlEvidenceCount: evidenceCounts.xml,
      pdfEvidenceCount: evidenceCounts.pdf,
    }

    return { data: transformedData, error: null }
  } catch (err) {
    console.error('Unexpected error in searchAssetBySerial:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}

// Iniciar proceso de borrado
export async function startWipeProcess(assetId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('id, status, internal_tag, batch_id, current_warehouse_id')
      .eq('id', assetId)
      .single()

    if (fetchError || !asset) {
      return { success: false, error: 'Activo no encontrado' }
    }

    if (asset.status !== 'received') {
      return { success: false, error: `El activo no está en estado "received". Estado actual: ${asset.status}` }
    }

    const { data: warehouses, error: warehousesError } = await supabase
      .from('warehouses')
      .select('id, code')
      .in('code', [RECEIVING_WAREHOUSE_CODE, REPAIR_WAREHOUSE_CODE])

    if (warehousesError) {
      console.error('Error fetching warehouses para traslado de borrado:', warehousesError)
    }

    const warehousesMap: Record<string, string> = {}
    warehouses?.forEach((warehouse) => {
      if (warehouse?.code && warehouse?.id) {
        warehousesMap[warehouse.code] = warehouse.id
      }
    })

    const repairWarehouseId = warehousesMap[REPAIR_WAREHOUSE_CODE]
    const receivingWarehouseId = warehousesMap[RECEIVING_WAREHOUSE_CODE]
    const fromWarehouseId = asset.current_warehouse_id || receivingWarehouseId || null

    const updates: Record<string, unknown> = {
      status: 'wiping',
      wipe_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (repairWarehouseId) {
      updates.current_warehouse_id = repairWarehouseId
    }

    const { error: updateError } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', assetId)

    if (updateError) {
      console.error('Error starting wipe:', updateError)
      return { success: false, error: updateError.message }
    }

    if (repairWarehouseId) {
      const movementPayload = {
        asset_id: asset.id,
        batch_id: asset.batch_id ?? null,
        movement_type: 'transfer',
        item_type: 'asset',
        item_id: asset.id,
        item_sku: asset.internal_tag || asset.id,
        quantity: 1,
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: repairWarehouseId,
        notes: 'Transferido a Reparación para Borrado de Datos',
        performed_by: user?.id ?? null,
      }

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert(movementPayload)

      if (movementError) {
        console.error('Error registrando movimiento de almacén al iniciar borrado:', movementError)
      }
    }

    // TODO: Registrar en audit_logs cuando la tabla esté configurada correctamente
    // Por ahora, solo logueamos a consola
    console.log('AUDIT: WIPE_STARTED', {
      asset_id: assetId,
      internal_tag: asset.internal_tag,
      performed_by: user?.id,
      timestamp: new Date().toISOString()
    })

    revalidatePath('/dashboard/borrado')
    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error in startWipeProcess:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}

// Certificar activo - Completar proceso de borrado
export async function certifyAsset(
  assetId: string,
  software: WipeSoftware,
  result: WipeResult = 'success',
  notes?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('id, status, internal_tag, serial_number, manufacturer, model')
      .eq('id', assetId)
      .single()

    if (fetchError || !asset) {
      return { success: false, error: 'Activo no encontrado' }
    }

    // Permitir certificar desde estados operativos de lab / recepción / taller
    const certifiable = ['received', 'wiping', 'data_wipe', 'in_repair', 'diagnosing', 'wiped']
    if (!certifiable.includes(asset.status)) {
      return { success: false, error: `El activo no puede ser certificado. Estado actual: ${asset.status}` }
    }

    const serialPart = (asset.serial_number || asset.internal_tag || assetId.slice(0, 8))
      .toString()
      .replace(/\s+/g, '')
      .toUpperCase()
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const certificateId = `WIPE-${serialPart}-${stamp}`

    if (result === 'failed') {
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          status: 'received',
          wipe_completed_at: new Date().toISOString(),
          wipe_certificate_id: certificateId,
          wipe_software: software,
          wipe_result: result,
          wipe_notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    } else {
      const { moveAssetToValorizacion } = await import('@/lib/wipe/moveToValorizacion')
      const moved = await moveAssetToValorizacion(supabase, assetId, {
        wipeSoftware: software,
        wipeResult: result,
        wipeNotes: notes?.trim() || null,
        wipeCertificateId: certificateId,
        performedBy: user?.id || null,
      })
      if (!moved.ok) {
        return { success: false, error: moved.error || 'No se pudo mover a Valorización' }
      }
      console.log('[certifyAsset] Movido a BOD-VAL:', moved.warehouseId)
    }

    revalidatePath('/dashboard/borrado')
    revalidatePath('/dashboard/inventario/bodega')
    revalidatePath('/dashboard/borrado/evidencias')
    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error in certifyAsset:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}

// Obtener activos borrados (para certificado)
export async function getWipedAssets(dateFrom?: string): Promise<{ data: WipedAssetForCertificate[] | null; error: string | null }> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('assets')
      .select(`
        id,
        internal_tag,
        serial_number,
        asset_type,
        manufacturer,
        model,
        wipe_certificate_id,
        wipe_software,
        wipe_completed_at,
        wipe_notes,
        specifications,
        batches (
          ticket_id
        )
      `)
      .eq('status', 'wiped')
      .order('wipe_completed_at', { ascending: false })

    if (dateFrom) {
      query = query.gte('wipe_completed_at', dateFrom)
    }

    const { data: assets, error } = await query.limit(100)

    if (error) {
      console.error('Error fetching wiped assets:', error)
      return { data: null, error: error.message }
    }

    if (!assets || assets.length === 0) {
      return { data: [], error: null }
    }

    const assetIds = assets.map((a: { id: string }) => a.id)
    const evidenceByAsset: Record<string, WipeReportSnapshot> = {}
    if (assetIds.length > 0) {
      const { data: evidenceRows } = await supabase
        .from('asset_wipe_evidence')
        .select('asset_id, parsed_json, type, created_at')
        .in('asset_id', assetIds)
        .eq('type', 'pdf')
        .order('created_at', { ascending: false })

      for (const row of evidenceRows || []) {
        const aid = (row as { asset_id: string }).asset_id
        if (evidenceByAsset[aid]) continue
        const parsed = (row as { parsed_json?: WipeReportSnapshot | null }).parsed_json
        if (parsed && typeof parsed === 'object') {
          evidenceByAsset[aid] = parsed
        }
      }
    }

    // Obtener nombres de clientes
    const ticketIds = Array.from(new Set(assets.map((a: any) => a.batches?.ticket_id).filter(Boolean)))
    let clientNames: Record<string, string> = {}

    if (ticketIds.length > 0) {
      const { data: tickets } = await supabase
        .from('operations_tickets')
        .select('id, crm_entities(name)')
        .in('id', ticketIds)

      if (tickets) {
        tickets.forEach((t: any) => {
          clientNames[t.id] = t.crm_entities?.name || 'N/A'
        })
      }
    }

    const transformedData: WipedAssetForCertificate[] = assets.map((asset: any) => {
      const specs = asset.specifications && typeof asset.specifications === 'object'
        ? asset.specifications
        : null
      const fromSpecs = (specs?.wipe_report && typeof specs.wipe_report === 'object'
        ? specs.wipe_report
        : null) as WipeReportSnapshot | null
      const wipe_report = fromSpecs || evidenceByAsset[asset.id] || null

      return {
        id: asset.id,
        internal_tag: asset.internal_tag,
        serial_number: asset.serial_number,
        asset_type: asset.asset_type,
        manufacturer: asset.manufacturer,
        model: asset.model,
        wipe_certificate_id: asset.wipe_certificate_id,
        wipe_software: asset.wipe_software,
        wipe_completed_at: asset.wipe_completed_at,
        wipe_notes: asset.wipe_notes || null,
        client_name: clientNames[asset.batches?.ticket_id] || wipe_report?.customerName || 'N/A',
        wipe_report,
      }
    })

    return { data: transformedData, error: null }
  } catch (err) {
    console.error('Unexpected error in getWipedAssets:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}

export async function uploadWipeEvidence({
  assetId,
  type,
  file
}: {
  assetId: string
  type: WipeEvidenceType
  file: File
}): Promise<{ success: boolean; error: string | null; data?: WipeEvidenceRecord }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const normalizedType = type.toLowerCase()
  if (!['photo', 'xml', 'pdf'].includes(normalizedType)) {
    return { success: false, error: 'Tipo de evidencia no permitido' }
  }

  if (normalizedType === 'photo' && !file.type.startsWith('image/')) {
    return { success: false, error: 'Sube una imagen válida para el respaldo fotográfico' }
  }
  if (normalizedType === 'xml' && !file.name.toLowerCase().endsWith('.xml') && !['text/xml', 'application/xml'].includes(file.type)) {
    return { success: false, error: 'El archivo XML debe tener extensión .xml' }
  }
  if (normalizedType === 'pdf' && !file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return { success: false, error: 'El archivo PDF debe tener extensión .pdf' }
  }

  const maxPhotoSize = 6 * 1024 * 1024
  const maxXmlSize = 2 * 1024 * 1024
  const maxPdfSize = 10 * 1024 * 1024
  if (normalizedType === 'photo' && file.size > maxPhotoSize) {
    return { success: false, error: 'Cada foto no debe exceder 6 MB' }
  }
  if (normalizedType === 'xml' && file.size > maxXmlSize) {
    return { success: false, error: 'El XML no debe exceder 2 MB' }
  }
  if (normalizedType === 'pdf' && file.size > maxPdfSize) {
    return { success: false, error: 'El PDF no debe exceder 10 MB' }
  }

  const bucket = 'wipe-evidence'
  const timestamp = Date.now()
  const randomToken = Math.random().toString(36).slice(2, 8)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${assetId}/${normalizedType}/${timestamp}-${randomToken}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    })

  if (uploadError) {
    console.error('Error uploading wipe evidence:', uploadError)
    return { success: false, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  if (!urlData?.publicUrl) {
    return { success: false, error: 'No se pudo generar la URL pública del archivo' }
  }

  const { data: insertedRecord, error: insertError } = await supabase
    .from('asset_wipe_evidence')
    .insert({
      asset_id: assetId,
      type: normalizedType as WipeEvidenceType,
      file_name: file.name,
      file_url: urlData.publicUrl,
      content_type: file.type || null,
      file_size: file.size,
      uploaded_by: user?.id || null
    })
    .select('*')
    .single()

  if (insertError) {
    console.error('Error saving wipe evidence metadata:', insertError)
    return { success: false, error: insertError.message }
  }

  revalidatePath('/dashboard/borrado')
  return { success: true, error: null, data: insertedRecord as WipeEvidenceRecord }
}

// Obtener detalles de series por estado
export async function getWipeStatusDetails(): Promise<{
  pending: Array<{ id: string; internal_tag: string; serial_number: string | null }>
  inProgress: Array<{ id: string; internal_tag: string; serial_number: string | null }>
  completedToday: Array<{ id: string; internal_tag: string; serial_number: string | null }>
  failedToday: Array<{ id: string; internal_tag: string; serial_number: string | null }>
}> {
  const supabase = await createClient()

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [pendingRes, inProgressRes, completedRes] = await Promise.all([
      supabase
        .from('assets')
        .select('id, internal_tag, serial_number')
        .eq('status', 'received'),
      supabase
        .from('assets')
        .select('id, internal_tag, serial_number')
        .eq('status', 'wiping'),
      supabase
        .from('assets')
        .select('id, internal_tag, serial_number')
        .eq('status', 'wiped')
        .gte('wipe_completed_at', today.toISOString()),
    ])

    return {
      pending: pendingRes.data || [],
      inProgress: inProgressRes.data || [],
      completedToday: completedRes.data || [],
      failedToday: [],
    }
  } catch (err) {
    console.error('Error getting wipe status details:', err)
    return { pending: [], inProgress: [], completedToday: [], failedToday: [] }
  }
}

// Obtener estadísticas
export async function getWipeStats(): Promise<{
  pending: number
  inProgress: number
  completedToday: number
  failedToday: number
}> {
  const supabase = await createClient()

  try {
    const { count: pending } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'received')

    const { count: inProgress } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'wiping')

    // Completados hoy
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: completedToday } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'wiped')
      .gte('wipe_completed_at', today.toISOString())

    // Fallidos hoy - por ahora siempre 0 hasta que tengamos audit_logs configurado
    const failedToday = 0

    return {
      pending: pending || 0,
      inProgress: inProgress || 0,
      completedToday: completedToday || 0,
      failedToday: failedToday,
    }
  } catch (err) {
    console.error('Error getting wipe stats:', err)
    return { pending: 0, inProgress: 0, completedToday: 0, failedToday: 0 }
  }
}
