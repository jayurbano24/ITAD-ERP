'use server'

import { createClient } from '@/lib/supabase/server'
import { ConfiguracionVisualSchema } from '@/lib/schemas'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// =====================================================
// ADMIN CLIENT (Con SERVICE_ROLE_KEY)
// =====================================================

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

function isAdminClientConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

// =====================================================
// VERIFICAR PERMISOS DE ADMIN
// =====================================================

async function verifyAdminAccess(): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, error: 'No autenticado' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return { authorized: false, error: 'No tienes permisos de administrador' }
  }

  return { authorized: true, userId: user.id }
}

// =====================================================
// INTERFACES
// =====================================================

export interface SystemUser {
  id: string
  email: string
  full_name: string | null
  role: string
  allowed_modules?: string[] | null
  module_permissions?: Record<string, string[]> | null
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  avatar_url: string | null
}

export interface CreateUserData {
  email: string
  password: string
  fullName: string
  role: string
}

// =====================================================
// OBTENER TODOS LOS USUARIOS
// =====================================================

export async function getSystemUsers(): Promise<{ data: SystemUser[]; error: string | null; needsConfig?: boolean }> {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { data: [], error: access.error || 'No autorizado' }
  }

  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at, avatar_url, allowed_modules, module_permissions')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  // Obtener emails de auth.users usando admin client
  const adminClient = getAdminClient()

  // Si no hay admin client, retornar usuarios sin emails
  if (!adminClient) {
    const usersWithoutEmail: SystemUser[] = (profiles || []).map(profile => ({
      ...profile,
      email: '(Configurar SERVICE_ROLE_KEY)',
      last_sign_in_at: null
    }))
    return { data: usersWithoutEmail, error: null, needsConfig: true }
  }

  const { data: authUsers } = await adminClient.auth.admin.listUsers()

  const usersWithEmail: SystemUser[] = (profiles || []).map(profile => {
    const authUser = authUsers?.users?.find(u => u.id === profile.id)
    return {
      ...profile,
      email: authUser?.email || 'Sin email',
      last_sign_in_at: authUser?.last_sign_in_at || null
    }
  })

  return { data: usersWithEmail, error: null }
}

// =====================================================
// CREAR NUEVO USUARIO
// =====================================================

export async function createSystemUser(data: CreateUserData) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  const adminClient = getAdminClient()

  if (!adminClient) {
    return {
      success: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada. Agrégala en .env.local'
    }
  }

  // 1. Crear usuario en auth con auto-confirm
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // Auto-confirmar email
    user_metadata: {
      full_name: data.fullName
    }
  })

  if (authError) {
    console.error('Error creating auth user:', authError)
    return { success: false, error: authError.message }
  }

  if (!authUser.user) {
    return { success: false, error: 'No se pudo crear el usuario' }
  }

  // 2. Crear perfil en profiles
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: authUser.user.id,
      full_name: data.fullName,
      role: data.role,
      is_active: true
    })

  if (profileError) {
    console.error('Error creating profile:', profileError)
    // Intentar eliminar el usuario de auth si falla el profile
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    return { success: false, error: profileError.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true, userId: authUser.user.id }
}

// =====================================================
// ACTUALIZAR ROL DE USUARIO
// =====================================================

