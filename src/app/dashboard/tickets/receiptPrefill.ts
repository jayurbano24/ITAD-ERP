'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  parseEquipmentReceiptText,
  type ParsedEquipmentReceipt,
} from '@/lib/receipts/parseEquipmentReceipt'
import type { CrmEntity } from '../clientes/actions'
import type { CatalogItem } from '../configuracion/usuarios/actions'

async function ocrReceiptImage(file: File): Promise<string> {
  const sharp = (await import('sharp')).default
  const { createWorker } = await import('tesseract.js')

  const input = Buffer.from(await file.arrayBuffer())
  const preprocessed = await sharp(input)
    .rotate()
    .grayscale()
    .normalize()
    .resize({ width: 2400, withoutEnlargement: false })
    .sharpen()
    .png()
    .toBuffer()

  const worker = await createWorker('eng')
  try {
    const {
      data: { text },
    } = await worker.recognize(preprocessed)
    return text || ''
  } finally {
    await worker.terminate()
  }
}

export interface PrefillCatalogRef extends CatalogItem {
  brand_id?: string | null
  product_type_id?: string | null
}

export interface ReceiptPrefillItem {
  brand_id: string
  model_id: string
  product_type_id: string
  quantity: number
  expected_serial: string | null
  brand_name: string
  model_name: string
  product_type_name: string
}

export interface ReceiptPrefillResult {
  success: boolean
  error: string | null
  parsed: ParsedEquipmentReceipt | null
  client: CrmEntity | null
  clientCreated: boolean
  brands: PrefillCatalogRef[]
  models: PrefillCatalogRef[]
  productTypes: PrefillCatalogRef[]
  items: ReceiptPrefillItem[]
  pickup_address: string | null
  pickup_date: string | null
  notes: string | null
}

function slugNit(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 24)
  return `TEMP-${slug || 'CLIENTE'}`
}

async function ensureCatalogByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'catalog_brands' | 'catalog_product_types',
  name: string
): Promise<PrefillCatalogRef> {
  const trimmed = name.trim()
  const { data: existing } = await supabase
    .from(table)
    .select('*')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()

  if (existing) return existing as PrefillCatalogRef

  const { data: created, error } = await supabase
    .from(table)
    .insert({ name: trimmed, is_active: true })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(`No se pudo crear ${table}: ${error?.message || 'sin datos'}`)
  }

  return created as PrefillCatalogRef
}

