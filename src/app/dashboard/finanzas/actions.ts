'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// =====================================================
// INTERFACES
// =====================================================

export interface BatchForSettlement {
  id: string
  internal_batch_id: string
  client_reference: string | null
  batch_status: string
  received_units: number
  created_at: string
  total_assets: number
  sold_count: number
  scrapped_count: number
  pending_count: number
  completion_pct: number
  total_cost: number
  total_sales: number
  has_settlement: boolean
  settlement_status: string | null
}

export interface PnLResult {
  success: boolean
  error?: string
  batch_id: string
  batch_number: string
  
  // Unidades
  total_units: number
  units_sold: number
  units_scrapped: number
  units_pending: number
  sell_through_pct: number
  
  // Ingresos
  gross_revenue: number
  scrap_revenue: number
  total_revenue: number
  
  // Costos
  acquisition_cost: number
  logistics_cost: number
  parts_cost: number
  labor_cost: number
  data_wipe_cost: number
  marketing_cost: number
  other_costs: number
  total_expenses: number
  
  // Márgenes
  gross_profit: number
  operating_profit: number
  profit_margin_pct: number
  
  // Promedios
  avg_sale_price: number
  avg_cost_per_unit: number
}

export interface Settlement {
  id: string
  settlement_number: string
  batch_id: string
  status: string
  total_units: number
  units_sold: number
  gross_revenue: number
  total_expenses: number
  net_profit: number
  profit_margin_pct: number
  created_at: string
  finalized_at: string | null
  batch?: {
    internal_batch_id: string
  }
}

// =====================================================
// OBTENER LOTES PARA LIQUIDAR
// =====================================================

