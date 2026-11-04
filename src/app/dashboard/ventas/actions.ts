'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  buildWarrantyPayloadFromSaleOrder,
  type WarrantyPrintPayload,
} from '@/lib/ventas/printWarrantyPolicy'

// =====================================================
// INTERFACES
// =====================================================

export interface Customer {
  id: string
  commercial_name: string
  legal_name: string | null
  tax_id_nit: string
  entity_type: string
  phone: string | null
  email: string | null
  address: string | null
  city: string
}

export interface AssetForSale {
  id: string
  internal_tag: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string
  condition: string | null
  cost_amount: number
  sales_price: number | null
  photos: string[]
  created_at: string
  /** Resumen CPU/RAM/SSD para política de garantía */
  specsSummary?: string | null
  specifications?: Record<string, unknown> | null
}

const REMARKETING_WAREHOUSE_CODE = 'BOD-REM'
const REPLACEMENT_WAREHOUSE_CODE = 'BOD-RPL'
const REPLACEMENT_CLAIM_TYPE = 'reclamacion_cliente'
const REMARKETING_READY_STATUS = 'ready_for_sale'

export interface CartItem {
  asset: AssetForSale
  /** Precio base sin IVA (lo que se guarda / usa para calcular el 12%) */
  unitPrice: number
  /** Precio que digitó el vendedor (antes de desglosar IVA) */
  listedPrice?: number
  /** true = el precio listado ya traía IVA incluido */
  priceIncludesIva?: boolean
}

export interface SalesOrder {
  id: string
  order_number: string
  customer_id: string
  status: string
  total_amount: number
  warranty_days: number
  created_at: string
  customer?: Customer
}

// =====================================================
// BUSCAR CLIENTES (COMBOBOX)
// =====================================================

export async function searchCustomers(query: string) {
  const supabase = await createClient()

  if (query.length < 2) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('crm_entities')
    .select('id, commercial_name, legal_name, tax_id_nit, entity_type, phone, email, address, city')
    .eq('is_active', true)
    .or(`commercial_name.ilike.%${query}%,tax_id_nit.ilike.%${query}%,legal_name.ilike.%${query}%`)
    .limit(10)

  if (error) {
    console.error('Error searching customers:', error)
    return { data: [], error: error.message }
  }

  return { data: data as Customer[], error: null }
}

const isConsumidorFinalNit = (nit: string) => {
  const n = nit.trim().toUpperCase()
  return n === 'CF' || n === 'C/F' || n === 'CONSUMIDOR FINAL'
}

/** Alta rápida de cliente desde POS (NIT opcional → CF; CF puede repetirse) */
export async function createCustomerQuick(input: {
  commercial_name: string
  tax_id_nit?: string
  phone?: string | null
  email?: string | null
  address?: string | null
}) {
  const supabase = await createClient()
  const commercial_name = input.commercial_name.trim()
  const tax_id_nit = (input.tax_id_nit || 'CF').trim() || 'CF'
  const customerSelect =
    'id, commercial_name, legal_name, tax_id_nit, entity_type, phone, email, address, city'

  if (!commercial_name) {
    return { data: null as Customer | null, error: 'El nombre del cliente es requerido' }
  }

  // NIT real: reutilizar si ya existe
  if (!isConsumidorFinalNit(tax_id_nit)) {
    const { data: existing } = await supabase
      .from('crm_entities')
      .select(customerSelect)
      .eq('tax_id_nit', tax_id_nit)
      .maybeSingle()

    if (existing) {
      return { data: existing as Customer, error: null }
    }
  } else {
    // CF: reutilizar solo si mismo nombre (mismo comprador)
    const { data: sameName } = await supabase
      .from('crm_entities')
      .select(customerSelect)
      .ilike('commercial_name', commercial_name)
      .ilike('tax_id_nit', 'CF')
      .limit(1)
      .maybeSingle()
    if (sameName) {
      return { data: sameName as Customer, error: null }
    }
  }

  const { data, error } = await supabase
    .from('crm_entities')
    .insert({
      commercial_name,
      tax_id_nit: isConsumidorFinalNit(tax_id_nit) ? 'CF' : tax_id_nit,
      entity_type: 'client',
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      city: 'Guatemala',
      country: 'Guatemala',
      is_active: true,
    })
    .select(customerSelect)
    .single()

  if (error) {
    // Carrera / NIT duplicado real: devolver el existente
    if (String(error.message || '').includes('crm_entities_tax_id_nit') || error.code === '23505') {
      const { data: raced } = await supabase
        .from('crm_entities')
        .select(customerSelect)
        .eq('tax_id_nit', isConsumidorFinalNit(tax_id_nit) ? 'CF' : tax_id_nit)
        .ilike('commercial_name', commercial_name)
        .limit(1)
        .maybeSingle()
      if (raced) return { data: raced as Customer, error: null }

      if (!isConsumidorFinalNit(tax_id_nit)) {
        const { data: byNit } = await supabase
          .from('crm_entities')
          .select(customerSelect)
          .eq('tax_id_nit', tax_id_nit)
          .maybeSingle()
        if (byNit) return { data: byNit as Customer, error: null }
      }
    }
    return { data: null as Customer | null, error: error.message }
  }

  revalidatePath('/dashboard/clientes')
  return { data: data as Customer, error: null }
}

// =====================================================
// BUSCAR ACTIVOS PARA VENTA
// Filtra por status 'ready_for_sale' y busca por serial/modelo
// =====================================================

function buildSpecsSummary(specifications: unknown): string {
  if (!specifications || typeof specifications !== 'object') return ''
  const root = specifications as Record<string, unknown>
  const hw =
    root.hardware_specs && typeof root.hardware_specs === 'object'
      ? (root.hardware_specs as Record<string, unknown>)
      : root
  const parts: string[] = []
  if (typeof hw.processor === 'string' && hw.processor.trim()) parts.push(hw.processor.trim())
  const ramBits = [hw.ram_capacity, hw.ram_type]
    .filter((v) => typeof v === 'string' && String(v).trim())
    .map(String)
  if (ramBits.length) parts.push(`RAM ${ramBits.join(' ')}`)
  const diskBits = [hw.disk_capacity, hw.disk_type]
    .filter((v) => typeof v === 'string' && String(v).trim())
    .map(String)
  if (diskBits.length) {
    const disk = diskBits.join(' ')
    parts.push(/ssd|hdd|nvme/i.test(disk) ? disk : `SSD ${disk}`)
  }
  if (typeof hw.screen_size === 'string' && hw.screen_size.trim()) parts.push(hw.screen_size.trim())
  return parts.join(' | ')
}

