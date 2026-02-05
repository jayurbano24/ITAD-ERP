'use server'

import { read, utils } from 'xlsx'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TicketItem } from '@/lib/supabase/types'
import { logTicketHistory } from './history'
import { createAuditLog } from '@/lib/audit'

export type TicketStatus =
  | 'draft'
  | 'open'
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled'
export type TicketType = 'recoleccion' | 'garantia' | 'auditoria' | 'destruccion' | 'reciclaje' | 'itad' | 'mantenimiento' | 'reparacion' | 'instalacion' | 'data_wipe'

export interface OperationsTicket {
  id: string
  readable_id: string
  client_id: string
  status: TicketStatus
  title: string
  description: string | null
  ticket_type: TicketType
  expected_units: number
  received_units: number
  pickup_address: string | null
  pickup_date: string | null
  priority: number
  assigned_to: string | null
  notes: string | null
  attachment_url: string | null  // URL del archivo Excel adjunto
  attachment_name: string | null // Nombre original del archivo
  created_by: string | null
  created_by_user?: {
    id: string
    full_name: string | null
  } | null
  created_at: string
  updated_at: string
  completed_at: string | null
  ticket_items?: TicketItem[]
  // Joined data
  client?: {
    id: string
    commercial_name: string
    tax_id_nit: string
  }
}

export interface CreateTicketData {
  client_id: string
  ticket_type: TicketType
  title: string
  description?: string
  expected_units?: number
  pickup_address?: string
  pickup_date?: string
  priority?: number
  notes?: string
}

type ManifestRow = {
  brand: string | null
  model: string | null
  color: string | null
  product_type: string | null
  expected_serial: string | null
}

const manifestColumns: Record<keyof ManifestRow, string[]> = {
  brand: ['brand', 'marca', 'marca_equipo'],
  model: ['model', 'modelo'],
  color: ['color', 'colores'],
  product_type: ['product_type', 'tipo_producto', 'producto', 'tipo'],
  expected_serial: ['expected_serial', 'serie_esperada', 'serie', 'serial', 'serial_number']
}

const normalizeHeader = (header: string) => header.replace(/[_\s-]/g, '').toLowerCase()

const normalizedManifestColumns: Record<keyof ManifestRow, string[]> = Object.fromEntries(
  Object.entries(manifestColumns).map(([key, values]) => [
    key,
    values.map(normalizeHeader)
  ])
) as Record<keyof ManifestRow, string[]>

const extractManifestValue = (row: Record<string, unknown>, candidates: string[]) => {
  for (const key of Object.keys(row)) {
    if (!key) continue
    const normalizedKey = normalizeHeader(key)
    if (candidates.some(candidate => candidate === normalizedKey)) {
      const value = row[key]
      if (value === null || value === undefined) continue
      const textValue = String(value).trim()
      if (textValue.length === 0) continue
      return textValue
    }
  }
  return null
}

async function parseManifestItems(file: File): Promise<ManifestRow[]> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return []

    const worksheet = workbook.Sheets[sheetName]
    const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      blankrows: false
    })

    return rows.map(row => {
      const mapped: ManifestRow = {
        brand: extractManifestValue(row, normalizedManifestColumns.brand),
        model: extractManifestValue(row, normalizedManifestColumns.model),
        color: extractManifestValue(row, normalizedManifestColumns.color),
        product_type: extractManifestValue(row, normalizedManifestColumns.product_type),
        expected_serial: extractManifestValue(row, normalizedManifestColumns.expected_serial),
      }
      return mapped
    }).filter(item => Object.values(item).some(Boolean))
  } catch (err) {
    console.error('Error parsing manifest Excel:', err)
    return []
  }
}

/**
 * Obtiene todos los tickets con información del cliente
 */
