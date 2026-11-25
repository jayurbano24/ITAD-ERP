import type { ProjectCostRow } from '@/lib/inventario/projectCostTypes'
import { isPurchasedAsset } from '@/lib/wipe/isPurchasedAsset'

type AssetWithSpecs = {
  specifications?: Record<string, unknown> | null
  cost_amount?: number | null
  sales_price?: number | null
}

export function getAssetProjectRef(asset: AssetWithSpecs): string | null {
  const specs = asset.specifications ?? null
  const projectRaw =
    specs?.project_number ??
    specs?.source_order_number ??
    specs?.invoice_ref ??
    specs?.project_hash ??
    null
  if (projectRaw == null || String(projectRaw).trim() === '') return null
  return String(projectRaw).trim()
}

/** Agrega costos de todos los equipos en Remarketing por Project #. */
export function buildRemarketingProjectCostRows(
  assets: AssetWithSpecs[]
): ProjectCostRow[] {
  const byProject = new Map<
    string,
    {
      units: number
      purchasedUnits: number
      processedUnits: number
      totalCost: number
      totalSale: number
    }
  >()

  for (const asset of assets) {
    const project = getAssetProjectRef(asset) ?? 'Sin Project #'
    const cost = asset.cost_amount != null ? Number(asset.cost_amount) : 0
    const sale = asset.sales_price != null ? Number(asset.sales_price) : 0
    const purchased = isPurchasedAsset(asset)

    const prev = byProject.get(project) || {
      units: 0,
      purchasedUnits: 0,
      processedUnits: 0,
      totalCost: 0,
      totalSale: 0,
    }
    prev.units += 1
    if (purchased) prev.purchasedUnits += 1
    else prev.processedUnits += 1
    prev.totalCost += Number.isFinite(cost) ? cost : 0
    prev.totalSale += Number.isFinite(sale) ? sale : 0
    byProject.set(project, prev)
  }

  return Array.from(byProject.entries())
    .map(([project, v]) => ({
      project,
      units: v.units,
      purchasedUnits: v.purchasedUnits,
      processedUnits: v.processedUnits,
      totalCost: Math.round(v.totalCost * 100) / 100,
      totalSale: Math.round(v.totalSale * 100) / 100,
    }))
    .sort((a, b) => a.project.localeCompare(b.project, 'es', { numeric: true }))
}

export function countDistinctProjects(assets: AssetWithSpecs[]): number {
  const keys = new Set<string>()
  for (const asset of assets) {
    keys.add(getAssetProjectRef(asset) ?? 'Sin Project #')
  }
  return keys.size
}