export async function getBatchesForSettlement() {
  const supabase = await createClient()

  // Intentar usar la vista
  const { data: viewData, error: viewError } = await supabase
    .from('batches_for_settlement')
    .select('*')
    .order('created_at', { ascending: false })

  if (!viewError && viewData) {
    return { data: viewData as BatchForSettlement[], error: null }
  }

  // Fallback: calcular manualmente
  console.log('Vista no disponible, calculando manualmente...')

  const { data: batches, error: batchError } = await supabase
    .from('batches')
    .select(`
      id,
      internal_batch_id,
      client_reference,
      status,
      received_units,
      created_at
    `)
    .in('status', ['received', 'processing', 'completed'])
    .order('created_at', { ascending: false })

  if (batchError) {
    return { data: [], error: batchError.message }
  }

  // Para cada lote, obtener estadísticas de assets
  const result: BatchForSettlement[] = []

  for (const batch of batches || []) {
    const { data: assets } = await supabase
      .from('assets')
      .select('id, status, cost_amount, sales_price')
      .eq('batch_id', batch.id)

    if (!assets || assets.length === 0) continue

    const soldCount = assets.filter(a => a.status === 'sold').length
    const scrappedCount = assets.filter(a => a.status === 'scrapped').length
    const totalCost = assets.reduce((sum, a) => sum + (a.cost_amount || 0), 0)
    const totalSales = assets
      .filter(a => a.status === 'sold')
      .reduce((sum, a) => sum + (a.sales_price || 0), 0)

    // Verificar si ya tiene liquidación
    const { data: settlement } = await supabase
      .from('settlements')
      .select('status')
      .eq('batch_id', batch.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    result.push({
      id: batch.id,
      internal_batch_id: batch.internal_batch_id,
      client_reference: batch.client_reference,
      batch_status: batch.status,
      received_units: batch.received_units || 0,
      created_at: batch.created_at,
      total_assets: assets.length,
      sold_count: soldCount,
      scrapped_count: scrappedCount,
      pending_count: assets.length - soldCount - scrappedCount,
      completion_pct: Math.round(((soldCount + scrappedCount) / assets.length) * 100 * 10) / 10,
      total_cost: totalCost,
      total_sales: totalSales,
      has_settlement: !!settlement,
      settlement_status: settlement?.status || null
    })
  }

  return { data: result, error: null }
}

// =====================================================
// CALCULAR P&L DE UN LOTE
// =====================================================

export async function calculateLotPnL(batchId: string): Promise<{ data: PnLResult | null; error: string | null }> {
  const supabase = await createClient()

  // Intentar usar la función RPC
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('calculate_batch_pnl', { p_batch_id: batchId })

  if (!rpcError && rpcResult?.success) {
    // Parchear con valores del ledger si existen (priorizar ajustes hechos desde UI)
    const base: PnLResult = rpcResult as PnLResult

    const { data: acquisitionSummary } = await supabase
      .from('expense_ledger')
      .select('amount')
      .eq('batch_id', batchId)
      .eq('expense_type', 'acquisition')
      .eq('reference_number', 'summary')
      .eq('status', 'approved')

    const acquisitionLedger = acquisitionSummary?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    const { data: revenueSummary } = await supabase
      .from('revenue_ledger')
      .select('amount')
      .eq('batch_id', batchId)
      .eq('reference_number', 'summary')
      .eq('revenue_type', 'sale')

    const revenueLedger = revenueSummary?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    const patched: PnLResult = { ...base }
    if (acquisitionLedger > 0) {
      patched.acquisition_cost = acquisitionLedger
      patched.avg_cost_per_unit = patched.total_units > 0 ? Math.round(acquisitionLedger / patched.total_units) : 0
    }
    if (revenueLedger > 0) {
      patched.gross_revenue = revenueLedger
      patched.total_revenue = revenueLedger + (patched.scrap_revenue || 0)
      patched.avg_sale_price = patched.units_sold > 0 ? Math.round(revenueLedger / patched.units_sold) : patched.avg_sale_price
    } else if (patched.gross_revenue === 0 && patched.units_sold > 0) {
      // Si no hay resumen de ledger pero hay unidades vendidas, calcular desde revenue_ledger individual items
      const { data: revenueLedgerItems } = await supabase
        .from('revenue_ledger')
        .select('amount')
        .eq('batch_id', batchId)
        .eq('revenue_type', 'sale')
      
      const totalRevenueLedger = revenueLedgerItems?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      if (totalRevenueLedger > 0) {
        patched.gross_revenue = totalRevenueLedger
        patched.total_revenue = totalRevenueLedger + (patched.scrap_revenue || 0)
        patched.avg_sale_price = Math.round(totalRevenueLedger / patched.units_sold)
      }
    }

    // Overrides de gastos desde ledger (resúmenes)
    const fetchSummary = async (type: string) => {
      const { data } = await supabase
        .from('expense_ledger')
        .select('amount')
        .eq('batch_id', batchId)
        .eq('expense_type', type)
        .eq('reference_number', 'summary')
        .eq('status', 'approved')
      return data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    }

    const logisticsSummary = await fetchSummary('logistics')
    if (logisticsSummary > 0) patched.logistics_cost = logisticsSummary

    const partsSummary = await fetchSummary('parts')
    if (partsSummary > 0) patched.parts_cost = partsSummary

    const laborSummary = await fetchSummary('labor')
    if (laborSummary > 0) patched.labor_cost = laborSummary

    const wipeSummary = await fetchSummary('data_wipe')
    if (wipeSummary > 0) patched.data_wipe_cost = wipeSummary

    const storageSummary = await fetchSummary('storage')
    const otherSummary = await fetchSummary('other')
    const combinedOther = storageSummary + otherSummary
    if (combinedOther > 0) patched.other_costs = combinedOther

    const marketingSummary = await fetchSummary('marketing')
    if (marketingSummary > 0) patched.marketing_cost = marketingSummary

    // Recalcular totales y márgenes
    patched.total_expenses = (patched.logistics_cost || 0) + (patched.parts_cost || 0) + (patched.labor_cost || 0) + (patched.data_wipe_cost || 0) + (patched.marketing_cost || 0) + (patched.other_costs || 0)
    patched.gross_profit = (patched.gross_revenue || 0) - (patched.acquisition_cost || 0)
    patched.operating_profit = (patched.gross_profit || 0) - (patched.total_expenses || 0)
    const safeGrossRevenue = patched.gross_revenue || 0
    patched.profit_margin_pct = safeGrossRevenue > 0
      ? Math.round((((patched.operating_profit || 0) / safeGrossRevenue) * 100) * 10) / 10
      : 0

    return { data: patched, error: null }
  }

  // Fallback: calcular manualmente
  console.log('RPC no disponible, calculando P&L manualmente...')

  // Obtener lote
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .single()

  if (batchError || !batch) {
    return { data: null, error: 'Lote no encontrado' }
  }

  // Obtener assets
  const { data: assets } = await supabase
    .from('assets')
    .select('id, status, cost_amount, sales_price, data_wipe_status')
    .eq('batch_id', batchId)

  if (!assets || assets.length === 0) {
    return { data: null, error: 'El lote no tiene activos' }
  }

  // Calcular métricas de unidades
  const totalUnits = assets.length
  const unitsSold = assets.filter(a => a.status === 'sold').length
  const unitsScrapped = assets.filter(a => a.status === 'scrapped').length
  const unitsPending = totalUnits - unitsSold - unitsScrapped

  // Calcular ingresos - Preferir revenue_ledger (datos editados desde UI)
  const { data: revenueSummaryData } = await supabase
    .from('revenue_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('reference_number', 'summary')
    .eq('revenue_type', 'sale')

  let grossRevenue = revenueSummaryData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

  // Si no hay resumen de ledger, intentar sales_order_items
  if (grossRevenue === 0) {
    const { data: salesItems } = await supabase
      .from('sales_order_items')
      .select('unit_price, asset_id')
      .in('asset_id', assets.map(a => a.id))

    grossRevenue = salesItems?.reduce((sum, item) => sum + (item.unit_price || 0), 0) || 0
  }

  // Si sigue siendo 0, usar sales_price de los assets con status 'sold'
  if (grossRevenue === 0 && unitsSold > 0) {
    const soldAssets = assets.filter(a => a.status === 'sold')
    grossRevenue = soldAssets.reduce((sum, a) => sum + (a.sales_price || 0), 0)
  }

  // Si aún sin ingresos pero hay unidades vendidas, leer todo el revenue_ledger
  if (grossRevenue === 0 && unitsSold > 0) {
    const { data: allRevenue } = await supabase
      .from('revenue_ledger')
      .select('amount')
      .eq('batch_id', batchId)
      .eq('revenue_type', 'sale')
    
    grossRevenue = allRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  }

  const scrapRevenue = 0 // TODO: implementar ventas de scrap

  // Calcular costos
  const baseAcquisitionCost = assets.reduce((sum, a) => sum + (a.cost_amount || 0), 0)

  // Preferir el resumen del ledger de adquisición si existe (monto ajustado desde UI)
  const { data: acquisitionSummary } = await supabase
    .from('expense_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('expense_type', 'acquisition')
    .eq('reference_number', 'summary')
    .eq('status', 'approved')

  const acquisitionLedger = acquisitionSummary?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  const acquisitionCost = acquisitionLedger > 0 ? acquisitionLedger : baseAcquisitionCost

  // Gastos de logística (del expense_ledger si existe)
  const { data: logisticsExpenses } = await supabase
    .from('expense_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('expense_type', 'logistics')

  let logisticsCost = logisticsExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

  // Gastos de repuestos: usar ledger si existe, si no estimar (Q50 por pieza)
  const assetIds = assets.map(a => a.id)
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('id')
    .in('asset_id', assetIds)

  let partsCost = 0
  const { data: partsExpenses } = await supabase
    .from('expense_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('expense_type', 'parts')

  partsCost = partsExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  if (partsCost === 0 && workOrders && workOrders.length > 0) {
    const woIds = workOrders.map(wo => wo.id)
    const { data: partRequests } = await supabase
      .from('part_requests')
      .select('quantity')
      .in('work_order_id', woIds)
      .eq('status', 'dispensed')

    // Estimar Q50 por pieza
    partsCost = (partRequests?.reduce((sum, pr) => sum + (pr.quantity || 1), 0) || 0) * 50
  }

  // Mano de obra: usar ledger si existe, si no estimar (Q80 por equipo)
  const { data: laborExpenses } = await supabase
    .from('expense_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('expense_type', 'labor')

  let laborCost = laborExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  if (laborCost === 0) {
    const { data: completedWO } = await supabase
      .from('work_orders')
      .select('id')
      .in('asset_id', assetIds)
      .in('status', ['completed', 'qc_passed'])

    laborCost = (completedWO?.length || 0) * 80
  }

  // Borrado de datos: usar ledger si existe, si no estimar (Q40 por equipo)
  const { data: wipeExpenses } = await supabase
    .from('expense_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('expense_type', 'data_wipe')

  let dataWipeCost = wipeExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  if (dataWipeCost === 0) {
    const wipedCount = assets.filter(a => a.data_wipe_status === 'completed').length
    dataWipeCost = wipedCount * 40
  }

  // Inversión en Marketing: usar ledger si existe
  const { data: marketingExpenses } = await supabase
    .from('expense_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('expense_type', 'marketing')

  let marketingCost = marketingExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

  // Otros gastos
  const { data: otherExpenses } = await supabase
    .from('expense_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .in('expense_type', ['storage', 'other'])

  let otherCosts = otherExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

  // Si existe resumen de ingresos en el ledger, preferirlo
  const { data: revenueSummary } = await supabase
    .from('revenue_ledger')
    .select('amount')
    .eq('batch_id', batchId)
    .eq('reference_number', 'summary')
    .eq('revenue_type', 'sale')

  const revenueLedger = revenueSummary?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  if (revenueLedger > 0) {
    grossRevenue = revenueLedger
  }

  // Overrides desde expense_ledger (resúmenes ingresados por UI)
  const fetchSummary = async (type: string) => {
    const { data } = await supabase
      .from('expense_ledger')
      .select('amount')
      .eq('batch_id', batchId)
      .eq('expense_type', type)
      .eq('reference_number', 'summary')
      .eq('status', 'approved')
    return data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  }

  const logisticsSummary = await fetchSummary('logistics')
  if (logisticsSummary > 0) logisticsCost = logisticsSummary

  const partsSummary = await fetchSummary('parts')
  if (partsSummary > 0) partsCost = partsSummary

  const laborSummary = await fetchSummary('labor')
  if (laborSummary > 0) laborCost = laborSummary

  const wipeSummary = await fetchSummary('data_wipe')
  if (wipeSummary > 0) dataWipeCost = wipeSummary

  const marketingSummary = await fetchSummary('marketing')
  if (marketingSummary > 0) marketingCost = marketingSummary

  const storageSummary = await fetchSummary('storage')
  const otherSummary = await fetchSummary('other')
  const combinedOther = storageSummary + otherSummary
  if (combinedOther > 0) otherCosts = combinedOther

  // Totales
  let totalExpenses = logisticsCost + partsCost + laborCost + dataWipeCost + marketingCost + otherCosts
  const grossProfit = grossRevenue - acquisitionCost
  const operatingProfit = grossProfit - totalExpenses
  const profitMarginPct = grossRevenue > 0 
    ? Math.round((operatingProfit / grossRevenue) * 100 * 10) / 10 
    : 0

  const result: PnLResult = {
    success: true,
    batch_id: batchId,
    batch_number: batch.internal_batch_id,
    
    total_units: totalUnits,
    units_sold: unitsSold,
    units_scrapped: unitsScrapped,
    units_pending: unitsPending,
    sell_through_pct: totalUnits > 0 ? Math.round((unitsSold / totalUnits) * 100 * 10) / 10 : 0,
    
    gross_revenue: grossRevenue,
    scrap_revenue: scrapRevenue,
    total_revenue: grossRevenue + scrapRevenue,
    
    acquisition_cost: acquisitionCost,
    logistics_cost: logisticsCost,
    parts_cost: partsCost,
    labor_cost: laborCost,
    data_wipe_cost: dataWipeCost,
    marketing_cost: marketingCost,
    other_costs: otherCosts,
    total_expenses: totalExpenses,
    
    gross_profit: grossProfit,
    operating_profit: operatingProfit,
    profit_margin_pct: profitMarginPct,
    
    avg_sale_price: unitsSold > 0 ? Math.round(grossRevenue / unitsSold) : 0,
    avg_cost_per_unit: totalUnits > 0 ? Math.round(acquisitionCost / totalUnits) : 0
  }

  return { data: result, error: null }
}

// =====================================================
// CREAR LIQUIDACIÓN
// =====================================================

export async function createSettlement(batchId: string, pnl: PnLResult) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  const { data, error } = await supabase
    .from('settlements')
    .insert({
      batch_id: batchId,
      status: 'draft',
      total_units: pnl.total_units,
      units_sold: pnl.units_sold,
      units_scrapped: pnl.units_scrapped,
      units_pending: pnl.units_pending,
      gross_revenue: pnl.gross_revenue,
      scrap_revenue: pnl.scrap_revenue,
      total_revenue: pnl.total_revenue,
      acquisition_cost: pnl.acquisition_cost,
      logistics_cost: pnl.logistics_cost,
      parts_cost: pnl.parts_cost,
      labor_cost: pnl.labor_cost,
      refurbishing_cost: pnl.parts_cost + pnl.labor_cost,
      data_wipe_cost: pnl.data_wipe_cost,
      other_costs: pnl.other_costs,
      total_expenses: pnl.total_expenses,
      gross_profit: pnl.gross_profit,
      operating_profit: pnl.operating_profit,
      net_profit: pnl.operating_profit,
      profit_margin_pct: pnl.profit_margin_pct,
      created_by: user.id
    })
    .select('id, settlement_number')
    .single()

  if (error) {
    console.error('Error creating settlement:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/finanzas')
  return { success: true, data }
}

// =====================================================
// ACTUALIZAR TOTALES DE LOTE (COSTO/VENTAS)
// =====================================================

export async function updateBatchTotals(
  batchId: string,
  type: 'cost' | 'revenue',
  amount: number
): Promise<{ success: boolean; error?: string }> {
  console.log('[updateBatchTotals] Called with:', { batchId, type, amount })
  // Intentar usar Service Role; si no está configurado, caer al cliente normal
  let supabase: any
  try {
    supabase = createAdminClient()
  } catch (e) {
    console.warn('[updateBatchTotals] Service role no configurado, usando cliente normal')
    const client = await createClient()
    supabase = client
  }

  if (amount < 0) {
    console.log('[updateBatchTotals] Negative amount rejected')
    return { success: false, error: 'El monto no puede ser negativo' }
  }

  try {
    if (type === 'cost') {
      console.log('[updateBatchTotals] Processing cost update')
      // Crear/actualizar registro de costo de adquisición en expense_ledger
      const { data: existing } = await supabase
        .from('expense_ledger')
        .select('id')
        .eq('batch_id', batchId)
        .eq('expense_type', 'acquisition')
        .eq('reference_number', 'summary')
        .limit(1)

      console.log('[updateBatchTotals] Existing expense record:', existing)

      if (existing && existing.length > 0) {
        console.log('[updateBatchTotals] Updating existing expense record:', existing[0].id)
        const { error: updateError } = await supabase
          .from('expense_ledger')
          .update({
            amount,
            description: 'Costo de adquisición total',
            status: 'approved'
          })
          .eq('id', existing[0].id)

        if (updateError) {
          console.log('[updateBatchTotals] Update error:', updateError)
          return { success: false, error: updateError.message }
        }
        console.log('[updateBatchTotals] Expense updated successfully')
      } else {
        console.log('[updateBatchTotals] Inserting new expense record')
        const { error: insertError } = await supabase
          .from('expense_ledger')
          .insert({
            batch_id: batchId,
            expense_type: 'acquisition',
            description: 'Costo de adquisición total',
            reference_number: 'summary',
            amount,
            status: 'approved'
          })

        if (insertError) {
          console.log('[updateBatchTotals] Insert error:', insertError)
          return { success: false, error: insertError.message }
        }
        console.log('[updateBatchTotals] Expense inserted successfully')
      }
    } else {
      console.log('[updateBatchTotals] Processing revenue update')
      // Crear/actualizar registro de ventas en revenue_ledger
      const { data: existing } = await supabase
        .from('revenue_ledger')
        .select('id')
        .eq('batch_id', batchId)
        .eq('reference_number', 'summary')
        .limit(1)

      console.log('[updateBatchTotals] Existing revenue record:', existing)

      if (existing && existing.length > 0) {
        console.log('[updateBatchTotals] Updating existing revenue record:', existing[0].id)
        const { error: updateError } = await supabase
          .from('revenue_ledger')
          .update({
            amount,
            description: 'Ventas totales'
          })
          .eq('id', existing[0].id)

        if (updateError) {
          console.log('[updateBatchTotals] Update error:', updateError)
          return { success: false, error: updateError.message }
        }
        console.log('[updateBatchTotals] Revenue updated successfully')
      } else {
        console.log('[updateBatchTotals] Inserting new revenue record')
        const { error: insertError } = await supabase
          .from('revenue_ledger')
          .insert({
            batch_id: batchId,
            revenue_type: 'sale',
            description: 'Ventas totales',
            reference_number: 'summary',
            amount
          })

        if (insertError) {
          console.log('[updateBatchTotals] Insert error:', insertError)
          return { success: false, error: insertError.message }
        }
        console.log('[updateBatchTotals] Revenue inserted successfully')
      }
    }

    console.log('[updateBatchTotals] Revalidating path')
    revalidatePath('/dashboard/finanzas')
    console.log('[updateBatchTotals] Success!')
    return { success: true }
  } catch (error) {
    console.log('[updateBatchTotals] Caught error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}

// =====================================================
// SETEAR/ACTUALIZAR GASTOS DEL LOTE (LEDGER)
// =====================================================

export async function setBatchExpense(
  batchId: string,
  expenseType: 'acquisition' | 'logistics' | 'parts' | 'labor' | 'data_wipe' | 'storage' | 'other',
  amount: number,
  description?: string
) {
  // Usar cliente admin para evitar bloqueos por RLS
  const supabase = createAdminClient()

  if (amount < 0) {
    return { success: false, error: 'El monto no puede ser negativo' }
  }

  try {
    // Pre-chequeo: validar que la tabla/columnas existen en el esquema
    const { error: schemaError } = await supabase
      .from('expense_ledger')
      .select('id')
      .limit(1)

    if (schemaError) {
      return {
        success: false,
        error:
          'La tabla expense_ledger no está disponible en el esquema o el cache no se ha actualizado. Ejecuta la migración (sql/011a_financial_tables.sql) en Supabase y reinicia/espera el refresco del cache.'
      }
    }

    // Intentar actualizar el registro resumen (reference_number='summary')
    const { data: existing } = await supabase
      .from('expense_ledger')
      .select('id')
      .eq('batch_id', batchId)
      .eq('expense_type', expenseType)
      .eq('reference_number', 'summary')
      .limit(1)

    if (existing && existing.length > 0) {
      const { error: updateError } = await supabase
        .from('expense_ledger')
        .update({
          amount,
          description: description || `Ajuste ${expenseType}`,
          status: 'approved',
            
        })
        .eq('id', existing[0].id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    } else {
      const { error: insertError } = await supabase
        .from('expense_ledger')
        .insert({
          batch_id: batchId,
          expense_type: expenseType,
          description: description || `Ajuste ${expenseType}`,
          reference_number: 'summary',
          amount,
          status: 'approved',
          
        })

      if (insertError) {
        return { success: false, error: insertError.message }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' }
  }
}


// =====================================================
// FINALIZAR LIQUIDACIÓN
// =====================================================

export async function finalizeSettlement(settlementId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  const { error } = await supabase
    .from('settlements')
    .update({
      status: 'finalized',
      finalized_by: user.id,
      finalized_at: new Date().toISOString()
    })
    .eq('id', settlementId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/finanzas')
  return { success: true }
}

// =====================================================
// OBTENER LIQUIDACIONES
// =====================================================

export async function getSettlements() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      batch:batches(internal_batch_id)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data as Settlement[], error: null }
}

// =====================================================
// OBTENER DETALLE DE LIQUIDACIÓN
// =====================================================

export async function getSettlementById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      batch:batches(internal_batch_id, client_reference, created_at),
      created_by_user:profiles!settlements_created_by_fkey(full_name),
      finalized_by_user:profiles!settlements_finalized_by_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// =====================================================
// OBTENER RESUMEN FINANCIERO GENERAL
// =====================================================

export async function getFinancialSummary() {
  const supabase = await createClient()

  // Total de liquidaciones finalizadas
  const { data: settlements } = await supabase
    .from('settlements')
    .select('total_revenue, total_expenses, net_profit')
    .eq('status', 'finalized')

  const totalRevenue = settlements?.reduce((sum, s) => sum + (s.total_revenue || 0), 0) || 0
  const totalExpenses = settlements?.reduce((sum, s) => sum + (s.total_expenses || 0), 0) || 0
  const totalProfit = settlements?.reduce((sum, s) => sum + (s.net_profit || 0), 0) || 0

  // Ventas del mes actual
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthSales } = await supabase
    .from('sales_orders')
    .select('total_amount')
    .eq('status', 'confirmed')
    .gte('created_at', startOfMonth.toISOString())

  const monthRevenue = monthSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0

  return {
    totalRevenue,
    totalExpenses,
    totalProfit,
    monthRevenue,
    settlementCount: settlements?.length || 0,
    avgMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  }
}

