'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// HELPER: Obtener Client ID del usuario actual
// CRÍTICO: Siempre usar esta función para RLS
// =====================================================

async function getClientId(): Promise<string | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()
  
  return profile?.client_id || null
}

// =====================================================
// DASHBOARD: KPIs del Cliente
// =====================================================

export interface ClientDashboardStats {
  processedThisMonth: number
  pendingPickups: number
  creditBalance: number
  totalAssets: number
  assetsInProcess: number
  certificatesAvailable: number
}

export async function getClientDashboardStats(): Promise<ClientDashboardStats> {
  const supabase = await createClient()
  const clientId = await getClientId()
  
  if (!clientId) {
    return {
      processedThisMonth: 0,
      pendingPickups: 0,
      creditBalance: 0,
      totalAssets: 0,
      assetsInProcess: 0,
      certificatesAvailable: 0
    }
  }
  
  // Inicio del mes actual
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  // Equipos procesados este mes (status: wiped, sold, ready_for_sale)
  const { count: processedThisMonth } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('owner_client_id', clientId)
    .in('status', ['wiped', 'sold', 'ready_for_sale'])
    .gte('updated_at', startOfMonth.toISOString())
  
  // Recolecciones pendientes (tickets abiertos tipo recoleccion)
  const { count: pendingPickups } = await supabase
    .from('operations_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('ticket_type', 'recoleccion')
    .in('status', ['open', 'assigned'])
  
  // Crédito a favor (de liquidaciones)
  const { data: settlements } = await supabase
    .from('settlements')
    .select('our_commission')
    .eq('status', 'finalized')
    // Nota: necesitaríamos una relación batch->client para esto
    // Por ahora retornamos 0
  
  const creditBalance = 0 // TODO: Calcular basado en liquidaciones del cliente
  
  // Total de activos del cliente
  const { count: totalAssets } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('owner_client_id', clientId)
  
  // Activos en proceso
  const { count: assetsInProcess } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('owner_client_id', clientId)
    .in('status', ['received', 'diagnosing', 'wiping'])
  
  // Certificados disponibles
  const { count: certificatesAvailable } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('owner_client_id', clientId)
    .eq('data_wipe_status', 'completed')
  
  return {
    processedThisMonth: processedThisMonth || 0,
    pendingPickups: pendingPickups || 0,
    creditBalance,
    totalAssets: totalAssets || 0,
    assetsInProcess: assetsInProcess || 0,
    certificatesAvailable: certificatesAvailable || 0
  }
}

// =====================================================
// TICKETS: Obtener tickets recientes del cliente
// =====================================================

export interface ClientTicket {
  id: string
  readable_id: string
  title: string
  ticket_type: string
  status: string
  priority: string
  created_at: string
  pickup_address: string | null
}

export async function getClientRecentTickets(limit: number = 5): Promise<ClientTicket[]> {
  const supabase = await createClient()
  const clientId = await getClientId()
  
  if (!clientId) return []
  
  const { data, error } = await supabase
    .from('operations_tickets')
    .select('id, readable_id, title, ticket_type, status, priority, created_at, pickup_address')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching client tickets:', error)
    return []
  }
  
  return data || []
}

// =====================================================
// SOLICITUD: Crear solicitud de recolección
// =====================================================

export interface PickupRequestData {
  pickupAddress: string
  contactName: string
  contactPhone: string
  preferredDate: string
  preferredTime: string
  estimatedLaptops: number
  estimatedDesktops: number
  estimatedMonitors: number
  estimatedPhones: number
  estimatedOther: number
  notes?: string
}