export async function getTickets(): Promise<{ data: OperationsTicket[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operations_tickets')
    .select(`
      *,
      created_by_user:profiles!operations_tickets_created_by_fkey (
        id,
        full_name
      ),
      client:crm_entities!client_id (
        id,
        commercial_name,
        tax_id_nit
      ),
      ticket_items (
        id,
        brand,
        model,
        color,
        product_type,
        expected_serial,
        collected_serial,
        validation_status,
        expected_quantity,
        received_quantity,
        status,
        brand_id,
        model_id,
        product_type_id,
        catalog_brand:catalog_brands!brand_id (
          id,
          name
        ),
        catalog_model:catalog_models!model_id (
          id,
          name
        ),
        catalog_product_type:catalog_product_types!product_type_id (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    return { data: null, error: error.message }
  }

  return { data: data as OperationsTicket[], error: null }
}

/**
 * Obtiene un ticket por ID
 */
export async function getTicketById(id: string): Promise<{ data: OperationsTicket | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operations_tickets')
    .select(`
      *,
      client:crm_entities!client_id (
        id,
        commercial_name,
        tax_id_nit
      )
      ,
      ticket_items (
        id,
        brand,
        model,
        color,
        product_type,
        expected_serial,
        collected_serial,
        validation_status,
        expected_quantity,
        received_quantity,
        status,
        brand_id,
        model_id,
        product_type_id,
        catalog_brand:catalog_brands!brand_id (
          id,
          name
        ),
        catalog_model:catalog_models!model_id (
          id,
          name
        ),
        catalog_product_type:catalog_product_types!product_type_id (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching ticket:', error)
    return { data: null, error: error.message }
  }

  return { data: data as OperationsTicket, error: null }
}

/**
 * Crea un nuevo ticket de operaciones
 */
export async function createTicketAction(formData: FormData): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()

    const client_id = formData.get('client_id') as string
    const ticket_type = formData.get('ticket_type') as TicketType
    const title = formData.get('title') as string
    const description = formData.get('description') as string || null
    const pickup_address = formData.get('pickup_address') as string || null
    const pickup_date = formData.get('pickup_date') as string || null
    const priority = parseInt(formData.get('priority') as string) || 3
    const notes = formData.get('notes') as string || null

    // Extraer items manuales del FormData
    const manualItems: Array<{
      brand_id: string
      model_id: string
      product_type_id: string
      quantity: number
    }> = []

  // Buscar todos los items[idx].* en el FormData
  const formDataEntries = Array.from(formData.entries())
  const itemIndices = new Set<number>()

  formDataEntries.forEach(([key]) => {
    const match = key.match(/items\[(\d+)\]/)
    if (match) {
      itemIndices.add(parseInt(match[1], 10))
    }
  })

  // Construir los items desde los índices encontrados
  itemIndices.forEach(idx => {
    const brand_id = formData.get(`items[${idx}].brand_id`) as string
    const model_id = formData.get(`items[${idx}].model_id`) as string
    const product_type_id = formData.get(`items[${idx}].product_type_id`) as string
    const quantity = parseInt(formData.get(`items[${idx}].quantity`) as string) || 1

    if (brand_id && model_id && product_type_id && quantity > 0) {
      manualItems.push({ brand_id, model_id, product_type_id, quantity })
    }
  })

  console.log('[CREATE TICKET] Manual items extracted:', manualItems.length, manualItems)

  // Calcular expected_units desde los items manuales, o usar el valor del formulario
  const formExpectedUnits = parseInt(formData.get('expected_units') as string) || 0
  const expected_units = manualItems.length > 0
    ? manualItems.reduce((sum, item) => sum + item.quantity, 0)
    : formExpectedUnits

  // Validaciones
  if (!client_id || !ticket_type || !title) {
    return { success: false, error: 'Cliente, tipo y título son requeridos' }
  }

  // El readable_id se genera automáticamente por el trigger de la BD
  const { data: createdTicket, error } = await supabase
    .from('operations_tickets')
    .insert({
      client_id,
      ticket_type,
      title,
      description,
      status: 'draft',
      expected_units,
      received_units: 0,
      pickup_address,
      pickup_date: pickup_date || null,
      priority,
      notes,
      created_by: user?.id,
    })
    .select('id, readable_id, title')
    .single()

  if (error || !createdTicket) {
    console.error('Error creating ticket:', error)
    return { success: false, error: error?.message || 'Error creando el ticket' }
  }

  // Insertar items manuales si existen
  if (manualItems.length > 0) {
    const ticketItemsPayload = manualItems.map(item => ({
      ticket_id: createdTicket.id,
      brand_id: item.brand_id,
      model_id: item.model_id,
      product_type_id: item.product_type_id,
      expected_quantity: item.quantity,
      received_quantity: 0,
      status: 'COMPLETADO'
    }))

    console.log('[CREATE TICKET] Inserting items:', ticketItemsPayload)

    const { error: manifestError } = await supabase
      .from('ticket_items')
      .insert(ticketItemsPayload)

    if (manifestError) {
      console.error('[CREATE TICKET] Error inserting ticket items:', manifestError)
      return { success: false, error: manifestError.message }
    }
  }

  await logTicketHistory(supabase, {
    ticketId: createdTicket.id,
    action: 'TICKET_CREATED',
    description: `Ticket ${createdTicket.readable_id || createdTicket.id} creado`,
    details: { title: createdTicket.title },
    performedBy: user?.id ?? null
  })

  // Auditoría centralizada
  await createAuditLog({
    action: 'CREATE',
    module: 'TICKETS',
    entityType: 'TICKET',
    entityId: createdTicket.id,
    entityReference: createdTicket.readable_id || createdTicket.id,
    description: `Ticket #${createdTicket.readable_id || createdTicket.id} creado: ${createdTicket.title}`,
    ticketId: createdTicket.id,
    changes_summary: {
      title: { old: null, new: createdTicket.title },
      ticket_type: { old: null, new: ticket_type },
      client_id: { old: null, new: client_id }
    }
  });

    revalidatePath('/dashboard/tickets')
    return { success: true, error: null }
  } catch (err) {
    console.error('[CREATE TICKET] Error:', err)
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al crear el ticket: ${errorMsg}` }
  }
}

/**
 * Actualiza el estado de un ticket
 */
export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const userId = data?.user?.id ?? null

  const updateData: Record<string, unknown> = { status: newStatus }

  // Si se completa, agregar fecha
  if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('operations_tickets')
    .update(updateData)
    .eq('id', ticketId)

  if (error) {
    console.error('Error updating ticket status:', error)
    return { success: false, error: error.message }
  }

  const { data: ticketRef } = await supabase
    .from('operations_tickets')
    .select('readable_id, status')
    .eq('id', ticketId)
    .single()

  await logTicketHistory(supabase, {
    ticketId,
    action: 'TICKET_STATUS_CHANGED',
    description: `Estado actualizado a ${newStatus}`,
    details: { status: newStatus },
    performedBy: userId
  })

  // Auditoría centralizada
  if (ticketRef) {
    await createAuditLog({
      action: 'STATUS_CHANGE',
      module: 'TICKETS',
      entityType: 'TICKET',
      entityId: ticketId,
      entityReference: ticketRef.readable_id || ticketId,
      description: `Ticket #${ticketRef.readable_id || ticketId} cambió estado de ${ticketRef.status} a ${newStatus}`,
      ticketId: ticketId,
      changes_summary: {
        status: { old: ticketRef.status, new: newStatus }
      }
    });
  }

  revalidatePath('/dashboard/tickets')
  return { success: true, error: null }
}

