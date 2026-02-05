'use server'

import { createClient } from '@/lib/supabase/server'

export type GoodInventoryPart = {
  id: string
  sku: string
  name: string
  description: string | null
  category: string | null
  stock_quantity: number
  min_stock_level: number
  location: string | null
  unit_cost: number | null
  selling_price: number | null
}

export type HarvestInventoryPart = {
  sku: string
  partName: string | null
  totalQuantity: number
  conditionSummary: string
  latestReceivedAt: string | null
  receivedFrom: string | null
  disposition: string | null
  notes: string | null
}

export type CatalogBrand = {
  id: string
  name: string
}

export type CatalogModel = {
  id: string
  name: string
  brand_id: string | null
  product_type_id: string | null
  brand?: { id: string; name: string } | null
  product_type?: { id: string; name: string } | null
}

export type CatalogProductType = {
  id: string
  name: string
}

type CatalogResult<T> = {
  data: T[]
  error: string | null
}

interface GoodWarehouseResult {
  data: GoodInventoryPart[]
  error: string | null
}

interface HarvestWarehouseResult {
  data: HarvestInventoryPart[]
  error: string | null
}

type PartsCatalogRow = {
  id: string
  sku: string
  name: string
  description: string | null
  category: string | null
  stock_quantity: number | null
  min_stock_level: number | null
  location: string | null
  unit_cost: number | null
  selling_price: number | null
}

type BadWarehouseRow = {
  sku: string
  part_name: string | null
  condition: string | null
  quantity: number | null
  received_from: string | null
  disposition: string | null
  date_received: string | null
  notes: string | null
}

export async function getGoodWarehouseParts(): Promise<GoodWarehouseResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parts_catalog')
    .select('id, sku, name, description, category, stock_quantity, min_stock_level, location')
    .order('name')

  if (error) {
    console.error('Error fetching parts catalog:', error)
  }

  const normalized = (data || []).map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    category: row.category,
    stock_quantity: row.stock_quantity ?? 0,
    min_stock_level: row.min_stock_level ?? 5,
    location: row.location,
    unit_cost: null,
    selling_price: null,
  }))

  return { data: normalized, error: error?.message ?? null }
}

export async function getHarvestingWarehouseParts(): Promise<HarvestWarehouseResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bad_warehouse_inventory')
    .select('sku, part_name, condition, quantity, received_from, disposition, date_received, notes')
    .order('date_received', { ascending: false })

  if (error) {
    console.error('Error fetching bad warehouse inventory:', error)
    return { data: [], error: error.message }
  }

  const grouped = new Map<string, {
    sku: string
    partName: string | null
    totalQuantity: number
    conditions: Set<string>
    latestReceivedAt: string | null
    receivedFrom: string | null
    disposition: string | null
    notes: string | null
  }>()

    ; (data || []).forEach((row) => {
      if (!row?.sku) return
      const quantity = Number(row.quantity ?? 0)
      const existing = grouped.get(row.sku)

      if (!existing) {
        grouped.set(row.sku, {
          sku: row.sku,
          partName: row.part_name,
          totalQuantity: quantity,
          conditions: new Set(row.condition ? [row.condition] : []),
          latestReceivedAt: row.date_received,
          receivedFrom: row.received_from,
          disposition: row.disposition,
          notes: row.notes
        })
        return
      }

      existing.totalQuantity += quantity
      if (row.condition) {
        existing.conditions.add(row.condition)
      }
      if (row.date_received) {
        const existingDate = existing.latestReceivedAt ? new Date(existing.latestReceivedAt) : null
        const candidate = new Date(row.date_received)
        if (!existingDate || candidate.getTime() > existingDate.getTime()) {
          existing.latestReceivedAt = row.date_received
        }
      }
      if (!existing.receivedFrom && row.received_from) {
        existing.receivedFrom = row.received_from
      }
      if (!existing.disposition && row.disposition) {
        existing.disposition = row.disposition
      }
      if (row.notes) {
        existing.notes = row.notes
      }
    })

  const normalized = Array.from(grouped.values())
    .map((entry) => ({
      sku: entry.sku,
      partName: entry.partName,
      totalQuantity: entry.totalQuantity,
      conditionSummary: Array.from(entry.conditions).filter(Boolean).join(', ') || 'Harvested',
      latestReceivedAt: entry.latestReceivedAt,
      receivedFrom: entry.receivedFrom,
      disposition: entry.disposition,
      notes: entry.notes
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)

  return { data: normalized, error: null }
}

export async function getCatalogBrands(): Promise<CatalogResult<CatalogBrand>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('catalog_brands')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching catalog brands:', error)
  }

  return { data: data || [], error: error?.message ?? null }
}

export async function getCatalogModels(): Promise<CatalogResult<CatalogModel>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('catalog_models')
    .select(`
      id,
      name,
      brand_id,
      product_type_id,
      brand:catalog_brands(id, name),
      product_type:catalog_product_types(id, name)
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching catalog models:', error)
  }

  const normalized = (data || []).map((item) => ({
    ...item,
    brand: Array.isArray(item.brand) ? item.brand[0] : item.brand,
    product_type: Array.isArray(item.product_type) ? item.product_type[0] : item.product_type
  })) as CatalogModel[]

  return { data: normalized, error: error?.message ?? null }
}

export async function getCatalogProductTypes(): Promise<CatalogResult<CatalogProductType>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('catalog_product_types')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching catalog product types:', error)
  }

  return { data: data || [], error: error?.message ?? null }
}