export async function createPickupRequest(data: PickupRequestData) {
  const supabase = await createClient()
  const clientId = await getClientId()
  
  if (!clientId) {
    return { success: false, error: 'No autorizado' }
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }
  
  // Construir descripción
  const itemsList = []
  if (data.estimatedLaptops > 0) itemsList.push(`${data.estimatedLaptops} Laptops`)
  if (data.estimatedDesktops > 0) itemsList.push(`${data.estimatedDesktops} Desktops`)
  if (data.estimatedMonitors > 0) itemsList.push(`${data.estimatedMonitors} Monitores`)
  if (data.estimatedPhones > 0) itemsList.push(`${data.estimatedPhones} Celulares`)
  if (data.estimatedOther > 0) itemsList.push(`${data.estimatedOther} Otros`)
  
  const totalEstimated = data.estimatedLaptops + data.estimatedDesktops + 
                         data.estimatedMonitors + data.estimatedPhones + data.estimatedOther
  
  const description = `
Solicitud de recolección
========================
Equipos estimados: ${totalEstimated}
- ${itemsList.join('\n- ')}

Contacto: ${data.contactName}
Teléfono: ${data.contactPhone}
Fecha preferida: ${data.preferredDate}
Horario preferido: ${data.preferredTime}

${data.notes ? `Notas adicionales:\n${data.notes}` : ''}
  `.trim()
  
  const { data: ticket, error } = await supabase
    .from('operations_tickets')
    .insert({
      client_id: clientId,
      created_by: user.id,
      ticket_type: 'recoleccion',
      title: `Recolección - ${totalEstimated} equipos estimados`,
      description,
      status: 'open',
      priority: 'medium',
      pickup_address: data.pickupAddress,
      channel: 'portal_cliente'
    })
    .select('id, readable_id')
    .single()
  
  if (error) {
    console.error('Error creating pickup request:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/portal')
  revalidatePath('/portal/solicitud')
  
  return { success: true, data: ticket }
}

// =====================================================
// ACTIVOS: Obtener activos del cliente
// =====================================================

export interface ClientAsset {
  id: string
  internal_tag: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  status: string
  data_wipe_status: string | null
  condition: string | null
  created_at: string
}

export async function getClientAssets(
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: ClientAsset[]; total: number }> {
  const supabase = await createClient()
  const clientId = await getClientId()
  
  if (!clientId) return { data: [], total: 0 }
  
  let query = supabase
    .from('assets')
    .select('id, internal_tag, serial_number, manufacturer, model, asset_type, status, data_wipe_status, condition, created_at', { count: 'exact' })
    .eq('owner_client_id', clientId)
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)
  
  const { data, count, error } = await query
  
  if (error) {
    console.error('Error fetching client assets:', error)
    return { data: [], total: 0 }
  }
  
  return { data: data || [], total: count || 0 }
}

// =====================================================
// CERTIFICADOS: Obtener activos con certificado
// =====================================================

export interface CertificateAsset {
  id: string
  internal_tag: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  data_wipe_status: string
  data_wipe_certificate_url: string | null
  wiped_at: string | null
  wipe_method: string | null
}

export async function getClientCertificates(): Promise<CertificateAsset[]> {
  const supabase = await createClient()
  const clientId = await getClientId()
  
  if (!clientId) return []
  
  const { data, error } = await supabase
    .from('assets')
    .select(`
      id, internal_tag, serial_number, manufacturer, model, asset_type,
      data_wipe_status, data_wipe_certificate_url, wiped_at, wipe_method
    `)
    .eq('owner_client_id', clientId)
    .eq('data_wipe_status', 'completed')
    .order('wiped_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching certificates:', error)
    return []
  }
  
  return data || []
}

// =====================================================
// LIQUIDACIONES: Obtener liquidaciones del cliente
// =====================================================

export interface ClientSettlement {
  id: string
  settlement_number: string
  total_units: number
  total_revenue: number
  our_commission: number
  status: string
  created_at: string
  finalized_at: string | null
}

export async function getClientSettlements(): Promise<ClientSettlement[]> {
  const supabase = await createClient()
  const clientId = await getClientId()
  
  if (!clientId) return []
  
  // Nota: Necesitaríamos una relación directa o a través de batches
  // Por ahora retornamos vacío hasta que se implemente la relación
  
  return []
}

// =====================================================
// SUCURSALES: Obtener sucursales del cliente
// =====================================================

export interface ClientBranch {
  id: string
  name: string
  address: string
  city: string
  contact_name: string | null
  contact_phone: string | null
}

export async function getClientBranches(): Promise<ClientBranch[]> {
  const supabase = await createClient()
  const clientId = await getClientId()
  
  if (!clientId) return []
  
  // Si tienes una tabla de sucursales
  // const { data } = await supabase
  //   .from('client_branches')
  //   .select('*')
  //   .eq('client_id', clientId)
  
  // Por ahora retornamos vacío
  return []
}