/**
 * Actualiza un ticket existente
 */
export async function updateTicketAction(
  ticketId: string,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const userId = data?.user?.id ?? null

  const title = formData.get('title') as string
  const description = formData.get('description') as string || null
  const expected_units = parseInt(formData.get('expected_units') as string) || 0
  const pickup_address = formData.get('pickup_address') as string || null
  const pickup_date = formData.get('pickup_date') as string || null
  const priority = parseInt(formData.get('priority') as string) || 3
  const ticket_type = formData.get('ticket_type') as TicketType || null
  const notes = formData.get('notes') as string || null

  if (!title) {
    return { success: false, error: 'El título es requerido' }
  }

  const updatePayload: any = {
    title,
    description,
    expected_units,
    pickup_address,
    pickup_date: pickup_date || null,
    priority,
    notes,
  }

  if (ticket_type) {
    updatePayload.ticket_type = ticket_type
  }

  const { error } = await supabase
    .from('operations_tickets')
    .update(updatePayload)
    .eq('id', ticketId)

  if (error) {
    console.error('Error updating ticket:', error)
    return { success: false, error: error.message }
  }

  /* 
   * Nota: Idealmente deberíamos obtener info previa para comparar, pero por simplicidad
   * logueamos la actualización con los datos nuevos.
   */
  const { data: ticketRef } = await supabase
    .from('operations_tickets')
    .select('readable_id')
    .eq('id', ticketId)
    .single()

  await logTicketHistory(supabase, {
    ticketId,
    action: 'TICKET_UPDATED',
    description: 'Detalles del ticket modificados',
    details: {
      title,
      expected_units,
      priority
    },
    performedBy: userId
  })

  // Auditoría centralizada
  if (ticketRef) {
    await createAuditLog({
      action: 'UPDATE',
      module: 'TICKETS',
      entityType: 'TICKET',
      entityId: ticketId,
      entityReference: ticketRef.readable_id || ticketId,
      description: `Ticket #${ticketRef.readable_id || ticketId} actualizado (Título: ${title})`,
      ticketId: ticketId,
      changes_summary: {
        // Solo listamos lo explícitamente cambiado que es crítico
        title: { old: '(previo)', new: title },
        expected_units: { old: '(previo)', new: expected_units }
      }
    });
  }

  revalidatePath('/dashboard/tickets')
  return { success: true, error: null }
}

