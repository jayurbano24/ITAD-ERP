import { createClient } from '@/lib/supabase/server'

type LotAssetRow = {
  id: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  status: string
  cost_amount: number | null
  sales_price: number | null
  batch_id: string
}

type LotBatch = {
  id: string
  internal_batch_id: string
  description: string | null
  notes: string | null
  status: string
  created_at: string
}

type SaleItem = {
  asset_id: string
  unit_price: number | null
  order: { status: string | null; subtotal: number | null; total_amount: number | null } | null
}

function sheetNameForLot(code: string, index: number): string {
  const base = (code || `Lote-${index + 1}`)
    .replace(/[\\/?*[\]:]/g, '-')
    .trim()
  const clipped = base.slice(0, 28)
  return clipped || `Lote-${index + 1}`
}

function saleAmountForAsset(assetId: string, salesByAsset: Map<string, number>, fallbackPrice: number | null) {
  const fromOrder = salesByAsset.get(assetId)
  if (fromOrder != null && fromOrder > 0) return fromOrder
  if (fallbackPrice != null && fallbackPrice > 0) return Math.round(fallbackPrice * 1.12 * 100) / 100
  return 0
}

export async function buildLotsFinanceWorkbookBuffer(): Promise<{
  buffer: ArrayBuffer
  fileName: string
}> {
  const supabase = await createClient()
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ITAD-ERP'
  wb.created = new Date()

  const { data: batches, error: batchError } = await supabase
    .from('batches')
    .select('id, internal_batch_id, description, notes, status, created_at')
    .in('status', ['received', 'processing', 'completed'])
    .order('created_at', { ascending: false })

  if (batchError) {
    throw new Error(batchError.message)
  }

  const lotList = (batches || []) as LotBatch[]
  const batchIds = lotList.map((b) => b.id)

  const { data: assets } = batchIds.length
    ? await supabase
        .from('assets')
        .select('id, serial_number, manufacturer, model, status, cost_amount, sales_price, batch_id')
        .in('batch_id', batchIds)
    : { data: [] as LotAssetRow[] }

  const allAssets = (assets || []) as LotAssetRow[]
  const assetIds = allAssets.map((a) => a.id)

  const { data: saleItems } = assetIds.length
    ? await supabase
        .from('sales_order_items')
        .select('asset_id, unit_price, order:sales_orders(status, subtotal, total_amount)')
        .in('asset_id', assetIds)
    : { data: [] as SaleItem[] }

  const salesByAsset = new Map<string, number>()
  for (const row of (saleItems || []) as SaleItem[]) {
    const order = row.order
    if (!row.asset_id || order?.status === 'cancelled') continue
    const unit = Number(row.unit_price || 0)
    let amount = Math.round(unit * 1.12 * 100) / 100
    if (order?.subtotal && Number(order.subtotal) > 0 && order.total_amount != null) {
      amount = unit * (Number(order.total_amount) / Number(order.subtotal))
    }
    salesByAsset.set(row.asset_id, Math.round(amount * 100) / 100)
  }

  const assetsByBatch = new Map<string, LotAssetRow[]>()
  for (const asset of allAssets) {
    const list = assetsByBatch.get(asset.batch_id) || []
    list.push(asset)
    assetsByBatch.set(asset.batch_id, list)
  }

  // —— Resumen general ——
  const resumen = wb.addWorksheet('Resumen General', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  resumen.columns = [
    { header: 'Lote', key: 'lote', width: 22 },
    { header: 'Referencia', key: 'ref', width: 28 },
    { header: 'Estado lote', key: 'status', width: 14 },
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Unidades', key: 'units', width: 12 },
    { header: 'Vendidos', key: 'sold', width: 12 },
    { header: 'Pendientes', key: 'pending', width: 12 },
    { header: 'Costo total (Q)', key: 'cost', width: 16 },
    { header: 'Ventas total (Q)', key: 'sales', width: 16 },
    { header: 'Utilidad (Q)', key: 'utility', width: 14 },
    { header: 'Margen %', key: 'margin', width: 12 },
  ]

  const headerRow = resumen.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  }

  let grandUnits = 0
  let grandSold = 0
  let grandCost = 0
  let grandSales = 0
  const usedSheetNames = new Set<string>(['Resumen General'])

  const lotSummaries: Array<{
    batch: LotBatch
    assets: LotAssetRow[]
    units: number
    sold: number
    pending: number
    cost: number
    sales: number
    utility: number
    sheetName: string
  }> = []

  lotList.forEach((batch, index) => {
    const lotAssets = assetsByBatch.get(batch.id) || []
    if (lotAssets.length === 0) return

    let cost = 0
    let sales = 0
    let sold = 0
    for (const a of lotAssets) {
      cost += Number(a.cost_amount || 0)
      if (a.status === 'sold') {
        sold += 1
        sales += saleAmountForAsset(a.id, salesByAsset, a.sales_price)
      }
    }
    cost = Math.round(cost * 100) / 100
    sales = Math.round(sales * 100) / 100
    const utility = Math.round((sales - cost) * 100) / 100
    const pending = lotAssets.length - sold

    let name = sheetNameForLot(batch.internal_batch_id, index)
    if (usedSheetNames.has(name)) {
      name = `${name.slice(0, 26)}-${index + 1}`.slice(0, 31)
    }
    usedSheetNames.add(name)

    lotSummaries.push({
      batch,
      assets: lotAssets,
      units: lotAssets.length,
      sold,
      pending,
      cost,
      sales,
      utility,
      sheetName: name,
    })

    grandUnits += lotAssets.length
    grandSold += sold
    grandCost += cost
    grandSales += sales

    const margin = sales > 0 ? Math.round(((sales - cost) / sales) * 1000) / 10 : 0
    resumen.addRow({
      lote: batch.internal_batch_id,
      ref: batch.description || batch.notes || '',
      status: batch.status,
      fecha: new Date(batch.created_at).toLocaleDateString('es-GT'),
      units: lotAssets.length,
      sold,
      pending,
      cost,
      sales,
      utility,
      margin,
    })
  })

  const totalUtility = Math.round((grandSales - grandCost) * 100) / 100
  const totalMargin =
    grandSales > 0 ? Math.round(((grandSales - grandCost) / grandSales) * 1000) / 10 : 0
  const totalRow = resumen.addRow({
    lote: 'TOTAL GENERAL',
    ref: '',
    status: '',
    fecha: '',
    units: grandUnits,
    sold: grandSold,
    pending: grandUnits - grandSold,
    cost: Math.round(grandCost * 100) / 100,
    sales: Math.round(grandSales * 100) / 100,
    utility: totalUtility,
    margin: totalMargin,
  })
  totalRow.font = { bold: true }
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF5' },
  }

  // —— Una hoja por lote ——
  for (const lot of lotSummaries) {
    const ws = wb.addWorksheet(lot.sheetName, {
      views: [{ state: 'frozen', ySplit: 5 }],
    })

    ws.mergeCells('A1:J1')
    ws.getCell('A1').value = `Lote ${lot.batch.internal_batch_id}`
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }

    ws.getCell('A2').value = 'Referencia'
    ws.getCell('B2').value = lot.batch.description || lot.batch.notes || '—'
    ws.getCell('A3').value = 'Resumen'
    ws.getCell('B3').value =
      `Unidades ${lot.units} · Vendidos ${lot.sold} · Pendientes ${lot.pending}`
    ws.getCell('A4').value = 'Costo / Ventas / Utilidad'
    ws.getCell('B4').value = `Q ${lot.cost.toFixed(2)}  /  Q ${lot.sales.toFixed(2)}  /  Q ${lot.utility.toFixed(2)}`
    ws.getCell('A4').font = { bold: true }

    const tableStart = 6
    const headers = [
      'Serie',
      'Marca',
      'Modelo',
      'Estado',
      'Costo c/u (Q)',
      'Venta c/u (Q)',
      'Utilidad c/u (Q)',
      'Vendible',
    ]
    headers.forEach((h, i) => {
      const cell = ws.getCell(tableStart, i + 1)
      cell.value = h
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' },
      }
    })

    lot.assets.forEach((asset, idx) => {
      const cost = Number(asset.cost_amount || 0)
      const sale =
        asset.status === 'sold'
          ? saleAmountForAsset(asset.id, salesByAsset, asset.sales_price)
          : 0
      const utility = Math.round((sale - cost) * 100) / 100
      const row = tableStart + 1 + idx
      ws.getCell(row, 1).value = asset.serial_number || '—'
      ws.getCell(row, 2).value = asset.manufacturer || '—'
      ws.getCell(row, 3).value = asset.model || '—'
      ws.getCell(row, 4).value = asset.status
      ws.getCell(row, 5).value = Math.round(cost * 100) / 100
      ws.getCell(row, 6).value = sale
      ws.getCell(row, 7).value = utility
      ws.getCell(row, 8).value =
        asset.status === 'sold' ? 'Vendido' : asset.status === 'ready_for_sale' ? 'Para venta' : asset.status
    })

    ws.getColumn(1).width = 18
    ws.getColumn(2).width = 14
    ws.getColumn(3).width = 28
    ws.getColumn(4).width = 14
    ws.getColumn(5).width = 14
    ws.getColumn(6).width = 14
    ws.getColumn(7).width = 16
    ws.getColumn(8).width = 14

    const footer = tableStart + 1 + lot.assets.length
    ws.getCell(footer, 4).value = 'TOTAL LOTE'
    ws.getCell(footer, 4).font = { bold: true }
    ws.getCell(footer, 5).value = lot.cost
    ws.getCell(footer, 6).value = lot.sales
    ws.getCell(footer, 7).value = lot.utility
    ws.getCell(footer, 5).font = { bold: true }
    ws.getCell(footer, 6).font = { bold: true }
    ws.getCell(footer, 7).font = { bold: true }
  }

  if (lotSummaries.length === 0) {
    resumen.addRow({
      lote: 'Sin lotes con equipos',
      ref: '',
      status: '',
      fecha: '',
      units: 0,
      sold: 0,
      pending: 0,
      cost: 0,
      sales: 0,
      utility: 0,
      margin: 0,
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)
  return {
    buffer: buffer as ArrayBuffer,
    fileName: `Finanzas-Lotes-${stamp}.xlsx`,
  }
}
