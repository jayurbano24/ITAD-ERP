/** True si el activo entró como lote comprado (Remarketing). */
export function isPurchasedAsset(asset: {
  specifications?: Record<string, unknown> | null
}): boolean {
  const specs = asset.specifications
  if (specs && typeof specs === 'object') {
    if (specs.acquisition_source === 'purchase' || specs.purchase_lot === true) return true
  }
  return false
}