function mapAssetForSale(row: Record<string, unknown>): AssetForSale {
  const grade =
    (row.condition as string | null) ||
    (row.condition_grade as string | null) ||
    null
  const specifications =
    row.specifications && typeof row.specifications === 'object'
      ? (row.specifications as Record<string, unknown>)
      : null
  return {
    id: String(row.id),
    internal_tag: String(row.internal_tag || ''),
    serial_number: (row.serial_number as string | null) ?? null,
    manufacturer: (row.manufacturer as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    asset_type: String(row.asset_type || 'Laptop'),
    condition: grade,
    cost_amount: row.cost_amount != null ? Number(row.cost_amount) : 0,
    sales_price: row.sales_price != null ? Number(row.sales_price) : null,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    created_at: String(row.created_at || ''),
    specifications,
    specsSummary: buildSpecsSummary(specifications),
  }
}

const ASSET_SALE_SELECT =
  'id, internal_tag, serial_number, manufacturer, model, asset_type, condition, condition_grade, cost_amount, sales_price, photos, created_at, current_warehouse_id, status, specifications'

/**
 * Crea (o reutiliza) un activo para venta manual cuando el serial
 * no está en Bodega Remarketing / ready_for_sale.
 */
export async function ensureManualSaleAsset(input: {
  serialNumber: string
  manufacturer: string
  model: string
  assetType?: string
  unitPrice: number
}) {
  const supabase = await createClient()
  const serial = input.serialNumber.trim()
  if (serial.length < 2) {
    return { data: null as AssetForSale | null, error: 'Serial inválido' }
  }

  const { data: existing } = await supabase
    .from('assets')
    .select(ASSET_SALE_SELECT)
    .ilike('serial_number', serial)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'sold') {
      return { data: null as AssetForSale | null, error: `El serial ${serial} ya fue vendido` }
    }
    // Permitir venta aunque no esté ready_for_sale (venta manual)
    const mapped = mapAssetForSale(existing as Record<string, unknown>)
    return {
      data: {
        ...mapped,
        sales_price: input.unitPrice,
        condition: mapped.condition || 'Grade B',
      },
      error: null,
    }
  }

  const tag = `MAN-${serial.slice(0, 12).toUpperCase()}`
  const { data: created, error } = await supabase
    .from('assets')
    .insert({
      internal_tag: tag,
      serial_number: serial,
      manufacturer: input.manufacturer,
      model: input.model,
      asset_type: input.assetType || 'laptop',
      condition: 'Grade B',
      status: 'ready_for_sale',
      cost_amount: 0,
      sales_price: input.unitPrice,
      photos: [],
    })
    .select('id, internal_tag, serial_number, manufacturer, model, asset_type, condition, cost_amount, sales_price, photos, created_at')
    .single()

  if (error) {
    return { data: null as AssetForSale | null, error: error.message }
  }

  return { data: created as AssetForSale, error: null }
}

/** Detalle de precio del equipo de reemplazo (serial exacto, ready_for_sale). */
export async function lookupReplacementAssetForExchange(serial: string) {
  const supabase = await createClient()
  const q = serial.trim()
  if (q.length < 2) {
    return { data: null as AssetForSale | null, error: null as string | null }
  }

  const { data, error } = await supabase
    .from('assets')
    .select(ASSET_SALE_SELECT)
    .eq('status', REMARKETING_READY_STATUS)
    .ilike('serial_number', q)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }
  if (!data) {
    return { data: null, error: `No hay equipo listo para venta con serial "${q}"` }
  }

  return { data: mapAssetForSale(data as Record<string, unknown>), error: null }
}

export async function searchAssetsForSale(query: string) {
  const supabase = await createClient()
  const q = query.trim()

  // Exact serial first (scanner / paste)
  if (q.length >= 2) {
    const { data: exact, error: exactErr } = await supabase
      .from('assets')
      .select(ASSET_SALE_SELECT)
      .eq('status', 'ready_for_sale')
      .ilike('serial_number', q)
      .limit(5)

    if (!exactErr && exact && exact.length > 0) {
      return { data: exact.map((row) => mapAssetForSale(row as Record<string, unknown>)), error: null }
    }
  }

  if (q.length < 2) {
    const { data, error } = await supabase
      .from('assets')
      .select(ASSET_SALE_SELECT)
      .eq('status', 'ready_for_sale')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return { data: [], error: error.message }
    }
    return {
      data: (data || []).map((row) => mapAssetForSale(row as Record<string, unknown>)),
      error: null,
    }
  }

  const safe = q.replace(/[%_,]/g, ' ')
  const { data, error } = await supabase
    .from('assets')
    .select(ASSET_SALE_SELECT)
    .eq('status', 'ready_for_sale')
    .or(
      `serial_number.ilike.%${safe}%,internal_tag.ilike.%${safe}%,manufacturer.ilike.%${safe}%,model.ilike.%${safe}%`
    )
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error searching assets:', error)
    return { data: [], error: error.message }
  }

  return {
    data: (data || []).map((row) => mapAssetForSale(row as Record<string, unknown>)),
    error: null,
  }
}

export async function getRemarketingWarehouseStock() {
  const supabase = await createClient()

  const { data: warehouse, error: warehouseError } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', REMARKETING_WAREHOUSE_CODE)
    .single()

  if (warehouseError || !warehouse?.id) {
    console.error('Remarketing warehouse lookup failed:', warehouseError)
    return { count: 0, error: warehouseError?.message ?? 'Bodega Remarketing no encontrada' }
  }

  const { count, error: assetsError } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('current_warehouse_id', warehouse.id)
    .eq('status', REMARKETING_READY_STATUS)

  if (assetsError) {
    console.error('Error counting Remarketing assets:', assetsError)
    return { count: 0, error: assetsError.message }
  }

  return { count: count ?? 0, error: null }
}

// =====================================================
// OBTENER PRECIO DESDE BODEGA REMARKETING
// =====================================================

export async function getRemarketingPrice(params: { manufacturer: string; model: string }) {
  const supabase = await createClient()

  // Obtener ID de bodega Remarketing
  const { data: warehouse, error: warehouseError } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', REMARKETING_WAREHOUSE_CODE)
    .single()

  if (warehouseError || !warehouse?.id) {
    console.error('Remarketing warehouse lookup failed:', warehouseError)
    return { price: null, error: 'Bodega Remarketing no encontrada' }
  }

  // Buscar assets en Remarketing con la marca y modelo especificados que tengan precio
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('sales_price')
    .eq('current_warehouse_id', warehouse.id)
    .eq('status', REMARKETING_READY_STATUS)
    .ilike('manufacturer', params.manufacturer)
    .ilike('model', params.model)
    .not('sales_price', 'is', null)
    .order('sales_price', { ascending: false })
    .limit(10)

  if (assetsError) {
    console.error('Error fetching remarketing prices:', assetsError)
    return { price: null, error: 'Error al obtener precios' }
  }

  if (!assets || assets.length === 0) {
    return { price: null, error: 'No hay equipos con precio asignado en Remarketing' }
  }

  // Calcular precio promedio de los equipos encontrados
  const prices = assets.map(a => a.sales_price).filter((p): p is number => p !== null)
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length

  return { price: Math.round(avgPrice * 100) / 100, error: null }
}