export async function updateUserRole(userId: string, newRole: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  // No permitir cambiar tu propio rol
  if (userId === access.userId) {
    return { success: false, error: 'No puedes cambiar tu propio rol' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function updateUserModules(userId: string, modules: string[] | null, permissions?: Record<string, string[]> | null) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  const supabase = await createClient()

  const updateData: any = { allowed_modules: modules }
  if (permissions !== undefined) {
    updateData.module_permissions = permissions
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// ACTIVAR/DESACTIVAR USUARIO
// =====================================================

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  // No permitir desactivarte a ti mismo
  if (userId === access.userId) {
    return { success: false, error: 'No puedes desactivarte a ti mismo' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// ELIMINAR USUARIO
// =====================================================

export async function deleteSystemUser(userId: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  // No permitir eliminarte a ti mismo
  if (userId === access.userId) {
    return { success: false, error: 'No puedes eliminarte a ti mismo' }
  }

  const adminClient = getAdminClient()

  if (!adminClient) {
    return { success: false, error: 'SERVICE_ROLE_KEY no configurada' }
  }

  // Eliminar de auth (cascade eliminará el profile si hay FK)
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) {
    return { success: false, error: error.message }
  }

  // También eliminar el profile por si acaso
  await adminClient.from('profiles').delete().eq('id', userId)

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// ACTUALIZAR NOMBRE DE USUARIO
// =====================================================

export async function updateUserName(userId: string, fullName: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  if (!fullName || fullName.trim().length === 0) {
    return { success: false, error: 'El nombre no puede estar vacío' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim() })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// RESETEAR PASSWORD
// =====================================================

export async function resetUserPassword(userId: string, newPassword: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  const adminClient = getAdminClient()

  if (!adminClient) {
    return { success: false, error: 'SERVICE_ROLE_KEY no configurada' }
  }

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Exportar función para verificar configuración
export async function checkAdminConfig(): Promise<boolean> {
  return isAdminClientConfigured()
}

// =====================================================
// CATÁLOGOS: MARCAS
// =====================================================

export interface CatalogItem {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export async function getBrands(): Promise<CatalogItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('catalog_brands')
    .select('*')
    .order('name')

  return data || []
}

export async function createBrand(name: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_brands')
    .insert({ name, is_active: true })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function deleteBrand(id: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_brands')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// CATÁLOGOS: FALLAS
// =====================================================

export async function getFailureCodes(): Promise<CatalogItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('catalog_failure_codes')
    .select('*')
    .order('name')

  return data || []
}

export async function createFailureCode(name: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_failure_codes')
    .insert({ name, is_active: true })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function deleteFailureCode(id: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_failure_codes')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// CATÁLOGOS GENÉRICO - CRUD UNIVERSAL
// =====================================================

type CatalogTable =
  | 'catalog_brands'
  | 'catalog_models'
  | 'catalog_product_types'
  | 'catalog_colors'
  | 'catalog_diagnostics'
  | 'catalog_repairs'
  | 'catalog_service_types'
  | 'catalog_failure_codes'
  | 'catalog_accessories'
  | 'catalog_processors'
  | 'catalog_memory'
  | 'catalog_keyboards'
  | 'catalog_storage'

export async function getCatalogItems(table: CatalogTable): Promise<CatalogItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from(table)
    .select('*')
    .eq('is_active', true)
    .order('name')

  return data || []
}

export async function createCatalogItem(table: CatalogTable, data: string | any) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const insertData = typeof data === 'string'
    ? { name: data, is_active: true }
    : { ...data, is_active: true }

  const { error } = await supabase
    .from(table)
    .insert(insertData)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function deleteCatalogItem(table: CatalogTable, id: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  // Hard delete - eliminar el registro
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// OBTENER TODOS LOS CATÁLOGOS
// =====================================================

export interface AllCatalogs {
  brands: CatalogItem[]
  models: CatalogItem[]
  productTypes: CatalogItem[]
  colors: CatalogItem[]
  diagnostics: CatalogItem[]
  repairs: CatalogItem[]
  serviceTypes: CatalogItem[]
  failureCodes: CatalogItem[]
  accessories: AccessoryItem[]
  processors: CatalogItem[]
  memory: CatalogItem[]
  keyboards: CatalogItem[]
  storage: CatalogItem[]
}

// =====================================================
// CONFIGURACIÓN DE EMPRESA
// =====================================================
// =====================================================
// CONFIGURACIÓN DE EMPRESA
// =====================================================

export interface CompanySettings {
  id: string
  name: string
  nit: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  typography: string | null
  // Visibilidad PDF
  show_nit: boolean
  show_signatures: boolean
  show_phones: boolean
  show_addresses: boolean
  legal_texts: string | null
  footer_notes: string | null
  ticket_prefix: string
  batch_prefix: string
  warranty_days: number
  currency: string
  updated_at: string
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  return data
}

export async function updateCompanySettings(formData: FormData): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error || 'No autorizado' }
  }

  const supabase = await createClient()

  const name = formData.get('name') as string
  const nit = formData.get('nit') as string
  const address = formData.get('address') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const website = formData.get('website') as string
  const logo_url = (formData.get('logo_url') as string)?.trim()
  const primary_color = (formData.get('primary_color') as string)?.trim() || '#22c55e'
  const secondary_color = (formData.get('secondary_color') as string)?.trim() || '#16a34a'
  const typography = (formData.get('typography') as string)?.trim() || 'Inter'
  const ticket_prefix = (formData.get('ticket_prefix') as string)?.trim() || 'TK'
  const batch_prefix = (formData.get('batch_prefix') as string)?.trim() || 'LOT'
  const warranty_days = parseInt(formData.get('warranty_days') as string) || 30
  const currency = (formData.get('currency') as string)?.trim() || 'GTQ'

  // Nuevos campos de visibilidad PDF
  const show_nit = formData.get('show_nit') === 'on'
  const show_signatures = formData.get('show_signatures') === 'on'
  const show_phones = formData.get('show_phones') === 'on'
  const show_addresses = formData.get('show_addresses') === 'on'
  const legal_texts = formData.get('legal_texts') as string
  const footer_notes = formData.get('footer_notes') as string

  // Validar con Zod antes de guardar
  const visualConfig = {
    logo_url,
    primary_color,
    secondary_color,
    typography,
    show_nit,
    show_signatures,
    show_phones,
    show_addresses,
    legal_texts,
    footer_notes
  }

  const validation = ConfiguracionVisualSchema.safeParse(visualConfig)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message }
  }

  // Verificar si existe un registro
  const { data: existing } = await supabase
    .from('company_settings')
    .select('id')
    .limit(1)
    .single()

  const dataToSave = {
    name,
    nit,
    address,
    phone,
    email,
    website,
    logo_url: logo_url || null,
    primary_color,
    secondary_color,
    typography,
    show_nit,
    show_signatures,
    show_phones,
    show_addresses,
    legal_texts,
    footer_notes,
    ticket_prefix,
    batch_prefix,
    warranty_days,
    currency
  }

  if (existing) {
    // Actualizar
    const { error } = await supabase
      .from('company_settings')
      .update(dataToSave)
      .eq('id', existing.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Insertar
    const { error } = await supabase
      .from('company_settings')
      .insert(dataToSave)

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true, error: null }
}

export async function getAllCatalogs(): Promise<AllCatalogs> {
  const supabase = await createClient()

  const [
    brands,
    models,
    productTypes,
    colors,
    diagnostics,
    repairs,
    serviceTypes,
    failureCodes,
    processors,
    memory,
    keyboards,
    storage
  ] = await Promise.all([
    supabase.from('catalog_brands').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_models').select(`
      *,
      brand:catalog_brands(id, name),
      product_type:catalog_product_types(id, name)
    `).eq('is_active', true).order('name'),
    supabase.from('catalog_product_types').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_colors').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_diagnostics').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_repairs').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_service_types').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_failure_codes').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_processors').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_memory').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_keyboards').select('*').eq('is_active', true).order('name'),
    supabase.from('catalog_storage').select('*').eq('is_active', true).order('name'),
  ])

  const accessories = await supabase
    .from('catalog_accessories')
    .select(
      `
        *,
        product_type:catalog_product_types(id, name)
      `
    )
    .eq('is_active', true)
    .order('name')

  return {
    brands: brands.data || [],
    models: models.data || [],
    productTypes: productTypes.data || [],
    colors: colors.data || [],
    diagnostics: diagnostics.data || [],
    repairs: repairs.data || [],
    serviceTypes: serviceTypes.data || [],
    failureCodes: failureCodes.data || [],
    accessories: accessories.data || [],
    processors: processors.data || [],
    memory: memory.data || [],
    keyboards: keyboards.data || [],
    storage: storage.data || []
  }
}

// =====================================================
// CATÁLOGO DE MODELOS - CRUD ESPECIAL
// =====================================================

export interface ModelItem {
  id: string
  name: string
  brand_id: string | null
  product_type_id: string | null
  description: string | null
  is_active: boolean
  brand?: { id: string; name: string } | null
  product_type?: { id: string; name: string } | null
}

export interface AccessoryItem {
  id: string
  name: string
  product_type_id: string | null
  is_required: boolean
  is_active: boolean
  created_at: string
  product_type?: { id: string; name: string } | null
}

export async function createModel(data: {
  name: string
  brand_id?: string
  product_type_id?: string
  description?: string
}) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_models')
    .insert({
      name: data.name,
      brand_id: data.brand_id || null,
      product_type_id: data.product_type_id || null,
      description: data.description || null,
      is_active: true
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function updateModel(id: string, data: {
  name: string
  brand_id?: string
  product_type_id?: string
  description?: string
}) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_models')
    .update({
      name: data.name,
      brand_id: data.brand_id || null,
      product_type_id: data.product_type_id || null,
      description: data.description || null
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function deleteModel(id: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_models')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// CATÁLOGO DE ACCESORIOS
// =====================================================

export async function getAccessories(): Promise<AccessoryItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('catalog_accessories')
    .select(`
      *,
      product_type:catalog_product_types(id, name)
    `)
    .eq('is_active', true)
    .order('name')

  return data || []
}

export async function createAccessory(data: { name: string; product_type_id?: string; is_required?: boolean }) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const payload = {
    name: data.name,
    product_type_id: data.product_type_id || null,
    is_required: data.is_required ?? false,
    is_active: true
  }

  const { error } = await supabase
    .from('catalog_accessories')
    .insert(payload)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function updateAccessory(id: string, data: { name: string; product_type_id?: string; is_required?: boolean }) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_accessories')
    .update({
      name: data.name,
      product_type_id: data.product_type_id || null,
      is_required: data.is_required ?? false
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

export async function deleteAccessory(id: string) {
  const access = await verifyAdminAccess()
  if (!access.authorized) {
    return { success: false, error: access.error }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_accessories')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/configuracion/usuarios')
  return { success: true }
}

// =====================================================
// CATÁLOGO DE CHOFERES
// =====================================================

export interface Driver {
  id: string
  name: string
  dpi: string | null
  phone: string | null
  vehicle_plate: string | null
  company: string | null
  is_active: boolean
}

export async function getDrivers(): Promise<Driver[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('catalog_drivers')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return data || []
}

export async function createDriver(data: {
  name: string
  dpi?: string
  phone?: string
  vehicle_plate?: string
  company?: string
}) {
  const supabase = await createClient()

  const { data: newDriver, error } = await supabase
    .from('catalog_drivers')
    .insert({
      name: data.name,
      dpi: data.dpi || null,
      phone: data.phone || null,
      vehicle_plate: data.vehicle_plate || null,
      company: data.company || null,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  revalidatePath('/dashboard/logistica')
  return { success: true, error: null, data: newDriver }
}

export async function deleteDriver(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('catalog_drivers')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/logistica')
  return { success: true }
}

