'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CrmEntityType = 'client' | 'supplier' | 'partner'

export type CrmAccountClass = 'empresa' | 'cliente_final'

export interface CrmEntity {
  id: string
  tax_id_nit: string
  commercial_name: string
  legal_name: string | null
  entity_type: CrmEntityType
  account_class?: CrmAccountClass | null
  parent_entity_id?: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string
  country: string
  contact_person: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateClientData {
  commercial_name: string
  tax_id_nit: string
  entity_type: CrmEntityType
  account_class?: CrmAccountClass
  parent_entity_id?: string | null
  legal_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  contact_person?: string
  notes?: string
}

/**
 * Obtiene todos los clientes/entidades CRM activos
 */
export async function getClients(): Promise<{ data: CrmEntity[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('crm_entities')
    .select('*')
    .eq('is_active', true)
    .order('commercial_name', { ascending: true })

  if (error) {
    console.error('Error fetching clients:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Obtiene un cliente por ID
 */
export async function getClientById(id: string): Promise<{ data: CrmEntity | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('crm_entities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching client:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Crea un nuevo cliente/entidad CRM
 */
export async function createClientAction(formData: FormData): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const commercial_name = formData.get('commercial_name') as string
  const tax_id_nit = formData.get('tax_id_nit') as string
  const entity_type = formData.get('entity_type') as CrmEntityType
  const account_class_raw = formData.get('account_class') as string
  const account_class: CrmAccountClass =
    account_class_raw === 'cliente_final' ? 'cliente_final' : 'empresa'
  const legal_name = formData.get('legal_name') as string || null
  const email = formData.get('email') as string || null
  const phone = formData.get('phone') as string || null
  const address = formData.get('address') as string || null
  const city = formData.get('city') as string || 'Guatemala'
  const contact_person = formData.get('contact_person') as string || null
  const notes = formData.get('notes') as string || null
  const parent_raw = (formData.get('parent_entity_id') as string)?.trim()
  const parent_entity_id =
    account_class === 'empresa' || !parent_raw ? null : parent_raw

  // Validaciones básicas
  if (!commercial_name || !tax_id_nit || !entity_type) {
    return { success: false, error: 'Nombre, NIT y tipo son requeridos' }
  }

  // Verificar que el NIT no exista
  const { data: existing } = await supabase
    .from('crm_entities')
    .select('id')
    .eq('tax_id_nit', tax_id_nit)
    .single()

  if (existing) {
    return { success: false, error: 'Ya existe una entidad con este NIT' }
  }

  // Insertar nuevo registro
  const { error } = await supabase
    .from('crm_entities')
    .insert({
      commercial_name,
      tax_id_nit,
      entity_type,
      account_class,
      parent_entity_id,
      legal_name,
      email,
      phone,
      address,
      city,
      contact_person,
      notes,
      country: 'Guatemala',
      is_active: true,
    })

  if (error) {
    console.error('Error creating client:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/clientes')
  return { success: true, error: null }
}

/** Alta rápida de empresa corporativa para asociar desde otro formulario */
export async function createParentCompanyQuickAction(
  commercial_name: string,
  tax_id_nit: string
): Promise<{
  success: boolean
  error: string | null
  data: { id: string; commercial_name: string; tax_id_nit: string } | null
}> {
  const supabase = await createClient()
  const name = commercial_name.trim()
  const nit = tax_id_nit.trim()

  if (!name || !nit) {
    return { success: false, error: 'Nombre y NIT son requeridos', data: null }
  }

  const { data: existing } = await supabase
    .from('crm_entities')
    .select('id')
    .eq('tax_id_nit', nit)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Ya existe una entidad con este NIT', data: null }
  }

  const { data, error } = await supabase
    .from('crm_entities')
    .insert({
      commercial_name: name,
      tax_id_nit: nit,
      entity_type: 'client',
      account_class: 'empresa',
      country: 'Guatemala',
      city: 'Guatemala',
      is_active: true,
    })
    .select('id, commercial_name, tax_id_nit')
    .single()

  if (error || !data) {
    console.error('Error creating parent company:', error)
    return { success: false, error: error?.message || 'Error al crear empresa', data: null }
  }

  revalidatePath('/dashboard/clientes')
  return { success: true, error: null, data }
}

/**
 * Actualiza un cliente existente
 */
export async function updateClientAction(id: string, formData: FormData): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const commercial_name = formData.get('commercial_name') as string
  const tax_id_nit = formData.get('tax_id_nit') as string
  const entity_type = formData.get('entity_type') as CrmEntityType
  const account_class_raw = formData.get('account_class') as string
  const account_class: CrmAccountClass =
    account_class_raw === 'cliente_final' ? 'cliente_final' : 'empresa'
  const legal_name = formData.get('legal_name') as string || null
  const email = formData.get('email') as string || null
  const phone = formData.get('phone') as string || null
  const address = formData.get('address') as string || null
  const city = formData.get('city') as string || 'Guatemala'
  const contact_person = formData.get('contact_person') as string || null
  const notes = formData.get('notes') as string || null
  const is_active = formData.get('is_active') === 'true'
  const parent_raw = (formData.get('parent_entity_id') as string)?.trim()
  const parent_entity_id =
    account_class === 'empresa' || !parent_raw || parent_raw === id ? null : parent_raw

  if (!commercial_name || !tax_id_nit || !entity_type) {
    return { success: false, error: 'Nombre, NIT y tipo son requeridos' }
  }

  // Verificar que el NIT no pertenezca a otra entidad
  const { data: existing } = await supabase
    .from('crm_entities')
    .select('id')
    .eq('tax_id_nit', tax_id_nit)
    .neq('id', id)
    .single()

  if (existing) {
    return { success: false, error: 'Ya existe otra entidad con este NIT' }
  }

  const { error } = await supabase
    .from('crm_entities')
    .update({
      commercial_name,
      tax_id_nit,
      entity_type,
      account_class,
      parent_entity_id,
      legal_name,
      email,
      phone,
      address,
      city,
      contact_person,
      notes,
      is_active,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating client:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/clientes')
  return { success: true, error: null }
}

/**
 * Elimina (desactiva) un cliente
 */
export async function deleteClientAction(id: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Soft delete - solo desactivamos
  const { error } = await supabase
    .from('crm_entities')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error deleting client:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/clientes')
  return { success: true, error: null }
}