async function ensureModel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  brandId: string,
  productTypeId: string | null
): Promise<PrefillCatalogRef> {
  const trimmed = name.trim()
  const { data: existing } = await supabase
    .from('catalog_models')
    .select('*')
    .eq('brand_id', brandId)
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()

  if (existing) return existing as PrefillCatalogRef

  const { data: created, error } = await supabase
    .from('catalog_models')
    .insert({
      name: trimmed,
      brand_id: brandId,
      product_type_id: productTypeId,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(`No se pudo crear el modelo: ${error?.message || 'sin datos'}`)
  }

  return created as PrefillCatalogRef
}

async function findOrCreateClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parsed: ParsedEquipmentReceipt
): Promise<{ client: CrmEntity; created: boolean }> {
  const commercialName = (parsed.customer || parsed.companyName || '').trim()
  if (!commercialName) {
    throw new Error('No se detectó el cliente en el recibo (Customer / Company Name)')
  }

  const { data: byName } = await supabase
    .from('crm_entities')
    .select('*')
    .ilike('commercial_name', commercialName)
    .limit(1)
    .maybeSingle()

  if (byName) {
    const updates: Record<string, unknown> = {}
    if (parsed.collectionAddress && !byName.address) {
      updates.address = parsed.collectionAddress
    }
    if (parsed.companyName && !byName.legal_name) {
      updates.legal_name = parsed.companyName
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('crm_entities').update(updates).eq('id', byName.id)
      return { client: { ...byName, ...updates } as CrmEntity, created: false }
    }
    return { client: byName as CrmEntity, created: false }
  }

  const nit = slugNit(commercialName)
  const noteParts = [
    parsed.orderNumber ? `Orden origen: ${parsed.orderNumber}` : null,
    parsed.projectId ? `Project ID: ${parsed.projectId}` : null,
    parsed.companyName && parsed.companyName !== commercialName
      ? `End client / Company: ${parsed.companyName}`
      : null,
    'Creado desde foto de recibo ITAD',
  ].filter(Boolean)

  const { data: created, error } = await supabase
    .from('crm_entities')
    .insert({
      commercial_name: commercialName,
      tax_id_nit: nit,
      entity_type: 'client',
      legal_name: parsed.companyName || commercialName,
      address: parsed.collectionAddress,
      city: 'Guatemala',
      country: 'Guatemala',
      notes: noteParts.join(' · '),
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !created) {
    // NIT collision: retry lookup by NIT then by name
    if (error?.code === '23505') {
      const { data: byNit } = await supabase
        .from('crm_entities')
        .select('*')
        .eq('tax_id_nit', nit)
        .maybeSingle()
      if (byNit) return { client: byNit as CrmEntity, created: false }
    }
    throw new Error(`No se pudo crear el cliente: ${error?.message || 'sin datos'}`)
  }

  return { client: created as CrmEntity, created: true }
}

async function applyParsedReceipt(parsed: ParsedEquipmentReceipt): Promise<ReceiptPrefillResult> {
  const empty: ReceiptPrefillResult = {
    success: false,
    error: null,
    parsed: null,
    client: null,
    clientCreated: false,
    brands: [],
    models: [],
    productTypes: [],
    items: [],
    pickup_address: null,
    pickup_date: null,
    notes: null,
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { ...empty, error: 'Sesión no válida. Vuelve a iniciar sesión.' }
    }
    const { client, created: clientCreated } = await findOrCreateClient(supabase, parsed)

    const brands: PrefillCatalogRef[] = []
    const models: PrefillCatalogRef[] = []
    const productTypes: PrefillCatalogRef[] = []
    const items: ReceiptPrefillItem[] = []

    for (const raw of parsed.items) {
      const brandName = (raw.make || 'SIN MARCA').trim()
      const modelName = (raw.model || 'SIN MODELO').trim()
      const typeName = (raw.product || 'Equipo').trim()

      const brand = await ensureCatalogByName(supabase, 'catalog_brands', brandName)
      const productType = await ensureCatalogByName(supabase, 'catalog_product_types', typeName)
      const model = await ensureModel(supabase, modelName, brand.id, productType.id)

      if (!brands.some((b) => b.id === brand.id)) brands.push(brand)
      if (!productTypes.some((t) => t.id === productType.id)) productTypes.push(productType)
      if (!models.some((m) => m.id === model.id)) models.push(model)

      items.push({
        brand_id: brand.id,
        model_id: model.id,
        product_type_id: productType.id,
        quantity: raw.quantity || 1,
        expected_serial: raw.serial,
        brand_name: brand.name,
        model_name: model.name,
        product_type_name: productType.name,
      })
    }

    const noteParts = [
      parsed.orderNumber ? `Orden origen: ${parsed.orderNumber}` : null,
      parsed.projectId ? `Project: ${parsed.projectId}` : null,
      parsed.companyName ? `Company: ${parsed.companyName}` : null,
      'Precargado desde foto de recibo',
    ].filter(Boolean)

    revalidatePath('/dashboard/clientes')
    revalidatePath('/dashboard/tickets')

    return {
      success: true,
      error: null,
      parsed,
      client,
      clientCreated,
      brands,
      models,
      productTypes,
      items,
      pickup_address: parsed.collectionAddress,
      pickup_date: parsed.pickupDateIso,
      notes: noteParts.join(' · '),
    }
  } catch (err) {
    console.error('[RECEIPT PREFILL]', err)
    const message = err instanceof Error ? err.message : String(err)
    return { ...empty, error: message }
  }
}

/**
 * Recibe texto OCR ya extraído (útil para pruebas).
 */
export async function prefillTicketFromReceiptOcr(
  ocrText: string
): Promise<ReceiptPrefillResult> {
  if (!ocrText || ocrText.trim().length < 20) {
    return {
      success: false,
      error: 'No se pudo leer texto útil de la imagen. Intenta con otra foto más nítida.',
      parsed: null,
      client: null,
      clientCreated: false,
      brands: [],
      models: [],
      productTypes: [],
      items: [],
      pickup_address: null,
      pickup_date: null,
      notes: null,
    }
  }

  const parsed = parseEquipmentReceiptText(ocrText)
  return applyParsedReceipt(parsed)
}

/**
 * Sube la foto del recibo, hace OCR (con preprocess) y precarga cliente + ticket.
 */
export async function prefillTicketFromReceiptPhoto(
  formData: FormData
): Promise<ReceiptPrefillResult> {
  const empty: ReceiptPrefillResult = {
    success: false,
    error: null,
    parsed: null,
    client: null,
    clientCreated: false,
    brands: [],
    models: [],
    productTypes: [],
    items: [],
    pickup_address: null,
    pickup_date: null,
    notes: null,
  }

  try {
    const file = formData.get('receipt')
    if (!(file instanceof File) || file.size === 0) {
      return { ...empty, error: 'Selecciona una foto del recibo' }
    }
    if (file.size > 12 * 1024 * 1024) {
      return { ...empty, error: 'La imagen es demasiado grande (máx. 12 MB)' }
    }

    const ocrText = await ocrReceiptImage(file)
    if (!ocrText || ocrText.trim().length < 20) {
      return {
        ...empty,
        error: 'No se pudo leer texto útil de la imagen. Intenta con otra foto más nítida.',
      }
    }

    const parsed = parseEquipmentReceiptText(ocrText)
    return applyParsedReceipt(parsed)
  } catch (err) {
    console.error('[RECEIPT PHOTO]', err)
    const message = err instanceof Error ? err.message : String(err)
    return { ...empty, error: `Error al leer la foto: ${message}` }
  }
}
