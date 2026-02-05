'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
}

const REMARKETING_WAREHOUSE_CODE = 'BOD-REM'
const REMARKETING_READY_STATUS = 'ready_for_sale'

export interface CartItem {
  asset: AssetForSale
  unitPrice: number
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

// =====================================================
// BUSCAR ACTIVOS PARA VENTA
// Filtra por status 'ready_for_sale' y busca por serial/modelo
// =====================================================

export async function searchAssetsForSale(query: string) {
  const supabase = await createClient()

  if (query.length < 2) {
    // Si no hay query, mostrar los últimos 20 disponibles
    const { data, error } = await supabase
      .from('assets')
      .select('id, internal_tag, serial_number, manufacturer, model, asset_type, condition, cost_amount, sales_price, photos, created_at')
      .eq('status', 'ready_for_sale')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return { data: [], error: error.message }
    }
    return { data: data as AssetForSale[], error: null }
  }

  const { data, error } = await supabase
    .from('assets')
    .select('id, internal_tag, serial_number, manufacturer, model, asset_type, condition, cost_amount, sales_price, photos, created_at')
    .eq('status', 'ready_for_sale')
    .or(`serial_number.ilike.%${query}%,internal_tag.ilike.%${query}%,manufacturer.ilike.%${query}%,model.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error searching assets:', error)
    return { data: [], error: error.message }
  }

  return { data: data as AssetForSale[], error: null }
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

interface ProcessSaleData {
  customerId: string
  cartItems: Array<{
    assetId: string
    unitPrice: number
    description: string
    serialNumber: string | null
    conditionGrade: string | null
  }>
  warrantyDays?: number
  paymentMethod?: string
  notes?: string
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
    return { success: false, error: 'El carrito está vacío' }
  }

  // Calcular total
  const totalAmount = data.cartItems.reduce((sum, item) => sum + item.unitPrice, 0)

  // Intentar usar la función RPC
  const rpcParams = {
    p_customer_id: data.customerId,
    p_items: data.cartItems.map(item => ({
      asset_id: item.assetId,
      unit_price: item.unitPrice,
      product_description: item.description,
      serial_number: item.serialNumber,
      condition_grade: item.conditionGrade
    })),
    p_warranty_days: data.warrantyDays || 30,
    p_payment_method: data.paymentMethod || 'transfer',
    p_notes: data.notes || null,
    p_created_by: user.id
  }

  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('create_sale_order', rpcParams)

  if (!rpcError && rpcResult?.success) {
    revalidatePath('/dashboard/ventas')
    revalidatePath('/dashboard/inventario')
    return { 
      success: true, 
      data: {
        orderId: rpcResult.order_id,
        orderNumber: rpcResult.order_number
      }
    }
  }

  // FALLBACK: Crear manualmente si RPC no existe
  console.log('RPC no disponible, creando venta manualmente...')

  try {
    // 1. Verificar disponibilidad de todos los activos
    const assetIds = data.cartItems.map(item => item.assetId)
    const { data: assets, error: checkError } = await supabase
      .from('assets')
      .select('id, status')
      .in('id', assetIds)

    if (checkError) {
      return { success: false, error: 'Error verificando disponibilidad' }
    }

    const unavailable = assets?.filter(a => a.status !== 'ready_for_sale')
    if (unavailable && unavailable.length > 0) {
      return { success: false, error: 'Algunos equipos ya no están disponibles' }
    }

    // 2. Crear orden de venta
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        customer_id: data.customerId,
        status: 'confirmed',
        subtotal: totalAmount,
        total_amount: totalAmount,
        warranty_days: data.warrantyDays || 30,
        payment_method: data.paymentMethod || 'transfer',
        internal_notes: data.notes || null,
        sales_rep_id: user.id,
        created_by: user.id,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .select('id, order_number')
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return { success: false, error: orderError.message }
    }

    // 3. Crear items de la orden
    const warrantyEnd = new Date()
    warrantyEnd.setDate(warrantyEnd.getDate() + (data.warrantyDays || 30))

    const itemsToInsert = data.cartItems.map(item => ({
      order_id: order.id,
      asset_id: item.assetId,
      product_description: item.description,
      serial_number: item.serialNumber,
      condition_grade: item.conditionGrade,
      list_price: item.unitPrice,
      unit_price: item.unitPrice,
      warranty_days: data.warrantyDays || 30,
      warranty_start_date: new Date().toISOString().split('T')[0],
      warranty_end_date: warrantyEnd.toISOString().split('T')[0]
    }))

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      // Rollback: eliminar orden
      await supabase.from('sales_orders').delete().eq('id', order.id)
      return { success: false, error: itemsError.message }
    }

    // 4. Actualizar activos a vendido
    for (const item of data.cartItems) {
      await supabase
        .from('assets')
        .update({
          status: 'sold',
          sold_to: data.customerId,
          sold_at: new Date().toISOString(),
          sold_by: user.id,
          sale_order_id: order.id,
          warranty_end_date: warrantyEnd.toISOString().split('T')[0]
        })
        .eq('id', item.assetId)
    }

    revalidatePath('/dashboard/ventas')
    revalidatePath('/dashboard/inventario')

    return { 
      success: true, 
      data: {
        orderId: order.id,
        orderNumber: order.order_number
      }
    }

  } catch (err) {
    console.error('Error in processSale:', err)
    return { success: false, error: 'Error inesperado al procesar la venta' }
  }
}

// =====================================================
// OBTENER ÓRDENES DE VENTA
// =====================================================

export async function getSalesOrders(status?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('sales_orders')
    .select(`
      *,
      customer:crm_entities(id, commercial_name, tax_id_nit),
      sales_rep:profiles!sales_orders_sales_rep_id_fkey(id, full_name),
      items:sales_order_items(count)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return { data: [], error: error.message }
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
        asset:assets(id, internal_tag, serial_number, manufacturer, model, photos)
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