// =====================================================
// PROCESAR VENTA (TRANSACCIONAL)
// =====================================================

export type SalePaymentMethod = 'efectivo' | 'tarjeta' | 'visacuota'

interface ProcessSaleData {
  customerId: string
  cartItems: Array<{
    /** null = línea de servicio / cargo sin equipo */
    assetId?: string | null
    unitPrice: number
    /** Precio de etiqueta / público (para assets.sales_price en bodega) */
    listedPrice?: number
    priceIncludesIva?: boolean
    description: string
    serialNumber?: string | null
    conditionGrade?: string | null
  }>
  warrantyDays?: number
  paymentMethod?: SalePaymentMethod | string
  /** Cuotas Visacuota (solo si paymentMethod = visacuota) */
  installments?: number
  notes?: string
  /** Referencia interna POS (Invoice); si vacío se genera FACT-… */
  invoiceNumber?: string
  /** Número de factura electrónica SAT (FEL) */
  satInvoiceNumber?: string
}

function buildInternalInvoiceNumber(manual?: string | null): string {
  const trimmed = (manual || '').trim()
  if (trimmed) return trimmed
  return `FACT-${Math.floor(10_000_000 + Math.random() * 90_000_000)}`
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** Precio de venta a persistir en inventario (P. base remarketing). */
function retailSalePriceForLine(item: {
  unitPrice: number
  listedPrice?: number
  priceIncludesIva?: boolean
}): number {
  const listed = item.listedPrice != null ? Number(item.listedPrice) : NaN
  if (Number.isFinite(listed) && listed > 0) {
    return roundMoney(listed)
  }
  return roundMoney(Number(item.unitPrice) || 0)
}

/**
 * Guarda precio de venta en el activo (desde POS / facturación).
 * Útil cuando en bodega Remarketing no se puede editar el P. base.
 */
export async function persistAssetRetailSalePrice(assetId: string, retailPrice: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  const id = (assetId || '').trim()
  const price = roundMoney(Number(retailPrice))
  if (!id || !Number.isFinite(price) || price < 0) {
    return { success: false, error: 'Precio o activo inválido' }
  }

  const { error } = await supabase
    .from('assets')
    .update({ sales_price: price, updated_at: new Date().toISOString() })
    .eq('id', id)
    .neq('status', 'sold')

  if (error) {
    console.error('persistAssetRetailSalePrice:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/inventario/bodega')
  revalidatePath('/dashboard/ventas')
  return { success: true }
}

async function applyRetailPricesToAssetLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lines: ProcessSaleData['cartItems']
) {
  for (const item of lines) {
    if (!item.assetId) continue
    const price = retailSalePriceForLine(item)
    await supabase
      .from('assets')
      .update({ sales_price: price, updated_at: new Date().toISOString() })
      .eq('id', item.assetId)
  }
}

export async function processSale(data: ProcessSaleData) {
  const supabase = await createClient()

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  // Validaciones
  if (!data.customerId) {
    return { success: false, error: 'Debe seleccionar un cliente' }
  }

  if (data.cartItems.length === 0) {
    return { success: false, error: 'Agrega equipos o servicios al carrito' }
  }

  // Calcular total (precios del carrito son base; IVA 12% se guarda en tax_amount)
  const subtotal = data.cartItems.reduce((sum, item) => sum + item.unitPrice, 0)
  const taxAmount = Math.round(subtotal * 0.12 * 100) / 100
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100
  const invoiceNumber = buildInternalInvoiceNumber(data.invoiceNumber)
  const satInvoiceNumber = (data.satInvoiceNumber || '').trim() || null
  const paymentMethod = (data.paymentMethod || 'efectivo').toLowerCase()
  const installments =
    paymentMethod === 'visacuota' && data.installments && data.installments > 0
      ? Math.floor(data.installments)
      : null
  const paymentNotes =
    paymentMethod === 'visacuota' && installments
      ? `Visacuota: ${installments} cuota${installments === 1 ? '' : 's'}`
      : null
  const customerNotes = data.notes?.trim() || null
  const internalNotes = [customerNotes, paymentNotes].filter(Boolean).join(' · ') || null
  const assetCartItems = data.cartItems.filter((item) => !!item.assetId)

  // Precio de venta en inventario (desde lo facturado en POS)
  await applyRetailPricesToAssetLines(supabase, assetCartItems)

  // Intentar usar la función RPC (solo si todos los ítems tienen asset)
  const rpcParams = {
    p_customer_id: data.customerId,
    p_items: data.cartItems
      .filter((item) => !!item.assetId)
      .map((item) => ({
        asset_id: item.assetId,
        unit_price: item.unitPrice,
        product_description: item.description,
        serial_number: item.serialNumber ?? null,
        condition_grade: item.conditionGrade ?? null,
      })),
    p_warranty_days: data.warrantyDays || 90,
    p_payment_method: paymentMethod,
    p_notes: internalNotes,
    p_created_by: user.id,
    p_invoice_number: invoiceNumber,
  }

  // RPC no soporta líneas de servicio sin asset → usar fallback
  const canUseRpc = assetCartItems.length === data.cartItems.length && assetCartItems.length > 0
  const { data: rpcResult, error: rpcError } = canUseRpc
    ? await supabase.rpc('create_sale_order', rpcParams)
    : { data: null, error: { message: 'fallback_services' } as { message: string } }

  if (!rpcError && rpcResult?.success) {
    if (rpcResult.order_id) {
      await supabase
        .from('sales_orders')
        .update({
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().slice(0, 10),
          tax_amount: taxAmount,
          subtotal,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          internal_notes: internalNotes,
          customer_notes: customerNotes,
          sat_invoice_number: satInvoiceNumber,
        })
        .eq('id', rpcResult.order_id)
    }
    revalidatePath('/dashboard/ventas')
    revalidatePath('/dashboard/inventario')
    revalidatePath('/dashboard/inventario/bodega')
    let warrantyPolicyNumber: string | undefined
    if (rpcResult.order_id && assetCartItems.length > 0) {
      const pol = await registerWarrantyPolicyPrint(supabase, {
        orderId: rpcResult.order_id,
        printedBy: user.id,
        printKind: 'initial',
      })
      if (pol) warrantyPolicyNumber = pol
    }
    return { 
      success: true, 
      data: {
        orderId: rpcResult.order_id,
        orderNumber: rpcResult.order_number,
        invoiceNumber: invoiceNumber || undefined,
        warrantyPolicyNumber,
      }
    }
  }

  // FALLBACK: Crear manualmente si RPC no existe
  console.log('RPC no disponible, creando venta manualmente...', rpcError?.message)

  try {
    // 1. Verificar disponibilidad solo de equipos (servicios no tienen asset)
    const assetIds = assetCartItems.map((item) => item.assetId!).filter(Boolean)
    if (assetIds.length > 0) {
      const { data: assets, error: checkError } = await supabase
        .from('assets')
        .select('id, status')
        .in('id', assetIds)

      if (checkError) {
        return { success: false, error: 'Error verificando disponibilidad' }
      }

      const unavailable = assets?.filter((a) => a.status === 'sold')
      if (unavailable && unavailable.length > 0) {
        return { success: false, error: 'Algunos equipos ya fueron vendidos' }
      }
    }

    // 2. Crear orden (referencia interna UUID corta — sin FACT-/SO- consecutivos de negocio)
    const fallbackOrderNumber = `VTA-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        order_number: fallbackOrderNumber,
        customer_id: data.customerId,
        status: 'confirmed',
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        warranty_days: data.warrantyDays || 90,
        payment_method: paymentMethod,
        internal_notes: internalNotes,
        customer_notes: customerNotes,
        invoice_number: invoiceNumber,
        sat_invoice_number: satInvoiceNumber,
        invoice_date: new Date().toISOString().slice(0, 10),
        sales_rep_id: user.id,
        created_by: user.id,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .select('id, order_number, invoice_number')
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return { success: false, error: orderError.message }
    }

    // 3. Crear items de la orden
    const warrantyEnd = new Date()
    warrantyEnd.setDate(warrantyEnd.getDate() + (data.warrantyDays || 90))

    const itemsToInsert = data.cartItems.map((item) => ({
      order_id: order.id,
      asset_id: item.assetId || null,
      product_description: item.description,
      serial_number: item.serialNumber || null,
      condition_grade: item.conditionGrade || null,
      list_price: item.unitPrice,
      unit_price: item.unitPrice,
      warranty_days: item.assetId ? data.warrantyDays || 90 : 0,
      warranty_start_date: item.assetId ? new Date().toISOString().split('T')[0] : null,
      warranty_end_date: item.assetId ? warrantyEnd.toISOString().split('T')[0] : null,
    }))

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      // Rollback: eliminar orden
      await supabase.from('sales_orders').delete().eq('id', order.id)
      return { success: false, error: itemsError.message }
    }

    // 4. Actualizar activos a vendido (solo equipos; servicios no tocan inventario)
    const soldAssetIds = assetCartItems.map((item) => item.assetId!)
    for (const item of assetCartItems) {
      const salePrice = retailSalePriceForLine(item)
      await supabase
        .from('assets')
        .update({
          status: 'sold',
          sales_price: salePrice,
          current_warehouse_id: null,
          sold_to: data.customerId,
          sold_at: new Date().toISOString(),
          sold_by: user.id,
          sale_order_id: order.id,
          warranty_end_date: warrantyEnd.toISOString().split('T')[0],
        })
        .eq('id', item.assetId!)
    }

    if (soldAssetIds.length > 0) {
      await supabase
        .from('work_orders')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .in('asset_id', soldAssetIds)
        .not(
          'status',
          'in',
          '("qc_passed","completed","cancelled","closed","cancelada","cerrada","completada")'
        )
    }

    revalidatePath('/dashboard/ventas')
    revalidatePath('/dashboard/inventario')
    revalidatePath('/dashboard/inventario/bodega')

    let warrantyPolicyNumber: string | undefined
    if (assetCartItems.length > 0) {
      const pol = await registerWarrantyPolicyPrint(supabase, {
        orderId: order.id,
        printedBy: user.id,
        printKind: 'initial',
      })
      if (pol) warrantyPolicyNumber = pol
    }

    return { 
      success: true, 
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        invoiceNumber: order.invoice_number || invoiceNumber || undefined,
        warrantyPolicyNumber,
      }
    }

  } catch (err) {
    console.error('Error in processSale:', err)
    return { success: false, error: 'Error inesperado al procesar la venta' }
  }
}

export async function updateSalesSatInvoice(orderId: string, satInvoiceNumber: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }
  if (!orderId) {
    return { success: false, error: 'Venta no válida' }
  }

  const value = satInvoiceNumber.trim() || null
  const { error } = await supabase
    .from('sales_orders')
    .update({
      sat_invoice_number: value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    console.error('updateSalesSatInvoice:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/ventas')
  revalidatePath(`/dashboard/ventas/${orderId}`)
  return { success: true, data: { satInvoiceNumber: value } }
}

// =====================================================
// POST-VENTA: GARANTÍA (CAMBIO DE SERIE) Y DEVOLUCIÓN
// =====================================================

async function getWarehouseIdByCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
  label: string
) {
  const { data: warehouse, error } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', code)
    .maybeSingle()
  if (error || !warehouse?.id) {
    return { id: null as string | null, error: error?.message ?? `${label} no encontrada` }
  }
  return { id: warehouse.id, error: null }
}

async function getRemarketingWarehouseId(supabase: Awaited<ReturnType<typeof createClient>>) {
  return getWarehouseIdByCode(supabase, REMARKETING_WAREHOUSE_CODE, 'Bodega Remarketing')
}

async function getReplacementWarehouseId(supabase: Awaited<ReturnType<typeof createClient>>) {
  return getWarehouseIdByCode(supabase, REPLACEMENT_WAREHOUSE_CODE, 'Bodega de Remplazo')
}

export type SaleExchangeRecord = {
  id: string
  from_serial: string | null
  to_serial: string | null
  reason: string | null
  claim_type: string | null
  return_warehouse_code: string | null
  upgrade_subtotal?: number | null
  upgrade_tax?: number | null
  upgrade_total?: number | null
  upgrade_payment_method?: string | null
  created_at: string
}

export async function getSaleExchangesForOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sale_exchanges')
    .select(
      'id, from_serial, to_serial, reason, claim_type, return_warehouse_code, upgrade_subtotal, upgrade_tax, upgrade_total, upgrade_payment_method, created_at'
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    if (String(error.message).includes('sale_exchanges')) {
      return { data: [] as SaleExchangeRecord[], error: null }
    }
    return { data: [] as SaleExchangeRecord[], error: error.message }
  }
  return { data: (data || []) as SaleExchangeRecord[], error: null }
}

export type SaleSerialSearchHint = {
  serial: string
  message: string
  kind: 'sold' | 'returned_for_replacement'
  at: string
}

async function allocateWarrantyPolicyNumber(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data, error } = await supabase.rpc('next_warranty_policy_number')
  if (!error && typeof data === 'string' && data.trim()) {
    return data.trim()
  }
  const year = new Date().getFullYear()
  const fallback = `POL-GT-${year}-${Math.floor(10000 + Math.random() * 89999)}`
  console.warn('next_warranty_policy_number RPC fallback:', error?.message)
  return fallback
}

async function registerWarrantyPolicyPrint(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    orderId: string
    printedBy: string
    printKind: 'initial' | 'exchange_reprint'
    exchangeId?: string | null
    exchangeFromSerial?: string | null
    exchangeToSerial?: string | null
    exchangeReason?: string | null
  }
): Promise<string | null> {
  const policyNumber = await allocateWarrantyPolicyNumber(supabase)
  const { error } = await supabase.from('warranty_policy_prints').insert({
    policy_number: policyNumber,
    order_id: input.orderId,
    exchange_id: input.exchangeId ?? null,
    print_kind: input.printKind,
    exchange_from_serial: input.exchangeFromSerial ?? null,
    exchange_to_serial: input.exchangeToSerial ?? null,
    exchange_reason: input.exchangeReason ?? null,
    printed_by: input.printedBy,
  })
  if (error) {
    console.warn('warranty_policy_prints insert:', error.message)
    return policyNumber
  }
  return policyNumber
}

export async function getLatestWarrantyPolicyNumber(orderId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('warranty_policy_prints')
    .select('policy_number')
    .eq('order_id', orderId)
    .order('printed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.policy_number ?? null
}

/** Payload listo para PDF (incluye consecutivo e historial de reemplazos). */
export async function getWarrantyPrintPayloadForOrder(
  orderId: string,
  options?: { registerIfMissing?: boolean }
): Promise<{ payload: WarrantyPrintPayload | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: order, error: orderErr } = await getSalesOrderById(orderId)
  if (orderErr || !order) {
    return { payload: null, error: orderErr || 'Venta no encontrada' }
  }

  const { data: exchanges } = await getSaleExchangesForOrder(orderId)
  let policyNumber = await getLatestWarrantyPolicyNumber(orderId)

  if (!policyNumber && options?.registerIfMissing && user) {
    policyNumber = await registerWarrantyPolicyPrint(supabase, {
      orderId,
      printedBy: user.id,
      printKind: exchanges?.length ? 'exchange_reprint' : 'initial',
    })
  }

  const payload = buildWarrantyPayloadFromSaleOrder(order, {
    policyNumber,
    exchanges: (exchanges || []).map((ex) => ({
      from_serial: ex.from_serial,
      to_serial: ex.to_serial,
      reason: ex.reason,
      created_at: ex.created_at,
      upgrade_total: ex.upgrade_total,
      upgrade_payment_method: ex.upgrade_payment_method,
    })),
  })

  return { payload, error: null }
}

async function findOrderIdsBySerialTerm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  term: string
): Promise<string[]> {
  const safe = term.replace(/[%_,]/g, ' ').trim()
  if (safe.length < 2) return []

  const ids = new Set<string>()

  const { data: itemRows } = await supabase
    .from('sales_order_items')
    .select('order_id, serial_number')
    .or(`serial_number.ilike.%${safe}%`)

  itemRows?.forEach((row) => {
    if (row.order_id) ids.add(row.order_id as string)
  })

  const { data: assetRows } = await supabase
    .from('assets')
    .select('sale_order_id, serial_number')
    .ilike('serial_number', `%${safe}%`)
    .not('sale_order_id', 'is', null)

  assetRows?.forEach((row) => {
    if (row.sale_order_id) ids.add(row.sale_order_id as string)
  })

  try {
    const { data: exRows } = await supabase
      .from('sale_exchanges')
      .select('order_id, from_serial, to_serial')
      .or(`from_serial.ilike.%${safe}%,to_serial.ilike.%${safe}%`)

    exRows?.forEach((row) => {
      if (row.order_id) ids.add(row.order_id as string)
    })
  } catch {
    // tabla aún no migrada
  }

  return Array.from(ids)
}

function buildSerialSearchHint(
  term: string,
  order: {
    id: string
    created_at: string
    items?: Array<{ serial_number?: string | null; asset?: { serial_number?: string | null } | null }> | null
  },
  exchanges: SaleExchangeRecord[]
): SaleSerialSearchHint | null {
  const q = term.trim().toLowerCase()
  if (q.length < 2) return null

  for (const ex of exchanges) {
    const from = (ex.from_serial || '').toLowerCase()
    const to = (ex.to_serial || '').toLowerCase()
    if (from.includes(q)) {
      return {
        serial: ex.from_serial || term,
        kind: 'returned_for_replacement',
        at: ex.created_at,
        message: `Vendida y devuelta por reemplazo el ${new Date(ex.created_at).toLocaleString('es-GT')} → entrega ${ex.to_serial || '—'}`,
      }
    }
    if (to.includes(q)) {
      return {
        serial: ex.to_serial || term,
        kind: 'sold',
        at: ex.created_at,
        message: `Entregada por reemplazo (garantía) el ${new Date(ex.created_at).toLocaleString('es-GT')} · antes ${ex.from_serial || '—'}`,
      }
    }
  }

  const items = order.items || []
  for (const it of items) {
    const sn = (it.serial_number || it.asset?.serial_number || '').toLowerCase()
    if (sn.includes(q)) {
      return {
        serial: it.serial_number || it.asset?.serial_number || term,
        kind: 'sold',
        at: order.created_at,
        message: `Vendida el ${new Date(order.created_at).toLocaleString('es-GT')}`,
      }
    }
  }

  return null
}

function lineRefundAmounts(unitPrice: number) {
  const base = Number(unitPrice) || 0
  const tax = Math.round(base * 0.12 * 100) / 100
  const total = Math.round((base + tax) * 100) / 100
  return { base, tax, total }
}

/** Monto total cobrado (con IVA) → base + IVA */
function splitTotalWithIva(totalGross: number) {
  const total = Math.max(0, Math.round(Number(totalGross) * 100) / 100)
  if (total <= 0) return { base: 0, tax: 0, total: 0 }
  const base = Math.round((total / 1.12) * 100) / 100
  const tax = Math.round((total - base) * 100) / 100
  return { base, tax, total }
}

function appendOrderNote(existing: string | null | undefined, line: string) {
  const prev = (existing || '').trim()
  return prev ? `${prev}\n${line}` : line
}

async function recomputeOrderRefundStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string
) {
  const { data: items } = await supabase
    .from('sales_order_items')
    .select('id, line_status, asset_id')
    .eq('order_id', orderId)

  const rows = items || []
  if (rows.length === 0) return

  const billable = rows.filter((r) => r.asset_id)
  const refundedCount = billable.filter((r) => r.line_status === 'refunded').length
  let status: string | null = null
  if (billable.length > 0 && refundedCount === billable.length) {
    status = 'refunded'
  } else if (refundedCount > 0) {
    status = 'partially_refunded'
  }

  if (status) {
    await supabase.from('sales_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
  }
}

/** Reemplazo por garantía: devuelve serie vendida a inventario (diagnóstico) y entrega otra serie en la misma venta. */
export async function exchangeSaleOrderItem(input: {
  orderItemId: string
  newSerial: string
  reason?: string
  /** Monto adicional cobrado al cliente (Q, incluye IVA 12%) por upgrade */
  upgradeDifferenceTotal?: number | null
  upgradePaymentMethod?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuario no autenticado' }

  const newSerial = input.newSerial.trim()
  const reason = (input.reason || '').trim()
  if (newSerial.length < 2) return { success: false, error: 'Serial de reemplazo inválido' }
  if (reason.length < 8) {
    return {
      success: false,
      error: 'Indique la razón del cambio (mínimo 8 caracteres), por ejemplo la falla reportada',
    }
  }

  const { data: item, error: itemErr } = await supabase
    .from('sales_order_items')
    .select(
      `
      id, order_id, asset_id, serial_number, line_status,
      warranty_end_date, warranty_start_date, warranty_days, unit_price, condition_grade,
      order:sales_orders(id, status, customer_id, internal_notes, subtotal, tax_amount, total_amount, payment_method)
    `
    )
    .eq('id', input.orderItemId)
    .single()

  if (itemErr || !item) return { success: false, error: 'Línea de venta no encontrada' }
  if (!item.asset_id) return { success: false, error: 'Esta línea no es un equipo serializado' }
  if (item.line_status === 'refunded') return { success: false, error: 'La línea ya fue devuelta' }

  const upgradeSplit = splitTotalWithIva(Number(input.upgradeDifferenceTotal) || 0)
  const upgradePayMethod = (input.upgradePaymentMethod || '').trim()

  const orderJoined = item.order as
    | {
        id: string
        status: string
        customer_id: string
        internal_notes: string | null
        subtotal: number | null
        tax_amount: number | null
        total_amount: number | null
        payment_method: string | null
      }
    | {
        id: string
        status: string
        customer_id: string
        internal_notes: string | null
        subtotal: number | null
        tax_amount: number | null
        total_amount: number | null
        payment_method: string | null
      }[]
    | null
  const order = Array.isArray(orderJoined) ? orderJoined[0] : orderJoined
  if (!order) return { success: false, error: 'Orden no encontrada' }
  if (['cancelled', 'refunded'].includes(order.status)) {
    return { success: false, error: 'La venta está cancelada o reembolsada' }
  }

  if (upgradeSplit.total > 0 && !upgradePayMethod && !order.payment_method) {
    return { success: false, error: 'Indique forma de pago de la diferencia' }
  }
  const resolvedUpgradePayment =
    upgradeSplit.total > 0
      ? (upgradePayMethod || order.payment_method || 'efectivo').toLowerCase()
      : null

  const { data: fromAsset, error: fromErr } = await supabase
    .from('assets')
    .select('id, status, serial_number, sale_order_id, specifications')
    .eq('id', item.asset_id)
    .single()

  if (fromErr || !fromAsset) return { success: false, error: 'Equipo original no encontrado' }
  if (fromAsset.status !== 'sold' || fromAsset.sale_order_id !== order.id) {
    return { success: false, error: 'El equipo de la línea no coincide con la venta actual' }
  }

  const { data: toAsset, error: toErr } = await supabase
    .from('assets')
    .select('id, status, serial_number, manufacturer, model, condition_grade, current_warehouse_id')
    .ilike('serial_number', newSerial)
    .maybeSingle()

  if (toErr || !toAsset) {
    return { success: false, error: `No existe equipo con serial "${newSerial}"` }
  }
  if (toAsset.status !== REMARKETING_READY_STATUS) {
    return { success: false, error: 'El equipo de reemplazo no está listo para venta' }
  }
  if (toAsset.id === fromAsset.id) {
    return { success: false, error: 'El serial de reemplazo es el mismo que el vendido' }
  }

  const { id: rplWhId, error: whErr } = await getReplacementWarehouseId(supabase)
  if (!rplWhId) return { success: false, error: whErr || 'Bodega de Remplazo (BOD-RPL) no encontrada' }

  const now = new Date().toISOString()
  const fromSn = fromAsset.serial_number || item.serial_number || '—'
  const toSn = toAsset.serial_number || newSerial
  const prevSpecs =
    fromAsset.specifications && typeof fromAsset.specifications === 'object'
      ? (fromAsset.specifications as Record<string, unknown>)
      : {}

  const { error: returnErr } = await supabase
    .from('assets')
    .update({
      status: 'received',
      current_warehouse_id: rplWhId,
      sold_to: null,
      sold_at: null,
      sold_by: null,
      sale_order_id: null,
      warranty_end_date: null,
      updated_at: now,
      specifications: {
        ...prevSpecs,
        warranty_return: true,
        claim_type: REPLACEMENT_CLAIM_TYPE,
        claim_label: 'Reclamación del Cliente',
        return_warehouse_code: REPLACEMENT_WAREHOUSE_CODE,
        return_reason: reason,
        replaced_by_serial: toSn,
        original_sale_order_id: order.id,
        returned_at: now,
      },
    })
    .eq('id', fromAsset.id)

  if (returnErr) return { success: false, error: returnErr.message }

  const salePrice = Number(item.unit_price) || 0
  const { error: sellErr } = await supabase
    .from('assets')
    .update({
      status: 'sold',
      current_warehouse_id: null,
      sales_price: salePrice,
      sold_to: order.customer_id,
      sold_at: now,
      sold_by: user.id,
      sale_order_id: order.id,
      warranty_end_date: item.warranty_end_date,
      updated_at: now,
    })
    .eq('id', toAsset.id)

  if (sellErr) {
    await supabase
      .from('assets')
      .update({
        status: 'sold',
        current_warehouse_id: null,
        sold_to: order.customer_id,
        sold_at: now,
        sold_by: user.id,
        sale_order_id: order.id,
        warranty_end_date: item.warranty_end_date,
      })
      .eq('id', fromAsset.id)
    return { success: false, error: sellErr.message }
  }

  const description = [toAsset.manufacturer, toAsset.model].filter(Boolean).join(' ').trim() || undefined
  const { error: itemUpdErr } = await supabase
    .from('sales_order_items')
    .update({
      asset_id: toAsset.id,
      serial_number: toSn,
      condition_grade: toAsset.condition_grade || item.condition_grade,
      ...(description ? { product_description: description } : {}),
    })
    .eq('id', item.id)

  if (itemUpdErr) return { success: false, error: itemUpdErr.message }

  const { data: exchangeRow, error: exErr } = await supabase
    .from('sale_exchanges')
    .insert({
      order_id: order.id,
      order_item_id: item.id,
      from_asset_id: fromAsset.id,
      to_asset_id: toAsset.id,
      from_serial: fromSn,
      to_serial: toSn,
      reason,
      claim_type: REPLACEMENT_CLAIM_TYPE,
      return_warehouse_code: REPLACEMENT_WAREHOUSE_CODE,
      upgrade_subtotal: upgradeSplit.base,
      upgrade_tax: upgradeSplit.tax,
      upgrade_total: upgradeSplit.total,
      upgrade_payment_method: resolvedUpgradePayment,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (exErr) return { success: false, error: exErr.message }

  const warrantyPolicyNumber = await registerWarrantyPolicyPrint(supabase, {
    orderId: order.id,
    printedBy: user.id,
    printKind: 'exchange_reprint',
    exchangeId: exchangeRow?.id,
    exchangeFromSerial: fromSn,
    exchangeToSerial: toSn,
    exchangeReason: reason,
  })

  const stamp = new Date().toLocaleString('es-GT')
  const diffNote =
    upgradeSplit.total > 0
      ? ` Diferencia cobrada Q${upgradeSplit.total.toFixed(2)} (${resolvedUpgradePayment}).`
      : ''
  const internalNote = `[${stamp}] Reclamación cliente · BOD-RPL: ingresa ${fromSn} · entrega ${toSn}.${diffNote} ${reason}`
  const customerNote = `Cambio de equipo (garantía): ${fromSn} → ${toSn}.${diffNote} Motivo: ${reason}`

  const { data: orderNotes } = await supabase
    .from('sales_orders')
    .select('customer_notes, subtotal, tax_amount, total_amount')
    .eq('id', order.id)
    .single()

  const nextSubtotal =
    Math.round((Number(orderNotes?.subtotal ?? order.subtotal ?? 0) + upgradeSplit.base) * 100) / 100
  const nextTax =
    Math.round((Number(orderNotes?.tax_amount ?? order.tax_amount ?? 0) + upgradeSplit.tax) * 100) / 100
  const nextTotal =
    Math.round((Number(orderNotes?.total_amount ?? order.total_amount ?? 0) + upgradeSplit.total) * 100) /
    100

  await supabase
    .from('sales_orders')
    .update({
      internal_notes: appendOrderNote(order.internal_notes, internalNote),
      customer_notes: appendOrderNote(orderNotes?.customer_notes, customerNote),
      ...(upgradeSplit.total > 0
        ? { subtotal: nextSubtotal, tax_amount: nextTax, total_amount: nextTotal }
        : {}),
      updated_at: now,
    })
    .eq('id', order.id)

  revalidatePath('/dashboard/ventas')
  revalidatePath(`/dashboard/ventas/${order.id}`)
  revalidatePath('/dashboard/inventario/bodega')

  return {
    success: true,
    data: {
      fromSerial: fromSn,
      toSerial: toSn,
      orderId: order.id,
      warrantyPolicyNumber: warrantyPolicyNumber || undefined,
      upgradeDifferenceTotal: upgradeSplit.total > 0 ? upgradeSplit.total : undefined,
    },
  }
}

/** Devolución de dinero por línea (equipo ingresa a Bodega de Remplazo — BOD-RPL). */
export async function refundSaleOrderItem(input: {
  orderItemId: string
  reason?: string
  refundMethod?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuario no autenticado' }

  const { data: item, error: itemErr } = await supabase
    .from('sales_order_items')
    .select(
      `
      id, order_id, asset_id, serial_number, line_status, unit_price,
      order:sales_orders(id, status, payment_method, internal_notes, refunded_amount)
    `
    )
    .eq('id', input.orderItemId)
    .single()

  if (itemErr || !item) return { success: false, error: 'Línea de venta no encontrada' }
  if (item.line_status === 'refunded') return { success: false, error: 'Esta línea ya fue reembolsada' }

  const orderJoined = item.order as
    | {
        id: string
        status: string
        payment_method: string | null
        internal_notes: string | null
        refunded_amount: number | null
      }
    | {
        id: string
        status: string
        payment_method: string | null
        internal_notes: string | null
        refunded_amount: number | null
      }[]
    | null
  const order = Array.isArray(orderJoined) ? orderJoined[0] : orderJoined
  if (!order) return { success: false, error: 'Orden no encontrada' }
  if (['cancelled', 'refunded'].includes(order.status)) {
    return { success: false, error: 'La venta ya está cancelada o reembolsada por completo' }
  }

  const { base, tax, total } = lineRefundAmounts(Number(item.unit_price) || 0)
  const reason = (input.reason || '').trim() || 'Devolución de dinero'
  const refundMethod =
    (input.refundMethod || order.payment_method || 'efectivo').trim() || 'efectivo'
  const now = new Date().toISOString()

  if (item.asset_id) {
    const { data: asset, error: assetErr } = await supabase
      .from('assets')
      .select('id, status, serial_number, sale_order_id, specifications')
      .eq('id', item.asset_id)
      .single()

    if (assetErr || !asset) return { success: false, error: 'Equipo no encontrado' }
    if (asset.status !== 'sold') {
      return { success: false, error: 'El equipo no está marcado como vendido' }
    }

    const { id: rplWhId, error: whErr } = await getReplacementWarehouseId(supabase)
    if (!rplWhId) return { success: false, error: whErr || 'Bodega de Remplazo (BOD-RPL) no encontrada' }

    const prevSpecs =
      asset.specifications && typeof asset.specifications === 'object'
        ? (asset.specifications as Record<string, unknown>)
        : {}
    const serial = asset.serial_number || item.serial_number || '—'

    const { error: retErr } = await supabase
      .from('assets')
      .update({
        status: 'received',
        current_warehouse_id: rplWhId,
        sold_to: null,
        sold_at: null,
        sold_by: null,
        sale_order_id: null,
        warranty_end_date: null,
        updated_at: now,
        specifications: {
          ...prevSpecs,
          warranty_return: true,
          money_refund: true,
          claim_type: REPLACEMENT_CLAIM_TYPE,
          claim_label: 'Reclamación del Cliente · Devolución de dinero',
          return_warehouse_code: REPLACEMENT_WAREHOUSE_CODE,
          return_reason: reason,
          original_sale_order_id: order.id,
          refund_amount: total,
          returned_at: now,
          returned_serial: serial,
        },
      })
      .eq('id', asset.id)

    if (retErr) return { success: false, error: retErr.message }
  }

  const { error: lineErr } = await supabase
    .from('sales_order_items')
    .update({ line_status: 'refunded', refunded_at: now })
    .eq('id', item.id)

  if (lineErr) return { success: false, error: lineErr.message }

  const { error: refundErr } = await supabase.from('sale_refunds').insert({
    order_id: order.id,
    order_item_id: item.id,
    refund_amount: total,
    tax_amount: tax,
    refund_method: refundMethod,
    reason,
    created_by: user.id,
  })

  if (refundErr) return { success: false, error: refundErr.message }

  const prevRefunded = Number(order.refunded_amount) || 0
  const note = `[${new Date().toLocaleString('es-GT')}] Devolución Q${total.toFixed(2)} · BOD-RPL ingresa ${item.serial_number || 'servicio'}. ${reason}`

  await supabase
    .from('sales_orders')
    .update({
      refunded_amount: Math.round((prevRefunded + total) * 100) / 100,
      internal_notes: appendOrderNote(order.internal_notes, note),
      updated_at: now,
    })
    .eq('id', order.id)

  await recomputeOrderRefundStatus(supabase, order.id)

  revalidatePath('/dashboard/ventas')
  revalidatePath(`/dashboard/ventas/${order.id}`)
  revalidatePath('/dashboard/inventario/bodega')

  return {
    success: true,
    data: { refundAmount: total, orderId: order.id },
  }
}

// =====================================================
// OBTENER ÓRDENES DE VENTA
// =====================================================

export type SalesPeriod = 'today' | '7d' | '30d' | 'month' | 'all'

function resolveSalesPeriodRange(
  period: SalesPeriod = 'month',
  month?: string
): { from: string | null; to: string | null } {
  const now = new Date()

  // Mes específico YYYY-MM
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    const from = new Date(y, m - 1, 1, 0, 0, 0, 0)
    const to = new Date(y, m, 0, 23, 59, 59, 999)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (period === 'all') return { from: null, to: null }

  if (period === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }

  if (period === '7d') {
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }

  if (period === '30d') {
    const from = new Date(now)
    from.setDate(from.getDate() - 30)
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }

  // month (mes actual)
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: null }
}

export async function getSalesOrders(options?: {
  status?: string
  search?: string
  period?: SalesPeriod
  month?: string
}) {
  const supabase = await createClient()
  const status = options?.status
  const search = options?.search
  const period = options?.period || 'month'
  const month = options?.month

  let query = supabase
    .from('sales_orders')
    .select(`
      *,
      customer:crm_entities(id, commercial_name, tax_id_nit),
      sales_rep:profiles!sales_orders_sales_rep_id_fkey(id, full_name),
      items:sales_order_items(
        serial_number,
        unit_price,
        product_description,
        asset:assets(serial_number, manufacturer, model)
      )
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { from, to } = resolveSalesPeriodRange(period, month)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const term = (search || '').trim()
  let serialOrderIds: string[] = []
  if (term) {
    serialOrderIds = await findOrderIdsBySerialTerm(supabase, term)
    const invoiceFilter = `order_number.ilike.%${term}%,invoice_number.ilike.%${term}%,sat_invoice_number.ilike.%${term}%`
    if (serialOrderIds.length > 0) {
      query = query.or(`${invoiceFilter},id.in.(${serialOrderIds.join(',')})`)
    } else {
      query = query.or(invoiceFilter)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return { data: [], error: error.message }
  }

  const rows = data || []
  if (rows.length === 0) {
    return { data: [], error: null }
  }

  const orderIds = rows.map((o) => o.id as string)
  let exchangesByOrder: Record<string, SaleExchangeRecord[]> = {}
  try {
    const { data: allEx } = await supabase
      .from('sale_exchanges')
      .select(
        'id, order_id, from_serial, to_serial, reason, claim_type, return_warehouse_code, upgrade_subtotal, upgrade_tax, upgrade_total, upgrade_payment_method, created_at'
      )
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })

    exchangesByOrder = (allEx || []).reduce(
      (acc, ex) => {
        const oid = ex.order_id as string
        if (!acc[oid]) acc[oid] = []
        acc[oid].push(ex as SaleExchangeRecord)
        return acc
      },
      {} as Record<string, SaleExchangeRecord[]>
    )
  } catch {
    exchangesByOrder = {}
  }

  const enriched = rows.map((order) => {
    const exchanges = exchangesByOrder[order.id as string] || []
    const serialSearchHint = term ? buildSerialSearchHint(term, order, exchanges) : null
    const hasExchange = exchanges.length > 0
    return {
      ...order,
      sale_exchanges: exchanges,
      serial_search_hint: serialSearchHint,
      has_warranty_exchange: hasExchange,
    }
  })

  return { data: enriched, error: null }
}

/** Busca venta por factura o número de orden */
export async function getSalesOrderByInvoice(invoiceOrOrder: string) {
  const supabase = await createClient()
  const term = invoiceOrOrder.trim()
  if (!term) return { data: null, error: 'Factura requerida' }

  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      customer:crm_entities(*),
      sales_rep:profiles!sales_orders_sales_rep_id_fkey(id, full_name),
      items:sales_order_items(
        *,
        asset:assets(id, internal_tag, serial_number, manufacturer, model, photos, condition, condition_grade, specifications)
      )
    `)
    .or(`invoice_number.eq.${term},order_number.eq.${term}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

// =====================================================
// OBTENER DETALLE DE ORDEN
// =====================================================

export async function getSalesOrderById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      customer:crm_entities(*),
      sales_rep:profiles!sales_orders_sales_rep_id_fkey(id, full_name),
      items:sales_order_items(
        *,
        asset:assets(id, internal_tag, serial_number, manufacturer, model, photos, condition, condition_grade, specifications)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
