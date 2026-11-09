'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createCustomerQuick } from '../actions'
import type {
  QuotationPaymentMethod,
  QuotationRequesterType,
} from '@/lib/ventas/quotationMeta'
import {
  computeQuotationIva,
  computeQuotationTotalsWithDiscount,
  listedTotalFromItems,
} from '@/lib/ventas/quotationIva'

export type QuotationStatus =
  | 'pendiente_aprobacion'
  | 'aprobada'
  | 'rechazada'
  | 'aceptada'

export interface SalesQuotation {
  id: string
  quote_number: string
  customer_id: string | null
  title: string
  description: string | null
  amount: number | null
  status: QuotationStatus
  rejection_reason: string | null
  approved_attachment_url: string | null
  approved_attachment_name: string | null
  approved_at: string | null
  rejected_at: string | null
  accepted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  solicitante_tipo?: QuotationRequesterType | null
  solicitante_empresa?: string | null
  solicitante_contacto?: string | null
  payment_method?: QuotationPaymentMethod | null
  recipient_email?: string | null
  prices_include_iva?: boolean
  subtotal?: number | null
  tax_amount?: number | null
  discount_percent?: number | null
  discount_amount?: number | null
  discount_note?: string | null
  customer?: {
    id: string
    commercial_name: string
    legal_name?: string | null
    tax_id_nit: string | null
    phone?: string | null
    address?: string | null
    email?: string | null
  } | null
  creator?: { full_name: string | null } | null
  items?: QuotationLineItem[]
}

export interface QuotationLineItem {
  id: string
  quotation_id: string
  asset_id: string | null
  sort_order: number
  description: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  condition: string | null
  asset_type: string | null
  quantity: number
  unit_price: number
  line_total: number
  created_at: string
}

export type QuotationLineInput = {
  asset_id?: string | null
  description: string
  manufacturer?: string | null
  model?: string | null
  serial_number?: string | null
  condition?: string | null
  asset_type?: string | null
  quantity: number
  unit_price: number
}

export type QuotationCommentType = 'seguimiento' | 'avance_aprobacion'

export interface QuotationComment {
  id: string
  quotation_id: string
  author_id: string | null
  body: string
  comment_type?: QuotationCommentType
  attachment_url?: string | null
  attachment_name?: string | null
  created_at: string
  author?: { full_name: string | null } | null
}

const BUCKET = 'sales-quotation-attachments'
const LIST_PATH = '/dashboard/ventas/cotizaciones'