/**
 * Borra un ticket completamente junto con toda su logística y registros
 * Elimina: items, historial de cambios, logs de recepción
 */
export async function deleteTicketCompletely(ticketId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const userId = data?.user?.id ?? null

  try {
    console.log('[DELETE] Iniciando borrado de ticket con ID:', ticketId)

    // Ejecutar la función RPC que borra todo en cascada
    const { data: result, error: rpcError } = await supabase
      .rpc('delete_ticket_completely', {
        p_ticket_id: ticketId
      })

    console.log('[DELETE] Resultado RPC:', { result, error: rpcError })

    if (rpcError) {
      console.error('[DELETE] Error RPC:', rpcError)
      return { success: false, error: `Error al borrar: ${rpcError.message}` }
    }

    if (!result) {
      console.log('[DELETE] Ticket eliminado por cascada (sin respuesta)')
      revalidatePath('/dashboard/tickets')
      return { success: true, error: null }
    }

    // El resultado puede ser un array o un objeto
    const response = Array.isArray(result) ? result[0] : result

    if (response && typeof response === 'object') {
      if (response.success === false) {
        console.error('[DELETE] Error en respuesta:', response.message)
        return { success: false, error: response.message || 'Error desconocido' }
      }
      console.log('[DELETE] Ticket eliminado exitosamente:', response)

      // Auditoría (Si tenemos el ID, aunque ya no exista el registro, queda el log)
      // Nota: readable_id ya no es accesible fácilmente post-delete a menos que lo pasemos o lo busquemos antes.
      // Por ahora usamos ticketId como referencia.
      await createAuditLog({
        action: 'DELETE',
        module: 'TICKETS',
        entityType: 'TICKET',
        entityId: ticketId,
        entityReference: ticketId,
        description: 'Ticket eliminado permanentemente del sistema',
        ticketId: ticketId
      });
    }

    revalidatePath('/dashboard/tickets')
    return { success: true, error: null }
  } catch (err) {
    console.error('[DELETE] Excepción:', err)
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error: ${errorMsg}` }
  }
}

/**
 * Cancela un ticket (marca como cancelado, no lo borra)
 * @deprecated Use deleteTicketCompletely() instead for actual deletion
 */
export async function cancelTicketAction(ticketId: string): Promise<{ success: boolean; error: string | null }> {
  return updateTicketStatus(ticketId, 'cancelled')
}

/**
 * Obtiene los assets vinculados a un ticket (Equipos Recibidos)
 */
export async function getTicketAssetsAction(ticketId: string): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient()

  try {
    // 1. Obtener los batches asociados al ticket
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('ticket_id', ticketId)

    if (batchError) {
      console.error('Error fetching batches:', batchError)
      return { data: null, error: batchError.message }
    }

    const batchIds = batches.map(b => b.id)

    if (batchIds.length === 0) {
      return { data: [], error: null }
    }

    // 2. Obtener los assets vinculados a esos batches
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select(`
        id,
        internal_tag,
        serial_number,
        asset_type,
        manufacturer,
        model,
        status,
        created_at,
        specifications
      `)
      .in('batch_id', batchIds)
      .order('internal_tag', { ascending: true })

    if (assetsError) {
      console.error('Error fetching assets:', assetsError)
      return { data: null, error: assetsError.message }
    }

    return { data: assets, error: null }
  } catch (err) {
    console.error('Unexpected error in getTicketAssetsAction:', err)
    return { data: null, error: 'Error inesperado al obtener equipos recibidos' }
  }
}