export async function getQuotations(options?: {
  status?: string
  search?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('sales_quotations')
    .select(
      `
      *,
      customer:crm_entities(id, commercial_name, legal_name, tax_id_nit, phone, address, email),
      creator:profiles!sales_quotations_created_by_fkey(full_name)
    `
    )
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const search = (options?.search || '').trim()
  if (search.length >= 2) {
    query = query.or(
      `quote_number.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('[getQuotations]', error)
    return { data: [] as SalesQuotation[], error: error.message }
  }

  return { data: (data || []) as SalesQuotation[], error: null }
}

export async function getQuotationById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales_quotations')
    .select(
      `
      *,
      customer:crm_entities(id, commercial_name, legal_name, tax_id_nit, phone, address, email),
      creator:profiles!sales_quotations_created_by_fkey(full_name),
      items:sales_quotation_items(*)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }
  if (!data) {
    return { data: null, error: 'Cotización no encontrada' }
  }

  const row = data as SalesQuotation & { items?: QuotationLineItem[] }
  if (row.items) {
    row.items.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  }

  return { data: row, error: null }
}

export async function getQuotationComments(quotationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales_quotation_comments')
    .select(
      `
      *,
      author:profiles!sales_quotation_comments_author_id_fkey(full_name)
    `
    )
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: [] as QuotationComment[], error: error.message }
  }
  return { data: (data || []) as QuotationComment[], error: null }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

const PAYMENT_METHODS: QuotationPaymentMethod[] = [
  'tarjeta',
  'transferencia',
  'deposito',
  'credito',
]

export type QuotationClientInput = {
  nombre: string
  apellido: string
  telefono?: string | null
  nit?: string | null
  direccion?: string | null
  correo: string
}

export async function createQuotation(input: {
  client: QuotationClientInput
  description?: string | null
  solicitante_tipo: QuotationRequesterType
  solicitante_empresa?: string | null
  solicitante_contacto?: string | null
  payment_method: QuotationPaymentMethod
  prices_include_iva: boolean
  items: QuotationLineInput[]
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nombre = input.client.nombre.trim()
  const apellido = input.client.apellido.trim()
  if (!nombre) {
    return { success: false, error: 'El nombre del cliente es requerido' }
  }
  if (!apellido) {
    return { success: false, error: 'El apellido del cliente es requerido' }
  }

  const correo = input.client.correo.trim().toLowerCase()
  if (!correo) {
    return { success: false, error: 'El correo para enviar la cotización es requerido' }
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
  if (!emailOk) {
    return { success: false, error: 'Ingrese un correo electrónico válido' }
  }

  const commercial_name = `${nombre} ${apellido}`.replace(/\s+/g, ' ').trim()
  const { data: customer, error: clientError } = await createCustomerQuick({
    commercial_name,
    legal_name: apellido,
    tax_id_nit: input.client.nit?.trim() || 'CF',
    phone: input.client.telefono?.trim() || null,
    address: input.client.direccion?.trim() || null,
    email: correo,
  })

  if (clientError || !customer) {
    return { success: false, error: clientError || 'No se pudo registrar el cliente' }
  }

  const title = `Cotización — ${commercial_name}`

  const solicitante_tipo = input.solicitante_tipo
  if (solicitante_tipo !== 'empresa' && solicitante_tipo !== 'cliente_final') {
    return { success: false, error: 'Indique si la solicitó una empresa o cliente final' }
  }

  let solicitante_empresa: string | null = null
  let solicitante_contacto: string | null = null
  if (solicitante_tipo === 'empresa') {
    solicitante_empresa = (input.solicitante_empresa || '').trim()
    solicitante_contacto = (input.solicitante_contacto || '').trim()
    if (!solicitante_empresa) {
      return { success: false, error: 'Ingrese el nombre de la empresa solicitante' }
    }
    if (!solicitante_contacto) {
      return { success: false, error: 'Ingrese el contacto dentro de la empresa' }
    }
  }

  const payment_method = input.payment_method
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return { success: false, error: 'Seleccione un método de pago válido' }
  }

  const normalized = (input.items || [])
    .map((line) => {
      const description = line.description.trim()
      const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1))
      const unit_price = Math.max(0, roundMoney(Number(line.unit_price) || 0))
      const line_total = roundMoney(unit_price * quantity)
      return {
        asset_id: line.asset_id || null,
        description,
        manufacturer: line.manufacturer?.trim() || null,
        model: line.model?.trim() || null,
        serial_number: line.serial_number?.trim() || null,
        condition: line.condition?.trim() || null,
        asset_type: line.asset_type?.trim() || null,
        quantity,
        unit_price,
        line_total,
      }
    })
    .filter((line) => line.description.length > 0)

  if (normalized.length === 0) {
    return { success: false, error: 'Agregue al menos un equipo con descripción y precio' }
  }

  const linesListedTotal = roundMoney(normalized.reduce((sum, line) => sum + line.line_total, 0))
  const { subtotal, tax_amount, total } = computeQuotationIva(
    linesListedTotal,
    input.prices_include_iva
  )

  const itemsFingerprint = (lines: typeof normalized) =>
    lines
      .map(
        (l) =>
          `${(l.serial_number || '').toLowerCase()}|${l.description.toLowerCase()}|${l.quantity}|${l.unit_price}`
      )
      .sort()
      .join(';;')

  const newFp = itemsFingerprint(normalized)
  const dupSince = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  const { data: recentQuotes } = await supabase
    .from('sales_quotations')
    .select(
      `
      id,
      quote_number,
      amount,
      payment_method,
      recipient_email,
      items:sales_quotation_items(serial_number, description, quantity, unit_price)
    `
    )
    .eq('customer_id', customer.id)
    .eq('status', 'pendiente_aprobacion')
    .gte('created_at', dupSince)

  for (const q of recentQuotes || []) {
    const row = q as {
      id: string
      quote_number: string
      amount: number
      payment_method: string
      recipient_email: string | null
      items?: Array<{
        serial_number: string | null
        description: string
        quantity: number
        unit_price: number
      }>
    }
    if (
      Number(row.amount) === total &&
      row.payment_method === payment_method &&
      (row.recipient_email || '').toLowerCase() === correo
    ) {
      const existingLines = (row.items || []).map((l) => ({
        serial_number: l.serial_number,
        description: l.description.trim(),
        quantity: l.quantity,
        unit_price: Number(l.unit_price),
        manufacturer: null,
        model: null,
        condition: null,
        asset_type: null,
        asset_id: null,
        line_total: roundMoney(Number(l.unit_price) * l.quantity),
      }))
      if (itemsFingerprint(existingLines) === newFp) {
        return {
          success: false,
          error: `Ya existe una cotización idéntica reciente (${row.quote_number}). Abra el detalle en lugar de crear otra.`,
          duplicateId: row.id,
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('sales_quotations')
    .insert({
      customer_id: customer.id,
      title,
      description: input.description?.trim() || null,
      amount: total,
      subtotal,
      tax_amount,
      prices_include_iva: input.prices_include_iva,
      solicitante_tipo,
      solicitante_empresa,
      solicitante_contacto,
      payment_method,
      recipient_email: correo,
      status: 'pendiente_aprobacion',
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('id, quote_number')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'No se pudo crear la cotización' }
  }

  const itemRows = normalized.map((line, index) => ({
    quotation_id: data.id,
    sort_order: index,
    ...line,
  }))

  const { error: itemsError } = await supabase.from('sales_quotation_items').insert(itemRows)

  if (itemsError) {
    await supabase.from('sales_quotations').delete().eq('id', data.id)
    return { success: false, error: itemsError.message }
  }

  revalidatePath(LIST_PATH)
  return { success: true, id: data.id, quoteNumber: data.quote_number }
}

export async function addQuotationComment(
  quotationId: string,
  body: string,
  commentType: QuotationCommentType = 'seguimiento'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const text = body.trim()
  if (!text) {
    return { success: false, error: 'Escriba un comentario' }
  }

  const type = commentType === 'avance_aprobacion' ? 'avance_aprobacion' : 'seguimiento'

  const { error } = await supabase.from('sales_quotation_comments').insert({
    quotation_id: quotationId,
    author_id: user?.id ?? null,
    body: text,
    comment_type: type,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`${LIST_PATH}/${quotationId}`)
  revalidatePath(LIST_PATH)
  return { success: true }
}

async function uploadQuotationAttachment(quotationId: string, file: File, folder: string) {
  const mime = file.type || 'application/octet-stream'
  const allowed =
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')

  if (!allowed) {
    return { ok: false as const, error: 'Solo se permiten imágenes o PDF' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${quotationId}/${folder}/${Date.now()}-${safeName || `adjunto.${ext}`}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  })

  if (uploadError) {
    console.error('[uploadQuotationAttachment]', uploadError)
    return { ok: false as const, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return {
    ok: true as const,
    url: urlData.publicUrl,
    name: file.name,
  }
}

export async function addQuotationApprovalAdvance(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const quotationId = String(formData.get('quotationId') || '')
  const bodyRaw = String(formData.get('body') || '').trim()
  const file = formData.get('attachment')

  if (!quotationId) {
    return { success: false, error: 'ID inválido' }
  }

  const hasFile = file instanceof File && file.size > 0
  if (!bodyRaw && !hasFile) {
    return { success: false, error: 'Escriba un avance o adjunte una foto' }
  }

  let attachment_url: string | null = null
  let attachment_name: string | null = null

  if (hasFile) {
    const uploaded = await uploadQuotationAttachment(quotationId, file, 'avances')
    if (!uploaded.ok) {
      return { success: false, error: uploaded.error }
    }
    attachment_url = uploaded.url
    attachment_name = uploaded.name
  }

  const body = bodyRaw || 'Imagen adjunta'

  const { error } = await supabase.from('sales_quotation_comments').insert({
    quotation_id: quotationId,
    author_id: user?.id ?? null,
    body,
    comment_type: 'avance_aprobacion',
    attachment_url,
    attachment_name,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`${LIST_PATH}/${quotationId}`)
  revalidatePath(LIST_PATH)
  return { success: true }
}

export type QuotationDiscountKind = 'percent' | 'fixed' | 'clear'

export async function updateQuotationDiscount(
  quotationId: string,
  input: { kind: QuotationDiscountKind; value: number; note?: string }
) {
  const supabase = await createClient()

  const { data: row, error: fetchError } = await supabase
    .from('sales_quotations')
    .select(
      `
      id,
      status,
      prices_include_iva,
      amount,
      items:sales_quotation_items(line_total)
    `
    )
    .eq('id', quotationId)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: 'Cotización no encontrada' }
  }

  const status = row.status as QuotationStatus
  if (status !== 'pendiente_aprobacion' && status !== 'aprobada') {
    return {
      success: false,
      error: 'El descuento solo aplica en cotizaciones pendientes o aprobadas',
    }
  }

  const items = (row as { items?: Array<{ line_total: number }> }).items || []
  const listedSum = listedTotalFromItems(items, Number(row.amount) || 0)
  const pricesIncludeIva = Boolean(row.prices_include_iva)

  let discount_percent = 0
  let discount_amount = 0
  let discount_note: string | null = input.note?.trim() || null

  if (input.kind === 'clear') {
    discount_note = null
  } else if (input.kind === 'percent') {
    const pct = Math.min(100, Math.max(0, roundMoney(Number(input.value) || 0)))
    if (pct <= 0) {
      return { success: false, error: 'Indique un porcentaje mayor a cero' }
    }
    discount_percent = pct
    discount_amount = 0
  } else if (input.kind === 'fixed') {
    const amt = Math.max(0, roundMoney(Number(input.value) || 0))
    if (amt <= 0) {
      return { success: false, error: 'Indique un monto mayor a cero' }
    }
    discount_amount = amt
    discount_percent = 0
  } else {
    return { success: false, error: 'Tipo de descuento inválido' }
  }

  const totals = computeQuotationTotalsWithDiscount(listedSum, pricesIncludeIva, {
    discount_percent,
    discount_amount,
  })

  const { error } = await supabase
    .from('sales_quotations')
    .update({
      discount_percent,
      discount_amount,
      discount_note,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      amount: totals.total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quotationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(LIST_PATH)
  revalidatePath(`${LIST_PATH}/${quotationId}`)
  return { success: true }
}

export async function approveQuotation(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('quotationId') || '')
  const file = formData.get('attachment')

  if (!id) {
    return { success: false, error: 'ID inválido' }
  }

  const { data: row } = await supabase
    .from('sales_quotations')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (!row) {
    return { success: false, error: 'Cotización no encontrada' }
  }
  if (row.status !== 'pendiente_aprobacion') {
    return { success: false, error: 'Solo se pueden aprobar cotizaciones pendientes' }
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Debe adjuntar PDF o foto de la cotización aprobada' }
  }

  const mime = file.type || 'application/octet-stream'
  const allowed =
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')

  if (!allowed) {
    return { success: false, error: 'Solo se permiten imágenes o PDF' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${id}/approved/${Date.now()}-${safeName || `cotizacion.${ext}`}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  })

  if (uploadError) {
    console.error('[approveQuotation] upload', uploadError)
    return { success: false, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('sales_quotations')
    .update({
      status: 'aprobada',
      approved_attachment_url: urlData.publicUrl,
      approved_attachment_name: file.name,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath(LIST_PATH)
  revalidatePath(`${LIST_PATH}/${id}`)
  return { success: true }
}

export async function rejectQuotation(quotationId: string, reason: string) {
  const supabase = await createClient()
  const rejection_reason = reason.trim()
  if (!rejection_reason) {
    return { success: false, error: 'Indique el motivo del rechazo' }
  }

  const { data: row } = await supabase
    .from('sales_quotations')
    .select('status')
    .eq('id', quotationId)
    .maybeSingle()

  if (!row) {
    return { success: false, error: 'Cotización no encontrada' }
  }
  if (row.status !== 'pendiente_aprobacion') {
    return { success: false, error: 'Solo se pueden rechazar cotizaciones pendientes' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('sales_quotations')
    .update({
      status: 'rechazada',
      rejection_reason,
      rejected_at: now,
      updated_at: now,
    })
    .eq('id', quotationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(LIST_PATH)
  revalidatePath(`${LIST_PATH}/${quotationId}`)
  return { success: true }
}

export async function acceptQuotation(quotationId: string) {
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('sales_quotations')
    .select('status')
    .eq('id', quotationId)
    .maybeSingle()

  if (!row) {
    return { success: false, error: 'Cotización no encontrada' }
  }
  if (row.status !== 'aprobada') {
    return { success: false, error: 'Solo cotizaciones aprobadas pueden marcarse como aceptadas' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('sales_quotations')
    .update({
      status: 'aceptada',
      accepted_at: now,
      updated_at: now,
    })
    .eq('id', quotationId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(LIST_PATH)
  revalidatePath(`${LIST_PATH}/${quotationId}`)
  return { success: true }
}

export async function deleteQuotation(quotationId: string) {
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('sales_quotations')
    .select('id, quote_number')
    .eq('id', quotationId)
    .maybeSingle()

  if (!row) {
    return { success: false, error: 'Cotización no encontrada' }
  }

  const { error } = await supabase.from('sales_quotations').delete().eq('id', quotationId)

  if (error) {
    console.error('[deleteQuotation]', error)
    return { success: false, error: error.message }
  }

  revalidatePath(LIST_PATH)
  return { success: true, quoteNumber: row.quote_number }
}
